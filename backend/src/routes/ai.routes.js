import { Router } from 'express';
import prisma from '../lib/prisma.js';
import * as ai from '../lib/ai.js';

const router = Router();

const MAX_MESSAGE_LEN = 600;
// LLM-д дамжуулах контекстийг хязгаарлана — токен зардал болон сессийн
// урттай учир зайлшгүй өсөх зардлаас сэргийлнэ.
const MAX_HISTORY = 8;

// ── POST /ai/chat ── (нэвтрэлт шаардахгүй — ChatWidget нийтэд нээлттэй тул.
// aiLimiter-ээр давхар хамгаалагдсан, тохируулаагүй үед 503 буцаана —
// frontend үүнийг локал rule-based хариулт руу шилжих дохио болгон ашиглана.)
router.post('/chat', async (req, res, next) => {
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
    next(err);
  }
});

export default router;
