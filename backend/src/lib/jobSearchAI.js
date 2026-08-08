// Чөлөөт бичвэр → ажлын хайлтын ШҮҮЛТҮҮР.
//
// Зарчим (энэ нь аюулгүй байдлын хувьд хамгийн чухал хэсэг):
//
//   Загвар нь ажлын жагсаалтыг ХЭЗЭЭ Ч гаргадаггүй. Түүний цорын ганц
//   ажил бол хэрэглэгчийн бичсэн зүйлээс ШҮҮЛТҮҮРИЙН УТГА сонгох. Жагсаалтыг
//   дараа нь бид өөрсдийн Prisma query-гээр гаргана — яг л энгийн хайлттай
//   ижил кодоор.
//
// Иймд:
//   • Загвар ажил зохиож (hallucinate) чадахгүй — DB-д байгаа нь л гарна.
//   • Хандах эрхийн шүүлт (status/moderationStatus) загварын мэдэлд байхгүй.
//   • Загварт ямар ч ажлын өгөгдөл ИЛГЭЭХГҮЙ — зардал бага, нууцлал хэвээр.
//
// Загварын гаргасан бүх утгыг цагаан жагсаалтаар шалгана: категори нь
// CATEGORIES enum-аас, ур чадвар нь DB-д БОДИТООР байгаа тагуудаас. Тэгэхгүй
// бол загвар "React.js" гэж бичээд (бодит таг нь "React") 0 үр дүн гарна.
import { CATEGORIES } from '../validators/job.schema.js';
import * as gemini from './gemini.js';
import prisma from './prisma.js';

export const MAX_PROMPT_LENGTH = 400;

// DB-д бодитоор байгаа ур чадварын тагууд. Шинэ зар нэмэгдэхэд өөрчлөгддөг
// тул кэшлээд үе үе шинэчилнэ — хүсэлт бүрд DISTINCT хийвэл дэмий ачаалал.
let skillCache = { values: [], at: 0 };
const SKILL_CACHE_MS = 5 * 60 * 1000;

async function knownSkills() {
  if (Date.now() - skillCache.at < SKILL_CACHE_MS && skillCache.values.length) {
    return skillCache.values;
  }
  const rows = await prisma.job.findMany({
    where: { status: 'OPEN', moderationStatus: 'APPROVED' },
    select: { skills: true },
    take: 500,
  });
  const values = [...new Set(rows.flatMap((r) => r.skills || []))].sort();
  skillCache = { values, at: Date.now() };
  return values;
}

// Gemini-ийн responseSchema. `enum` ашигласнаар загвар зөвхөн эдгээр
// утгуудаас л сонгож чадна — prompt дотор "зөвхөн эдгээрээс сонго" гэж
// гуйхаас хамаагүй хатуу.
function buildSchema(skills) {
  return {
    type: 'object',
    properties: {
      q: {
        type: 'string',
        description: 'Free-text keywords for title/description search. Empty string if not useful.',
      },
      category: { type: 'string', enum: CATEGORIES },
      type: { type: 'string', enum: ['FIXED', 'HOURLY'] },
      skills: {
        type: 'array',
        items: skills.length ? { type: 'string', enum: skills } : { type: 'string' },
        maxItems: 6,
      },
      minBudget: { type: 'integer' },
      maxBudget: { type: 'integer' },
      // Хэрэглэгчид "чамайг ингэж ойлголоо" гэж харуулах богино тайлбар —
      // AI юуг яагаад сонгосныг ил болгоно.
      interpretation: { type: 'string' },
    },
    required: ['interpretation'],
  };
}

function buildSystemPrompt(skills) {
  return `You convert a freelancer's free-text description of the work they want into search filters for the KREATIV job board.

You do NOT answer questions, write jobs, or list jobs. You ONLY output filter values.

Rules:
- category: pick at most one, only if the text clearly implies it. Omit when unsure.
- skills: only tags that genuinely match the request. Omit the field entirely rather than guessing.
- type: "HOURLY" only if they mention hourly/ongoing/retainer work; "FIXED" only if they mention a fixed project/one-off. Otherwise omit.
- minBudget/maxBudget: whole US dollars. Only set these if the text mentions money or a rate. Never invent a budget.
- q: 1-4 keywords that would appear in a job title or description. Leave empty if category/skills already capture the request.
- interpretation: one short sentence, in the SAME LANGUAGE the user wrote in, describing how you read their request.

Omitting a filter is always better than guessing one. A too-narrow filter returns nothing, which is worse than a broad result.

Available skill tags: ${skills.length ? skills.join(', ') : '(none yet)'}`;
}

/**
 * Prompt-оос шүүлтүүр гаргана.
 *
 * @returns {Promise<{ filters: object, interpretation: string, source: 'ai'|'keyword' }>}
 *   `source: 'keyword'` нь AI тохируулаагүй/унасан үед — prompt-ыг шууд
 *   түлхүүр үг болгон ашиглана. Хэрэглэгч хоосон дэлгэц харахгүй.
 */
export async function promptToFilters(prompt) {
  const text = String(prompt || '').trim().slice(0, MAX_PROMPT_LENGTH);
  if (!text) throw new Error('Хайх зүйлээ бичнэ үү');

  if (!gemini.isConfigured()) {
    return { filters: await keywordFallback(text), interpretation: '', source: 'keyword' };
  }

  const skills = await knownSkills();

  let raw;
  try {
    raw = await gemini.generateJson({
      system: buildSystemPrompt(skills),
      user: text,
      schema: buildSchema(skills),
      maxOutputTokens: 300,
    });
  } catch (err) {
    // AI унасан ч хайлт ажиллах ёстой — түлхүүр үгээр үргэлжлүүлнэ.
    err.fallbackUsed = true;
    return { filters: await keywordFallback(text), interpretation: '', source: 'keyword', error: err };
  }

  return {
    filters: sanitizeFilters(raw, skills),
    interpretation: String(raw.interpretation || '').slice(0, 300),
    source: 'ai',
  };
}

/**
 * AI байхгүй/унасан үеийн хайлт.
 *
 * Бүтэн өгүүлбэрийг шууд `q` болгож болохгүй: `q` нь гарчиг/тайлбар дотроос
 * ЯГ ТЭР мөрийг хайдаг тул "React dashboard work" гэх мэт хэдэн үгтэй хүсэлт
 * бараг үргэлж 0 үр дүн өгнө. Оронд нь мэдэгдэж буй ур чадвар, категорийн
 * нэрсийг бичвэрээс таньж шүүлтүүр болгоно; юу ч танигдаагүй үед л хамгийн
 * утга агуулсан (хамгийн урт) үгээр хайна.
 */
export async function keywordFallback(text) {
  const lower = text.toLowerCase();
  const skills = await knownSkills();

  const matchedSkills = skills.filter((s) => lower.includes(s.toLowerCase()));
  const matchedCategory = CATEGORIES.find((c) => lower.includes(c.toLowerCase()));

  const filters = {};
  if (matchedSkills.length) filters.skills = matchedSkills.slice(0, 6).join(',');
  if (matchedCategory) filters.category = matchedCategory;

  if (/hourly|ретейнер|цагийн/i.test(text)) filters.type = 'HOURLY';
  else if (/fixed|тогтмол/i.test(text)) filters.type = 'FIXED';

  // Ур чадвар/категори аль нь ч танигдаагүй бол л түлхүүр үг рүү шилжинэ.
  if (!filters.skills && !filters.category) {
    const words = text
      .split(/[^\p{L}\p{N}.+#]+/u)
      .filter((w) => w.length >= 3)
      // Хамгийн урт үг нь ихэвчлэн хамгийн онцлог нь ("dashboard" > "work").
      .sort((a, b) => b.length - a.length);
    if (words.length) filters.q = words[0].slice(0, 200);
  }

  return filters;
}

/**
 * Загварын гаргасныг ЦАГААН ЖАГСААЛТААР шалгана.
 *
 * responseSchema-ийн enum нь ихэнх тохиолдолд хангалттай ч түүнд бүрэн
 * найдаж болохгүй: энэ нь загварын хариуг чиглүүлдэг болохоос гэрээ биш.
 * Тиймээс сервер тал дээр дахин шалгана — "хэзээ ч клиентэд/загварт
 * итгэхгүй" зарчим.
 */
export function sanitizeFilters(raw, skills) {
  const out = {};

  if (typeof raw.q === 'string' && raw.q.trim()) {
    out.q = raw.q.trim().slice(0, 200);
  }

  if (CATEGORIES.includes(raw.category)) out.category = raw.category;
  if (raw.type === 'FIXED' || raw.type === 'HOURLY') out.type = raw.type;

  if (Array.isArray(raw.skills)) {
    const allowed = new Set(skills);
    // skills хоосон бол (шинэ DB) цагаан жагсаалтаар шүүхгүй — эс тэгвээс
    // бүх ур чадвар хаягдана.
    const picked = raw.skills
      .filter((s) => typeof s === 'string' && s.trim())
      .map((s) => s.trim())
      .filter((s) => (allowed.size ? allowed.has(s) : true))
      .slice(0, 6);
    if (picked.length) out.skills = picked.join(',');
  }

  const budget = (v) =>
    Number.isFinite(v) && v >= 0 && v <= 10_000_000 ? Math.round(v) : null;
  const min = budget(raw.minBudget);
  const max = budget(raw.maxBudget);
  if (min != null) out.minBudget = min;
  if (max != null) out.maxBudget = max;
  // Загвар мужийг эсрэгээр өгвөл хэзээ ч үр дүн гарахгүй — сольж засна.
  if (out.minBudget != null && out.maxBudget != null && out.minBudget > out.maxBudget) {
    [out.minBudget, out.maxBudget] = [out.maxBudget, out.minBudget];
  }

  return out;
}
