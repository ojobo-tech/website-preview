const guide = document.querySelector('[data-guide-root]');
const parts = [
  { id: 'awareness', name: 'Awareness', description: "You know AI matters. It isn't part of your work yet.", action: 'Name one outcome worth improving and identify the recurring work behind it.' },
  { id: 'understanding', name: 'Understanding', description: "You use AI for quick questions and drafts. It's a chat box, not yet a system.", action: 'Practice with a relevant AI tool on real work, including context, verification, and safe use.' },
  { id: 'evaluation', name: 'Evaluation', description: "You're testing AI on real tasks and starting to see where it pays off.", action: 'Run one contained pilot with a baseline, an owner, and a clear success measure.' },
  { id: 'adoption', name: 'Adoption', description: "AI runs inside a few repeatable workflows. Now it's about measuring and scaling.", action: 'Turn a successful pilot into a documented workflow with training and human review.' },
  { id: 'optimization', name: 'Optimization', description: 'AI is part of how you operate. Your edge is redesigning work and opening new revenue.', action: 'Measure return, improve the workflow, and test where AI can expand service or revenue.' }
];
const routes = [
  { id: 'solo', label: 'Individual, solopreneur, or professional', band: '1 person', audience: 'your own work', prompts: [
    'Which parts of your own work consume time without adding much value?', 'Have you identified a client or personal outcome you want AI to improve?', 'Can you describe what a useful result would look like for your practice?',
    'Can you select a tool for research, drafting, analysis, or client work?', 'Can you provide useful context and examples when prompting AI?', 'Do you check accuracy and protect client or personal information?',
    'Have you chosen one repeatable task to test with AI?', 'Have you tested AI on a real deliverable rather than a demo?', 'Have you compared the time and quality of that deliverable with your old approach?',
    'Do you use AI in a documented routine for recurring work?', 'Do you know when to review, edit, or reject AI output before sharing it?', 'Have you built the skills and habits needed to use that routine consistently?',
    'Do you track time saved, quality improved, or income gained?', 'Do you refine your AI-supported routine from client feedback and results?', 'Have you used AI to expand capacity, develop an offer, or reach new clients?'],
    priority: 'Choose one recurring task that takes time or limits the value you deliver.', plan: ['Map one task and record its current time, quality, and cost.', 'Test a tool on real work, review every output, and compare results.', 'Document the routine and use the evidence to improve your service or capacity.'] },
  { id: 'small', label: 'Business or team of 2–20', band: '2–20 people', audience: 'a small team', prompts: [
    'Can you identify the repetitive work that slows your team down?', 'Have you named a customer, delivery, or revenue outcome AI could improve?', 'Do the owner and team agree on which problem matters most?',
    'Can your team choose an AI tool that fits a specific job?', 'Can staff give tools the right context and instructions?', 'Does the team know how to verify output and protect customer information?',
    'Have you selected one workflow with a clear owner for a pilot?', 'Have people who do the work tested AI on real cases?', 'Have you compared pilot results with the old process on time, quality, or cost?',
    'Is AI used in a repeatable team workflow instead of isolated chats?', 'Are handoffs, human review, and exceptions clear?', 'Have team members learned the tools and skills needed for the new process?',
    'Do you measure whether AI helps capacity, service, or revenue?', 'Do you improve the workflow using team and customer feedback?', 'Have you considered where AI could support a new offer or more demand?'],
    priority: 'Pick one team bottleneck with an owner and a visible customer or business outcome.', plan: ['Map the bottleneck, its owner, and current time or cost.', 'Pilot one step with staff and customer safeguards; compare with the baseline.', 'Train the team, document handoffs, and expand only where results hold.'] },
  { id: 'growing', label: 'Business or team of 21–49', band: '21–49 people', audience: 'a growing business', prompts: [
    'Can you identify friction between teams that affects delivery or growth?', 'Have leaders named business outcomes AI might improve?', 'Do the teams involved agree on the problem and its owner?',
    'Can staff select approved tools for their specific roles?', 'Can teams share effective prompting and task practices?', 'Are data handling and output checks understood across teams?',
    'Have you prioritized a cross-team use case by value and feasibility?', 'Have frontline users tested that use case on real work?', 'Do you compare pilots with a baseline for quality, time, cost, or revenue?',
    'Is AI part of a repeatable process shared by more than one person?', 'Are ownership, review, and escalation clear across handoffs?', 'Have managers and staff received role-specific training?',
    'Do you track realized gains against the effort and tools invested?', 'Do you improve workflows from user and customer feedback?', 'Are you using evidence to decide where to expand capacity or offers?'],
    priority: 'Select a cross-team process with a clear owner and enough volume to show value.', plan: ['Map handoffs and establish a shared baseline and owner.', 'Pilot a specific step with frontline staff and compare results.', 'Train managers, standardize the workflow, and choose the next use case by evidence.'] },
  { id: 'mid', label: 'Organization of 50–199', band: '50–199 people', audience: 'a midsize organization', prompts: [
    'Have you mapped the workflows where AI could change cost, service, or growth?', 'Are target business outcomes agreed by relevant leaders?', 'Is there a sponsor and owner for AI opportunities?',
    'Can teams select tools appropriate to their data and workflows?', 'Do staff know how to design prompts and review AI-supported tasks?', 'Are privacy, security, and accuracy expectations clear?',
    'Have use cases been ranked by value, feasibility, and risk?', 'Have users tested a pilot with real operational data or cases?', 'Are pilot measures compared with a pre-AI baseline?',
    'Are successful pilots integrated into repeatable team processes?', 'Are process ownership, human review, and escalation defined?', 'Is role-based training available for managers and frontline teams?',
    'Do leaders see realized value alongside technology and change costs?', 'Are processes improved using adoption and outcome data?', 'Is there a way to scale successful patterns to other units or offerings?'],
    priority: 'Align a sponsor, process owner, and measurable outcome around one high-value workflow.', plan: ['Prioritize use cases and record a baseline, owner, and risk checks.', 'Run a controlled workflow pilot with users and clear success measures.', 'Integrate what works, train teams, and review return before scaling.'] },
  { id: 'large', label: 'Organization of 200–499', band: '200–499 people', audience: 'a large organization', prompts: [
    'Do leaders see where AI could change performance across functions?', 'Are desired outcomes linked to strategic and operational priorities?', 'Is sponsorship and accountability clear across affected functions?',
    'Do teams understand which tools fit their roles and systems?', 'Are there shared skills for designing, checking, and improving AI-supported work?', 'Are data access, privacy, security, and accuracy rules understood?',
    'Is there a portfolio of use cases ranked by value, feasibility, and risk?', 'Do pilots involve actual users and relevant systems or data?', 'Are pilots judged against cost, quality, risk, and service baselines?',
    'Are proven use cases integrated into processes and systems?', 'Are decision rights, human oversight, and escalation defined across units?', 'Is role-specific training linked to rollout and adoption?',
    'Can leaders track net value, adoption, and ongoing operating cost?', 'Do teams use performance evidence to improve implementations?', 'Can successful solutions scale across functions without losing ownership?'],
    priority: 'Choose one valuable cross-functional workflow with executive sponsorship and process ownership.', plan: ['Map the process, dependencies, risk, and baseline across teams.', 'Pilot with users, data owners, and controls; test value and adoption.', 'Standardize the successful workflow, train roles, and plan the next rollout.'] },
  { id: 'enterprise', label: 'Organization of 500 or more', band: '500+ people', audience: 'an enterprise', prompts: [
    'Is there a shared view of AI opportunities across major business units?', 'Are AI outcomes connected to enterprise priorities and financial value?', 'Are executive sponsorship and accountable owners established?',
    'Do business units understand approved tools, platforms, and use limits?', 'Are AI skills defined by role, from leaders to operational teams?', 'Are governance, privacy, security, and quality standards applied consistently?',
    'Is the use-case portfolio prioritized by impact, feasibility, and risk?', 'Are pilots tested with real users, data, and integration constraints?', 'Are baseline metrics and evaluation criteria consistent enough to compare pilots?',
    'Are successful AI uses integrated into systems and managed workflows?', 'Are decision rights, oversight, and escalation clear at enterprise scale?', 'Are change management and training linked to adoption measures?',
    'Can leaders see net return, risk, and adoption across the portfolio?', 'Are implementations improved through monitoring and feedback?', 'Can proven capabilities be reused across units and new revenue models?'],
    priority: 'Prioritize one enterprise use case with a sponsor, accountable owner, governance path, and financial measure.', plan: ['Set portfolio priorities, ownership, baseline measures, and governance.', 'Pilot with users and integration owners; evaluate value, risk, and adoption.', 'Operationalize the proven pattern, train roles, and scale through shared standards.'] }
];
const goals = [
  { id: 'productivity', label: 'Save time and improve productivity', focus: 'time saved and quality maintained' },
  { id: 'operations', label: 'Improve or automate operations', focus: 'cycle time, errors, and operating cost' },
  { id: 'service', label: 'Improve customer or client service', focus: 'response time and service quality' },
  { id: 'growth', label: 'Grow revenue or capacity', focus: 'capacity, conversion, and revenue' },
  { id: 'skills', label: 'Develop AI skills and adoption', focus: 'skill use, confidence, and adoption' },
  { id: 'unsure', label: 'Discover where AI can help', focus: 'the value of a promising use case' }
];
let questions = [];
const answerScale = [
  ['No area mapped', 'A possible issue noticed', 'Several areas listed', 'One valuable area prioritized', 'Priorities reviewed with evidence'],
  ['No outcome named', 'A broad goal in mind', 'A specific outcome named', 'Outcome and baseline defined', 'Outcome measured and revisited'],
  ['No clear result or agreement', 'Different ideas or a vague result', 'A result discussed or described', 'A specific result agreed or defined', 'Result measured and reviewed'],
  ['No tool selected', 'A tool considered', 'A tool tried informally', 'Tool chosen for the task and data', 'Tool fit reviewed and improved'],
  ['No practical method', 'Basic questions or drafts', 'Useful context in some tasks', 'Repeatable instructions and checks', 'Method refined using results'],
  ['No safeguards in place', 'Some risks recognized', 'Occasional checks', 'Clear checks for data and accuracy', 'Checks applied and reviewed'],
  ['No use case chosen', 'Several ideas collected', 'One candidate selected', 'Value, feasibility, and risk assessed', 'Priorities revisited using evidence'],
  ['No real-work test', 'A demonstration only', 'A limited real-work test', 'A pilot with the intended users', 'Pilot repeated and refined'],
  ['No baseline or comparison', 'Anecdotal impressions', 'One result compared', 'Time, quality, or cost compared', 'Results tracked over time'],
  ['Only occasional AI chats', 'One informal routine', 'A repeatable process emerging', 'Documented workflow in use', 'Workflow embedded and monitored'],
  ['No review or ownership', 'Informal review only', 'Some responsibilities defined', 'Owner, review, and escalation clear', 'Oversight reviewed and improved'],
  ['No skill development', 'Interest but no practice', 'Some people practicing', 'Relevant people trained for the task', 'Skills supported and refreshed'],
  ['No value measure', 'Expected benefits only', 'Occasional results checked', 'Gains and costs tracked', 'Net value reviewed regularly'],
  ['No improvement cycle', 'Occasional tweaks', 'Feedback collected', 'Changes based on evidence', 'Improvement measured and sustained'],
  ['No expansion considered', 'Ideas for expansion', 'One opportunity explored', 'Expansion tested in practice', 'Expansion producing measurable value']
];
const routeAnswerOverrides = {
  solo: {
    2: ['No result described', 'A vague idea of success', 'A useful result described', 'A measurable result defined', 'Result tracked and refined'],
    10: ['No review habit', 'I review occasionally', 'I check important output', 'I have a review and correction routine', 'I refine the routine using errors and feedback'],
    11: ['No AI skill practice', 'Interested but not practicing', 'Learning a few useful skills', 'Practicing the skills in real work', 'Skills refreshed as the work changes']
  },
  enterprise: {
    4: ['No roles or skills defined', 'Skills discussed broadly', 'Some roles mapped', 'Role-based AI skills defined', 'Skills measured and refreshed across units'],
    14: ['No reuse planned', 'Potential uses identified', 'One reusable capability explored', 'Capability tested across units', 'Reuse creating measurable value']
  }
};
function optionsFor(route, index) {
  return routeAnswerOverrides[route.id]?.[index] || answerScale[index];
}
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
const state = { index: 0, answers: [], route: null, goal: null, submitted: false };
const endpoint = String(window.siteSettings?.contactFormEndpoint || '').trim();
const validEndpoint = /^https:\/\/formspree\.io\/f\/[A-Za-z0-9]+$/.test(endpoint);
let assessment = null;

function renderIntro() {
  guide.innerHTML = `<div class="guide-intro"><span class="eyebrow">Find your path</span><h3 tabindex="-1" data-guide-heading>Start with your situation</h3><p>Your role and the scale of your work change what is useful to ask. Choose the closest fit, then tell us the result you want.</p>
    <form data-route-form><div class="guide-route-fields"><div class="contact-field"><label for="guide-route">Which describes you or your team? *</label><select id="guide-route" name="route" required><option value="">Choose your situation</option>${routes.map(route => `<option value="${route.id}" ${state.route?.id === route.id ? 'selected' : ''}>${escapeHTML(route.label)}</option>`).join('')}</select></div>
    <div class="contact-field"><label for="guide-goal">What would you most like AI to help you do? *</label><select id="guide-goal" name="goal" required><option value="">Choose your main goal</option>${goals.map(goal => `<option value="${goal.id}" ${state.goal?.id === goal.id ? 'selected' : ''}>${escapeHTML(goal.label)}</option>`).join('')}</select></div></div><p class="guide-intro-note">You can change your path later. Your 15 answers will produce five percentages and a report tailored to your situation and goal.</p><button class="button" type="submit">Begin assessment</button></form></div>`;
  guide.querySelector('[data-guide-heading]')?.focus({ preventScroll: true });
}

function beginAssessment(route, goal) {
  state.route = route;
  state.goal = goal;
  questions = route.prompts.map((title, index) => ({ part: parts[Math.floor(index / 3)].id, title }));
  state.index = 0;
  state.answers = Array(15).fill(null);
  assessment = null;
  renderQuestion();
}

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
  guide.innerHTML = `<div class="guide-progress"><span>${escapeHTML(state.route.band)} · Question ${state.index + 1} of 15 · ${escapeHTML(parts.find(part => part.id === question.part).name)}</span><div aria-hidden="true">${questions.map((_, index) => `<i class="${index <= state.index ? 'active' : ''}"></i>`).join('')}</div></div>
    <h3 tabindex="-1" data-guide-heading>${escapeHTML(question.title)}</h3>
    <div class="guide-options guide-options-five" role="group" aria-label="${escapeHTML(question.title)}">${optionsFor(state.route, state.index).map((label, score) => `<button type="button" data-answer="${score}" aria-pressed="${value === score}"><strong>${score}</strong><span>${escapeHTML(label)}</span></button>`).join('')}</div>
    <div class="guide-controls"><button type="button" class="guide-back" data-back>${state.index ? 'Previous question' : 'Change my path'}</button><button type="button" class="button" data-next ${value === null ? 'disabled' : ''}>${state.index === questions.length - 1 ? 'See my results' : 'Next question'}</button></div>`;
  guide.querySelector('[data-guide-heading]')?.focus({ preventScroll: true });
}

function scoreRows(result) {
  return parts.map((part, index) => `<div class="readiness-row"><div><span>${String(index + 1).padStart(2, '0')} · ${escapeHTML(part.name)}</span><strong>${result.scores[part.id]}%</strong></div><div class="readiness-track" role="img" aria-label="${escapeHTML(part.name)}: ${result.scores[part.id]} percent"><i style="width:${result.scores[part.id]}%"></i></div></div>`).join('');
}

function renderScores() {
  assessment = calculate(state.answers);
  guide.innerHTML = `<div class="guide-result"><span class="eyebrow">Your self-assessment snapshot</span><h3 tabindex="-1" data-guide-heading>${assessment.overall}% overall · ${escapeHTML(assessment.stage.name)}</h3>
    <p class="guide-result-lead">${escapeHTML(assessment.stage.description)}</p><p>${escapeHTML(state.route.label)} · Goal: ${escapeHTML(state.goal.label)}</p><p>Each part uses three equally weighted questions scored from 0 to 4. These percentages summarize your own answers; they are a starting point for a conversation, not a validated diagnosis or a comparison with others.</p>
    <div class="readiness-scores">${scoreRows(assessment)}</div>
    <div class="readiness-gate"><h4>Get your one-page action report</h4><p>Enter your details to open a tailored report here. It includes your five scores, a first priority, and a 30/60/90-day action path. It is not automatically emailed.</p>
      <form data-report-form novalidate>
        <div class="contact-field-row"><div class="contact-field"><label for="report-name">Your name *</label><input id="report-name" name="name" autocomplete="name" required></div><div class="contact-field"><label for="report-email">Email address *</label><input id="report-email" name="email" type="email" autocomplete="email" required></div></div>
        <div class="contact-field"><label for="report-organization">Business or organization (optional)</label><input id="report-organization" name="organization" autocomplete="organization"></div>
        <div class="contact-field"><label class="report-consent"><input type="checkbox" name="consent" required> I agree to share my name, email, and assessment results with Ojobo through Formspree so he can provide and discuss my report.</label></div>
        <p class="report-privacy">Your answers are submitted only when you request the report. Do not include sensitive or confidential information.</p>
        <button class="button" type="submit" ${validEndpoint ? '' : 'disabled'} data-report-submit>Open my report</button><p role="status" data-report-status>${validEndpoint ? '' : 'The report form is temporarily unavailable. You can contact Ojobo directly.'}</p>
      </form></div><div class="guide-result-actions"><a class="arrow-link" href="contact.html#choose-a-conversation">Discuss this with Ojobo</a><button type="button" class="guide-back" data-reset>Start again</button></div></div>`;
  guide.querySelector('[data-guide-heading]')?.focus({ preventScroll: true });
}

function reportMarkup(result, name, route = state.route, goal = state.goal) {
  const weak = result.focus;
  return `<article class="ai-report"><div class="ai-report-head"><span>OJOBO AGBO EJE · AI STARTING POINT</span><h1>Your AI action report</h1><p>Prepared for ${escapeHTML(name)} · ${escapeHTML(route.label)} · ${new Date().toLocaleDateString()}</p></div>
    <div class="ai-report-summary"><div><span>Overall self-assessment</span><strong>${result.overall}%</strong></div><div><span>Current stage</span><strong>${escapeHTML(result.stage.name)}</strong></div></div>
    <p><strong>Your goal:</strong> ${escapeHTML(goal.label)}. ${escapeHTML(result.stage.description)} This is a directional self-assessment, not a validated readiness certification.</p>
    <h2>Your five-part profile</h2><div class="ai-report-scores">${scoreRows(result)}</div>
    <h2>Where to focus first</h2><p><strong>${escapeHTML(weak.name)}:</strong> ${escapeHTML(route.priority)} ${escapeHTML(weak.action)}</p><p>For your goal, watch ${escapeHTML(goal.focus)}. Record a baseline before changing the work.</p>
    <div class="ai-report-plan"><div><strong>First 30 days</strong><p>${escapeHTML(route.plan[0])}</p></div><div><strong>By 60 days</strong><p>${escapeHTML(route.plan[1])}</p></div><div><strong>By 90 days</strong><p>${escapeHTML(route.plan[2])}</p></div></div>
    <div class="ai-report-footer"><p>Want to turn this snapshot into a practical plan? <strong>ojoboagboeje.com/contact/</strong></p><span>© ${new Date().getFullYear()} Ojobo Agbo Eje</span></div></article>`;
}

function showReport(name) {
  state.submitted = true;
  const markup = reportMarkup(assessment, name);
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
      if (state.index > 0) { state.index -= 1; renderQuestion(); } else renderIntro();
    } else if (button.hasAttribute('data-reset')) {
      state.index = 0; state.answers = []; state.route = null; state.goal = null; state.submitted = false; assessment = null;
      document.querySelector('#ai-report-print')?.remove(); renderIntro(); guide.scrollIntoView({ block: 'start' });
    } else if (button.hasAttribute('data-print') && state.submitted) window.print();
  });
  guide.addEventListener('submit', async event => {
    const routeForm = event.target.closest('[data-route-form]');
    if (routeForm) {
      event.preventDefault();
      if (!routeForm.reportValidity()) return;
      const selected = new FormData(routeForm);
      const route = routes.find(item => item.id === selected.get('route'));
      const goal = goals.find(item => item.id === selected.get('goal'));
      if (route && goal) beginAssessment(route, goal);
      return;
    }
    const form = event.target.closest('[data-report-form]'); if (!form) return;
    event.preventDefault(); if (!form.reportValidity() || !validEndpoint || !assessment) return;
    const button = form.querySelector('[data-report-submit]');
    const status = form.querySelector('[data-report-status]');
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    data.set('subject', 'AI Starting Point assessment');
    data.set('form_type', 'AI Starting Point report request');
    data.set('audience', state.route.label);
    data.set('audience_size', state.route.band);
    data.set('primary_goal', state.goal.label);
    data.set('overall_readiness_percent', String(assessment.overall));
    data.set('current_stage', assessment.stage.name);
    for (const part of parts) data.set(`${part.id}_percent`, String(assessment.scores[part.id]));
    data.set('answers_15', questions.map((question, index) => `${index + 1}. ${question.title} — ${state.answers[index]}/4: ${optionsFor(state.route, index)[state.answers[index]]}`).join('\n'));
    button.disabled = true; button.textContent = 'Preparing report…'; status.textContent = 'Submitting your answers…';
    try {
      const response = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const detail = Array.isArray(payload.errors) ? payload.errors.map(error => error.message).filter(Boolean).join(' ') : '';
        throw new Error(detail || (response.status === 429 ? 'Too many requests. Please wait and try again.' : 'The report could not be prepared. Please try again.'));
      }
      showReport(name);
    } catch (error) { status.textContent = error.message || 'The report could not be prepared. Please try again.'; button.disabled = false; button.textContent = 'Open my report'; }
  });
  renderIntro();
}
