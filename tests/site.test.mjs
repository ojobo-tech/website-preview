import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { renderEditablePage } from '../scripts/render-page-content.mjs';
import { eventDateRange, renderListContent } from '../scripts/render-list-content.mjs';

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
    assert.match(html, /class="essay-hero"/);
    assert.match(html, /class="essay-brief"/);
    assert.match(html, /class="essay-sidebar"/);
    assert.match(html, /class="essay-conversation"/);
    assert.match(html, /application\/ld\+json/);
    if (essay.image?.startsWith('assets/')) await access(join(root, essay.image));
  }
});

test('reading and event entries are visible in built HTML and their images exist', async () => {
  const home = await read('dist/index.html');
  const reading = await read('dist/reading.html');
  const speaking = await read('dist/speaking.html');
  for (const item of data.reading.filter(item => item.status === 'published')) assert.ok(reading.includes(item.title));
  for (const item of data.events.filter(item => item.status === 'published')) {
    assert.ok(speaking.includes(item.title));
    if (item.image?.startsWith('assets/')) await access(join(root, item.image));
  }
  assert.match(home, /The AI Revolution/);
  assert.match(home, /University Librarian’s Symposium Series/);
  assert.match(speaking, /Attending/);
  assert.match(speaking, /Ethical AI Transformation by Design/);
  assert.doesNotMatch(reading, /Example book|Personal reading note to add/);
  assert.doesNotMatch(home, /No dates announced yet/);
});

test('a two-day event stays upcoming through its final day', () => {
  const event = data.events.find(item => item.id === 'ai-revolution-2026');
  assert.equal(eventDateRange(event), 'October 21–22, 2026');
  const markup = '<div class="speaking-track" data-speaking-track aria-live="polite">old</div><div class="speaking-controls"></div>';
  assert.match(renderListContent(markup, 'index.html', data, '2026-10-22'), /The AI Revolution/);
  assert.doesNotMatch(renderListContent(markup, 'index.html', data, '2026-10-23'), /The AI Revolution/);
});

test('page content build safely changes text, images, and search descriptions', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'ojobo-page-test-'));
  try {
    await mkdir(join(fixture, 'content', 'pages'), { recursive: true });
    const fields = ['seoTitle', 'seoDescription', 'text_001', 'image_001', 'image_001_alt', 'heroImage'].map(key => ({ key }));
    await writeFile(join(fixture, 'content', 'pages', 'manifest.json'), JSON.stringify([{ filename: 'index.html', slug: 'home', fields }]));
    const data = { seoTitle: 'A & B', seoDescription: 'Quote "this"', text_001: '<script>alert(1)</script>', image_001: 'assets/new-photo.png', image_001_alt: 'A <portrait>', heroImage: 'assets/hero.png' };
    await writeFile(join(fixture, 'content', 'pages', 'home.json'), JSON.stringify(data));
    const source = '<head><title>Old</title><meta name="description" content="Old"></head><section data-edit-background="heroImage"><h1 data-edit-text="text_001">Old</h1><img src="assets/old.png" alt="Old" data-edit-image="image_001"></section>';
    const output = await renderEditablePage(fixture, 'index.html', source);
    assert.match(output, /<title>A &amp; B<\/title>/);
    assert.match(output, /content="Quote &quot;this&quot;"/);
    assert.match(output, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(output, /src="assets\/new-photo.png" alt="A &lt;portrait&gt;"/);
    assert.match(output, /background-image:url\(&#39;assets\/hero.png&#39;\)/);
    data.image_001 = "assets/x');alert(1)//";
    await writeFile(join(fixture, 'content', 'pages', 'home.json'), JSON.stringify(data));
    await assert.rejects(renderEditablePage(fixture, 'index.html', source), /Unsafe page image path/);
  } finally { await rm(fixture, { recursive: true, force: true }); }
});

test('deployment package includes public pages but not source material or drafts', async () => {
  await access(join(root, 'dist', 'index.html'));
  await assert.rejects(access(join(root, 'dist', 'admin', 'index.html')));
  await access(join(root, 'dist', 'content', 'site-content.js'));
  assert.match(await read('dist/index.html'), /window\.siteSettings=/);
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
    for (const folder of ['scripts', 'content', 'assets']) await mkdir(join(fixture, folder));
    for (const file of ['scripts/build-content.mjs', 'scripts/render-page-content.mjs', 'scripts/render-list-content.mjs', 'site.js', 'content-render.js', 'article.js']) {
      await copyFile(join(root, file), join(fixture, file));
    }
    const sample = structuredClone(data);
    sample.essays.push({ ...sample.essays[0], id: 'sample-essay', title: 'Sample Essay', body: '## A section\nA **bold** idea and a [source](https://example.com).', publishedAt: '2026-10-18', tags: ['Systems'], audio: 'assets/sample.mp3', questions: [{ question: 'What changes?', answer: 'The example changes.' }], status: 'published' });
    sample.essays.push({ ...sample.essays[0], id: 'private-draft', title: 'Private Draft', status: 'draft' });
    sample.projects.push({ id: 'sample-build', title: 'Sample Build', summary: 'A build.', body: '## The problem\nA useful tool.', detailReady: true, status: 'published' });
    sample.research.push({ id: 'sample-research', title: 'Sample Research', summary: 'An inquiry.', body: '## Finding\nA useful insight.', status: 'published' });
    await writeFile(join(fixture, 'content', 'site-content.json'), JSON.stringify(sample));
    await import(pathToFileURL(join(fixture, 'scripts', 'build-content.mjs')).href);
    const sampleArticle = await readFile(join(fixture, 'dist', 'essay-sample-essay.html'), 'utf8');
    assert.match(sampleArticle, /<strong>bold<\/strong>/);
    assert.match(sampleArticle, /datetime="2026-10-18"/);
    assert.match(sampleArticle, /href="#a-section"/);
    assert.match(sampleArticle, /Listen to this article/);
    assert.match(sampleArticle, /The questions considered/);
    assert.match(sampleArticle, /Related articles/);
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
