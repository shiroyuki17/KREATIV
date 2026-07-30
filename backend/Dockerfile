# Kreativ backend — production image.
# Node 24+ шаардлагатай: Prisma 7 generator "erasable syntax" TypeScript
# гаргадаг тул src/generated/prisma/*.ts файлуудыг Node-ийн built-in TS
# stripping-ээр шууд ажиллуулна (transpile хийхгүй).
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY prisma ./prisma
COPY prisma.config.ts ./
# зөвхөн Prisma Client үүсгэхэд хэрэгтэй — бодит DB холболт шаардахгүй
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npx prisma generate
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
CMD ["node", "src/index.js"]
