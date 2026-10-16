const page = document.body.dataset.page || 'home';
const links = [
  ['about', 'About', 'about.html'],
  ['framework', 'Transformation', 'framework.html'],
  ['build', 'Build', 'build.html'],
  ['research', 'Research', 'research.html'],
  ['writing', 'Writing', 'writing.html'],
  ['speaking', 'Speaking', 'speaking.html']
];
const active = { biography:'about', leadership:'about', reading:'about', 'project-chedvi':'build', essay:'writing' }[page] || page;
const header = document.querySelector('[data-header]');
if (header) header.innerHTML = `<a class="wordmark" href="index.html">Ojobo Agbo Eje</a><nav id="primary-nav" aria-label="Primary navigation">${links.map(([key,label,url]) => `<a href="${url}" ${active === key ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav><div class="nav-tools"><a class="icon-link" href="search.html" aria-label="Search">⌕</a><a class="icon-link" href="contact.html" aria-label="Contact">✉</a><a class="nav-contact" href="contact.html">Get in touch</a><button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="primary-nav">☰</button></div>`;
const menu = document.querySelector('.menu-toggle');
const topicMenus = {
  framework: [['My take','#my-take'],['Framework','#sequence'],['Use cases','#use-cases'],['Selected work','build.html'],['Questions','#questions']],
  build: [['My take','#my-take'],['Projects','#projects'],['How I build','#approach'],['Research','research.html'],['Questions','#questions']],
  research: [['My take','#my-take'],['Themes','#themes'],['Applied work','#translation'],['Writing','writing.html'],['Questions','#questions']]
};
if (header && topicMenus[page]) {
  const topicNav = document.createElement('nav');
  topicNav.className = 'topic-nav';
  topicNav.setAttribute('aria-label', `${page === 'framework' ? 'Transformation' : page === 'build' ? 'Build' : 'Research'} sections`);
  topicNav.innerHTML = `<div class="container topic-nav-inner"><span class="topic-nav-label">Explore this topic</span>${topicMenus[page].map(([label,url]) => `<a href="${url}">${label}</a>`).join('')}</div>`;
  header.after(topicNav);
  const localLinks = [...topicNav.querySelectorAll('a[href^="#"]')];
  const sections = localLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) localLinks.forEach(link => link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`));
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
const footer = document.querySelector('[data-footer]');
if (footer) footer.innerHTML = `<div class="container"><div class="footer-grid"><div><h3>About me</h3><p>I work across AI transformation, applied research, and platform development. The aim is to help organizations redesign work around real problems and build the capability to sustain change.</p><a href="about.html">Read about my work →</a></div><div><h4>Explore</h4><a href="framework.html">AI transformation</a><a href="build.html">Technical projects</a><a href="research.html">Research</a><a href="writing.html">Articles & audio</a><a href="speaking.html">Speaking & events</a><a href="reading.html">Reading room</a></div><div><h4>Connect</h4><a href="contact.html">Start a conversation</a><a href="https://ojoboagboeje.substack.com/" target="_blank" rel="noopener noreferrer">The AI Catalyst Report ↗</a><a href="https://chedvi.onrender.com/" target="_blank" rel="noopener noreferrer">Explore CHEDVI ↗</a></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} Ojobo Agbo Eje</span><span>AI transformation · Research · Applied technology</span><a href="#top">Back to top ↑</a></div></div>`;
document.querySelector('[data-question-nav]')?.addEventListener('change', event => {
  if (event.target.value) location.href = event.target.value;
});
const siteEvents = Array.isArray(window.siteContent?.events) ? window.siteContent.events : (Array.isArray(window.siteEvents) ? window.siteEvents : []);
const now = new Date();
const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
const eventIsPublished = event => event && event.title && /^\d{4}-\d{2}-\d{2}$/.test(event.date || '') && event.status !== 'draft';
const upcomingEvents = siteEvents.filter(event => eventIsPublished(event) && (event.status === 'upcoming' || (event.status === 'published' && event.date >= today)));
const pastEvents = siteEvents.filter(event => eventIsPublished(event) && (event.status === 'past' || (event.status === 'published' && event.date < today)));
const eventDate = value => {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
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
  addText(copy, 'p', 'event-meta', [eventDate(event.date), event.event, event.place].filter(Boolean).join(' · '));
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
    const copy = document.createElement('div');
    addText(copy, 'span', 'kicker', [event.role || 'Speaking', eventDate(event.date)].join(' · '));
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
    ['About Ojobo', 'about.html', 'Biography and approach'],
    ['AI Transformation Framework', 'framework.html', 'Problem, process, use case, skills, technology, culture'],
    ['Selected builds', 'build.html', 'Platforms and technical portfolio'],
    ['CHEDVI', 'project-chedvi.html', 'Camden Health Equity Data Visualization Initiative'],
    ['Research', 'research.html', 'AI readiness, healthcare, public interest'],
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
    const matched = items.filter(i => i.join(' ').toLowerCase().includes(q));
    results.replaceChildren();
    if (!matched.length) { addText(results, 'p', '', 'No matching pages yet.'); return; }
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
