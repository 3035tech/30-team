import { QUESTION_BANK, TYPE_DATA, drawQuestions, SCALE_LABELS } from './data';
import { normalizeLocale } from './i18n';

const SCALE_LABELS_EN = ['Not like me', 'A little', 'Sometimes', 'Very much', 'Very much like me'];

const TYPE_DATA_EN = {
  1: {
    name: 'The Reformer',
    short: 'Reformer',
    desc: 'Ethical, organized, and driven by a strong sense of right and wrong. The inner critic also fuels excellence.',
    strengths: ['Ethical', 'Organized', 'Principled', 'Reliable', 'Detail-oriented'],
    challenge: 'Accept imperfection as part of the process.',
    team: 'Protects quality and high standards. Strong in review, compliance, and process work.',
  },
  2: {
    name: 'The Helper',
    short: 'Helper',
    desc: 'Warm, generous, and intuitive. Often anticipates what others need before they ask.',
    strengths: ['Empathetic', 'Generous', 'Warm', 'Connected', 'Attentive'],
    challenge: 'Remember that your own needs matter too.',
    team: 'Creates connection across the team. Strong in service, HR, and people-facing roles.',
  },
  3: {
    name: 'The Achiever',
    short: 'Achiever',
    desc: 'Ambitious, efficient, and charismatic. Turns goals into results with strong adaptability.',
    strengths: ['Ambitious', 'Efficient', 'Charismatic', 'Adaptable', 'Focused'],
    challenge: 'Discover who you are beyond accomplishments.',
    team: 'Drives outcomes. Strong in sales, leadership, and deadline-oriented projects.',
  },
  4: {
    name: 'The Individualist',
    short: 'Individualist',
    desc: 'Creative, authentic, and emotionally deep. Seeks to be fully seen and understood.',
    strengths: ['Creative', 'Authentic', 'Deep', 'Expressive', 'Empathetic'],
    challenge: 'Find value in the ordinary and the present.',
    team: 'Brings aesthetic innovation and depth. Strong in design, creation, and creative strategy.',
  },
  5: {
    name: 'The Investigator',
    short: 'Investigator',
    desc: 'Analytical, independent, and perceptive. Observes before acting and treats knowledge as a resource.',
    strengths: ['Analytical', 'Independent', 'Perceptive', 'Innovative', 'Focused'],
    challenge: 'Move out of the mind and engage more with the world.',
    team: 'A natural specialist. Strong in research, data, architecture, and complex analysis.',
  },
  6: {
    name: 'The Loyalist',
    short: 'Loyalist',
    desc: 'Committed, responsible, and alert to risks. Anticipates problems, questions, and prepares.',
    strengths: ['Loyal', 'Responsible', 'Careful', 'Committed', 'Protective'],
    challenge: 'Trust yourself as much as you trust others.',
    team: 'A pillar of reliability. Strong in security, planning, and long-term functions.',
  },
  7: {
    name: 'The Enthusiast',
    short: 'Enthusiast',
    desc: 'Spontaneous, optimistic, and versatile. Lives in expansion mode and energizes the room.',
    strengths: ['Enthusiastic', 'Creative', 'Optimistic', 'Spontaneous', 'Versatile'],
    challenge: 'Find freedom in depth, not in escape.',
    team: 'Generates energy and ideas. Strong in brainstorming, product, and agile environments.',
  },
  8: {
    name: 'The Challenger',
    short: 'Challenger',
    desc: 'Assertive, protective, and direct. Behind the toughness is a heart that fiercely protects others.',
    strengths: ['Assertive', 'Protective', 'Direct', 'Brave', 'Decisive'],
    challenge: 'Let vulnerability become your greatest strength.',
    team: 'Natural leadership in crisis. Strong in hard decisions and competitive environments.',
  },
  9: {
    name: 'The Peacemaker',
    short: 'Peacemaker',
    desc: 'Receptive, patient, and comforting. Sees all sides and creates harmony where conflict appears.',
    strengths: ['Mediator', 'Patient', 'Receptive', 'Stable', 'Harmonizing'],
    challenge: 'Prioritize your needs without guilt.',
    team: 'A natural mediator. Essential in conflict management, support, and collaborative leadership.',
  },
};

const QUESTION_TEXT_EN = {
  101: 'I have a very clear inner sense of what is right and wrong.',
  102: 'I feel bothered when things are not done the right way.',
  103: 'An inner critical voice often points out my mistakes and imperfections.',
  104: 'I feel responsible for improving the environment around me.',
  105: 'I am very demanding with myself when I make mistakes.',
  106: 'I find it hard to relax when something important was not done properly.',
  201: 'I anticipate people’s needs before they even express them.',
  202: 'I prefer being the person who helps rather than the person who asks for help.',
  203: 'I feel my value comes from being useful and indispensable to others.',
  204: 'Making another person feel good brings me genuine satisfaction.',
  205: 'Sometimes I neglect my own needs to take care of others.',
  206: 'I feel uncomfortable when I do not have someone to support or care for.',
  301: 'I care about how I am perceived in professional contexts.',
  302: 'I adapt how I present myself depending on the audience in front of me.',
  303: 'I am driven by goals, achievements, and concrete results.',
  304: 'Efficiency is something I deeply value in myself and in others.',
  305: 'Wasting time or being inefficient bothers me deeply.',
  306: 'I easily identify what is needed to succeed in any context.',
  401: 'I feel fundamentally different from most people.',
  402: 'I have an intense relationship with melancholy and nostalgia.',
  403: 'I need life to have depth, beauty, and meaning.',
  404: 'Sometimes I feel that something important is missing from my life.',
  405: 'I prefer authentic and unique experiences over conventional ones.',
  406: 'I experience emotions very intensely, both positive and negative.',
  501: 'I need a lot of time alone to recharge my energy.',
  502: 'I prefer to observe and analyze a situation before participating in it.',
  503: 'I have intense curiosity and love going deep into specific topics.',
  504: 'I protect my space, time, and energy very carefully.',
  505: 'I prefer to think calmly before making any decision.',
  506: 'When I am emotionally overwhelmed, my instinct is to isolate myself.',
  601: 'I often anticipate problems or negative scenarios before they happen.',
  602: 'Loyalty and trust are central values in my life.',
  603: 'I question people’s motivations before fully trusting them.',
  604: 'I feel anxious when making important decisions without support from people I trust.',
  605: 'I need references or approval from people I trust to feel secure.',
  606: 'I usually prepare backup plans in case something goes wrong.',
  701: 'I get bored easily with routines and constantly seek new experiences.',
  702: 'I get excited about possibilities and future plans.',
  703: 'I find it hard to stay with negative feelings for very long.',
  704: 'I prefer keeping options open rather than committing to one direction.',
  705: 'I easily find the positive side of almost any situation.',
  706: 'I often start new projects before finishing previous ones.',
  801: 'I am not afraid of conflict; sometimes I even feel more alive in it.',
  802: 'I strongly protect the people I love or those who are vulnerable.',
  803: 'I need to have control over my life and do not accept feeling controlled.',
  804: 'I am direct and prefer a hard truth over a gentle lie.',
  805: 'I find it difficult to show vulnerability or weakness to others.',
  806: 'I get angry when I perceive injustice or manipulation around me.',
  901: 'I avoid conflict and prefer finding ways to mediate disagreements.',
  902: 'Sometimes I lose sight of what I want because I am focused on what others want.',
  903: 'I feel comfortable with calm and predictable routines.',
  904: 'I find it hard to say no to people I like.',
  905: 'I can easily see the merit in completely opposite perspectives.',
  906: 'Sometimes I postpone important decisions to avoid tension or conflict.',
};

const EN_QUESTION_IDS = Object.keys(QUESTION_TEXT_EN).map((id) => parseInt(id, 10));

const AREA_LABELS_EN = {
  comercial: 'Sales',
  rh: 'HR',
  financeiro: 'Finance',
  tecnologia: 'Technology',
  outros: 'Other',
  produto: 'Product',
  cs: 'Customer Success',
  atendimento: 'Support',
  marketing: 'Marketing',
  operacoes: 'Operations/Projects',
  juridico: 'Legal/Compliance',
};

export function getTypeData(locale) {
  if (normalizeLocale(locale) !== 'en') return TYPE_DATA;
  const out = {};
  for (let t = 1; t <= 9; t++) {
    out[t] = { ...TYPE_DATA[t], ...TYPE_DATA_EN[t], emoji: TYPE_DATA[t].emoji, color: TYPE_DATA[t].color };
  }
  return out;
}

export function getScaleLabels(locale) {
  return normalizeLocale(locale) === 'en' ? SCALE_LABELS_EN : SCALE_LABELS;
}

export function drawLocalizedQuestions(locale) {
  const loc = normalizeLocale(locale);
  if (loc === 'en') {
    return QUESTION_BANK.filter((q) => EN_QUESTION_IDS.includes(q.id)).map((q) => ({
      ...q,
      text: QUESTION_TEXT_EN[q.id] || q.text,
    }));
  }
  return drawQuestions().map((q) => ({
    ...q,
    text: q.text,
  }));
}

export function localizeAreaLabel(area, locale) {
  if (normalizeLocale(locale) !== 'en') return area?.label || '';
  return AREA_LABELS_EN[area?.key] || area?.label || '';
}
