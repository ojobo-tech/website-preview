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
    assert.ok(section.includes(`href="${process.env.SITE_PREVIEW === 'true' ? '/website-preview/' : '/'}${file.replace(/\.html$/, '')}/"`));
  }
});

test('navigation and search keep clear routes to enquiries on small screens', async () => {
  const shell = await read('site.js');
  const search = await read('search.html');
  assert.match(shell, /class="mobile-nav-action" href="work-with-me\.html"/);
  assert.match(shell, /class="mobile-nav-action" href="contact\.html"/);
  assert.match(shell, /skip\.href = '#main-content'/);
  assert.match(shell, /'Popular starting points'/);
  assert.equal((search.match(/content\/site-content\.js/g) || []).length, 1);
  assert.match(search, /data-search-status[^>]*role="status"/);
});

test('offer and sharing copy give visitors a clear next action', async () => {
  const home = JSON.parse(await read('content/pages/home.json'));
  const work = JSON.parse(await read('content/pages/work.json'));
  const contact = JSON.parse(await read('content/pages/contact.json'));
  const shell = await read('site.js');
  assert.match(home.text_002, /AI ambition into measurable value.*redesigning work.*building solutions/s);
  assert.match(work.text_007, /scope, deliverables, and measures of success/);
  assert.match(contact.text_003, /slowing your work down.*right starting point.*build a solution/s);
  assert.match(shell, /Copy this page link/);
  assert.match(shell, /navigator\.clipboard\.writeText/);
});

test('15-question starting-point assessment provides five scores and a gated report', async () => {
  const home = await read('dist/index.html');
  const start = await read('dist/start-here.html');
  const script = await read('dist/start-here.js');
  const sitemap = await read('dist/sitemap.xml');
  const manifest = JSON.parse(await read('content/pages/manifest.json'));
  assert.match(home, /href="\/start-here\/"/);
  assert.match(start, /data-guide-root/);
  assert.match(start, /15 questions across five parts/);
  assert.match(start, /30, 60, and 90 days/);
  assert.doesNotMatch(start, /A quick orientation|What progress could look like|Your answers stay in this browser/);
  assert.match(start, /not a validated diagnostic/);
  assert.equal((script.match(/\['(?:awareness|understanding|evaluation|adoption|optimization)', 'How /g) || []).length, 15);
  for (const part of ['Awareness', 'Understanding', 'Evaluation', 'Adoption', 'Optimization']) assert.match(script, new RegExp(part));
  assert.match(script, /data-report-form/);
  assert.match(script, /data-print/);
  assert.match(script, /fetch\(endpoint/);
  assert.match(script, /response\.ok/);
  assert.doesNotMatch(script, /data-copy|clipboard\.writeText/);
  assert.match(sitemap, /\/start-here\//);
  assert.ok(manifest.some(page => page.filename === 'start-here.html'));
});

test('assessment percentages follow the disclosed 15-question, five-part scoring', async () => {
  const script = await read('start-here.js');
  const { questions, calculate, reportMarkup } = runInNewContext(`${script}\n;({ questions, calculate, reportMarkup })`, {
    document: { querySelector: () => null },
    window: { siteSettings: { contactFormEndpoint: 'https://formspree.io/f/xvkkkojw' } }
  });
  assert.equal(questions.length, 15);
  assert.deepEqual([...new Set(questions.map(question => question.part))], ['awareness', 'understanding', 'evaluation', 'adoption', 'optimization']);
  assert.equal(calculate(Array(15).fill(0)).overall, 0);
  assert.equal(calculate(Array(15).fill(2)).overall, 50);
  assert.equal(calculate(Array(15).fill(4)).overall, 100);
  const mixed = calculate([...Array(3).fill(4), ...Array(12).fill(0)]);
  assert.equal(mixed.scores.awareness, 100);
  assert.equal(mixed.scores.understanding, 0);
  assert.equal(mixed.overall, 20);
  const report = reportMarkup(mixed, '<Visitor>', 'Independent professional');
  assert.match(report, /Your AI action report/);
  assert.match(report, /First 30 days/);
  assert.match(report, /By 60 days/);
  assert.match(report, /By 90 days/);
  assert.match(report, /&lt;Visitor&gt;/);
  assert.doesNotMatch(report, /<Visitor>/);
});

test('engagement paths lead to evidence and a specific enquiry', async () => {
  const home = await read('dist/index.html');
  const routes = ['work-with-me/#transformation', 'work-with-me/#build', 'training/', 'speaking/'];
  for (const route of routes) assert.ok(home.includes(`href="${process.env.SITE_PREVIEW === 'true' ? '/website-preview/' : '/'}${route}"`));
  assert.ok(home.indexOf('id="ways-to-work"') < home.indexOf('id="latest-writing"'));
  assert.ok(home.indexOf('Proof in practice') < home.indexOf('id="latest-writing"'));
  const work = await read('dist/work-with-me.html');
  for (const id of ['transformation', 'build', 'training', 'speaking']) assert.ok(work.includes(`id="${id}"`));
  assert.match(work, /I conceived and led CHEDVI/);
  const training = await read('dist/training.html');
  assert.match(training, /Leadership briefing/);
  assert.match(training, /Team workshop/);
  for (const tool of ['ChatGPT', 'Claude', 'Gemini', 'Microsoft 365 Copilot']) assert.ok(training.includes(tool));
  for (const skill of ['Check and improve outputs', 'Apply AI to a workflow']) assert.ok(training.includes(skill));
  const solutions = await read('dist/build.html');
  for (const outcome of ['Give time back', 'Serve customers better', 'Make information useful', 'Grow capacity and revenue']) assert.ok(solutions.includes(outcome));
  const speaking = await read('dist/speaking.html');
  assert.match(speaking, /For event organizers/);
  assert.match(speaking, /Short speaker biography/);
  const contact = await read('dist/contact.html');
  assert.match(contact, /data-contact-form/);
  assert.match(contact, /name="topic"/);
  assert.match(contact, /name="message"/);
  assert.match(contact, /mailto:agboojobo@gmail.com/);
  assert.match(await read('dist/contact.js'), /contactFormEndpoint/);
  const siteSettings = JSON.parse(await read('content/site-settings.json'));
  assert.equal(siteSettings.contactFormEndpoint, 'https://formspree.io/f/xvkkkojw');
  assert.match(contact, /"contactFormEndpoint":"https:\/\/formspree\.io\/f\/xvkkkojw"/);
  for (const page of ['work-with-me.html', 'training.html']) {
    await access(join(root, 'dist', page));
    assert.match(await read(`dist/${page}`), /href="site\.css\?v=[a-f0-9]{10}"/);
  }
});

test('career proof and publications are visible with source links', async () => {
  const home = await read('dist/index.html');
  for (const page of ['research-state-ai-readiness.html', 'research-explainable-ai-healthcare-review.html', 'project-chedvi.html']) {
    await access(join(root, 'dist', page));
    await access(join(root, 'dist', page.replace(/\.html$/, ''), 'index.html'));
  }
  const bio = await read('dist/biography.html');
  for (const fact of ['MS in Data Science', 'Bachelor of Engineering', 'AAAS Annual Meeting', 'B0CCDYJF87', '10.3390/a19060488']) assert.ok(bio.includes(fact));
  assert.doesNotMatch(bio, /working draft/i);
  const research = await read('dist/research.html');
  assert.match(research, /Selected publications/);
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
  assert.match(home, /src="site\.js\?v=[a-f0-9]{10}"/);
  assert.match(home, /"@type":"ProfilePage"/);
  if (process.env.SITE_PREVIEW === 'true') {
    assert.match(home, /noindex,nofollow/);
    assert.match(home, /rel="canonical" href="https:\/\/ojobo-tech\.github\.io\/website-preview\/"/);
  } else {
    assert.doesNotMatch(home, /noindex,nofollow/);
    assert.match(home, /rel="canonical" href="https:\/\/ojoboagboeje\.com\/"/);
    assert.match(await read('dist/sitemap.xml'), /<loc>https:\/\/ojoboagboeje\.com\/<\/loc>/);
  }
  assert.doesNotMatch(await read('dist/about.html'), /href="index\.html"/);
  assert.match(await read('dist/about.html'), /href="\.\/">Home<\/a>/);
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

test('homepage preview keeps the opening focused on the person and offer', async () => {
  const html = await read('dist/index.html');
  const hero = html.split('<section class="hero-home">')[1].split('</section>')[0];
  assert.match(hero, /ojobo-portrait-formal\.jpg/);
  assert.match(hero, /Portrait of Ojobo Agbo Eje/);
  assert.match(hero, /Explore ways to work together/);
  assert.doesNotMatch(hero, /CHEDVI|Rutgers|research-state-ai-readiness|project-chedvi/i);
  assert.match(html, /class="hero-wayfinder"/);
  assert.match(html, /href="\/start-here\/"/);
});

test('homepage motion preview keeps service imagery editable and motion optional', async () => {
  const source = await read('index.html');
  const html = await read('dist/index.html');
  const css = await read('dist/site.css');
  const js = await read('dist/site.js');
  const manifest = JSON.parse(await read('content/pages/manifest.json'));
  const homeFields = manifest.find(page => page.slug === 'home')?.fields || [];
  for (const id of [11, 12, 13, 14]) {
    const key = `image_${String(id).padStart(3, '0')}`;
    assert.ok(source.includes(`data-edit-image="${key}"`));
    assert.ok(homeFields.some(field => field.key === key && field.widget === 'image'));
    assert.ok(html.includes(`data-edit-image="${key}"`));
  }
  assert.match(html, /class="section home-proof"/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(js, /revealObserver\.unobserve/);
});

test('inner pages share subtle motion without delaying article text', async () => {
  const css = await read('dist/site.css');
  const js = await read('dist/site.js');
  for (const selector of ['.service-detail', '.project-list .card', '.editorial-grid .editorial-card', '.contact-route-grid > a', '.essay-related-card', '.case-feature-list > *']) {
    assert.ok(js.includes(selector), `${selector} is missing from sitewide reveal targets`);
  }
  assert.match(js, /page === 'essay'/);
  assert.match(js, /reading-progress/);
  assert.match(css, /\.site-motion-target\.is-visible/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  for (const page of ['about.html', 'work-with-me.html', 'build.html', 'training.html', 'speaking.html', 'writing.html', 'reading.html', 'contact.html', 'project-chedvi.html', 'essay-five-stages-ai-maturity.html']) {
    const html = await read(`dist/${page}`);
    assert.match(html, /src="site\.js\?v=[a-f0-9]{10}"/, `${page} is missing the shared interaction script`);
    assert.match(html, /href="site\.css\?v=[a-f0-9]{10}"/, `${page} is missing the shared visual styles`);
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
    assert.ok(html.includes(`rel="canonical" href="${process.env.SITE_PREVIEW === 'true' ? 'https://ojobo-tech.github.io/website-preview' : 'https://ojoboagboeje.com'}/essay-${essay.id}/"`));
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
  if (new Date().toISOString().slice(0, 10) <= '2026-10-22') assert.match(home, /The AI Revolution/);
  else assert.doesNotMatch(home, /The AI Revolution/);
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
    assert.match(await read('dist/sitemap.xml'), /https:\/\/ojoboagboeje\.com\/essay\//);
  }
  await assert.rejects(access(join(root, 'dist', 'sources')));
  await assert.rejects(access(join(root, 'dist', 'content', 'site-content.json')));
});

test('a sample publication builds its pages while a draft stays private', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'ojobo-publish-test-'));
  try {
    for (const folder of ['scripts', 'content', 'assets']) await mkdir(join(fixture, folder));
    for (const file of ['scripts/build-content.mjs', 'scripts/render-page-content.mjs', 'scripts/render-list-content.mjs', 'site.css', 'site-conversion.css', 'site.js', 'content-render.js', 'article.js', 'start-here.js', 'contact.js']) {
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
    await access(join(fixture, 'dist', 'essay-sample-essay', 'index.html'));
    await access(join(fixture, 'dist', 'project-sample-build', 'index.html'));
    await assert.rejects(access(join(fixture, 'dist', 'essay-private-draft.html')));
    assert.doesNotMatch(await readFile(join(fixture, 'dist', 'content', 'site-content.js'), 'utf8'), /Private Draft/);
    if (process.env.SITE_PREVIEW === 'true') {
      assert.match(await readFile(join(fixture, 'dist', 'essay-sample-essay.html'), 'utf8'), /noindex,nofollow/);
      await assert.rejects(access(join(fixture, 'dist', 'sitemap.xml')));
    } else {
      const sitemap = await readFile(join(fixture, 'dist', 'sitemap.xml'), 'utf8');
      assert.match(sitemap, /essay-sample-essay\//);
      assert.doesNotMatch(sitemap, /private-draft/);
    }
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
