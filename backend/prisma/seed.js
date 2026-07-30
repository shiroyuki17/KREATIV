// Day 4 deliverable: "Seed Data ажилладаг". Idempotent — дахин ажиллуулахад
// давхардуулахгүй (email-ээр upsert хийдэг). Frontend-ийн src/data/mock.js-ийн
// JOBS жагсаалттай агуулгаараа тохирсон демо өгөгдөл.
import { PrismaClient } from '../src/generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { hashPassword } from '../src/utils/password.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CLIENTS = [
  { email: 'nova@demo.kreativ.mn', name: 'Nova Studio', orgName: 'Nova Studio', verifiedPayer: true, ratingAvg: 4.9 },
  { email: 'meridian@demo.kreativ.mn', name: 'Meridian Bank', orgName: 'Meridian Bank', verifiedPayer: true, ratingAvg: 5.0 },
  { email: 'luminary@demo.kreativ.mn', name: 'Luminary Finance', orgName: 'Luminary Finance', verifiedPayer: true, ratingAvg: 4.8 },
  { email: 'helix@demo.kreativ.mn', name: 'Helix Health', orgName: 'Helix Health', verifiedPayer: true, ratingAvg: 4.9 },
  { email: 'pulse@demo.kreativ.mn', name: 'Pulse Fitness', orgName: 'Pulse Fitness', verifiedPayer: false, ratingAvg: 4.7 },
  { email: 'arcade@demo.kreativ.mn', name: 'Arcade Supply', orgName: 'Arcade Supply', verifiedPayer: true, ratingAvg: 4.8 },
];

const FREELANCERS = [
  {
    email: 'daniel@demo.kreativ.mn', name: 'Daniel Kim', category: 'Dev',
    headline: 'Full-Stack Developer', bio: 'React + Node specialist, 8 years shipping fintech products.',
    skills: ['React', 'TypeScript', 'Node.js'], priceMin: 60, priceMax: 120,
    portfolio: { title: 'Fintech analytics dashboard', description: 'Real-time trading dashboard for a hedge fund.', link: 'https://example.com/daniel' },
  },
  {
    email: 'ava@demo.kreativ.mn', name: 'Ava Torres', category: 'Design',
    headline: 'Senior Product Designer', bio: 'Design systems specialist crafting coherent, scalable product languages.',
    skills: ['Figma', 'Design Systems', 'Motion'], priceMin: 70, priceMax: 140,
    portfolio: { title: 'Brand system for Luminary Finance', description: 'Full token library + component kit.', link: 'https://example.com/ava' },
  },
  {
    email: 'mina@demo.kreativ.mn', name: 'Mina Okafor', category: 'Motion',
    headline: 'Motion Designer', bio: 'Rive/Lottie animation specialist for product and marketing.',
    skills: ['Rive', 'Lottie', 'After Effects'], priceMin: 50, priceMax: 100,
    portfolio: { title: 'Mobile app motion language', description: 'Full micro-interaction system for a fitness app.', link: 'https://example.com/mina' },
  },
  {
    email: 'leo@demo.kreativ.mn', name: 'Leo Vance', category: 'AI',
    headline: 'AI Engineer', bio: 'RAG pipelines and LLM infra for production products.',
    skills: ['Python', 'LLM', 'RAG'], priceMin: 90, priceMax: 150,
    portfolio: { title: 'RAG chatbot infra', description: 'Production retrieval-augmented chatbot for a healthtech client.', link: 'https://example.com/leo' },
  },
  {
    email: 'sara@demo.kreativ.mn', name: 'Sara Cohen', category: 'Design',
    headline: 'Brand & UI Designer', bio: 'Distinctive brand systems for consumer startups.',
    skills: ['Branding', 'Figma', 'Illustration'], priceMin: 55, priceMax: 90,
    portfolio: { title: 'Luminary token library', description: 'Full brand identity and component library.', link: 'https://example.com/sara' },
  },
];

const JOBS = [
  { client: 'nova@demo.kreativ.mn', title: 'Design a 3D landing experience for an AI startup', category: 'Design', skills: ['3D', 'WebGL', 'Motion'], languages: ['English'], budgetType: 'FIXED', budgetMin: 12000, budgetMax: 12000 },
  { client: 'meridian@demo.kreativ.mn', title: 'React dashboard for fintech analytics', category: 'Dev', skills: ['React', 'TypeScript', 'D3'], languages: ['English'], budgetType: 'HOURLY', budgetMin: 95, budgetMax: 95 },
  { client: 'luminary@demo.kreativ.mn', title: 'Brand system and design tokens library', category: 'Design', skills: ['Figma', 'Design Systems'], languages: ['English', 'French'], budgetType: 'FIXED', budgetMin: 6500, budgetMax: 6500 },
  { client: 'helix@demo.kreativ.mn', title: 'AI chatbot integration with RAG pipeline', category: 'AI', skills: ['Python', 'LLM', 'Node.js'], languages: ['English'], budgetType: 'HOURLY', budgetMin: 110, budgetMax: 110 },
  { client: 'pulse@demo.kreativ.mn', title: 'Mobile app motion language overhaul', category: 'Motion', skills: ['Rive', 'Lottie', 'iOS'], languages: ['English', 'Spanish'], budgetType: 'FIXED', budgetMin: 8200, budgetMax: 8200 },
  { client: 'arcade@demo.kreativ.mn', title: 'Headless e-commerce build on Next.js', category: 'Dev', skills: ['Next.js', 'Shopify', 'GraphQL'], languages: ['English', 'German'], budgetType: 'HOURLY', budgetMin: 85, budgetMax: 85 },
  { client: 'luminary@demo.kreativ.mn', title: 'Design tokens migration to Tailwind v4', category: 'Dev', skills: ['Tailwind', 'React', 'Figma'], languages: ['English', 'Portuguese'], budgetType: 'FIXED', budgetMin: 3800, budgetMax: 3800 },
  { client: 'arcade@demo.kreativ.mn', title: 'Product explainer video in 3D', category: 'Motion', skills: ['Blender', 'After Effects'], languages: ['English'], budgetType: 'FIXED', budgetMin: 5600, budgetMax: 5600 },
];

const DEMO_PASSWORD = 'password123';

// Frontend-ийн Auth.jsx өмнө нь "admin@kreativ.mn" имэйлээр нэвтэрвэл
// role=admin болгодог demo hack ашигладаг байсан (no backend). Day 8
// интеграцийн дараа энэ нь бодит backend Role.ADMIN акаунт болно.
const ADMIN = { email: 'admin@kreativ.mn', name: 'Ulaanaa' };

async function main() {
  console.log('🌱 Seeding...');
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  await prisma.user.upsert({
    where: { email: ADMIN.email },
    update: { role: 'ADMIN' },
    create: { email: ADMIN.email, passwordHash, name: ADMIN.name, role: 'ADMIN' },
  });
  console.log(`  admin: ${ADMIN.email}`);

  const clientProfilesByEmail = {};
  for (const c of CLIENTS) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: { email: c.email, passwordHash, name: c.name },
    });
    const profile = await prisma.clientProfile.upsert({
      where: { userId: user.id },
      update: { orgName: c.orgName, verifiedPayer: c.verifiedPayer, ratingAvg: c.ratingAvg },
      create: { userId: user.id, orgName: c.orgName, verifiedPayer: c.verifiedPayer, ratingAvg: c.ratingAvg },
    });
    clientProfilesByEmail[c.email] = profile;
    console.log(`  client: ${c.email}`);
  }

  for (const f of FREELANCERS) {
    const user = await prisma.user.upsert({
      where: { email: f.email },
      update: {},
      create: { email: f.email, passwordHash, name: f.name },
    });
    const profile = await prisma.freelancerProfile.upsert({
      where: { userId: user.id },
      update: { headline: f.headline, bio: f.bio, category: f.category, skills: f.skills, priceMin: f.priceMin, priceMax: f.priceMax },
      create: { userId: user.id, headline: f.headline, bio: f.bio, category: f.category, skills: f.skills, priceMin: f.priceMin, priceMax: f.priceMax },
    });
    const hasPortfolio = await prisma.portfolioItem.findFirst({ where: { freelancerId: profile.id } });
    if (!hasPortfolio) {
      await prisma.portfolioItem.create({ data: { ...f.portfolio, freelancerId: profile.id } });
    }
    console.log(`  freelancer: ${f.email}`);
  }

  const existingJobCount = await prisma.job.count();
  if (existingJobCount === 0) {
    for (const j of JOBS) {
      const clientProfile = clientProfilesByEmail[j.client];
      await prisma.job.create({
        data: {
          clientId: clientProfile.id,
          title: j.title,
          description: `${j.title}. Демо зорилгоор үүсгэсэн жишээ ажлын зар.`,
          category: j.category,
          skills: j.skills,
          languages: j.languages,
          budgetType: j.budgetType,
          budgetMin: j.budgetMin,
          budgetMax: j.budgetMax,
        },
      });
    }
    console.log(`  jobs: ${JOBS.length} created`);
  } else {
    console.log(`  jobs: skipped (${existingJobCount} already exist)`);
  }

  console.log(`✅ Done. Demo password for all seeded accounts: "${DEMO_PASSWORD}"`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
