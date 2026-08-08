// Жинхэнэ Anthropic Claude API холболт — ANTHROPIC_API_KEY тохируулаагүй үед
// isConfigured() false, ChatWidget.jsx локал rule-based хариулт руугаа
// автоматаар унана (Google OAuth/QPay-тэй ижил demo-fallback хэв маяг).
import { config } from '../config/env.js';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 400;

export function isConfigured() {
  return !!config.ANTHROPIC_API_KEY;
}

// Хиймэл тоо зохиохоос сэргийлж, өгсөн баримтаас өөрийг хэлэхгүй байхыг
// шаардана — амьд статистикийг хүсэлт бүрт шинээр дамжуулна.
function buildSystemPrompt(stats) {
  return `You are KREATIV AI, the support assistant embedded in the KREATIV freelance marketplace website. Keep replies short (2-4 sentences) — this is a chat widget, not an essay. Be warm, direct, and specific.

Only state facts you're given below — never invent statistics, feature names, or policies that aren't listed here. If you don't know something, say so plainly and suggest the person browse the relevant page instead of guessing.

Real, current platform facts:
- Fees: Starter is free with a 10% escrow commission. Pro is $29/mo with 5% commission, unlimited proposals, and AI matchmaking. Enterprise is custom-priced with 2% commission.
- Escrow: clients fund the full milestone amount before work begins; funds are locked until the client approves the milestone, then released instantly.
- Disputes: either side can open a dispute from the project tracker; the contract freezes, both sides submit evidence within 24h, and a human specialist decides within 48h.
- Payments: KREATIV uses QPay for real deposits/withdrawals; demo accounts simulate the same flow without moving real money.
- Live stats right now: ${stats.freelancers} freelancers, ${stats.clients} clients, ${stats.jobs} jobs posted (${stats.openJobs} currently open, ${stats.completedJobs} completed).

If asked something unrelated to KREATIV (general trivia, coding help, etc.), politely redirect back to what you can help with on the platform.`;
}

async function callAnthropic({ system, messages, maxTokens = MAX_TOKENS }) {
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
    // өгнө — route үүнийг 503 болгож буцаана, ингэснээр ChatWidget локал
    // хариулт руугаа шилжиж, хүсэлт бүрд дэмий дахин оролдохоо болино.
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

export async function chat(messages, stats) {
  return callAnthropic({ system: buildSystemPrompt(stats), messages });
}

const JOB_CATEGORIES = ['Design', 'Dev', 'AI', 'Motion', 'Writing', 'Marketing'];

// FR-1.2: захиалагчийн товч, чөлөөтэй бичсэн санааг бүтэцтэй ажлын зар болгож
// хувиргана. Хатуу JSON бүтэц шаардаж, parse хийхэд амжилтгүй бол алдаа шиднэ
// (хагас broken зар үүсгэхийн оронд).
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

  const text = await callAnthropic({
    system,
    messages: [{ role: 'user', content: idea }],
    maxTokens: 500,
  });

  let draft;
  try {
    draft = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
  } catch {
    throw new Error('AI-ийн хариуг боловсруулж чадсангүй. Дахин оролдоно уу.');
  }
  if (!draft.title || !draft.description || !Array.isArray(draft.skills)) {
    throw new Error('AI-ийн хариу дутуу байна. Дахин оролдоно уу.');
  }
  if (!JOB_CATEGORIES.includes(draft.category)) draft.category = 'Dev';
  draft.budgetType = draft.budgetType === 'HOURLY' ? 'HOURLY' : 'FIXED';
  return draft;
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

  const payload = {
    originalBrief: brief,
    milestone,
    kanbanTasks: tasks,
    chatTranscript,
    disputeReason: reason,
  };

  const text = await callAnthropic({
    system,
    messages: [{ role: 'user', content: JSON.stringify(payload) }],
    maxTokens: 700,
  });

  let analysis;
  try {
    analysis = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
  } catch {
    throw new Error('AI-ийн хариуг боловсруулж чадсангүй. Дахин оролдоно уу.');
  }
  if (!['FREELANCER', 'CLIENT', 'SPLIT'].includes(analysis.recommendation)) {
    throw new Error('AI-ийн хариу дутуу байна. Дахин оролдоно уу.');
  }
  if (!['low', 'medium', 'high'].includes(analysis.confidence)) analysis.confidence = 'medium';
  if (!Array.isArray(analysis.keyEvidence)) analysis.keyEvidence = [];
  return analysis;
}
