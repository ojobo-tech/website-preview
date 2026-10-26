const contactForm = document.querySelector('[data-contact-form]');
if (contactForm) {
  const endpoint = (window.siteSettings?.contactFormEndpoint || '').trim();
  const validEndpoint = /^https:\/\/formspree\.io\/f\/[A-Za-z0-9]+$/.test(endpoint);
  const sendButton = contactForm.querySelector('[data-contact-submit]');
  const status = contactForm.querySelector('[data-contact-status]');
  if (validEndpoint) {
    contactForm.action = endpoint;
    sendButton.disabled = false;
    status.textContent = 'Your message will be sent securely through Formspree.';
  }
  contactForm.addEventListener('submit', event => {
    if (!validEndpoint) {
      event.preventDefault();
      return;
    }
    if (!contactForm.reportValidity()) event.preventDefault();
  });
}
