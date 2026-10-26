const page = document.body.dataset.page || 'home';
const siteSettings = window.siteSettings || {};
const cleanText = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const links = [
  ['start', 'Start here', 'start-here.html'],
  ['framework', 'Transformation', 'framework.html'],
  ['build', 'AI solutions', 'build.html'],
  ['training', 'AI training', 'training.html'],
  ['speaking', 'Speaking', 'speaking.html'],
  ['writing', 'Writing', 'writing.html'],
  ['about', 'About', 'about.html']
];
const active = { biography:'about', leadership:'about', reading:'about', 'project-chedvi':'build', essay:'writing' }[page] || page;
const main = document.querySelector('main');
if (main) {
  main.id ||= 'main-content';
  main.setAttribute('tabindex', '-1');
  const skip = document.createElement('a');
  skip.className = 'skip-link';
  skip.href = '#main-content';
  skip.textContent = 'Skip to main content';
  document.body.prepend(skip);
}
const header = document.querySelector('[data-header]');
if (location.pathname.endsWith('.html')) history.replaceState(null, '', `${location.pathname.replace(/\/([a-z0-9-]+)\.html$/, (_, slug) => slug === 'index' ? '/' : `/${slug}/`)}${location.search}${location.hash}`);
if (header) header.innerHTML = `<a class="wordmark" href="./">${cleanText(siteSettings.wordmark || 'Ojobo Agbo Eje')}</a><nav id="primary-nav" aria-label="Primary navigation">${links.map(([key,label,url]) => `<a href="${url}" ${active === key ? 'aria-current="page"' : ''}>${label}</a>`).join('')}<a class="mobile-nav-action" href="work-with-me.html" ${page === 'work' ? 'aria-current="page"' : ''}>Work with me</a><a class="mobile-nav-action" href="contact.html" ${page === 'contact' ? 'aria-current="page"' : ''}>Contact</a></nav><div class="nav-tools"><a class="icon-link" href="search.html" aria-label="Search">⌕</a><a class="icon-link" href="contact.html" aria-label="Contact">✉</a><a class="nav-contact" href="work-with-me.html" ${page === 'work' ? 'aria-current="page"' : ''}>${cleanText(siteSettings.contactButton || 'Work with me')}</a><button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="primary-nav">☰</button></div>`;
const menu = document.querySelector('.menu-toggle');
const topicMenus = {
  framework: [['My take','#my-take'],['Framework','#sequence'],['Use cases','#use-cases'],['Selected work','build.html'],['Questions','#questions']],
  build: [['Solutions','build.html'],['Selected work','#projects'],['Questions','#questions'],['Discuss a solution','contact.html']],
  research: [['Why evidence matters','#my-take'],['Themes','#themes'],['Applied work','#translation'],['Writing','writing.html'],['Questions','#questions']],
  work: [['Transformation','#transformation'],['Build','#build'],['Training','#training'],['Speaking','#speaking'],['Get in touch','contact.html#choose-a-conversation']]
};
if (header && topicMenus[page]) {
  const topicNav = document.createElement('nav');
  topicNav.className = 'topic-nav';
  topicNav.setAttribute('aria-label', `${page === 'framework' ? 'Transformation' : page === 'build' ? 'Build' : page === 'research' ? 'Evidence' : 'Work with me'} sections`);
  topicNav.innerHTML = `<div class="container topic-nav-inner"><span class="topic-nav-label">Explore this topic</span>${topicMenus[page].map(([label,url]) => `<a href="${url}">${label}</a>`).join('')}</div>`;
  header.after(topicNav);
  const localLinks = [...topicNav.querySelectorAll('a[href^="#"]')];
  const sections = localLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) localLinks.forEach(link => link.classList.toggle('is-active', link.hash === `#${entry.target.id}`));
      });
    }, { rootMargin: '-115px 0px -65% 0px' });
    sections.forEach(section => observer.observe(section));
  }
}
menu?.addEventListener('click', () => {
  const open = document.querySelector('#primary-nav').classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menu.textContent = open ? '×' : '☰';
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.querySelector('#primary-nav')?.classList.contains('open')) menu?.click();
});
const footer = document.querySelector('[data-footer]');
if (footer) footer.innerHTML = `<div class="container"><div class="footer-grid"><div><h3>${cleanText(siteSettings.footerHeading || 'What I do')}</h3><p>${cleanText(siteSettings.footerBio || 'I help organizations find valuable AI use cases, redesign work, implement solutions, and train teams.')}</p><a href="about.html">Read about my work →</a></div><div><h4>Explore</h4><a href="start-here.html">Find your AI starting point</a><a href="work-with-me.html">Work with me</a><a href="framework.html">AI transformation</a><a href="build.html">AI solutions</a><a href="training.html">AI training</a><a href="speaking.html">Speaking & events</a><a href="writing.html">Articles & audio</a><a href="research.html">Evidence & publications</a><a href="reading.html">Reading room</a></div><div><h4>Connect</h4><a href="contact.html">Start a conversation</a><a href="https://ojoboagboeje.substack.com/" target="_blank" rel="noopener noreferrer">The AI Catalyst Report ↗</a><a href="https://chedvi.onrender.com/" target="_blank" rel="noopener noreferrer">Explore CHEDVI ↗</a></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} ${cleanText(siteSettings.wordmark || 'Ojobo Agbo Eje')}</span><span>${cleanText(siteSettings.footerTagline || 'AI transformation · Implementation · Training')}</span><a href="#top">Back to top ↑</a></div></div>`;
if (footer) {
  const connect = footer.querySelector('.footer-grid > div:last-child');
  const share = document.createElement('button');
  share.type = 'button';
  share.className = 'footer-share';
  share.textContent = 'Copy this page link ↗';
  const status = document.createElement('span');
  status.className = 'footer-share-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  connect?.append(share, status);
  share.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(new URL(location.pathname, location.origin).href);
      status.textContent = 'Link copied. You can share it anywhere.';
    } catch {
      status.textContent = 'Copy the link from your browser address bar.';
    }
  });
}
document.querySelector('[data-question-nav]')?.addEventListener('change', event => {
  if (event.target.value) location.href = new URL(event.target.value, document.baseURI).href;
});
const siteRoot = new URL(document.querySelector('base')?.href || './', location.href);
const normalizeRoute = value => {
  const page = /^([a-z0-9-]+)\.html(#[^\s]*)?$/i.exec(value);
  if (page) return new URL(`${page[1] === 'index' ? '' : `${page[1]}/`}${page[2] || ''}`, siteRoot).pathname + (page[2] || '');
  if (value.startsWith('#') && value.length > 1) return `${location.pathname}${value}`;
  return value;
};
const normalizeLinks = root => {
  const elements = root.matches?.('a[href], option[value]') ? [root, ...root.querySelectorAll('a[href], option[value]')] : root.querySelectorAll('a[href], option[value]');
  for (const element of elements) {
    const attribute = element.tagName === 'OPTION' ? 'value' : 'href';
    const current = element.getAttribute(attribute);
    if (current) {
      const normalized = normalizeRoute(current);
      if (normalized !== current) element.setAttribute(attribute, normalized);
    }
  }
};
document.addEventListener('DOMContentLoaded', () => {
  normalizeLinks(document);
  new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') normalizeLinks(mutation.target);
      else for (const node of mutation.addedNodes) if (node.nodeType === 1) normalizeLinks(node);
    }
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['href', 'value'] });
});
const siteEvents = Array.isArray(window.siteContent?.events) ? window.siteContent.events : (Array.isArray(window.siteEvents) ? window.siteEvents : []);
const now = new Date();
const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
const eventIsPublished = event => event && event.title && /^\d{4}-\d{2}-\d{2}$/.test(event.date || '') && event.status !== 'draft';
const eventEnd = event => /^\d{4}-\d{2}-\d{2}$/.test(event.endDate || '') && event.endDate > event.date ? event.endDate : event.date;
const upcomingEvents = siteEvents.filter(event => eventIsPublished(event) && (event.status === 'upcoming' || (event.status === 'published' && eventEnd(event) >= today))).sort((a,b) => a.date.localeCompare(b.date));
const pastEvents = siteEvents.filter(event => eventIsPublished(event) && (event.status === 'past' || (event.status === 'published' && eventEnd(event) < today))).sort((a,b) => b.date.localeCompare(a.date));
const eventDate = value => {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
};
const eventDateRange = event => {
  if (eventEnd(event) === event.date) return eventDate(event.date);
  const start = new Date(`${event.date}T12:00:00`);
  const end = new Date(`${event.endDate}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return eventDate(event.date);
  if (event.date.slice(0, 7) === event.endDate.slice(0, 7)) return `${start.toLocaleDateString('en-US', { month:'long', day:'numeric' })}–${end.getDate()}, ${end.getFullYear()}`;
  return `${eventDate(event.date)}–${eventDate(event.endDate)}`;
};
const eventImage = value => typeof value === 'string' && /^(?:\/?assets\/[-\w./]+|https:\/\/[^\s<>"']+)$/.test(value) && !value.includes('..') ? value : 'assets/editorial-speaking-stage.png';
const eventUrl = value => typeof value === 'string' && /^https:\/\//.test(value) ? value : 'speaking.html';
const addText = (parent, tag, className, value) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = value || '';
  parent.append(element);
  return element;
};
const makeEventSlide = event => {
  const slide = document.createElement('article');
  slide.className = 'speaking-slide';
  slide.setAttribute('data-speaking-slide', '');
  const visual = document.createElement('div');
  visual.className = 'speaking-slide-visual';
  const img = document.createElement('img');
  img.src = eventImage(event.image);
  img.alt = event.imageAlt || 'Illustrative image for this speaking event';
  img.loading = 'lazy';
  visual.append(img);
  const copy = document.createElement('div');
  copy.className = 'speaking-slide-copy';
  addText(copy, 'span', 'kicker', event.role || 'Upcoming appearance');
  addText(copy, 'h3', '', event.title);
  addText(copy, 'p', 'event-meta', [eventDateRange(event), event.event, event.place].filter(Boolean).join(' · '));
  if (event.description) addText(copy, 'p', '', event.description);
  const link = addText(copy, 'a', 'arrow-link', event.url ? 'Event details →' : 'Speaking & events →');
  link.href = eventUrl(event.url);
  if (event.url && link.href !== location.href && link.href.startsWith('https://')) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  slide.append(visual, copy);
  return slide;
};
const carousel = document.querySelector('[data-speaking-carousel]');
if (carousel) {
  const track = carousel.querySelector('[data-speaking-track]');
  if (upcomingEvents.length) track.replaceChildren(...upcomingEvents.map(makeEventSlide));
  const slides = [...track.querySelectorAll('[data-speaking-slide]')];
  const dots = carousel.querySelector('[data-speaking-dots]');
  let index = 0;
  slides.forEach((_, item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Show speaking slide ${item + 1}`);
    button.addEventListener('click', () => { index = item; showSlide(); });
    dots.append(button);
  });
  const showSlide = () => {
    slides.forEach((slide, item) => {
      slide.hidden = item !== index;
      slide.setAttribute('aria-hidden', String(item !== index));
    });
    [...dots.children].forEach((dot, item) => dot.setAttribute('aria-current', String(item === index)));
  };
  const controls = carousel.querySelector('[data-speaking-controls]');
  if (slides.length < 2) controls.hidden = true;
  carousel.querySelector('[data-speaking-prev]')?.addEventListener('click', () => { index = (index - 1 + slides.length) % slides.length; showSlide(); });
  carousel.querySelector('[data-speaking-next]')?.addEventListener('click', () => { index = (index + 1) % slides.length; showSlide(); });
  if (slides.length) showSlide();
}
for (const status of ['upcoming','past']) {
  const list = document.querySelector(`[data-event-list="${status}"]`);
  const events = status === 'upcoming' ? upcomingEvents : pastEvents;
  if (!list || !events.length) continue;
  if (status === 'past') document.querySelector('[data-past-section]').hidden = false;
  list.replaceChildren(...events.map(event => {
    const card = document.createElement('article');
    card.className = 'event-list-card';
    const img = document.createElement('img');
    img.src = eventImage(event.image);
    img.alt = event.imageAlt || 'Illustrative image for this speaking event';
    img.loading = 'lazy';
    if (event.imageFit === 'contain') img.className = 'event-image-contain';
    const copy = document.createElement('div');
    addText(copy, 'span', 'kicker', [event.role || 'Appearance', eventDateRange(event)].join(' · '));
    addText(copy, 'h3', '', event.title);
    addText(copy, 'p', 'event-meta', [event.event, event.place].filter(Boolean).join(' · '));
    if (event.description) addText(copy, 'p', '', event.description);
    if (event.url) {
      const link = addText(copy, 'a', 'arrow-link', 'Event details →');
      link.href = eventUrl(event.url);
      if (link.href.startsWith('https://')) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    }
    card.append(img, copy);
    return card;
  }));
}
const search = document.querySelector('[data-search]');
if (search) {
  const items = [
    ['Start here', 'start-here.html', 'Find your AI starting point and a practical path to value'],
    ['About Ojobo', 'about.html', 'Biography and approach'],
    ['Work with me', 'work-with-me.html', 'AI transformation, building, training and speaking'],
    ['AI training & capability', 'training.html', 'AI literacy, use cases and team workshops'],
    ['AI Transformation Framework', 'framework.html', 'Problem, process, use case, skills, technology, culture'],
    ['Selected builds', 'build.html', 'Platforms and technical portfolio'],
    ['CHEDVI', 'project-chedvi.html', 'Camden Health Equity Data Visualization Initiative'],
    ['Evidence & publications', 'research.html', 'AI readiness, healthcare, public interest'],
    ['Writing', 'writing.html', 'Articles, briefings and audio'],
    ['Reading room', 'reading.html', 'Books, papers and ideas'],
    ['Speaking & events', 'speaking.html', 'Upcoming appearances and speaking topics'],
    ['Contact', 'contact.html', 'Work together']
  ];
  for (const essay of (window.siteContent?.essays || []).filter(item => item.status === 'published')) {
    const url = essay.id === 'how-ai-actually-works' ? 'essay.html' : `essay-${essay.id}.html`;
    items.push([essay.title, url, essay.summary || essay.category || 'Article']);
  }
  for (const project of (window.siteContent?.projects || []).filter(item => item.status === 'published' && item.id !== 'chedvi')) {
    const url = /^[a-z0-9-]+\.html$/.test(project.url || '') ? project.url : project.detailReady && project.body ? `project-${project.id}.html` : 'build.html';
    items.push([project.title, url, project.summary || 'Technical project']);
  }
  for (const item of (window.siteContent?.research || []).filter(item => item.status === 'published')) {
    const url = item.body ? `research-${item.id}.html` : (/^https:\/\/[^\s<>"']+$/.test(item.link || '') ? item.link : 'research.html');
    items.push([item.title, url, item.summary || 'Research']);
  }
  for (const note of (window.siteContent?.reading || []).filter(item => item.status === 'published')) items.push([note.title, 'reading.html', note.summary || 'Reading room']);
  const results = document.querySelector('[data-results]');
  const render = () => {
    const q = search.value.trim().toLowerCase();
    const matched = q ? items.filter(i => i.join(' ').toLowerCase().includes(q)) : items.slice(0, 6);
    results.replaceChildren();
    const status = document.querySelector('[data-search-status]');
    if (status) status.textContent = q ? `${matched.length} ${matched.length === 1 ? 'result' : 'results'} for “${search.value.trim()}”` : 'Popular starting points';
    if (!matched.length) { addText(results, 'p', '', 'No matches. Try a broader term such as AI, training, research, or speaking.'); return; }
    for (const [title, url, desc] of matched) {
      const row = document.createElement('a');
      row.className = 'article-row';
      row.href = url;
      const copy = document.createElement('div');
      addText(copy, 'h3', '', title);
      addText(copy, 'p', '', desc);
      row.append(copy);
      addText(row, 'span', 'meta', 'OPEN →');
      results.append(row);
    }
  };
  search.addEventListener('input', render);
  render();
}

// Reveal structural highlights across the site, never the paragraphs of an article.
// With JavaScript disabled, unsupported observers, or reduced motion, content stays visible.
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const homeTargets = '.home-offers .section-heading, .home-offers .offer-card, .project-showcase .section-heading, .project-showcase .card';
  const innerTargets = '.service-detail, .project-list .card, .editorial-grid .editorial-card, .speaking-topic-grid article, .event-list-card, .reading-list .reading-item, .contact-route-grid > a, .training-format-grid > *, .training-principle-grid > *, .essay-related-card, .evidence-card, .inner-layout > .article-content > h2, .inner-layout > .article-content > .lead, .article-content > .inline-editorial, .article-content > .topic-cta, .article-content > .contact-card, .case-facts > *, .case-feature-list > *';
  const revealTargets = document.querySelectorAll(page === 'home' ? homeTargets : innerTargets);
  const revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
  revealTargets.forEach((target, index) => {
    if (page !== 'home') {
      target.classList.add('site-motion-target');
      target.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 65}ms`);
    }
    revealObserver.observe(target);
  });
}

// A small page-progress indicator helps readers orient themselves in long essays.
if (page === 'essay') {
  const progress = document.createElement('div');
  progress.className = 'reading-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);
  let progressQueued = false;
  const updateProgress = () => {
    const total = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    progress.style.transform = `scaleX(${Math.min(1, Math.max(0, window.scrollY / total))})`;
    progressQueued = false;
  };
  const queueProgress = () => {
    if (progressQueued) return;
    progressQueued = true;
    requestAnimationFrame(updateProgress);
  };
  window.addEventListener('scroll', queueProgress, { passive: true });
  window.addEventListener('resize', queueProgress);
  queueProgress();
}
