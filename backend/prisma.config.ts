import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  // Prisma 7: холболтын URL нь schema-аас энд шилжсэн
  datasource: {
    url: env('DATABASE_URL'),
  },
});