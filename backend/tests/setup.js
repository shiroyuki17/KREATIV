// Бусад бүх import (ялангуяа src/config/env.js)-аас ӨМНӨ ажиллах ёстой тул
// vitest.config.js-ийн setupFiles-д заагдсан — .env.test-ийг ачаална
// (жинхэнэ dev/prod DATABASE_URL-д хэзээ ч тест ажиллуулахгүйн баталгаа).
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

if (!process.env.DATABASE_URL?.includes('kreativ_test')) {
  throw new Error('Аюулгүй байдлын шалгалт: тест зөвхөн kreativ_test DB дээр ажиллана');
}
