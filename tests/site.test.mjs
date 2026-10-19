import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, copyFile, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
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

test('homepage latest writing shows exactly three article cards', async () => {
  const html = await read('dist/index.html');
  const section = html.split('id="latest-writing"')[1].split('class="section-more"')[0];
  assert.equal((section.match(/class="editorial-card"/g) || []).length, 3);
  assert.doesNotMatch(section, /href="framework\.html"|href="research\.html"/);
  for (const essay of data.essays.filter(item => item.status === 'published' && item.featured).slice(0, 3)) {
    const file = essay.id === 'how-ai-actually-works' ? 'essay.html' : `essay-${essay.id}.html`;
    assert.ok(section.includes(`href="${file}"`));
  }
});

test('engagement paths lead to evidence and a specific enquiry', async () => {
  const home = await read('dist/index.html');
  const routes = ['work-with-me.html#transformation', 'work-with-me.html#build', 'training.html', 'speaking.html'];
  for (const route of routes) assert.ok(home.includes(`href="${route}"`));
  assert.ok(home.indexOf('id="work-with-me"') < home.indexOf('id="latest-writing"'));
  assert.ok(home.indexOf('Proof in practice') < home.indexOf('id="latest-writing"'));
  const work = await read('dist/work-with-me.html');
  for (const id of ['transformation', 'build', 'training', 'speaking']) assert.ok(work.includes(`id="${id}"`));
  assert.match(work, /I conceived and led CHEDVI/);
  const training = await read('dist/training.html');
  assert.match(training, /Leadership briefing/);
  assert.match(training, /Team workshop/);
  const speaking = await read('dist/speaking.html');
  assert.match(speaking, /For event organizers/);
  assert.match(speaking, /Short speaker biography/);
  const contact = await read('dist/contact.html');
  for (const subject of ['AI%20transformation%20enquiry', 'Platform%20build%20enquiry', 'AI%20training%20enquiry', 'Speaking%20invitation']) assert.ok(contact.includes(subject));
  for (const page of ['work-with-me.html', 'training.html']) {
    await access(join(root, 'dist', page));
    assert.match(await read(`dist/${page}`), /href="site\.css\?v=[a-f0-9]{10}"/);
  }
});

test('career proof and publications are visible with source links', async () => {
  const home = await read('dist/index.html');
  for (const page of ['research-state-ai-readiness.html', 'research-explainable-ai-healthcare-review.html', 'project-chedvi.html']) {
    assert.ok(home.includes(`href="${page}"`));
    await access(join(root, 'dist', page));
  }
  const bio = await read('dist/biography.html');
  for (const fact of ['MS in Data Science', 'Bachelor of Engineering', 'AAAS Annual Meeting', 'B0CCDYJF87', '10.3390/a19060488']) assert.ok(bio.includes(fact));
  assert.doesNotMatch(bio, /working draft/i);
  const research = await read('dist/research.html');
  assert.match(research, /Published research/);
  assert.match(research, /The State AI Preparedness Project/);
  assert.match(research, /Explainable AI Applications in Healthcare/);
  const speaking = await read('dist/speaking.html');
  assert.match(speaking, /AAAS Annual Meeting/);
  assert.match(speaking, /Rutgers–Camden School of Business Symposium/);
  await access(join(root, 'dist/assets/event-rutgers-business-symposium-2024.webp'));
});

test('search metadata distinguishes preview and production', async () => {
  const home = await read('dist/index.html');
  assert.match(home, /rel="canonical"/);
  assert.match(home, /property="og:description"/);
  assert.match(home, /"@type":"ProfilePage"/);
  if (process.env.SITE_PREVIEW === 'true') {
    assert.match(home, /noindex,nofollow/);
    assert.match(home, /ojobo-tech\.github\.io\/website-preview\/index\.html/);
  } else {
    assert.doesNotMatch(home, /noindex,nofollow/);
    assert.match(home, /https:\/\/ojoboagboeje\.com\/index\.html/);
  }
});

test('analytics stays off in preview and uses only configured production IDs', async () => {
  const settings = JSON.parse(await read('content/analytics.json'));
  assert.equal(typeof settings.cloudflareToken, 'string');
  assert.equal(typeof settings.googleSiteVerification, 'string');
  const cloudflareToken = process.env.CLOUDFLARE_WEB_ANALYTICS_TOKEN || settings.cloudflareToken;
  const googleVerification = process.env.GOOGLE_SITE_VERIFICATION || settings.googleSiteVerification;
  for (const file of (await readdir(join(root, 'dist'))).filter(name => name.endsWith('.html'))) {
    const page = await read(`dist/${file}`);
    if (process.env.SITE_PREVIEW === 'true' || !cloudflareToken) {
      assert.doesNotMatch(page, /static\.cloudflareinsights\.com\/beacon\.min\.js/, file);
    } else {
      assert.match(page, /static\.cloudflareinsights\.com\/beacon\.min\.js/, file);
      assert.ok(page.includes(`data-cf-beacon='{"token":"${cloudflareToken}"}'`), file);
    }
    if (process.env.SITE_PREVIEW === 'true' || !googleVerification) {
      assert.doesNotMatch(page, /name="google-site-verification"/, file);
    } else {
      assert.ok(page.includes(`name="google-site-verification" content="${googleVerification}"`), file);
    }
  }
});

test('personal photos are present on the intended pages and editable', async () => {
  const pages = [
    ['index.html', 'ojobo-portrait-pink.jpg'],
    ['about.html', 'ojobo-portrait-pink.jpg'],
    ['biography.html', 'ojobo-portrait-formal.jpg'],
    ['speaking.html', 'ojobo-innovate-100.jpg'],
    ['essay-five-stages-ai-maturity.html', 'ojobo-portrait-formal.jpg'],
  ];
  for (const [page, filename] of pages) {
    await access(join(root, 'dist', 'assets', filename));
    const html = await read(`dist/${page}`);
    assert.ok(html.includes(`assets/${filename}`), `${page} does not show ${filename}`);
    assert.match(html, /href="site\.css\?v=[a-f0-9]{10}"/);
  }
  assert.match(await read('index.html'), /data-edit-image="image_009"/);
  assert.match(await read('biography.html'), /data-edit-image="image_001"/);
  const manifest = JSON.parse(await read('content/pages/manifest.json'));
  for (const [slug, key] of [['home', 'image_009'], ['biography', 'image_001']]) {
    assert.ok(manifest.find(page => page.slug === slug)?.fields.some(field => field.key === key));
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

test('the four Substack essays retain full text, provenance, and publication dates', async () => {
  const importedIds = new Set(['five-stages-ai-maturity', 'new-wine-old-wineskins', 'history-ai-investment-roi', 'ai-adoption-paradox']);
  const imported = data.essays.filter(item => importedIds.has(item.id));
  assert.equal(imported.length, 4);
  for (const essay of imported) {
    assert.match(essay.sourceUrl, /^https:\/\/ojoboagboeje\.substack\.com\/p\//);
    assert.ok(essay.body.split(/\s+/).length > 1200, `${essay.id} looks incomplete`);
    assert.match(essay.publishedAt, /^2026-\d{2}-\d{2}$/);
    assert.match(essay.body, /^## /m);
    assert.doesNotMatch(essay.body, /Thanks for reading The AI Catalyst Report|Type your email/);
    assert.doesNotMatch(essay.body, /[.!?][A-Z][a-z]/);
    const html = await read(`dist/essay-${essay.id}.html`);
    assert.ok(html.includes(`datetime="${essay.publishedAt}"`));
    assert.ok(html.includes(`rel="canonical" href="${essay.sourceUrl}"`));
    assert.match(html, /Originally published in/);
    assert.match(html, /Related articles/);
  }
  assert.match(await read('dist/essay-five-stages-ai-maturity.html'), /<ol>/);
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

test('the reading room uses the five supplied book covers', async () => {
  const reading = await read('dist/reading.html');
  const expected = new Map([
    ['prediction-machines', 'book-prediction-machines.jpg'],
    ['great-mental-models', 'book-great-mental-models.jpg'],
    ['tipping-point', 'book-tipping-point.webp'],
    ['thinking-in-systems', 'book-thinking-in-systems.jpg'],
    ['superforecasting', 'book-superforecasting.jpg'],
  ]);
  for (const [id, filename] of expected) {
    const item = data.reading.find(entry => entry.id === id);
    assert.equal(item?.image, `assets/${filename}`);
    assert.ok(item.imageAlt);
    await access(join(root, 'dist', 'assets', filename));
    assert.ok(reading.includes(`src="assets/${filename}"`));
  }
  assert.equal(data.reading.find(entry => entry.id === 'culture-communication-delegation-triad')?.image, '');
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
    for (const file of ['scripts/build-content.mjs', 'scripts/render-page-content.mjs', 'scripts/render-list-content.mjs', 'site.css', 'site-conversion.css', 'site.js', 'content-render.js', 'article.js']) {
      await copyFile(join(root, file), join(fixture, file));
    }
    await copyFile(join(root, 'content', 'analytics.json'), join(fixture, 'content', 'analytics.json'));
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
