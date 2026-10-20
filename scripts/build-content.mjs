import { copyFile, cp, lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderEditablePage } from './render-page-content.mjs';
import { renderListContent } from './render-list-content.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentPath = join(root, 'content', 'site-content.json');
const manifestPath = join(root, 'content', 'generated-pages.json');
const content = JSON.parse(await readFile(contentPath, 'utf8'));
const preview = process.env.SITE_PREVIEW === 'true';
const analyticsSettings = JSON.parse(await readFile(join(root, 'content', 'analytics.json'), 'utf8'));
const cloudflareToken = String(process.env.CLOUDFLARE_WEB_ANALYTICS_TOKEN || analyticsSettings.cloudflareToken || '').trim();
const googleVerification = String(process.env.GOOGLE_SITE_VERIFICATION || analyticsSettings.googleSiteVerification || '').trim();
if (cloudflareToken && !/^[A-Za-z0-9_-]{16,128}$/.test(cloudflareToken)) throw new Error('Invalid Cloudflare Web Analytics token.');
if (googleVerification && !/^[A-Za-z0-9_-]{8,200}$/.test(googleVerification)) throw new Error('Invalid Google Search Console verification token.');
let siteSettings = null;
try {
  siteSettings = JSON.parse(await readFile(join(root, 'content', 'site-settings.json'), 'utf8'));
  for (const key of ['wordmark', 'contactButton', 'footerHeading', 'footerBio', 'footerTagline']) {
    if (typeof siteSettings[key] !== 'string') throw new Error(`Site setting ${key} is missing.`);
  }
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const siteSettingsScript = siteSettings ? `<script>window.siteSettings=${JSON.stringify(siteSettings).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')};</script>` : '';
const withSiteSettings = markup => siteSettingsScript ? markup.replace(/<script src="site\.js" defer><\/script>/i, `${siteSettingsScript}<script src="site.js" defer></script>`) : markup;
const publicBase = preview ? 'https://ojobo-tech.github.io/website-preview/' : 'https://ojoboagboeje.com/';
const sitePath = preview ? '/website-preview/' : '/';
const cleanPath = filename => filename === 'index.html' ? publicBase : `${publicBase}${filename.replace(/\.html$/, '')}/`;
const withCleanRoutes = markup => markup
  .replace(/<head>/i, `<head><base href="${sitePath}">`)
  .replace(/\b(href|value)="([a-z0-9-]+)\.html(#[^"]*)?"/gi, (_, attribute, slug, fragment = '') => `${attribute}="${sitePath}${slug === 'index' ? '' : `${slug}/`}${fragment}"`);
const withMeasurement = markup => {
  if (preview) return markup;
  const verified = googleVerification ? markup.replace(/<\/head>/i, `<meta name="google-site-verification" content="${googleVerification}"></head>`) : markup;
  return cloudflareToken ? verified.replace(/<\/body>/i, `<script type="module" defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${JSON.stringify({ token: cloudflareToken })}'></script></body>`) : verified;
};
const withDiscoveryMetadata = (markup, filename) => {
  if (markup.includes('rel="canonical"') || markup.includes('name="robots" content="noindex"')) return markup;
  const title = markup.match(/<title>([^<]*)<\/title>/i)?.[1] || 'Ojobo Agbo Eje';
  const description = markup.match(/<meta name="description" content="([^"]*)"/i)?.[1] || '';
  const url = cleanPath(filename);
  const imageUrl = `${publicBase}assets/ojobo-portrait-formal.jpg`;
  const person = {
    '@type': 'Person', '@id': `${publicBase}#ojobo-agbo-eje`, name: 'Ojobo Agbo Eje', url: publicBase,
    image: imageUrl, description: 'AI transformation and adoption practitioner, data scientist, researcher, and platform builder.',
    knowsAbout: ['AI transformation', 'AI adoption', 'AI literacy', 'work redesign', 'data science', 'explainable AI', 'AI readiness'],
    alumniOf: { '@type': 'CollegeOrUniversity', name: 'Rutgers University' },
    sameAs: ['https://ojoboagboeje.substack.com/', 'https://policylab.rutgers.edu/publication/the-state-ai-preparedness-project/', 'https://www.mdpi.com/1999-4893/19/6/488']
  };
  const structured = ['index.html', 'about.html', 'biography.html'].includes(filename)
    ? { '@context': 'https://schema.org', '@type': 'ProfilePage', '@id': `${url}#profile`, url, mainEntity: person }
    : { '@context': 'https://schema.org', '@type': 'WebPage', url, name: title, description };
  const metadata = `<link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${url}"><meta property="og:image" content="${imageUrl}"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${JSON.stringify(structured).replace(/</g, '\\u003c')}</script>`;
  return markup.replace(/<\/head>/i, `${metadata}</head>`);
};
const kinds = ['essays', 'projects', 'research', 'events', 'reading'];
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
const safeUrl = value => {
  const url = String(value ?? '').trim();
  return /^(?:https:\/\/[^\s<>"']+|\/?assets\/[\w./-]+|[a-z0-9-]+\.html)$/i.test(url) && !url.includes('..') ? url : '';
};
const fileForEssay = essay => essay.id === 'how-ai-actually-works' ? 'essay.html' : `essay-${essay.id}.html`;
const fileForProject = project => `project-${project.id}.html`;
const fileForResearch = item => `research-${item.id}.html`;
const published = item => item.status === 'published';

if (content.version !== 1 || kinds.some(kind => !Array.isArray(content[kind]))) throw new Error('Content file is missing a required collection or version.');
for (const kind of kinds) {
  const ids = new Set();
  for (const item of content[kind]) {
    if (!item || !idPattern.test(item.id || '') || ids.has(item.id)) throw new Error(`Invalid or duplicate ID in ${kind}.`);
    ids.add(item.id);
    if (!['draft', 'published'].includes(item.status)) throw new Error(`Invalid status for ${kind}/${item.id}.`);
    if (published(item) && !item.title) throw new Error(`Published ${kind}/${item.id} needs a title.`);
  }
}

const inline = value => {
  const input = String(value ?? '');
  let output = '';
  let cursor = 0;
  const tokens = /(!?\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  for (const match of input.matchAll(tokens)) {
    output += esc(input.slice(cursor, match.index));
    if (match[2] != null) {
      const href = safeUrl(match[3]);
      output += href ? (match[1].startsWith('!') ? `<img src="${esc(href)}" alt="${esc(match[2])}" loading="lazy">` : `<a href="${esc(href)}">${esc(match[2])}</a>`) : esc(match[0]);
    } else if (match[4] != null) output += `<strong>${esc(match[4])}</strong>`;
    else if (match[5] != null) output += `<em>${esc(match[5])}</em>`;
    else output += `<code>${esc(match[6])}</code>`;
    cursor = match.index + match[0].length;
  }
  return output + esc(input.slice(cursor));
};
const headingId = value => String(value).toLowerCase().replace(/[^a-z0-9 -]/g, '').trim().replace(/\s+/g, '-');
const markdown = source => {
  const lines = String(source ?? '').replace(/\r/g, '').split('\n');
  const chunks = [];
  let paragraph = [];
  let list = [];
  let listKind = '';
  const flush = () => {
    if (paragraph.length) { chunks.push(`<p>${inline(paragraph.join(' '))}</p>`); paragraph = []; }
    if (list.length) { chunks.push(`<${listKind}>${list.map(item => `<li>${inline(item)}</li>`).join('')}</${listKind}>`); list = []; listKind = ''; }
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { flush(); continue; }
    const heading = /^(#{2,3})\s+(.+)$/.exec(trimmed);
    if (heading) { flush(); const level = heading[1].length; chunks.push(`<h${level} id="${esc(headingId(heading[2]))}">${inline(heading[2])}</h${level}>`); continue; }
    if (trimmed.startsWith('> ')) { flush(); chunks.push(`<blockquote>${inline(trimmed.slice(2))}</blockquote>`); continue; }
    const unordered = /^-\s+(.+)$/.exec(trimmed);
    const ordered = /^\d+\.\s+(.+)$/.exec(trimmed);
    if (unordered || ordered) {
      const nextKind = unordered ? 'ul' : 'ol';
      if (paragraph.length || (list.length && listKind !== nextKind)) flush();
      listKind = nextKind;
      list.push((unordered || ordered)[1]);
      continue;
    }
    if (list.length) flush();
    paragraph.push(trimmed);
  }
  flush();
  return chunks.join('\n');
};
const sideLinks = body => [...String(body ?? '').matchAll(/^##\s+(.+)$/gm)].map(([, label]) => `<a href="#${esc(headingId(label))}">${esc(label)}</a>`).join('');
const image = (item, fallback) => safeUrl(item.image) || fallback;
const html = (title, description, page, main, headExtra = '') => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(description)}"><title>${esc(title)} — Ojobo Agbo Eje</title><link rel="stylesheet" href="site.css">${headExtra}<script src="site.js" defer></script></head>
<body id="top" data-page="${page}"><header class="site-header" data-header></header><main>${main}</main><footer class="footer-main" data-footer></footer></body></html>
`;
const articlePage = essay => {
  const file = fileForEssay(essay);
  const sourceUrl = safeUrl(essay.sourceUrl);
  const canonical = essay.canonicalPreference === 'website' ? cleanPath(file) : sourceUrl || cleanPath(file);
  const cover = image(essay, 'assets/editorial-ai-literacy.png');
  const publishedAt = /^\d{4}-\d{2}-\d{2}$/.test(essay.publishedAt || '') ? essay.publishedAt : '';
  const publishedLabel = publishedAt ? new Date(`${publishedAt}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '';
  const tags = Array.isArray(essay.tags) ? essay.tags.filter(tag => typeof tag === 'string' && tag.trim()).slice(0, 8) : [];
  const questions = Array.isArray(essay.questions) ? essay.questions.filter(item => item?.question && item?.answer) : [];
  const otherEssays = content.essays.filter(item => published(item) && item.id !== essay.id).slice(0, 3);
  const outline = sideLinks(essay.body);
  const audio = safeUrl(essay.audio);
  const metadata = [publishedAt ? `<time datetime="${publishedAt}">${esc(publishedLabel)}</time>` : '', essay.readMinutes ? `<span>${esc(essay.readMinutes)} min read</span>` : '', essay.location ? `<span>${esc(essay.location)}</span>` : ''].filter(Boolean).join('');
  const shareLinks = '<a data-share="linkedin" href="#share">LinkedIn</a><a data-share="x" href="#share">X</a><a data-share="email" href="#share">Email</a>';
  const relatedSide = otherEssays.length ? `<div class="essay-rail-block"><h2>Related articles</h2>${otherEssays.map(item => `<a href="${esc(fileForEssay(item))}">${esc(item.title)}</a>`).join('')}</div>` : `<div class="essay-rail-block"><h2>Explore more</h2><a href="writing.html">All articles</a><a href="framework.html">AI transformation framework</a></div>`;
  const faq = questions.length ? `<section class="essay-questions" id="questions-considered"><h2>The questions considered</h2>${questions.map(item => `<details><summary>${esc(item.question)}</summary><p>${esc(item.answer)}</p></details>`).join('')}</section>` : '';
  const relatedCards = otherEssays.length ? `<section class="essay-related container"><h2>Related articles</h2><div class="essay-related-grid">${otherEssays.map(item => `<a class="essay-related-card" href="${esc(fileForEssay(item))}"><img src="${esc(image(item, 'assets/editorial-ai-literacy.png'))}" alt="${esc(item.imageAlt || `Illustration for ${item.title}`)}" loading="lazy"><span class="kicker">${esc(item.category || 'Article')}</span><h3>${esc(item.title)}</h3><p>${esc(item.summary || '')}</p></a>`).join('')}</div></section>` : '<section class="essay-related container"><h2>Continue exploring</h2><div class="essay-related-links"><a href="writing.html">More articles →</a><a href="framework.html">The transformation framework →</a></div></section>';
  const schema = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: essay.title, description: essay.summary || essay.title, image: `https://ojoboagboeje.com/${cover}`, author: { '@type': 'Person', name: 'Ojobo Agbo Eje' }, mainEntityOfPage: canonical };
  if (publishedAt) schema.datePublished = publishedAt;
  const headExtra = `<link rel="canonical" href="${esc(canonical)}"><meta property="og:type" content="article"><meta property="og:title" content="${esc(essay.title)}"><meta property="og:description" content="${esc(essay.summary || essay.title)}"><meta property="og:image" content="https://ojoboagboeje.com/${esc(cover)}"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script><script src="article.js" defer></script>`;
  const main = `<section class="essay-hero"><img class="essay-hero-image" src="${esc(cover)}" alt="${esc(essay.imageAlt || `Illustration for ${essay.title}`)}"><div class="container essay-hero-inner"><span class="essay-category">${esc(essay.category || 'Article')}</span><h1>${esc(essay.title)}</h1>${essay.summary ? `<p class="essay-deck">${esc(essay.summary)}</p>` : ''}<div class="essay-meta"><span>Ojobo Agbo Eje</span>${metadata}</div>${tags.length ? `<div class="essay-tags">${tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div>` : ''}</div></section>
  <nav class="breadcrumb-wrap" aria-label="Breadcrumb"><div class="container breadcrumb"><a href="index.html">Home</a><span>/</span><a href="writing.html">Articles</a><span>/</span>${esc(essay.title)}</div></nav>
  <div class="container essay-layout"><aside class="essay-sidebar" aria-label="Article navigation">${outline ? `<div class="essay-rail-block essay-toc"><h2>Contents</h2>${outline}</div>` : ''}${relatedSide}<div class="essay-rail-block"><h2>Share</h2>${shareLinks}</div></aside><article class="article-content essay-body">${essay.lead ? `<div class="essay-brief"><span class="kicker">In brief</span><p>${esc(essay.lead)}</p></div>` : ''}${audio ? `<div class="essay-audio"><span class="kicker">Listen to this article</span><audio controls preload="none" src="${esc(audio)}">Your browser does not support audio playback.</audio></div>` : ''}${outline ? `<details class="essay-mobile-toc"><summary>In this article</summary>${outline}</details>` : ''}${markdown(essay.body)}${sourceUrl ? `<p class="essay-origin">Originally published in <a href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">The AI Catalyst Report ↗</a></p>` : ''}${faq}<section class="essay-conversation"><span class="kicker">Continue the conversation</span><h2>What does this question mean for your organization?</h2><p>If it connects to a problem you are working through, I would be glad to hear from you.</p><a class="button" href="contact.html">Start a conversation →</a></section></article></div>${relatedCards}<section class="essay-author"><div class="container"><img class="essay-author-portrait" src="assets/ojobo-portrait-formal.jpg" alt="Portrait of Ojobo Agbo Eje" loading="lazy"><div><span class="kicker">About the author</span><h2>Ojobo Agbo Eje</h2><p>${esc(siteSettings?.footerBio || 'I work across AI transformation, applied research, and platform development.')}</p><a class="arrow-link" href="about.html">More about me →</a></div><div class="essay-author-links"><a href="reading.html">What I am reading →</a><a href="https://ojoboagboeje.substack.com/" target="_blank" rel="noopener noreferrer">The AI Catalyst Report ↗</a></div></div></section>`;
  return html(essay.title, essay.summary || essay.title, 'essay', main, headExtra);
};
const projectPage = project => {
  const name = esc(project.title);
  const cover = image(project, 'assets/editorial-platform-build.png');
  return html(project.title, project.summary || project.title, 'project-portfolio', `<section class="plain-banner"><div class="container"><span class="eyebrow">Selected build</span><h1>${name}</h1></div></section><div class="breadcrumb-wrap"><div class="container breadcrumb"><a href="index.html">Home</a><span>/</span><a href="build.html">Build</a><span>/</span>${name}</div></div><div class="container inner-layout"><aside class="side-rail"><div class="side-block"><span class="side-title">Projects</span><a href="build.html">All builds</a></div>${sideLinks(project.body) ? `<div class="side-block"><span class="side-title">On this page</span>${sideLinks(project.body)}</div>` : ''}</aside><article class="article-content"><span class="kicker">${esc(project.category)}</span><p class="lead">${esc(project.summary)}</p><figure class="inline-editorial"><img src="${esc(cover)}" alt="${esc(project.imageAlt || `Illustration for ${project.title}`)}" loading="lazy"></figure>${markdown(project.body)}<div class="topic-cta"><span class="kicker">Discuss a project</span><h3>Explore what we could build together</h3><a class="arrow-link" href="contact.html">Start a conversation →</a></div></article></div>`);
};
const researchPage = item => {
  const name = esc(item.title);
  const cover = image(item, 'assets/editorial-data-research.png');
  const source = safeUrl(item.link);
  return html(item.title, item.summary || item.title, 'research', `<section class="plain-banner"><div class="container"><span class="eyebrow">Research</span><h1>${name}</h1></div></section><div class="breadcrumb-wrap"><div class="container breadcrumb"><a href="index.html">Home</a><span>/</span><a href="research.html">Research</a><span>/</span>${name}</div></div><div class="container inner-layout"><aside class="side-rail"><div class="side-block"><span class="side-title">Research</span><a href="research.html">All research</a></div>${sideLinks(item.body) ? `<div class="side-block"><span class="side-title">On this page</span>${sideLinks(item.body)}</div>` : ''}</aside><article class="article-content"><span class="kicker">${esc(item.category)}</span><p class="lead">${esc(item.summary)}</p><figure class="inline-editorial"><img src="${esc(cover)}" alt="${esc(item.imageAlt || `Illustration for ${item.title}`)}" loading="lazy"></figure>${markdown(item.body)}${source ? `<p><a class="arrow-link" href="${esc(source)}">View source or publication ↗</a></p>` : ''}</article></div>`);
};
const unavailablePage = () => '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Page unavailable — Ojobo Agbo Eje</title><link rel="stylesheet" href="site.css"></head><body><main class="container" style="padding:80px 0"><h1>This page is no longer available.</h1><p><a href="index.html">Return to the homepage →</a></p></main></body></html>\n';

const expected = new Map();
for (const essay of content.essays.filter(published)) expected.set(fileForEssay(essay), articlePage(essay));
for (const project of content.projects.filter(item => published(item) && item.detailReady === true && item.body && !item.url && item.id !== 'chedvi')) expected.set(fileForProject(project), projectPage(project));
for (const item of content.research.filter(item => published(item) && item.body)) expected.set(fileForResearch(item), researchPage(item));
let previous = [];
try { previous = JSON.parse(await readFile(manifestPath, 'utf8')); } catch { /* First build. */ }
if (!Array.isArray(previous)) throw new Error('Generated page manifest is invalid.');
for (const name of [...expected.keys(), ...previous]) {
  if (!/^(?:essay(?:-[a-z0-9-]+)?|project-[a-z0-9-]+|research-[a-z0-9-]+)\.html$/.test(name)) throw new Error(`Unsafe generated page path: ${name}`);
}
for (const [name, markup] of expected) {
  const path = join(root, name);
  if (name !== 'essay.html' && !previous.includes(name)) {
    try { await readFile(path, 'utf8'); throw new Error(`Refusing to overwrite an existing non-generated page: ${name}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  await writeFile(path, markup, 'utf8');
}
for (const name of previous.filter(name => !expected.has(name))) await writeFile(join(root, name), unavailablePage(), 'utf8');
const publicContent = { version: content.version, ...Object.fromEntries(kinds.map(kind => [kind, content[kind].filter(published)])) };
await writeFile(join(root, 'content', 'site-content.js'), `window.siteContent = ${JSON.stringify(publicContent, null, 2)};\n`, 'utf8');
await writeFile(manifestPath, JSON.stringify([...expected.keys()], null, 2) + '\n', 'utf8');
const publishRoot = join(root, 'dist');
if (resolve(publishRoot) !== resolve(root, 'dist')) throw new Error('Unexpected publish directory.');
try {
  if ((await lstat(publishRoot)).isSymbolicLink()) throw new Error('Refusing to replace a linked publish directory.');
  await rm(publishRoot, { recursive: true });
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(join(publishRoot, 'content'), { recursive: true });
const cssVersion = createHash('sha256').update(await readFile(join(root, 'site.css'))).update(await readFile(join(root, 'site-conversion.css'))).digest('hex').slice(0, 10);
const siteJsVersion = createHash('sha256').update(await readFile(join(root, 'site.js'))).digest('hex').slice(0, 10);
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (/\.css$/.test(entry.name)) await copyFile(join(root, entry.name), join(publishRoot, entry.name));
  if (/\.html$/.test(entry.name)) {
    const markup = await readFile(join(root, entry.name), 'utf8');
    const edited = await renderEditablePage(root, entry.name, markup);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    const ready = withCleanRoutes(withDiscoveryMetadata(renderListContent(withSiteSettings(edited), entry.name, content, today)
      .replace(/href="site\.css"/g, `href="site.css?v=${cssVersion}"`)
      .replace(/src="site\.js"/g, `src="site.js?v=${siteJsVersion}"`)
      .replace(/href="index\.html(?=[#"])/g, 'href="./'), entry.name));
    await writeFile(join(publishRoot, entry.name), preview ? ready.replace(/<head>/i, '<head><meta name="robots" content="noindex,nofollow">') : withMeasurement(ready), 'utf8');
  }
}
for (const name of ['site.js', 'content-render.js', 'article.js']) await copyFile(join(root, name), join(publishRoot, name));
await copyFile(join(root, 'content', 'site-content.js'), join(publishRoot, 'content', 'site-content.js'));
await cp(join(root, 'assets'), join(publishRoot, 'assets'), { recursive: true });
for (const entry of await readdir(publishRoot, { withFileTypes: true })) {
  if (!entry.isFile() || !/^[a-z0-9-]+\.html$/.test(entry.name) || entry.name === 'index.html') continue;
  const cleanDirectory = join(publishRoot, entry.name.slice(0, -'.html'.length));
  await mkdir(cleanDirectory);
  await copyFile(join(publishRoot, entry.name), join(cleanDirectory, 'index.html'));
}
const publicPages = ['index.html', 'about.html', 'biography.html', 'leadership.html', 'reading.html', 'framework.html', 'build.html', 'project-chedvi.html', 'research.html', 'writing.html', 'speaking.html', 'work-with-me.html', 'training.html', 'contact.html', ...expected.keys()];
if (preview) {
  await writeFile(join(publishRoot, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8');
} else {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(publicPages)].map(name => `  <url><loc>${cleanPath(name)}</loc></url>`).join('\n')}\n</urlset>\n`;
  await writeFile(join(publishRoot, 'sitemap.xml'), sitemap, 'utf8');
  await writeFile(join(publishRoot, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://ojoboagboeje.com/sitemap.xml\n', 'utf8');
}
console.log(`Built ${expected.size} article/project pages and packaged the public website in dist/.`);
