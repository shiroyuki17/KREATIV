// Google Gemini (AI Studio) холболт.
//
// Түлхүүрээ https://aistudio.google.com/api-keys дээрээс авна.
// GEMINI_API_KEY тохируулаагүй бол isConfigured() false буцаах бөгөөд
// дуудагч тал (jobSearchAI.js) энгийн түлхүүр үгийн хайлт руугаа автоматаар
// унана — Anthropic/QPay/S3-той ижил fallback хэв маяг.
//
// SDK суулгаагүй, зориуд REST-ээр: нэг л endpoint дуудна, шинэ dependency
// нэмэх нь зөвтгөгдөхгүй.
import { config } from '../config/env.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export function isConfigured() {
  return !!config.GEMINI_API_KEY;
}

/**
 * Structured output — responseSchema өгснөөр загвар нь ЗААВАЛ тухайн
 * бүтэцтэй JSON буцаана. Prompt дотор "JSON-оор хариул" гэж гуйхаас
 * хамаагүй найдвартай: markdown fence, тайлбар текст зэрэг ороод parse
 * унах асуудал үүсэхгүй.
 *
 * @param {object} opts
 * @param {string} opts.system   - системийн заавар
 * @param {string} opts.user     - хэрэглэгчийн текст
 * @param {object} opts.schema   - OpenAPI-маягийн responseSchema
 * @param {number} [opts.maxOutputTokens]
 * @param {number} [opts.timeoutMs]
 */
export async function generateJson({
  system,
  user,
  schema,
  maxOutputTokens = 400,
  timeoutMs = 8000,
}) {
  if (!config.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY тохируулаагүй байна');

  // Хугацааны хязгаар: AI унасан/удаашралтай үед хэрэглэгчийг тодорхойгүй
  // хугацаагаар хүлээлгэхгүй — fallback руу шилжих нь хамаагүй дээр.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(
      `${BASE}/${config.GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': config.GEMINI_API_KEY,
          'content-type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            maxOutputTokens,
            // Шүүлтүүр гаргах ажилд бүтээлч байх шаардлагагүй — ижил
            // хүсэлтэд ижил хариу өгөх нь илүү чухал.
            temperature: 0,
          },
        }),
      }
    );
  } catch (err) {
    const wrapped = new Error(
      err.name === 'AbortError' ? 'Gemini хугацаа хэтэрлээ' : `Gemini холболтын алдаа: ${err.message}`
    );
    wrapped.upstream = true;
    throw wrapped;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Gemini API алдаа: ${res.status} ${body.slice(0, 300)}`);
    err.upstream = true;
    err.upstreamStatus = res.status;
    throw err;
  }

  const data = await res.json();

  // Safety filter эсвэл токен дуусалт — хоосон хариу ирж болно.
  const finish = data.candidates?.[0]?.finishReason;
  if (finish && finish !== 'STOP') {
    const err = new Error(`Gemini хариуг дуусгасангүй (${finish})`);
    err.upstream = true;
    throw err;
  }

  const text = (data.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text)
    .filter(Boolean)
    .join('')
    .trim();

  if (!text) {
    const err = new Error('Gemini хоосон хариу буцаалаа');
    err.upstream = true;
    throw err;
  }

  try {
    return JSON.parse(text);
  } catch {
    const err = new Error('Gemini-ийн хариуг JSON болгож задалж чадсангүй');
    err.upstream = true;
    throw err;
  }
}
