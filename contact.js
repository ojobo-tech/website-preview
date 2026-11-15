const contactForm = document.querySelector('[data-contact-form]');
if (contactForm) {
  const endpoint = (window.siteSettings?.contactFormEndpoint || '').trim();
  const validEndpoint = /^https:\/\/formspree\.io\/f\/[A-Za-z0-9]+$/.test(endpoint);
  const sendButton = contactForm.querySelector('[data-contact-submit]');
  const status = contactForm.querySelector('[data-contact-status]');
  const topicSelect = contactForm.querySelector('#contact-topic');
  const routeTopics = {
    opportunity: 'Find an AI opportunity',
    transformation: 'Transformation and implementation',
    build: 'Build a solution',
    training: 'Training and enablement',
    speaking: 'Speaking',
    role: 'Employment opportunity / role',
    collaboration: 'Collaboration'
  };
  const requestedTopic = new URLSearchParams(location.search).get('topic');
  if (topicSelect && Object.hasOwn(routeTopics, requestedTopic)) topicSelect.value = routeTopics[requestedTopic];
  const topicPrompts = {
    'Find an AI opportunity': ['What work or decision would you most like to improve?', 'Describe the goal, the current process, the people involved, and where you think AI might help.'],
    'Transformation and implementation': ['What outcome should this change produce?', 'Describe the current workflow, what needs to change, who owns it, and how you would measure progress.'],
    'Build a solution': ['What should the solution make possible?', 'Describe the users, the work they need to do, the data or tools involved, and what success would look like.'],
    'Training and enablement': ['What should people be able to do differently?', 'Describe the audience, tools they use today, skills they need, and the work they will practice on.'],
    Speaking: ['What should your audience leave ready to do?', 'Share the event, audience, format, date, and the question you want us to explore.'],
    'Employment opportunity / role': ['What work would this role lead?', 'Share the role, team, goals, location or working arrangement, and the next step in your process.'],
    Collaboration: ['What would we build or explore together?', 'Describe the idea, the people involved, your role, the intended outcome, and any timing.']
  };
  const intro = document.querySelector('[data-topic-intro]');
  const messageLabel = document.querySelector('[data-message-label]');
  const message = document.querySelector('#contact-message');
  const updatePrompt = () => {
    const [question, placeholder] = topicPrompts[topicSelect?.value] || ['What are you trying to achieve?', 'The goal, how work happens now, who is affected, and the outcome you want'];
    if (intro) intro.textContent = question;
    if (messageLabel) messageLabel.textContent = `${question} *`;
    if (message) message.placeholder = placeholder;
  };
  topicSelect?.addEventListener('change', updatePrompt);
  updatePrompt();
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
