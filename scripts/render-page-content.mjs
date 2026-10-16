import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const imagePath = value => {
  const path = String(value ?? '').trim();
  if (path.includes('..') || !/^(?:assets\/[\w./%-]+|https:\/\/[\w./%?=&-]+)$/.test(path)) throw new Error(`Unsafe page image path: ${path}`);
  return path;
};
const setAttribute = (tag, name, value) => {
  const escaped = escapeHtml(value);
  const pattern = new RegExp(`\\b${name}="[^"]*"`, 'i');
  return pattern.test(tag) ? tag.replace(pattern, `${name}="${escaped}"`) : tag.replace(/>$/, ` ${name}="${escaped}">`);
};

export async function renderEditablePage(root, filename, markup) {
  let manifest;
  try { manifest = JSON.parse(await readFile(join(root, 'content', 'pages', 'manifest.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return markup; throw error; }
  const page = manifest.find(item => item.filename === filename);
  if (!page) return markup;
  const data = JSON.parse(await readFile(join(root, 'content', 'pages', `${page.slug}.json`), 'utf8'));
  for (const field of page.fields) {
    if (typeof data[field.key] !== 'string') throw new Error(`${page.slug}: missing ${field.key}`);
  }
  const found = new Set();
  let result = markup.replace(/(<([a-z][\w:-]*)\b[^>]*\bdata-edit-text="(text_\d+)"[^>]*>)([^<]*)(<\/\2>)/gi, (whole, start, tag, key, oldText, end) => {
    found.add(key);
    return `${start}${escapeHtml(data[key])}${end}`;
  });
  result = result.replace(/<img\b[^>]*\bdata-edit-image="(image_\d+)"[^>]*>/gi, (tag, key) => {
    found.add(key);
    found.add(`${key}_alt`);
    return setAttribute(setAttribute(tag, 'src', imagePath(data[key])), 'alt', data[`${key}_alt`]);
  });
  result = result.replace(/<(?:section|div)\b[^>]*\bdata-edit-background="(heroImage)"[^>]*>/gi, (tag, key) => {
    found.add(key);
    return setAttribute(tag, 'style', `background-image:url('${imagePath(data[key])}')`);
  });
  for (const field of page.fields.filter(item => !['seoTitle', 'seoDescription'].includes(item.key))) {
    if (!found.has(field.key)) throw new Error(`${page.slug}: edit marker for ${field.key} is missing`);
  }
  result = result.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(data.seoTitle)}</title>`);
  result = result.replace(/<meta\s+name="description"\s+content="[^"]*"/i, `<meta name="description" content="${escapeHtml(data.seoDescription)}"`);
  return result;
}
