/* Display the content edited in the publishing dashboard. Generated detail pages stay static. */
const siteContent = window.siteContent || { essays: [], projects: [], research: [], events: [], reading: [] };
const live = entries => (Array.isArray(entries) ? entries : []).filter(entry => entry?.status === 'published');
const safeMedia = value => /^(?:https:\/\/[^\s<>"']+|\/?assets\/[\w./-]+)$/i.test(value || '') && !String(value).includes('..') ? value : '';
const safePage = value => /^(?:[a-z0-9-]+\.html|https:\/\/[^\s<>"']+)$/i.test(value || '') ? value : '';
const add = (parent, tag, className, value) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value != null) element.textContent = value;
  parent.append(element);
  return element;
};
const essayLink = item => item.id === 'how-ai-actually-works' ? 'essay.html' : `essay-${item.id}.html`;
const projectLink = item => safePage(item.url) || (item.detailReady && item.body ? `project-${item.id}.html` : '');
const essayCard = item => {
  const card = document.createElement('a');
  card.className = 'editorial-card';
  card.href = essayLink(item);
  const img = add(card, 'img');
  img.src = safeMedia(item.image) || 'assets/editorial-ai-literacy.png';
  img.alt = item.imageAlt || `Illustration for ${item.title}`;
  img.loading = 'lazy';
  const copy = add(card, 'div', 'editorial-card-copy');
  add(copy, 'span', 'kicker', item.category || 'Article');
  add(copy, 'h3', '', item.title);
  add(copy, 'p', '', item.summary || '');
  add(copy, 'span', 'editorial-card-action', 'Read article →');
  return card;
};
const projectCard = (item, home = false) => {
  const href = projectLink(item) || (home ? 'build.html' : '');
  const card = document.createElement(href ? 'a' : 'div');
  card.className = 'card';
  if (href) card.href = href;
  const cover = add(card, 'div', `card-image photo${item.id === 'chedvi' ? ' chedvi-card-shot' : ''}`);
  const img = add(cover, 'img');
  img.src = safeMedia(item.image) || 'assets/editorial-platform-build.png';
  img.alt = item.imageAlt || `Illustration for ${item.title}`;
  img.loading = 'lazy';
  const copy = add(card, 'div', 'card-content');
  add(copy, 'span', 'card-type', item.category || 'Project');
  add(copy, 'h3', '', item.title);
  add(copy, 'p', '', item.summary || '');
  add(copy, 'span', 'arrow-link', href ? 'View project →' : 'More details to come');
  return card;
};
const essayItems = live(siteContent.essays);
const projectItems = live(siteContent.projects);
for (const container of document.querySelectorAll('[data-content-list]')) {
  const type = container.dataset.contentList;
  if (type === 'essays-home' || type === 'essays') {
    const evergreen = [...container.children].filter(child => child.matches('a[href="framework.html"],a[href="research.html"]'));
    const selected = type === 'essays-home' ? essayItems.filter(item => item.featured).slice(0, 3) : essayItems;
    container.replaceChildren(...selected.map(essayCard), ...evergreen);
  }
  if (type === 'projects-home' || type === 'projects') {
    const selected = type === 'projects-home' ? projectItems.filter(item => item.featured).slice(0, 3) : projectItems;
    container.replaceChildren(...selected.map(item => projectCard(item, type === 'projects-home')));
  }
  if (type === 'reading') {
    const items = live(siteContent.reading);
    const feature = document.querySelector('[data-reading-feature]');
    const note = document.querySelector('.shelf-note');
    container.replaceChildren();
    feature?.replaceChildren();
    if (!items.length) {
      if (note) note.textContent = 'Personal reading notes will appear here as they are published.';
      if (feature) add(feature, 'p', 'reading-empty', 'The first featured note is coming soon.');
      add(container, 'p', 'reading-empty', 'No reading-room entries have been published yet.');
      continue;
    }
    note?.remove();
    const featured = items.find(item => item.featured) || items[0];
    if (feature) {
      const cover = add(feature, 'div', 'book-cover cover-evidence');
      if (safeMedia(featured.image)) { const img = add(cover, 'img'); img.src = featured.image; img.alt = featured.imageAlt || `Cover for ${featured.title}`; }
      else add(cover, 'span', '', featured.title);
      const copy = add(feature, 'div');
      add(copy, 'span', 'kicker', featured.category || 'Reading note');
      add(copy, 'h3', '', featured.title);
      add(copy, 'p', '', featured.summary || '');
      if (safePage(featured.link)) { const link = add(copy, 'a', 'arrow-link', 'Explore reference ↗'); link.href = featured.link; }
    }
    for (const item of items.filter(item => item !== featured)) {
      const entry = add(container, 'div', 'book-entry');
      const cover = add(entry, 'div', 'book-cover cover-evidence');
      if (safeMedia(item.image)) { const img = add(cover, 'img'); img.src = item.image; img.alt = item.imageAlt || `Cover for ${item.title}`; }
      else add(cover, 'span', '', item.title);
      add(entry, 'span', 'kicker', item.category || 'Reading note');
      add(entry, 'h3', '', item.title);
      add(entry, 'p', '', item.summary || '');
      if (safePage(item.link)) { const link = add(entry, 'a', 'arrow-link', 'Explore reference ↗'); link.href = item.link; }
    }
  }
}
const researchItems = live(siteContent.research);
const themes = document.querySelector('#themes');
if (themes && researchItems.length) {
  const list = themes.nextElementSibling;
  if (list) {
    const section = document.createElement('section');
    section.className = 'research-outputs';
    add(section, 'h2', '', 'Research outputs');
    const grid = add(section, 'div', 'reading-list');
    for (const item of researchItems) {
      const href = item.body ? `research-${item.id}.html` : safePage(item.link);
      const card = add(grid, 'div', 'reading-item');
      if (safeMedia(item.image)) { const img = add(card, 'img', 'research-thumb'); img.src = item.image; img.alt = item.imageAlt || `Illustration for ${item.title}`; img.loading = 'lazy'; }
      add(card, 'span', 'kicker', item.category || 'Research');
      add(card, 'h3', '', item.title);
      add(card, 'p', '', item.summary || '');
      if (href) { const link = add(card, 'a', 'arrow-link', 'Read more →'); link.href = href; }
    }
    list.after(section);
  }
}
