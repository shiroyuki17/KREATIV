// Жинхэнэ AI холболт — Anthropic Claude-г эхлээд оролдож, кредит дуусах/rate
// limit/тасалдал зэрэг upstream алдаа гарвал Gemini рүү автоматаар шилждэг
// (хоёулаа тохируулаагүй үед л ChatWidget.jsx локал rule-based хариулт руугаа
// унана — Google OAuth/QPay-тэй ижил demo-fallback хэв маяг).
import { config } from '../config/env.js';
import * as gemini from './gemini.js';
import { PLANS } from './plans.js';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 400;

export function isConfigured() {
  return !!config.ANTHROPIC_API_KEY || gemini.isConfigured();
}

async function callAnthropicRaw({ system, messages, maxTokens = MAX_TOKENS }) {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': config.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  });

  if (!res.ok) {
    const body = await res.text();
    // Дээд урсгалын алдааг (кредит дуусах, rate limit, тасалдал) тэмдэглэж
    // өгнө — эндээс Gemini рүү шилжинэ, хоёулаа унасан үед л route 503
    // буцаана.
    const err = new Error(`Anthropic API алдаа: ${res.status} ${body}`);
    err.upstream = true;
    err.upstreamStatus = res.status;
    throw err;
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
  if (!text) throw new Error('Anthropic API хоосон хариу буцаалаа');
  return text;
}

/**
 * Anthropic-г эхлээд оролдоно; тохируулаагүй эсвэл upstream алдаатай бол
 * (кредит дуусах гэх мэт) `geminiCall`-ыг ажиллуулна. Аль аль нь боломжгүй
 * бол сүүлийн алдааг шидэнэ (route 503 болгож буцаана).
 */
async function withFallback(anthropicMessages, anthropicOpts, geminiCall) {
  if (config.ANTHROPIC_API_KEY) {
    try {
      return await callAnthropicRaw({ ...anthropicOpts, messages: anthropicMessages });
    } catch (err) {
      if (!err.upstream || !gemini.isConfigured()) throw err;
      // Anthropic-ийн upstream алдаа (жишээ нь кредит дуусах) — Gemini рүү шилжинэ.
    }
  } else if (!gemini.isConfigured()) {
    const err = new Error('AI тохируулагдаагүй байна');
    err.notConfigured = true;
    throw err;
  }
  return geminiCall();
}

// Хиймэл тоо зохиохоос сэргийлж, өгсөн баримтаас өөрийг хэлэхгүй байхыг
// шаардана — амьд статистикийг хүсэлт бүрт шинээр дамжуулна.
//
// Үнийг PLANS-аас уншина, гараар бичихгүй: өмнө нь энд "$29/mo" гэж
// хатуу бичсэн байсан бөгөөд бодит Stripe үнэ нь $29.99 болсноор бот
// хэрэглэгчид буруу дүн хэлдэг байв.
function buildSystemPrompt(stats, locale) {
  const fee = (key) => {
    const p = PLANS[key];
    return p.monthlyUsd === null ? 'custom-priced' : p.monthlyUsd === 0 ? 'free' : `$${p.monthlyUsd}/mo`;
  };
  // Хэрэглэгчийн сонгосон хэлээр хариулна — интерфэйс монгол байхад бот
  // англиар ярих нь хамгийн их анзаарагддаг зөрүү.
  const language = locale === 'en'
    ? 'Reply in English.'
    : 'Reply in Mongolian (Cyrillic). Keep product names like KREATIV, Pro, Starter and escrow as they are.';

  return `You are KREATIV AI, the support assistant embedded in the KREATIV freelance marketplace website. Keep replies short (2-4 sentences) — this is a chat widget, not an essay. Be warm, direct, and specific. ${language}

Only state facts you're given below — never invent statistics, feature names, or policies that aren't listed here. If you don't know something, say so plainly and suggest the person browse the relevant page instead of guessing.

Real, current platform facts:
- Fees: Starter is ${fee('starter')} with a ${PLANS.starter.commissionPct}% escrow commission. Pro is ${fee('pro')} with ${PLANS.pro.commissionPct}% commission, unlimited proposals, and AI matchmaking. There are only these two plans — never mention an Enterprise or custom-priced tier.
- Escrow: clients fund the full milestone amount before work begins; funds are locked until the client approves the milestone, then released instantly.
- Disputes: either side can open a dispute from the project tracker; the contract freezes, both sides submit evidence within 24h, and a human specialist decides within 48h.
- Payments: KREATIV uses QPay for real deposits/withdrawals; demo accounts simulate the same flow without moving real money.
- Live stats right now: ${stats.freelancers} freelancers, ${stats.clients} clients, ${stats.jobs} jobs posted (${stats.openJobs} currently open, ${stats.completedJobs} completed).

If asked something unrelated to KREATIV (general trivia, coding help, etc.), politely redirect back to what you can help with on the platform.`;
}

export async function chat(messages, stats, locale) {
  const system = buildSystemPrompt(stats, locale);
  const userText = messages.map((m) => m.content).join('\n\n');
  const result = await withFallback(messages, { system }, () =>
    gemini.generateJson({
      system: `${system}\n\nRespond with ONLY valid JSON: {"reply": string} — "reply" holds your full plain-text chat response (no markdown JSON inside it).`,
      user: userText,
      schema: { type: 'object', properties: { reply: { type: 'string' } }, required: ['reply'] },
      // gemini-flash-ийн "thinking" горим гаралтын token хязгаараас урьдчилан
      // зарцуулдаг тул жижиг хязгаар (жишээ нь 400) хариу гарахаас өмнө
      // MAX_TOKENS алдаа өгдөг байсан — их хэмжээгээр нэмэгдүүлсэн.
      maxOutputTokens: 1500,
    })
  );
  return typeof result === 'string' ? result : result.reply;
}

const JOB_CATEGORIES = ['Design', 'Dev', 'AI', 'Motion', 'Writing', 'Marketing'];

function sanitizeJobDraft(draft) {
  if (!draft.title || !draft.description || !Array.isArray(draft.skills)) {
    throw new Error('AI-ийн хариу дутуу байна. Дахин оролдоно уу.');
  }
  if (!JOB_CATEGORIES.includes(draft.category)) draft.category = 'Dev';
  draft.budgetType = draft.budgetType === 'HOURLY' ? 'HOURLY' : 'FIXED';
  return draft;
}

// FR-1.2: захиалагчийн товч, чөлөөтэй бичсэн санааг бүтэцтэй ажлын зар болгож
// хувиргана. Хатуу JSON бүтэц шаардаж, parse хийхэд амжилтгүй бол алдаа шиднэ
// (хагас broken зар үүсгэхийн оронд).
/**
 * Ерөнхий "JSON буцаа" дуудлага — Anthropic эхэлж, унавал Gemini.
 *
 * Яагаад хэрэгтэй болов: jobSearchAI.js нь ЗӨВХӨН gemini.isConfigured()-ыг
 * шалгадаг байсан тул зөвхөн ANTHROPIC_API_KEY тохируулсан орчинд AI хайлт
 * ажиллахгүй, түлхүүр үгийн хайлт руугаа унадаг байв — тэр үед AI-ийн бусад
 * функц (job draft, dispute) хэвийн ажиллаж байхад.
 */
export async function generateJsonWithFallback({ system, user, schema, maxTokens = 500, geminiMaxOutputTokens = 1500 }) {
  const result = await withFallback(
    [{ role: 'user', content: user }],
    { system, maxTokens },
    () => gemini.generateJson({ system, user, schema, maxOutputTokens: geminiMaxOutputTokens })
  );
  // Anthropic нь түүхий текст, Gemini нь аль хэдийн object буцаадаг.
  return typeof result === 'string'
    ? JSON.parse(result.replace(/^```json\s*|\s*```$/g, ''))
    : result;
}

export async function generateJobDraft(idea) {
  const system = `You turn a short, casual freelance project idea into a structured job brief for the KREATIV marketplace. Respond with ONLY valid JSON, no markdown fences, no commentary, matching exactly this shape:
{"title": string, "description": string, "category": string, "skills": string[], "budgetType": string, "budgetMin": number, "budgetMax": number}

Rules:
- title: punchy, specific, under 80 characters
- description: 3-5 sentences, concrete and professional, no placeholder text like "[insert here]"
- category: exactly one of ${JSON.stringify(JOB_CATEGORIES)}
- skills: 3 to 6 real, specific skill tags relevant to the work (not generic filler)
- budgetType: "FIXED" or "HOURLY", whichever fits the scope described
- budgetMin/budgetMax: a realistic USD range for this kind of freelance work (integers)`;

  const geminiSchema = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      category: { type: 'string', enum: JOB_CATEGORIES },
      skills: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 6 },
      budgetType: { type: 'string', enum: ['FIXED', 'HOURLY'] },
      budgetMin: { type: 'integer' },
      budgetMax: { type: 'integer' },
    },
    required: ['title', 'description', 'category', 'skills', 'budgetType', 'budgetMin', 'budgetMax'],
  };

  const draft = await withFallback(
    [{ role: 'user', content: idea }],
    { system, maxTokens: 500 },
    async () => {
      const raw = await gemini.generateJson({ system, user: idea, schema: geminiSchema, maxOutputTokens: 2000 });
      return raw;
    },
    // Anthropic-ийн raw text-ийг JSON болгож задлана (Gemini аль хэдийн object буцаадаг).
  ).then((result) => (typeof result === 'string' ? JSON.parse(result.replace(/^```json\s*|\s*```$/g, '')) : result))
    .catch((err) => {
      if (err.notConfigured || err.upstream) throw err;
      throw new Error('AI-ийн хариуг боловсруулж чадсангүй. Дахин оролдоно уу.');
    });

  return sanitizeJobDraft(draft);
}

function sanitizeDisputeAnalysis(analysis) {
  if (!['FREELANCER', 'CLIENT', 'SPLIT'].includes(analysis.recommendation)) {
    throw new Error('AI-ийн хариу дутуу байна. Дахин оролдоно уу.');
  }
  if (!['low', 'medium', 'high'].includes(analysis.confidence)) analysis.confidence = 'medium';
  if (!Array.isArray(analysis.keyEvidence)) analysis.keyEvidence = [];
  return analysis;
}

// FR-5.2: AI Dispute Auditor — анхны brief, Kanban явц, чат түүхийг уншиж
// админд шийдвэрийн ЗӨВЛӨМЖ өгнө. Эцсийн шийдвэрийг ЗААВАЛ хүн (админ)
// гаргана — энэ функц юуг ч автоматаар шийдэхгүй, зөвхөн admin.routes.js-ийн
// /admin/disputes/:id/resolve дуудлагыг хүн хийхэд туслах зөвлөмж бэлдэнэ.
export async function analyzeDispute({ brief, milestone, tasks, chatTranscript, reason }) {
  const system = `You are an impartial dispute-resolution assistant for the KREATIV freelance marketplace. A client and freelancer disagree over whether a milestone deliverable meets the agreed brief. You will be given the original job brief, the milestone details, the contract's Kanban task history, the chat transcript between the two parties, and the dispute reason.

Analyze the evidence fairly and objectively. Cite specific evidence from the chat or task history to support your reasoning — never invent facts not present in the evidence.

Respond with ONLY valid JSON, no markdown fences, no commentary, matching exactly this shape:
{"recommendation": "FREELANCER" | "CLIENT" | "SPLIT", "confidence": "low" | "medium" | "high", "reasoning": string, "keyEvidence": string[]}

- recommendation: "FREELANCER" if the deliverable substantially meets the brief and escrow should release to the freelancer; "CLIENT" if the work clearly falls short and the client should be refunded; "SPLIT" if evidence is genuinely mixed or partial work was delivered.
- reasoning: 3-5 sentences, specific to this case, referencing the actual evidence given.
- keyEvidence: 2-4 short quotes or facts (from the chat/tasks/brief) that most influenced the recommendation.`;

  const payload = { originalBrief: brief, milestone, kanbanTasks: tasks, chatTranscript, disputeReason: reason };
  const payloadText = JSON.stringify(payload);

  const geminiSchema = {
    type: 'object',
    properties: {
      recommendation: { type: 'string', enum: ['FREELANCER', 'CLIENT', 'SPLIT'] },
      confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
      reasoning: { type: 'string' },
      keyEvidence: { type: 'array', items: { type: 'string' }, maxItems: 4 },
    },
    required: ['recommendation', 'confidence', 'reasoning', 'keyEvidence'],
  };

  const analysis = await withFallback(
    [{ role: 'user', content: payloadText }],
    { system, maxTokens: 700 },
    () => gemini.generateJson({ system, user: payloadText, schema: geminiSchema, maxOutputTokens: 2500 })
  )
    .then((result) => (typeof result === 'string' ? JSON.parse(result.replace(/^```json\s*|\s*```$/g, '')) : result))
    .catch((err) => {
      if (err.notConfigured || err.upstream) throw err;
      throw new Error('AI-ийн хариуг боловсруулж чадсангүй. Дахин оролдоно уу.');
    });

  return sanitizeDisputeAnalysis(analysis);
}
