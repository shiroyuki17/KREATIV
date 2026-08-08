# syntax=docker/dockerfile:1.7
# Kreativ backend — production image.
# Node 24+ шаардлагатай: Prisma 7 generator "erasable syntax" TypeScript
# гаргадаг тул src/generated/prisma/*.ts файлуудыг Node-ийн built-in TS
# stripping-ээр шууд ажиллуулна (transpile хийхгүй).
#
# ЧУХАЛ: Render-ийн build орчинд `COPY package.json package-lock.json* ./`
# нь диагностикоор баталгаажсанаар манай repo-той ХАМААРАЛГҮЙ, өөр 5 мөрт
# "prisma" ч байхгүй, "wrench" (манай project-д хэзээ ч байгаагүй) dependency
# агуулсан файл олгодог болох нь тогтоогдсон — Docker layer cache, npm
# registry аль аль нь биш, харин Render-ийн build-context дэх энэ хоёр
# файлын хувьд өөрөө эвдэрсэн байдал. Тиймээс package.json-ыг build
# context-оос COPY хийхийн оронд Dockerfile дотроо шууд бичиж, package-lock
# .json-оос бүрмөсөн татгалзаж (npm install, npm ci биш) энэ эвдрэлийг
# бүрэн тойрч гарна.
#
# ⚠️⚠️ ЭНЭ НЬ ДООРХ ЖАГСААЛТЫГ package.json-ТОЙ ГАРААР СИНК БАЙЛГАХЫГ
# ШААРДАНА. Нэг удаа мартсанаас production deploy унасан:
#   Error: Cannot find package 'stripe' imported from /app/src/lib/payments/stripe.js
# Локал дээр бүх зүйл ажилладаг тул зөрүү нь зөвхөн deploy дээр илэрдэг.
#
# Тиймээс src/lib/dockerDeps.test.js нь энэ файлын dependencies-ийг
# package.json-тэй тулгаж шалгадаг — `npm test` зөрүүг өмнө нь барина.
# Шинэ dependency нэмэх бүрд ХОЁР газарт нэмнэ.
FROM node:24-alpine AS deps
WORKDIR /app
RUN cat <<'PKGJSON' > package.json
{
  "name": "kreativ-backend",
  "version": "1.0.0",
  "description": "KREATIV marketplace backend — Express + Prisma (ESM, PostgreSQL, JWT)",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "seed": "node prisma/seed.js",
    "reconcile": "node scripts/reconcile.js",
    "perf:smoke": "node scripts/perf-smoke.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.1105.0",
    "@prisma/adapter-pg": "7.9.1",
    "@prisma/client": "7.9.1",
    "bcryptjs": "^3.0.0",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^17.0.0",
    "express": "^5.0.0",
    "express-rate-limit": "^8.6.1",
    "helmet": "^8.3.0",
    "jsonwebtoken": "^9.0.0",
    "morgan": "^1.11.0",
    "multer": "^2.2.0",
    "nodemailer": "^9.0.3",
    "pg": "^8.13.0",
    "prisma": "7.9.1",
    "socket.io": "^4.8.3",
    "stripe": "^22.4.0",
    "swagger-ui-express": "^5.0.1",
    "zod": "^4.0.0"
  }
}
PKGJSON
RUN npm install --omit=dev --registry=https://registry.npmjs.org/ \
  && test -f node_modules/.bin/prisma || (echo "FATAL: npm install did not install prisma" && ls node_modules | wc -l && exit 1)

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/package.json ./
RUN npm install --registry=https://registry.npmjs.org/ \
  && test -f node_modules/.bin/prisma || (echo "FATAL: npm install did not install prisma" && ls node_modules | wc -l && exit 1)
COPY prisma ./prisma
COPY prisma.config.ts ./
# зөвхөн Prisma Client үүсгэхэд хэрэгтэй — бодит DB холболт шаардахгүй
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN node_modules/.bin/prisma generate
COPY src ./src

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./
COPY --from=build /app/src ./src
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./

EXPOSE 4100
# Hosting-ууд (Render чөлөөт төлбөргүй төлөвлөгөө г.м) Shell/One-off Jobs
# өгдөггүй үед migration ажиллуулах өөр арга байхгүй тул сервер асах бүрдээ
# өөрөө хийнэ. `migrate deploy` зөвхөн pending migration-ыг хэрэглэдэг тул
# (schema аль хэдийн сингк бол юу ч хийхгүй) энэ бүрэн аюулгүй, давтагдах
# боломжтой. Seed нь мөн upsert-суурьтай тул давхар ажиллахад асуудалгүй.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && npm run seed && node src/index.js"]
