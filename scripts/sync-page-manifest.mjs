import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Keep the hand-editable field catalog aligned with page markers after a layout change.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'content', 'pages', 'manifest.json');
const manifest = JSON.parse(await readFile(path, 'utf8'));
for (const page of manifest) {
  const html = await readFile(join(root, page.filename), 'utf8');
  const markers = new Set([...html.matchAll(/data-edit-(?:text|image|background)="([\w_]+)"/g)].map(match => match[1]));
  page.fields = page.fields.filter(field =>
    ['seoTitle', 'seoDescription'].includes(field.key) || markers.has(field.key) ||
    (field.key.endsWith('_alt') && markers.has(field.key.slice(0, -4))));
}
await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log('Synchronized page field manifest.');
