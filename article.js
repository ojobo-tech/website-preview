document.addEventListener('DOMContentLoaded', () => {
  const pageUrl = window.location.href.split('#')[0];
  const title = document.querySelector('.essay-hero h1')?.textContent?.trim() || document.title;
  const links = {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(pageUrl)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(pageUrl)}`
  };
  document.querySelectorAll('[data-share]').forEach(link => {
    const type = link.dataset.share;
    if (!links[type]) return;
    link.href = links[type];
    if (type !== 'email') {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  });
});
