import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const read = file => readFile(join(root, file), 'utf8');
const data = JSON.parse(await read('content/site-content.json'));

test('content catalog has the editable collections and valid IDs', () => {
  assert.equal(data.version, 1);
  for (const kind of ['essays', 'projects', 'research', 'events', 'reading']) {
    assert.ok(Array.isArray(data[kind]));
    assert.equal(new Set(data[kind].map(item => item.id)).size, data[kind].length);
    for (const item of data[kind]) assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  }
});

test('generated browser feed contains published entries only', async () => {
  const sandbox = { window: {} };
  runInNewContext(await read('content/site-content.js'), sandbox);
  const feed = JSON.parse(JSON.stringify(sandbox.window.siteContent));
  assert.equal(feed.version, data.version);
  for (const kind of ['essays', 'projects', 'research', 'events', 'reading']) {
    assert.deepEqual(feed[kind], data[kind].filter(item => item.status === 'published'));
  }
});

test('all managed lists load the content renderer', async () => {
  for (const file of ['index.html', 'build.html', 'research.html', 'writing.html', 'reading.html']) {
    const html = await read(file);
    assert.match(html, /content\/site-content\.js/);
    assert.match(html, /content-render\.js/);
  }
});

test('published article pages are built and their images exist', async () => {
  for (const essay of data.essays.filter(item => item.status === 'published')) {
    const file = essay.id === 'how-ai-actually-works' ? 'essay.html' : `essay-${essay.id}.html`;
    const html = await read(file);
    assert.ok(html.includes(essay.title));
    if (essay.image?.startsWith('assets/')) await access(join(root, essay.image));
  }
});

test('the editor is present but requires a real hosted site ID', async () => {
  const config = await read('admin/config.yml');
  assert.match(config, /turbo-github/);
  assert.match(config, /REPLACE_WITH_DECAP_TURBO_SITE_ID/);
});

test('deployment package includes public pages but not source material or drafts', async () => {
  await access(join(root, 'dist', 'index.html'));
  await access(join(root, 'dist', 'admin', 'index.html'));
  await access(join(root, 'dist', 'content', 'site-content.js'));
  if (process.env.SITE_PREVIEW === 'true') {
    assert.match(await read('dist/index.html'), /<meta name="robots" content="noindex,nofollow">/);
    assert.match(await read('dist/robots.txt'), /Disallow: \//);
    await assert.rejects(access(join(root, 'dist', 'sitemap.xml')));
  } else {
    assert.match(await read('dist/sitemap.xml'), /https:\/\/ojoboagboeje\.com\/essay\.html/);
  }
  await assert.rejects(access(join(root, 'dist', 'sources')));
  await assert.rejects(access(join(root, 'dist', 'content', 'site-content.json')));
});

test('a sample publication builds its pages while a draft stays private', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'ojobo-publish-test-'));
  try {
    for (const folder of ['scripts', 'content', 'admin', 'assets']) await mkdir(join(fixture, folder));
    for (const file of ['scripts/build-content.mjs', 'admin/index.html', 'admin/config.yml', 'site.js', 'content-render.js']) {
      await copyFile(join(root, file), join(fixture, file));
    }
    const sample = structuredClone(data);
    sample.essays.push({ ...sample.essays[0], id: 'sample-essay', title: 'Sample Essay', body: '## A section\nA **bold** idea and a [source](https://example.com).', status: 'published' });
    sample.essays.push({ ...sample.essays[0], id: 'private-draft', title: 'Private Draft', status: 'draft' });
    sample.projects.push({ id: 'sample-build', title: 'Sample Build', summary: 'A build.', body: '## The problem\nA useful tool.', detailReady: true, status: 'published' });
    sample.research.push({ id: 'sample-research', title: 'Sample Research', summary: 'An inquiry.', body: '## Finding\nA useful insight.', status: 'published' });
    await writeFile(join(fixture, 'content', 'site-content.json'), JSON.stringify(sample));
    await import(pathToFileURL(join(fixture, 'scripts', 'build-content.mjs')).href);
    assert.match(await readFile(join(fixture, 'dist', 'essay-sample-essay.html'), 'utf8'), /<strong>bold<\/strong>/);
    assert.match(await readFile(join(fixture, 'dist', 'project-sample-build.html'), 'utf8'), /Sample Build/);
    assert.match(await readFile(join(fixture, 'dist', 'research-sample-research.html'), 'utf8'), /Sample Research/);
    await assert.rejects(access(join(fixture, 'dist', 'essay-private-draft.html')));
    assert.doesNotMatch(await readFile(join(fixture, 'dist', 'content', 'site-content.js'), 'utf8'), /Private Draft/);
    if (process.env.SITE_PREVIEW === 'true') {
      assert.match(await readFile(join(fixture, 'dist', 'essay-sample-essay.html'), 'utf8'), /noindex,nofollow/);
      await assert.rejects(access(join(fixture, 'dist', 'sitemap.xml')));
    } else {
      const sitemap = await readFile(join(fixture, 'dist', 'sitemap.xml'), 'utf8');
      assert.match(sitemap, /essay-sample-essay\.html/);
      assert.doesNotMatch(sitemap, /private-draft/);
    }
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
