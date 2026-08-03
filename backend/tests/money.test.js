// NFR-8 — "Escrow, milestone state machine, комисс, маргааны шийдвэр, payout —
// мөнгөтэй бүх логик integration тесттэй" гэсэн Definition-of-Done шалгуурыг
// биелүүлэх integration тестүүд. Жинхэнэ Express app-аар (supertest), жинхэнэ
// Postgres test DB-ээр дамжуулж — mock биш, бодит route+DB урсгал.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import prisma from '../src/lib/prisma.js';
import { hashPassword } from '../src/utils/password.js';

const api = request(app);
let seq = 0;
const uniq = () => `${Date.now()}_${seq++}`;

async function registerUser() {
  const email = `user_${uniq()}@test.kreativ.mn`;
  const res = await api.post('/auth/register').send({ email, password: 'password123', name: 'Test User' });
  expect(res.status).toBe(201);
  return { email, accessToken: res.body.accessToken, userId: res.body.user.id };
}

async function makeClient() {
  const u = await registerUser();
  const res = await api.post('/profile/client').set('Authorization', `Bearer ${u.accessToken}`).send({ orgName: 'Test Client Co' });
  expect(res.status).toBe(200);
  return { ...u, clientProfileId: res.body.id };
}

async function makeFreelancer() {
  const u = await registerUser();
  const res = await api.post('/profile/freelancer').set('Authorization', `Bearer ${u.accessToken}`).send({
    headline: 'Test Dev', bio: 'bio', category: 'Dev', skills: ['React'], priceMin: 50, priceMax: 100,
  });
  expect(res.status).toBe(200);
  return { ...u, freelancerProfileId: res.body.id };
}

async function makeAdmin() {
  const email = `admin_${uniq()}@test.kreativ.mn`;
  await prisma.user.create({ data: { email, passwordHash: await hashPassword('password123'), name: 'Test Admin', role: 'ADMIN' } });
  const res = await api.post('/auth/login').send({ email, password: 'password123' });
  expect(res.status).toBe(200);
  return { email, accessToken: res.body.accessToken };
}

async function postJob(client, overrides = {}) {
  const res = await api.post('/jobs').set('Authorization', `Bearer ${client.accessToken}`).send({
    title: 'Build a dashboard', description: 'We need a React dashboard built end to end.',
    category: 'Dev', skills: ['React'], budgetType: 'FIXED', budgetMin: 1000, budgetMax: 1000,
    ...overrides,
  });
  expect(res.status).toBe(201);
  return res.body;
}

async function submitProposal(freelancer, jobId, price = 1000) {
  const res = await api.post(`/jobs/${jobId}/proposals`).set('Authorization', `Bearer ${freelancer.accessToken}`)
    .send({ price, coverLetter: 'I would love to build this for you, here is my plan.' });
  expect(res.status).toBe(201);
  return res.body;
}

async function acceptProposal(client, proposalId, milestones) {
  const res = await api.post(`/proposals/${proposalId}/accept`).set('Authorization', `Bearer ${client.accessToken}`)
    .send(milestones ? { milestones } : {});
  expect(res.status).toBe(201);
  return res.body;
}

async function deposit(user, amount) {
  const dep = await api.post('/payments/deposit').set('Authorization', `Bearer ${user.accessToken}`).send({ amount });
  expect(dep.status).toBe(201);
  const conf = await api.post(`/payments/deposit/${dep.body.transaction.id}/confirm`).set('Authorization', `Bearer ${user.accessToken}`);
  expect(conf.status).toBe(200);
  return conf.body.balance;
}

async function balanceOf(user) {
  const res = await api.get('/payments/balance').set('Authorization', `Bearer ${user.accessToken}`);
  expect(res.status).toBe(200);
  return res.body;
}

beforeAll(async () => {
  // Тестийн эхэнд test DB-г цэвэрлэнэ — өмнөх ажиллуулгын үлдэгдэл дараагийн
  // тестийн тоолуур/шүүлтэд саад болохгүйн тулд.
  await prisma.review.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.job.deleteMany();
  await prisma.portfolioItem.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.freelancerProfile.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Escrow + milestone state machine + commission (FR-4, FR-6)', () => {
  it('walks a milestone through PENDING_FUNDING -> FUNDED -> DELIVERED -> APPROVED with correct 10% commission payout', async () => {
    const client = await makeClient();
    const freelancer = await makeFreelancer();
    const job = await postJob(client);
    const proposal = await submitProposal(freelancer, job.id, 1000);
    const contract = await acceptProposal(client, proposal.id);
    const milestone = contract.milestones[0];
    expect(milestone.status).toBe('PENDING_FUNDING');
    expect(contract.commissionPct).toBe(10);

    // Escrow-гүйгээр fund хийх боломжгүй
    const fundNoMoney = await api.post(`/milestones/${milestone.id}/fund`).set('Authorization', `Bearer ${client.accessToken}`);
    expect(fundNoMoney.status).toBe(400);

    await deposit(client, 1000);

    const fund = await api.post(`/milestones/${milestone.id}/fund`).set('Authorization', `Bearer ${client.accessToken}`);
    expect(fund.status).toBe(200);
    expect(fund.body.milestone.status).toBe('FUNDED');
    expect(fund.body.balance).toBe(0); // 1000 deposited - 1000 held in escrow

    const deliver = await api.post(`/milestones/${milestone.id}/deliver`).set('Authorization', `Bearer ${freelancer.accessToken}`).send({ note: 'Done' });
    expect(deliver.status).toBe(200);
    expect(deliver.body.milestone.status).toBe('DELIVERED');

    const approve = await api.post(`/milestones/${milestone.id}/approve`).set('Authorization', `Bearer ${client.accessToken}`);
    expect(approve.status).toBe(200);
    expect(approve.body.milestone.status).toBe('APPROVED');

    // 10% комисс: 1000 - 100 = 900 — гэхдээ 5 хоногийн pending hold-д орсон тул
    // ШУУД available болохгүй, харин "pending" дор харагдана (FR-6.3).
    const fBalance = await balanceOf(freelancer);
    expect(fBalance.balance).toBe(0);
    expect(fBalance.pending).toBe(900);

    // Contract бүх milestone дуусаад COMPLETED, Job CLOSED болсон эсэхийг шалгана
    const contractCheck = await api.get(`/contracts/${contract.id}`).set('Authorization', `Bearer ${client.accessToken}`);
    expect(contractCheck.body.status).toBe('COMPLETED');
    expect(contractCheck.body.completedAt).toBeTruthy();

    const freelancerProfile = await api.get('/profile/freelancer/me').set('Authorization', `Bearer ${freelancer.accessToken}`);
    expect(freelancerProfile.body.jobsCompleted).toBe(1);
  });

  it('rejects milestone amounts that do not sum to the proposal price', async () => {
    const client = await makeClient();
    const freelancer = await makeFreelancer();
    const job = await postJob(client);
    const proposal = await submitProposal(freelancer, job.id, 1000);
    const res = await api.post(`/proposals/${proposal.id}/accept`).set('Authorization', `Bearer ${client.accessToken}`)
      .send({ milestones: [{ title: 'Part 1', amount: 400 }] }); // 400 != 1000
    expect(res.status).toBe(400);
  });

  it('enforces the revision limit (default 2) — client cannot request a 3rd revision', async () => {
    const client = await makeClient();
    const freelancer = await makeFreelancer();
    const job = await postJob(client);
    const proposal = await submitProposal(freelancer, job.id, 500);
    const contract = await acceptProposal(client, proposal.id);
    const milestone = contract.milestones[0];
    await deposit(client, 500);
    await api.post(`/milestones/${milestone.id}/fund`).set('Authorization', `Bearer ${client.accessToken}`);

    for (let i = 0; i < 2; i++) {
      await api.post(`/milestones/${milestone.id}/deliver`).set('Authorization', `Bearer ${freelancer.accessToken}`).send({ note: `attempt ${i}` });
      const rev = await api.post(`/milestones/${milestone.id}/request-revision`).set('Authorization', `Bearer ${client.accessToken}`);
      expect(rev.status).toBe(200);
    }

    await api.post(`/milestones/${milestone.id}/deliver`).set('Authorization', `Bearer ${freelancer.accessToken}`).send({ note: 'final' });
    const thirdRevision = await api.post(`/milestones/${milestone.id}/request-revision`).set('Authorization', `Bearer ${client.accessToken}`);
    expect(thirdRevision.status).toBe(409);
  });

  it('auto-approves a DELIVERED milestone once autoApproveAt has passed (FR-4.5, lazy check)', async () => {
    const client = await makeClient();
    const freelancer = await makeFreelancer();
    const job = await postJob(client);
    const proposal = await submitProposal(freelancer, job.id, 300);
    const contract = await acceptProposal(client, proposal.id);
    const milestone = contract.milestones[0];
    await deposit(client, 300);
    await api.post(`/milestones/${milestone.id}/fund`).set('Authorization', `Bearer ${client.accessToken}`);
    await api.post(`/milestones/${milestone.id}/deliver`).set('Authorization', `Bearer ${freelancer.accessToken}`).send({ note: 'done' });

    // Client 7 хоног хариу өгөөгүй гэдгийг симуляцлав
    await prisma.milestone.update({ where: { id: milestone.id }, data: { autoApproveAt: new Date(Date.now() - 1000) } });

    const res = await api.get(`/contracts/${contract.id}`).set('Authorization', `Bearer ${client.accessToken}`);
    expect(res.body.status).toBe('COMPLETED');
    expect(res.body.milestones[0].status).toBe('APPROVED');
  });

  it('rejects a stranger funding or approving someone else’s milestone (IDOR / NFR-4)', async () => {
    const client = await makeClient();
    const freelancer = await makeFreelancer();
    const stranger = await makeClient();
    const job = await postJob(client);
    const proposal = await submitProposal(freelancer, job.id, 200);
    const contract = await acceptProposal(client, proposal.id);
    const milestone = contract.milestones[0];

    const res = await api.post(`/milestones/${milestone.id}/fund`).set('Authorization', `Bearer ${stranger.accessToken}`);
    expect(res.status).toBe(403);
  });
});

describe('Disputes — three resolution paths (FR-7)', () => {
  async function fundedAndDelivered(amount) {
    const client = await makeClient();
    const freelancer = await makeFreelancer();
    const job = await postJob(client);
    const proposal = await submitProposal(freelancer, job.id, amount);
    const contract = await acceptProposal(client, proposal.id);
    const milestone = contract.milestones[0];
    await deposit(client, amount + 200); // extra so post-resolution balance checks are unambiguous
    await api.post(`/milestones/${milestone.id}/fund`).set('Authorization', `Bearer ${client.accessToken}`);
    await api.post(`/milestones/${milestone.id}/deliver`).set('Authorization', `Bearer ${freelancer.accessToken}`).send({ note: 'done' });
    return { client, freelancer, contract, milestone };
  }

  it('FREELANCER resolution pays the freelancer the full amount minus commission', async () => {
    const { client, freelancer, milestone } = await fundedAndDelivered(1000);
    const admin = await makeAdmin();
    const dispute = await api.post('/disputes').set('Authorization', `Bearer ${client.accessToken}`)
      .send({ milestoneId: milestone.id, reason: 'Testing freelancer-resolution payout math.' });
    expect(dispute.status).toBe(201);

    const resolve = await api.post(`/admin/disputes/${dispute.body.id}/resolve`).set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ resolution: 'FREELANCER' });
    expect(resolve.status).toBe(200);

    const fBalance = await balanceOf(freelancer);
    expect(fBalance.pending).toBe(900); // 1000 - 10%
  });

  it('CLIENT resolution refunds the full amount to the client, freelancer gets nothing', async () => {
    const { client, freelancer, milestone } = await fundedAndDelivered(1000);
    const admin = await makeAdmin();
    const dispute = await api.post('/disputes').set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send({ milestoneId: milestone.id, reason: 'Testing client-resolution refund math.' });

    await api.post(`/admin/disputes/${dispute.body.id}/resolve`).set('Authorization', `Bearer ${admin.accessToken}`).send({ resolution: 'CLIENT' });

    const cBalance = await balanceOf(client);
    expect(cBalance.balance).toBe(1200); // deposited 1200, held 1000, all 1000 refunded back
    const fBalance = await balanceOf(freelancer);
    expect(fBalance.balance).toBe(0);
    expect(fBalance.pending).toBe(0);
  });

  it('SPLIT resolution divides 50/50, commission applied only to the freelancer half', async () => {
    const { client, freelancer, milestone } = await fundedAndDelivered(800);
    const admin = await makeAdmin();
    const dispute = await api.post('/disputes').set('Authorization', `Bearer ${client.accessToken}`)
      .send({ milestoneId: milestone.id, reason: 'Testing split-resolution math.' });

    await api.post(`/admin/disputes/${dispute.body.id}/resolve`).set('Authorization', `Bearer ${admin.accessToken}`).send({ resolution: 'SPLIT' });

    // 800 -> 400/400. Freelancer half: 400 - 10% (40) = 360. Client half: 400 flat.
    const fBalance = await balanceOf(freelancer);
    expect(fBalance.pending).toBe(360);
    const cBalance = await balanceOf(client);
    expect(cBalance.balance).toBe(1000 - 800 + 400); // deposited 1000, held 800, refunded 400
  });

  it('cannot resolve the same dispute twice', async () => {
    const { client, milestone } = await fundedAndDelivered(300);
    const admin = await makeAdmin();
    const dispute = await api.post('/disputes').set('Authorization', `Bearer ${client.accessToken}`)
      .send({ milestoneId: milestone.id, reason: 'Testing double-resolution guard.' });
    await api.post(`/admin/disputes/${dispute.body.id}/resolve`).set('Authorization', `Bearer ${admin.accessToken}`).send({ resolution: 'CLIENT' });
    const second = await api.post(`/admin/disputes/${dispute.body.id}/resolve`).set('Authorization', `Bearer ${admin.accessToken}`).send({ resolution: 'CLIENT' });
    expect(second.status).toBe(409);
  });
});

describe('Payouts — minimum threshold + admin approval (FR-6.4)', () => {
  it('rejects a withdrawal below the minimum', async () => {
    const client = await makeClient();
    await deposit(client, 100);
    const res = await api.post('/payments/withdraw').set('Authorization', `Bearer ${client.accessToken}`).send({ amount: 10 });
    expect(res.status).toBe(400);
  });

  it('reserves funds on request (PENDING), and admin approval/rejection resolves it correctly', async () => {
    const client = await makeClient();
    await deposit(client, 200);

    const withdraw = await api.post('/payments/withdraw').set('Authorization', `Bearer ${client.accessToken}`).send({ amount: 150 });
    expect(withdraw.status).toBe(201);
    expect(withdraw.body.balance).toBe(50); // reserved immediately, even while PENDING

    const admin = await makeAdmin();
    const rejected = await api.post(`/admin/payouts/${withdraw.body.transaction.id}/reject`).set('Authorization', `Bearer ${admin.accessToken}`);
    expect(rejected.status).toBe(200);

    const afterReject = await balanceOf(client);
    expect(afterReject.balance).toBe(200); // rejected payout returns the reservation

    const withdraw2 = await api.post('/payments/withdraw').set('Authorization', `Bearer ${client.accessToken}`).send({ amount: 200 });
    const approved = await api.post(`/admin/payouts/${withdraw2.body.transaction.id}/approve`).set('Authorization', `Bearer ${admin.accessToken}`);
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe('COMPLETED');
  });
});

describe('Job moderation / leakage detection (FR-2.3, NFR-3)', () => {
  it('flags a job with a phone number for moderation and hides it from the public listing until approved', async () => {
    const client = await makeClient();
    const job = await postJob(client, { description: 'Call me at 99112233 to discuss the project details please.' });
    expect(job.moderationStatus).toBe('PENDING');

    const publicList = await api.get('/jobs').query({ q: job.title });
    expect(publicList.body.jobs.find((j) => j.id === job.id)).toBeUndefined();

    const admin = await makeAdmin();
    const approve = await api.post(`/admin/jobs/${job.id}/moderate`).set('Authorization', `Bearer ${admin.accessToken}`).send({ action: 'APPROVE' });
    expect(approve.status).toBe(200);
    expect(approve.body.moderationStatus).toBe('APPROVED');
  });
});
