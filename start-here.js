const guide = document.querySelector('[data-guide-root]');
const parts = [
  { id: 'awareness', name: 'Awareness', description: "You know AI matters. It isn't part of your work yet.", action: 'Name one outcome worth improving and identify the recurring work behind it.' },
  { id: 'understanding', name: 'Understanding', description: "You use AI for quick questions and drafts. It's a chat box, not yet a system.", action: 'Practice with a relevant AI tool on real work, including context, verification, and safe use.' },
  { id: 'evaluation', name: 'Evaluation', description: "You're testing AI on real tasks and starting to see where it pays off.", action: 'Run one contained pilot with a baseline, an owner, and a clear success measure.' },
  { id: 'adoption', name: 'Adoption', description: "AI runs inside a few repeatable workflows. Now it's about measuring and scaling.", action: 'Turn a successful pilot into a documented workflow with training and human review.' },
  { id: 'optimization', name: 'Optimization', description: 'AI is part of how you operate. Your edge is redesigning work and opening new revenue.', action: 'Measure return, improve the workflow, and test where AI can expand service or revenue.' }
];
const questions = [
  ['awareness', 'How clearly can you explain why AI matters to your work or business?'],
  ['awareness', 'How clearly have you identified work, customer, or growth problems AI might improve?'],
  ['awareness', 'How aligned are the people involved on the outcome you want from AI?'],
  ['understanding', 'How confidently can you choose an AI tool for a specific task?'],
  ['understanding', 'How well can you give an AI tool context, instructions, and examples for useful output?'],
  ['understanding', 'How consistently do you verify outputs and handle private information safely?'],
  ['evaluation', 'How clearly have you prioritized an AI use case by value and feasibility?'],
  ['evaluation', 'How much have you tested AI on a real task with the people who do that work?'],
  ['evaluation', 'How well have you compared a pilot with the current process on time, quality, cost, or revenue?'],
  ['adoption', 'How reliably is AI used in a repeatable workflow rather than one-off chats?'],
  ['adoption', 'How clearly are ownership, human review, and escalation defined for AI-supported work?'],
  ['adoption', 'How well are people trained and supported to use the new workflow?'],
  ['optimization', 'How consistently do you measure the return from AI-supported work?'],
  ['optimization', 'How regularly do you improve AI-enabled processes based on evidence and feedback?'],
  ['optimization', 'How far have you used AI to redesign services, grow capacity, or create new revenue?']
].map(([part, title]) => ({ part, title }));
const choices = ['Not yet', 'We see the need, but have not acted', 'Trying this informally', 'Used consistently in some work', 'Established and measured'];
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
const state = { index: 0, answers: Array(questions.length).fill(null), submitted: false };
const endpoint = String(window.siteSettings?.contactFormEndpoint || '').trim();
const validEndpoint = /^https:\/\/formspree\.io\/f\/[A-Za-z0-9]+$/.test(endpoint);
let assessment = null;

function calculate(values) {
  if (values.length !== questions.length || values.some(value => !Number.isInteger(value) || value < 0 || value > 4)) throw new Error('Answer all 15 questions.');
  const scores = Object.fromEntries(parts.map(part => {
    const indices = questions.flatMap((question, index) => question.part === part.id ? [index] : []);
    return [part.id, Math.round(indices.reduce((sum, index) => sum + values[index], 0) / 12 * 100)];
  }));
  const overall = Math.round(values.reduce((sum, value) => sum + value, 0) / 60 * 100);
  const stage = parts[Math.min(4, Math.floor(overall / 20))];
  const focus = [...parts].sort((a, b) => scores[a.id] - scores[b.id])[0];
  return { scores, overall, stage, focus };
}

function renderQuestion() {
  const question = questions[state.index];
  const value = state.answers[state.index];
  guide.innerHTML = `<div class="guide-progress"><span>Question ${state.index + 1} of 15 · ${escapeHTML(parts.find(part => part.id === question.part).name)}</span><div aria-hidden="true">${questions.map((_, index) => `<i class="${index <= state.index ? 'active' : ''}"></i>`).join('')}</div></div>
    <h3 tabindex="-1" data-guide-heading>${escapeHTML(question.title)}</h3>
    <div class="guide-options guide-options-five" role="group" aria-label="${escapeHTML(question.title)}">${choices.map((label, score) => `<button type="button" data-answer="${score}" aria-pressed="${value === score}"><strong>${score}</strong><span>${escapeHTML(label)}</span></button>`).join('')}</div>
    <div class="guide-controls"><button type="button" class="guide-back" data-back>${state.index ? ' Previous' : ' Back to introduction'}</button><button type="button" class="button" data-next ${value === null ? 'disabled' : ''}>${state.index === questions.length - 1 ? 'See my results' : 'Next'}</button></div>`;
  guide.querySelector('[data-guide-heading]')?.focus({ preventScroll: true });
}

function scoreRows(result) {
  return parts.map((part, index) => `<div class="readiness-row"><div><span>${String(index + 1).padStart(2, '0')} · ${escapeHTML(part.name)}</span><strong>${result.scores[part.id]}%</strong></div><div class="readiness-track" role="img" aria-label="${escapeHTML(part.name)}: ${result.scores[part.id]} percent"><i style="width:${result.scores[part.id]}%"></i></div></div>`).join('');
}

function renderScores() {
  assessment = calculate(state.answers);
  guide.innerHTML = `<div class="guide-result"><span class="eyebrow">Your self-assessment snapshot</span><h3 tabindex="-1" data-guide-heading>${assessment.overall}% overall · ${escapeHTML(assessment.stage.name)}</h3>
    <p class="guide-result-lead">${escapeHTML(assessment.stage.description)}</p><p>Each part uses three equally weighted questions scored from 0 to 4. These percentages summarize your own answers; they are a starting point for a conversation, not a validated diagnosis or a promise of outcomes.</p>
    <div class="readiness-scores">${scoreRows(assessment)}</div>
    <div class="readiness-gate"><h4>Get your one-page action report</h4><p>Enter your details to open a tailored report here. It includes your five scores, a first priority, and a 30/60/90-day action path. It is not automatically emailed.</p>
      <form data-report-form novalidate>
        <div class="contact-field-row"><div class="contact-field"><label for="report-name">Your name *</label><input id="report-name" name="name" autocomplete="name" required></div><div class="contact-field"><label for="report-email">Email address *</label><input id="report-email" name="email" type="email" autocomplete="email" required></div></div>
        <div class="contact-field"><label for="report-audience">Which best describes you? *</label><select id="report-audience" name="audience" required><option value="">Choose one</option><option>Independent professional</option><option>Owner-led business or team of 2–49</option><option>Business or organization of 50–199</option><option>Business or organization of 200–500</option><option>Organization of more than 500</option><option>Public, nonprofit, or educational institution</option></select></div>
        <div class="contact-field"><label for="report-organization">Business or organization (optional)</label><input id="report-organization" name="organization" autocomplete="organization"></div>
        <div class="contact-field"><label class="report-consent"><input type="checkbox" name="consent" required> I agree to share my name, email, and assessment results with Ojobo through Formspree so he can provide and discuss my report.</label></div>
        <p class="report-privacy">Your answers are submitted only when you request the report. Do not include sensitive or confidential information.</p>
        <button class="button" type="submit" ${validEndpoint ? '' : 'disabled'} data-report-submit>Open my report</button><p role="status" data-report-status>${validEndpoint ? '' : 'The report form is temporarily unavailable. You can contact Ojobo directly.'}</p>
      </form></div><div class="guide-result-actions"><a class="arrow-link" href="contact.html#choose-a-conversation">Discuss this with Ojobo</a><button type="button" class="guide-back" data-reset>Start again</button></div></div>`;
  guide.querySelector('[data-guide-heading]')?.focus({ preventScroll: true });
}

function reportMarkup(result, name, audience) {
  const weak = result.focus;
  return `<article class="ai-report"><div class="ai-report-head"><span>OJOBO AGBO EJE · AI STARTING POINT</span><h1>Your AI action report</h1><p>Prepared for ${escapeHTML(name)} · ${escapeHTML(audience)} · ${new Date().toLocaleDateString()}</p></div>
    <div class="ai-report-summary"><div><span>Overall self-assessment</span><strong>${result.overall}%</strong></div><div><span>Current stage</span><strong>${escapeHTML(result.stage.name)}</strong></div></div>
    <p>${escapeHTML(result.stage.description)} This is a directional self-assessment, not a validated readiness certification.</p>
    <h2>Your five-part profile</h2><div class="ai-report-scores">${scoreRows(result)}</div>
    <h2>Where to focus first</h2><p><strong>${escapeHTML(weak.name)}:</strong> ${escapeHTML(weak.action)}</p>
    <div class="ai-report-plan"><div><strong>First 30 days</strong><p>Choose one valuable outcome. Map the current work, name an owner, and record a baseline.</p></div><div><strong>By 60 days</strong><p>Test one AI-supported step with the right tool, skills, and human review. Compare it with the baseline.</p></div><div><strong>By 90 days</strong><p>Improve what works, train the people involved, and decide what merits wider implementation.</p></div></div>
    <div class="ai-report-footer"><p>Want to turn this snapshot into a practical plan? <strong>ojoboagboeje.com/contact/</strong></p><span>© ${new Date().getFullYear()} Ojobo Agbo Eje</span></div></article>`;
}

function showReport(name, audience) {
  state.submitted = true;
  const markup = reportMarkup(assessment, name, audience);
  guide.innerHTML = `<div class="guide-result"><span class="eyebrow">Your one-page report is ready</span>${markup}<div class="guide-result-actions"><button type="button" class="button" data-print>Print or save as PDF</button><a class="arrow-link" href="contact.html#choose-a-conversation">Discuss the next step</a><button type="button" class="guide-back" data-reset>Start again</button></div></div>`;
  document.querySelector('#ai-report-print')?.remove();
  const print = document.createElement('div'); print.id = 'ai-report-print'; print.innerHTML = markup; document.body.append(print);
  guide.scrollIntoView({ block: 'start' });
}

if (guide) {
  guide.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !guide.contains(button)) return;
    if (button.hasAttribute('data-answer')) { state.answers[state.index] = Number(button.dataset.answer); renderQuestion(); }
    else if (button.hasAttribute('data-next')) {
      if (state.answers[state.index] === null) return;
      if (state.index < questions.length - 1) { state.index += 1; renderQuestion(); } else renderScores();
    } else if (button.hasAttribute('data-back')) {
      if (state.index > 0) { state.index -= 1; renderQuestion(); } else document.querySelector('.start-hero')?.scrollIntoView({ behavior: 'smooth' });
    } else if (button.hasAttribute('data-reset')) {
      state.index = 0; state.answers.fill(null); state.submitted = false; assessment = null;
      document.querySelector('#ai-report-print')?.remove(); renderQuestion(); guide.scrollIntoView({ block: 'start' });
    } else if (button.hasAttribute('data-print') && state.submitted) window.print();
  });
  guide.addEventListener('submit', async event => {
    const form = event.target.closest('[data-report-form]'); if (!form) return;
    event.preventDefault(); if (!form.reportValidity() || !validEndpoint || !assessment) return;
    const button = form.querySelector('[data-report-submit]');
    const status = form.querySelector('[data-report-status]');
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const audience = String(data.get('audience') || '').trim();
    data.set('subject', 'AI Starting Point assessment');
    data.set('form_type', 'AI Starting Point report request');
    data.set('overall_readiness_percent', String(assessment.overall));
    data.set('current_stage', assessment.stage.name);
    for (const part of parts) data.set(`${part.id}_percent`, String(assessment.scores[part.id]));
    data.set('answers_15', questions.map((question, index) => `${index + 1}. ${question.title} — ${choices[state.answers[index]]}`).join('\n'));
    button.disabled = true; button.textContent = 'Preparing report…'; status.textContent = 'Submitting your answers…';
    try {
      const response = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const detail = Array.isArray(payload.errors) ? payload.errors.map(error => error.message).filter(Boolean).join(' ') : '';
        throw new Error(detail || (response.status === 429 ? 'Too many requests. Please wait and try again.' : 'The report could not be prepared. Please try again.'));
      }
      showReport(name, audience);
    } catch (error) { status.textContent = error.message || 'The report could not be prepared. Please try again.'; button.disabled = false; button.textContent = 'Open my report'; }
  });
  renderQuestion();
}
