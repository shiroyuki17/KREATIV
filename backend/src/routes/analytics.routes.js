// Day 9 deliverable: "Dashboard Analytics". Frontend-ийн ClientDashboard/
// FreelancerProfile хуудсууд одоо mock дата дээр гүйдэг (Day 8 интеграц хийгдээгүй) —
// энэ endpoint бол тэдгээрийг холбоход бэлэн, бодит DB дээр тооцоолсон summary.
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const EMPTY_STATUS_COUNTS = { OPEN: 0, IN_PROGRESS: 0, CLOSED: 0, CANCELLED: 0 };

// ── GET /analytics/public ── (нэвтрэлт шаардахгүй — Home хуудасны статистик)
router.get('/public', async (req, res, next) => {
  try {
    const [freelancers, clients, jobs, openJobs, completedJobs] = await Promise.all([
      prisma.freelancerProfile.count(),
      prisma.clientProfile.count(),
      prisma.job.count(),
      prisma.job.count({ where: { status: 'OPEN' } }),
      prisma.job.count({ where: { status: 'CLOSED' } }),
    ]);
    res.json({ freelancers, clients, jobs, openJobs, completedJobs });
  } catch (err) {
    next(err);
  }
});

router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    const [clientProfile, freelancerProfile] = await Promise.all([
      prisma.clientProfile.findUnique({ where: { userId: req.user.id } }),
      prisma.freelancerProfile.findUnique({ where: { userId: req.user.id }, include: { portfolio: true } }),
    ]);

    let client = null;
    if (clientProfile) {
      const statusCounts = await prisma.job.groupBy({
        by: ['status'],
        where: { clientId: clientProfile.id },
        _count: { _all: true },
      });
      const byStatus = { ...EMPTY_STATUS_COUNTS };
      for (const row of statusCounts) byStatus[row.status] = row._count._all;

      client = {
        jobsPosted: clientProfile.jobsPosted,
        activeJobs: byStatus.OPEN + byStatus.IN_PROGRESS,
        closedJobs: byStatus.CLOSED + byStatus.CANCELLED,
        byStatus,
        ratingAvg: clientProfile.ratingAvg,
        verifiedPayer: clientProfile.verifiedPayer,
      };
    }

    const freelancer = freelancerProfile && {
      jobsCompleted: freelancerProfile.jobsCompleted,
      ratingAvg: freelancerProfile.ratingAvg,
      portfolioCount: freelancerProfile.portfolio.length,
      skills: freelancerProfile.skills,
    };

    res.json({ client, freelancer: freelancer || null });
  } catch (err) {
    next(err);
  }
});

export default router;
