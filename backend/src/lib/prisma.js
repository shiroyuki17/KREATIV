// Prisma 7 generates TS source using only erasable syntax (no real `enum`,
// no decorators) specifically so Node's built-in TypeScript support can run
// it unmodified — hence the .ts extension here, not .js.
import { PrismaClient } from '../generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../config/env.js';

// ── Prisma 7-ийн client үүсгэх (createClient) ──
// Prisma 7-д PrismaClient нь driver adapter ЗААВАЛ шаарддаг.
// (datasourceUrl устсан тул adapter дамжуулна.)
function createClient() {
  const adapter = new PrismaPg({ connectionString: config.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// ── Singleton ──
// dev үед (node --watch) дахин ачаалал бүрт шинэ холболт үүсэхээс сэргийлнэ.
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.__prisma ?? createClient();

if (config.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

export default prisma;