import { Router } from 'express';
import prisma from '../lib/prisma.js';
import * as ai from '../lib/ai.js';
import { requireAuth } from '../middleware/auth.js';
import { config } from '../config/env.js';
import { logError } from '../lib/logger.js';
import { promptToFilters } from '../lib/jobSearchAI.js';
import { searchJobs } from '../lib/jobSearch.js';
import { jobQuerySchema } from '../validators/job.schema.js';
import { isConfigured as geminiConfigured } from '../lib/gemini.js';
import { aiLimiter, aiSearchLimiter } from '../middleware/rateLimit.js';

const router = Router();

const MAX_MESSAGE_LEN = 600;
// LLM-д дамжуулах контекстийг хязгаарлана — токен зардал болон сессийн
// урттай учир зайлшгүй өсөх зардлаас сэргийлнэ.
const MAX_HISTORY = 8;

// ── POST /ai/chat ── (нэвтрэлт шаардахгүй — ChatWidget нийтэд нээлттэй тул.
// aiLimiter-ээр давхар хамгаалагдсан, тохируулаагүй үед 503 буцаана —
// frontend үүнийг локал rule-based хариулт руу шилжих дохио болгон ашиглана.)
router.post('/chat', aiLimiter, async (req, res, next) => {
  try {
    if (!ai.isConfigured()) {
      return res.status(503).json({ error: 'AI тохируулагдаагүй байна' });
    }

    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages массив шаардлагатай' });
    }

    const trimmed = messages
      .slice(-MAX_HISTORY)
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || '').slice(0, MAX_MESSAGE_LEN),
      }))
      .filter((m) => m.content.trim().length > 0);

    if (trimmed.length === 0) {
      return res.status(400).json({ error: 'Хоосон мессеж' });
    }

    const [freelancers, clients, jobs, openJobs, completedJobs] = await Promise.all([
      prisma.freelancerProfile.count(),
      prisma.clientProfile.count(),
      prisma.job.count(),
      prisma.job.count({ where: { status: 'OPEN' } }),
      prisma.job.count({ where: { status: 'CLOSED' } }),
    ]);

    const text = await ai.chat(trimmed, { freelancers, clients, jobs, openJobs, completedJobs });
    res.json({ text });
  } catch (err) {
    // Дээд урсгал унасан бол (кредит дууссан, rate limit, тасалдал) 503
    // буцаана — тохируулаагүй үеийнхтэй ижил дохио, ChatWidget локал
    // хариулт руугаа шилжинэ. Бусад алдаа энгийнээрээ 500 болно.
    if (err?.upstream) {
      console.error('AI upstream unavailable:', err.message);
      return res.status(503).json({ error: 'AI түр боломжгүй байна' });
    }
    next(err);
  }
});

// ── POST /ai/job-draft ── (FR-1.2 — PostJob wizard-ийн "Draft with AI" товч.
// Нэвтэрсэн хэрэглэгч л дуудна, тохируулаагүй үед 503 — frontend товчоо
// нуух/идэвхгүй болгох дохио болгон ашиглана.)
router.post('/job-draft', aiLimiter, requireAuth, async (req, res, next) => {
  try {
    if (!ai.isConfigured()) {
      return res.status(503).json({ error: 'AI тохируулагдаагүй байна' });
    }
    const idea = String(req.body.idea || '').trim().slice(0, 500);
    if (idea.length < 8) {
      return res.status(400).json({ error: 'Санаагаа арай дэлгэрэнгүй бичнэ үү' });
    }
    const draft = await ai.generateJobDraft(idea);
    res.json(draft);
  } catch (err) {
    if (err?.upstream) {
      console.error('AI upstream unavailable:', err.message);
      return res.status(503).json({ error: 'AI түр боломжгүй байна' });
    }
    next(err);
  }
});

// ── POST /ai/job-search ──
//
// Хэрэглэгч шаардлагаа чөлөөтэй бичнэ → Gemini түүнийг ШҮҮЛТҮҮР болгоно →
// бид ердийн хайлтын query-гээ ажиллуулна. Загвар ажлын жагсаалтыг хэзээ ч
// өөрөө гаргахгүй (lib/jobSearchAI.js-ийн тайлбарыг үзнэ үү).
//
// Хязгаарлалтууд, давхарга давхаргаар:
//   1. requireAuth — зөвхөн нэвтэрсэн хэрэглэгч (зочин LLM зарцуулж чадахгүй)
//   2. aiSearchLimiter — IP-ийн түвшинд 15 минутад 60
//   3. Хэрэглэгчийн ӨДРИЙН квот (AI_SEARCH_DAILY_LIMIT, өгөгдмөл 40)
//   4. Prompt-ийн урт MAX_PROMPT_LENGTH-ээр таслагдана
//   5. Gemini талд maxOutputTokens=300, timeout 8s, temperature 0
//   6. Аль нэг нь унавал → түлхүүр үгийн хайлт (хэрэглэгч хоосон хардаггүй)
const aiSearchUsage = new Map(); // userId -> { day, count }

function dayStamp() {
  return new Date().toISOString().slice(0, 10);
}

// Санах ойд хадгална: нэг instance-тай (Render дээр) тул хангалттай, мөн
// квот хэтрэх нь аюулгүй байдлын хил биш — зардлын хамгаалалт. Restart
// хийхэд тэглэгдэх нь хүлээн зөвшөөрөгдөнө.
function consumeDailyQuota(userId) {
  const today = dayStamp();
  const entry = aiSearchUsage.get(userId);
  if (!entry || entry.day !== today) {
    aiSearchUsage.set(userId, { day: today, count: 1 });
    return { ok: true, remaining: config.AI_SEARCH_DAILY_LIMIT - 1 };
  }
  if (entry.count >= config.AI_SEARCH_DAILY_LIMIT) {
    return { ok: false, remaining: 0 };
  }
  entry.count += 1;
  return { ok: true, remaining: config.AI_SEARCH_DAILY_LIMIT - entry.count };
}

// Map хязгааргүй өсөхөөс сэргийлж, өдөр солигдоход хуучныг цэвэрлэнэ.
setInterval(() => {
  const today = dayStamp();
  for (const [k, v] of aiSearchUsage) if (v.day !== today) aiSearchUsage.delete(k);
}, 60 * 60 * 1000).unref?.();

router.post('/job-search', aiSearchLimiter, requireAuth, async (req, res, next) => {
  try {
    const prompt = String(req.body?.prompt || '').trim();
    if (prompt.length < 3) {
      return res.status(400).json({ error: 'Хайх зүйлээ арай дэлгэрэнгүй бичнэ үү' });
    }

    // Квотыг ЗӨВХӨН AI үнэхээр дуудагдах үед л зарцуулна — Gemini
    // тохируулаагүй үед энэ бол ердийн түлхүүр үгийн хайлт, хязгаарлах
    // шалтгаангүй.
    let remaining = null;
    if (geminiConfigured()) {
      const quota = consumeDailyQuota(req.user.id);
      if (!quota.ok) {
        return res.status(429).json({
          error: `Өдрийн AI хайлтын хязгаарт (${config.AI_SEARCH_DAILY_LIMIT}) хүрлээ. Маргааш дахин оролдоно уу.`,
        });
      }
      remaining = quota.remaining;
    }

    const { filters, interpretation, source } = await promptToFilters(prompt);

    // Загварын гаргасныг ердийн хайлтын schema-гаар ДАХИН шалгана —
    // хуудаслалт, хязгаарууд ижилхэн үйлчилнэ.
    const parsed = jobQuerySchema.safeParse({
      ...filters,
      page: req.body?.page ?? 1,
      pageSize: req.body?.pageSize ?? 12,
    });
    if (!parsed.success) {
      // Энэ нь загварын биш, манай кодын алдаа — sanitizeFilters-ийг
      // өнгөрсөн зүйл schema-д унах ёсгүй.
      logError(new Error('AI шүүлтүүр schema-д тэнцсэнгүй'), { filters });
      return res.json({ ...(await searchJobs(jobQuerySchema.parse({ q: prompt.slice(0, 200) }))), filters: {}, interpretation: '', source: 'keyword' });
    }

    const results = await searchJobs(parsed.data);

    res.json({
      ...results,
      // Хэрэглэгчид "чамайг ингэж ойлголоо" гэж ил харуулна — AI-ийн
      // сонголтыг далд байлгах нь итгэл алдагдуулна, мөн буруу ойлгосныг
      // засах боломж өгнө.
      filters,
      interpretation,
      source,
      quotaRemaining: remaining,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
