# Kreativ backend — production image.
# Node 24+ шаардлагатай: Prisma 7 generator "erasable syntax" TypeScript
# гаргадаг тул src/generated/prisma/*.ts файлуудыг Node-ийн built-in TS
# stripping-ээр шууд ажиллуулна (transpile хийхгүй).
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --registry=https://registry.npmjs.org/

FROM node:24-alpine AS build
WORKDIR /app
# Зарим CI орчинд (Render дээр ажиглагдсан) npm ci нь package.json/lock.json
# зөв атал огт хамааралгүй, хэдэн сарын өмнөх (одоо байхгүй "wrench" зэрэг
# dependency агуулсан) дутуу tree суулгадаг эвдрэл гарсан — Docker layer
# cache-ийн асуудал биш (ARG-аар cache-bust хийсэн ч давтагдсан) харин
# орчны npm registry/mirror stale байсан бололтой тул --registry-ийг тодорхой
# зааж, environment/.npmrc-ээс үл хамааран албан ёсны registry ашиглуулна.
ARG CACHE_BUST=2026-08-03-2
COPY package.json package-lock.json* ./
# ВРЕМЕННО diagnostic — Render дээр яг ямар файл checkout хийгдэж байгааг
# нарийн харахын тулд (wc/md5/grep) — асуудал олдсоны дараа устгана.
RUN echo "=== DIAGNOSTIC ===" \
  && wc -l package.json package-lock.json \
  && md5sum package.json package-lock.json \
  && (grep -c '"prisma"' package.json || echo "prisma NOT in package.json") \
  && (grep -c wrench package-lock.json || echo "wrench NOT in package-lock.json (good)") \
  && echo "=== END DIAGNOSTIC ==="
RUN npm ci --registry=https://registry.npmjs.org/ && test -f node_modules/.bin/prisma || (echo "FATAL: npm ci did not install prisma — dependency tree is likely stale/incomplete" && ls node_modules | wc -l && exit 1)
COPY prisma ./prisma
COPY prisma.config.ts ./
# зөвхөн Prisma Client үүсгэхэд хэрэгтэй — бодит DB холболт шаардахгүй
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
# `npx prisma` заримдаа локал node_modules-ийг олохгүй, npx-ийн өөрийн
# кэшид тусад нь prisma татаж авчихдаг (тэр тохиолдолд prisma.config.ts-ийн
# `dotenv/config`-ийг олохгүй байх шиг эвдрэл гарсан) — node_modules/.bin
# доtorh binary-г шууд дуудаж энэ л асуудлаас бүрэн зайлсхийнэ.
RUN node_modules/.bin/prisma generate
COPY src ./src

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
COPY package.json ./

EXPOSE 4100
# Hosting-ууд (Render чөлөөт төлбөргүй төлөвлөгөө г.м) Shell/One-off Jobs
# өгдөггүй үед migration ажиллуулах өөр арга байхгүй тул сервер асах бүрдээ
# өөрөө хийнэ. `migrate deploy` зөвхөн pending migration-ыг хэрэглэдэг тул
# (schema аль хэдийн сингк бол юу ч хийхгүй) энэ бүрэн аюулгүй, давтагдах
# боломжтой. Seed нь мөн upsert-суурьтай тул давхар ажиллахад асуудалгүй.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && npm run seed && node src/index.js"]
