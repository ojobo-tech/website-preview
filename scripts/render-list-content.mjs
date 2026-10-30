const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
const asset = value => /^assets\/[\w./-]+$/.test(value || '') && !value.includes('..') ? value : '';
const external = value => /^https:\/\/[^\s<>"']+$/.test(value || '') ? value : '';
const dateIsValid = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
const datePart = (value, options) => new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', ...options });
export const eventDateRange = item => {
  if (!dateIsValid(item.date)) return '';
  if (!dateIsValid(item.endDate) || item.endDate <= item.date) return datePart(item.date, { month:'long', day:'numeric', year:'numeric' });
  const sameMonth = item.date.slice(0, 7) === item.endDate.slice(0, 7);
  const start = datePart(item.date, { month:'long', day:'numeric', ...(sameMonth ? {} : { year:'numeric' }) });
  const end = sameMonth ? `${Number(item.endDate.slice(8))}, ${item.endDate.slice(0, 4)}` : datePart(item.endDate, { month:'long', day:'numeric', year:'numeric' });
  return `${start}–${end}`;
};
const cover = item => {
  const src = asset(item.image);
  return src ? `<div class="book-cover cover-evidence"><img src="${esc(src)}" alt="${esc(item.imageAlt || `Cover for ${item.title}`)}" loading="lazy"></div>`
    : `<div class="book-cover cover-evidence" aria-hidden="true"><span>${esc(item.coverText || item.title)}</span></div>`;
};
const readingFeature = item => item ? `${cover(item)}<div><span class="kicker">${esc(item.category || 'Reading note')}</span><h3>${esc(item.title)}</h3>${item.author ? `<p class="book-author">${esc(item.author)}</p>` : ''}${item.summary ? `<p>${esc(item.summary)}</p>` : ''}${external(item.link) ? `<a class="arrow-link" href="${esc(item.link)}" target="_blank" rel="noopener noreferrer">Explore reference</a>` : ''}</div>` : '<p class="reading-empty">Reading notes will appear here.</p>';
const readingShelf = items => items.map(item => `<div class="book-entry">${cover(item)}<span class="kicker">${esc(item.category || 'Reading note')}</span><h3>${esc(item.title)}</h3>${item.author ? `<p class="book-author">${esc(item.author)}</p>` : ''}${item.summary ? `<p>${esc(item.summary)}</p>` : ''}${external(item.link) ? `<a class="arrow-link" href="${esc(item.link)}" target="_blank" rel="noopener noreferrer">Explore reference</a>` : ''}</div>`).join('');
const eventImage = item => asset(item.image) || 'assets/editorial-speaking-stage.png';
const eventMeta = item => [eventDateRange(item), item.event, item.place].filter(Boolean).join(' · ');
const eventSlide = (item, first) => `<article class="speaking-slide" data-speaking-slide${first ? '' : ' hidden aria-hidden="true"'}><div class="speaking-slide-visual"><img src="${esc(eventImage(item))}" alt="${esc(item.imageAlt || `Image for ${item.title}`)}" loading="lazy"></div><div class="speaking-slide-copy"><span class="kicker">${esc(item.role || 'Upcoming appearance')}</span><h3>${esc(item.title)}</h3><p class="event-meta">${esc(eventMeta(item))}</p>${item.description ? `<p>${esc(item.description)}</p>` : ''}<a class="arrow-link" href="${esc(external(item.url) || 'speaking.html')}"${external(item.url) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${external(item.url) ? 'Event details' : 'Speaking & events'}</a></div></article>`;
const eventCard = item => `<article class="event-list-card"><img src="${esc(eventImage(item))}" alt="${esc(item.imageAlt || `Image for ${item.title}`)}" loading="lazy"${item.imageFit === 'contain' ? ' class="event-image-contain"' : ''}><div><span class="kicker">${esc([item.role || 'Appearance', eventDateRange(item)].filter(Boolean).join(' · '))}</span><h3>${esc(item.title)}</h3><p class="event-meta">${esc([item.event, item.place].filter(Boolean).join(' · '))}</p>${item.description ? `<p>${esc(item.description)}</p>` : ''}${external(item.url) ? `<a class="arrow-link" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Event details</a>` : ''}</div></article>`;
const essayImage = item => asset(item.image) || 'assets/editorial-ai-literacy.png';
const essayHref = item => item.id === 'how-ai-actually-works' ? 'essay.html' : `essay-${item.id}.html`;
const essayCard = item => `<a class="editorial-card" href="${esc(essayHref(item))}"><img src="${esc(essayImage(item))}" alt="${esc(item.imageAlt || `Illustration for ${item.title}`)}" loading="lazy"><div class="editorial-card-copy"><span class="kicker">${esc(item.category || 'Article')}</span><h3>${esc(item.title)}</h3><p>${esc(item.summary || '')}</p><span class="editorial-card-action">Read article</span></div></a>`;
const researchCard = item => `<article class="reading-item">${asset(item.image) ? `<img class="research-thumb" src="${esc(item.image)}" alt="${esc(item.imageAlt || `Illustration for ${item.title}`)}" loading="lazy">` : ''}<span class="kicker">${esc(item.category || 'Research')}</span><h3>${esc(item.title)}</h3><p>${esc(item.summary || '')}</p><a class="arrow-link" href="${esc(item.body ? `research-${item.id}.html` : external(item.link) || 'research.html')}">Read the research</a></article>`;
const replaceMarker = (markup, marker, replacement) => markup.replace(`<!-- ${marker} -->`, replacement);
export const renderListContent = (markup, filename, content, today) => {
  if (filename === 'reading.html') {
    const items = content.reading.filter(item => item.status === 'published');
    const featured = items.find(item => item.featured) || items[0];
    return replaceMarker(replaceMarker(markup, 'reading-feature', readingFeature(featured)), 'reading-shelf', readingShelf(items.filter(item => item !== featured)));
  }
  if (filename === 'research.html') {
    const items = content.research.filter(item => item.status === 'published');
    return replaceMarker(markup, 'research-outputs', items.map(researchCard).join(''));
  }
  if (filename !== 'index.html' && filename !== 'speaking.html') return markup;
  const events = content.events.filter(item => item.status === 'published' && dateIsValid(item.date));
  const upcoming = events.filter(item => (dateIsValid(item.endDate) ? item.endDate : item.date) >= today).sort((a,b) => a.date.localeCompare(b.date));
  const past = events.filter(item => (dateIsValid(item.endDate) ? item.endDate : item.date) < today).sort((a,b) => b.date.localeCompare(a.date));
  if (filename === 'index.html') {
    const essayOpening = '<div class="editorial-grid" data-content-list="essays-home">';
    const essayStart = markup.indexOf(essayOpening);
    const essayEnd = markup.indexOf('<div class="section-more">', essayStart);
    if (essayStart >= 0) {
      if (essayEnd < 0) throw new Error('Homepage writing section was not found.');
      const featured = content.essays.filter(item => item.status === 'published' && item.featured).slice(0, 3);
      markup = markup.slice(0, essayStart) + essayOpening + featured.map(essayCard).join('') + '</div>' + markup.slice(essayEnd);
    }
    const opening = '<div class="speaking-track" data-speaking-track aria-live="polite">';
    const start = markup.indexOf(opening);
    const end = markup.indexOf('<div class="speaking-controls"', start);
    if (start < 0 || end < 0) throw new Error('Homepage speaking carousel was not found.');
    const slides = upcoming.length ? upcoming.map((item, index) => eventSlide(item, index === 0)).join('') : '<article class="speaking-slide" data-speaking-slide><div class="speaking-slide-copy"><span class="kicker">Speaking & events</span><h3>Let’s start a conversation</h3><a class="arrow-link" href="speaking.html">Explore speaking & events</a></div></article>';
    return markup.slice(0, start) + opening + slides + '</div>' + markup.slice(end);
  }
  let result = replaceMarker(markup, 'upcoming-events', upcoming.length ? upcoming.map(eventCard).join('') : '<div class="no-events"><p>No upcoming dates are currently listed.</p><a class="arrow-link" href="contact.html">Invite me to speak</a></div>');
  result = replaceMarker(result, 'past-events', past.map(eventCard).join(''));
  return past.length ? result.replace('data-past-section hidden', 'data-past-section') : result;
};
