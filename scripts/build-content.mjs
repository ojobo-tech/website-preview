import { copyFile, cp, lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderEditablePage } from './render-page-content.mjs';
import { renderListContent } from './render-list-content.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentPath = join(root, 'content', 'site-content.json');
const manifestPath = join(root, 'content', 'generated-pages.json');
const content = JSON.parse(await readFile(contentPath, 'utf8'));
const preview = process.env.SITE_PREVIEW === 'true';
let siteSettings = null;
try {
  siteSettings = JSON.parse(await readFile(join(root, 'content', 'site-settings.json'), 'utf8'));
  for (const key of ['wordmark', 'contactButton', 'footerHeading', 'footerBio', 'footerTagline']) {
    if (typeof siteSettings[key] !== 'string') throw new Error(`Site setting ${key} is missing.`);
  }
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const siteSettingsScript = siteSettings ? `<script>window.siteSettings=${JSON.stringify(siteSettings).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')};</script>` : '';
const withSiteSettings = markup => siteSettingsScript ? markup.replace(/<script src="site\.js" defer><\/script>/i, `${siteSettingsScript}<script src="site.js" defer></script>`) : markup;
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
  const flush = () => {
    if (paragraph.length) { chunks.push(`<p>${inline(paragraph.join(' '))}</p>`); paragraph = []; }
    if (list.length) { chunks.push(`<ul>${list.map(item => `<li>${inline(item)}</li>`).join('')}</ul>`); list = []; }
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { flush(); continue; }
    const heading = /^(#{2,3})\s+(.+)$/.exec(trimmed);
    if (heading) { flush(); const level = heading[1].length; chunks.push(`<h${level} id="${esc(headingId(heading[2]))}">${inline(heading[2])}</h${level}>`); continue; }
    if (trimmed.startsWith('> ')) { flush(); chunks.push(`<blockquote>${inline(trimmed.slice(2))}</blockquote>`); continue; }
    if (trimmed.startsWith('- ')) { if (paragraph.length) flush(); list.push(trimmed.slice(2)); continue; }
    if (list.length) flush();
    paragraph.push(trimmed);
  }
  flush();
  return chunks.join('\n');
};
const sideLinks = body => [...String(body ?? '').matchAll(/^##\s+(.+)$/gm)].map(([, label]) => `<a href="#${esc(headingId(label))}">${esc(label)}</a>`).join('');
const image = (item, fallback) => safeUrl(item.image) || fallback;
const html = (title, description, page, main) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(description)}"><title>${esc(title)} — Ojobo Agbo Eje</title><link rel="stylesheet" href="site.css"><script src="site.js" defer></script></head>
<body id="top" data-page="${page}"><header class="site-header" data-header></header><main>${main}</main><footer class="footer-main" data-footer></footer></body></html>
`;
const articlePage = essay => {
  const name = esc(essay.title);
  const body = markdown(essay.body);
  const audio = safeUrl(essay.audio);
  const lead = essay.lead || essay.summary;
  const cover = image(essay, 'assets/editorial-ai-literacy.png');
  return html(essay.title, essay.summary || essay.title, 'essay', `<section class="plain-banner"><div class="container"><span class="eyebrow">Article</span><h1>${name}</h1></div></section><div class="breadcrumb-wrap"><div class="container breadcrumb"><a href="index.html">Home</a><span>/</span><a href="writing.html">Writing</a><span>/</span>${name}</div></div><div class="container inner-layout"><aside class="side-rail"><div class="side-block"><span class="side-title">Writing</span><a href="writing.html">All articles</a><a href="https://ojoboagboeje.substack.com/">Newsletter ↗</a></div>${sideLinks(essay.body) ? `<div class="side-block"><span class="side-title">On this page</span>${sideLinks(essay.body)}</div>` : ''}</aside><article class="article-content"><div class="meta-line"><span>Ojobo Agbo Eje</span><span>${esc(essay.category)}</span>${essay.readMinutes ? `<span>${esc(essay.readMinutes)} min read</span>` : ''}</div><p class="lead">${esc(lead)}</p><figure class="inline-editorial"><img src="${esc(cover)}" alt="${esc(essay.imageAlt || `Illustration for ${essay.title}`)}" loading="lazy"></figure>${audio ? `<div class="article-audio"><span class="kicker">Listen to this article</span><audio controls preload="none" src="${esc(audio)}">Your browser does not support audio playback.</audio></div>` : ''}${body}</article></div>`);
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
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (/\.css$/.test(entry.name)) await copyFile(join(root, entry.name), join(publishRoot, entry.name));
  if (/\.html$/.test(entry.name)) {
    const markup = await readFile(join(root, entry.name), 'utf8');
    const edited = await renderEditablePage(root, entry.name, markup);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    const ready = renderListContent(withSiteSettings(edited), entry.name, content, today);
    await writeFile(join(publishRoot, entry.name), preview ? ready.replace(/<head>/i, '<head><meta name="robots" content="noindex,nofollow">') : ready, 'utf8');
  }
}
for (const name of ['site.js', 'content-render.js']) await copyFile(join(root, name), join(publishRoot, name));
await copyFile(join(root, 'content', 'site-content.js'), join(publishRoot, 'content', 'site-content.js'));
await cp(join(root, 'assets'), join(publishRoot, 'assets'), { recursive: true });
const publicPages = ['index.html', 'about.html', 'biography.html', 'leadership.html', 'reading.html', 'framework.html', 'build.html', 'project-chedvi.html', 'research.html', 'writing.html', 'speaking.html', 'contact.html', ...expected.keys()];
if (preview) {
  await writeFile(join(publishRoot, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8');
} else {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(publicPages)].map(name => `  <url><loc>https://ojoboagboeje.com/${esc(name)}</loc></url>`).join('\n')}\n</urlset>\n`;
  await writeFile(join(publishRoot, 'sitemap.xml'), sitemap, 'utf8');
  await writeFile(join(publishRoot, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://ojoboagboeje.com/sitemap.xml\n', 'utf8');
}
console.log(`Built ${expected.size} article/project pages and packaged the public website in dist/.`);
