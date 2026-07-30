# Deploy — бэлтгэл (Day 10)

Энэ файл зөвхөн **бэлтгэл** — жинхэнэ push/deploy-г та өөрөө хийх ёстой, учир нь
GitHub акаунт, hosting акаунт болон аль нэгнийх нь эрхийг надад өгөөгүй байна.

## 1. Локал дээр бүтэн стек турших (Docker Compose)

```bash
cd backend
docker compose up --build -d
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed
curl http://localhost:4100/health
```

`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`-ийг `docker compose` ажиллуулахаасаа
өмнө `backend/.env`-д (эсвэл shell env-д) тавьсан байх ёстой — жишээ нь одоо
байгаа `.env`-ээ ашиглаж болно, `docker-compose.yml` DATABASE_URL-ийг л
container доторх postgres руу дахин чиглүүлдэг.

## 2. GitHub Repository (танаас шаардагдана)

Энэ folder одоогоор git repo биш. Та:

```bash
cd kreativ-react-source
git init
git add .
git commit -m "Initial commit"
```

дараа нь GitHub дээр шинэ repo үүсгээд (public эсвэл private — өөрөө шийднэ):

```bash
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

## 3. Backend hosting (Railway / Render — аль нь ч Dockerfile-аас шууд deploy хийдэг)

> **Render ашиглах бол:** repo-ийн үндэст байгаа [`render.yaml`](../render.yaml)
> нь backend (Docker) + frontend (static) + Postgres гурвыг нэг Blueprint-аар
> тодорхойлсон байгаа. Render dashboard → **New** → **Blueprint** → энэ
> GitHub repo-г сонговол доорх алхмуудыг гараар давтахгүйгээр шууд эхэлнэ —
> зөвхөн `FRONTEND_URL`/`GOOGLE_*`/`VITE_API_URL` шиг `sync: false` тэмдэглэсэн
> хувьсагчдыг deploy хийсний дараа дашбоард дээр гараар бөглөнө.

1. GitHub repo-гоо холбоно (эсвэл CLI-ээр шууд deploy хийнэ).
2. Root directory: `backend/` (Dockerfile байгаа хавтас).
3. Орчны хувьсагч (Environment Variables) тохируулна:
   - `DATABASE_URL` — hosting-ийн өгсөн Postgres addon-ы холболтын мөр
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — санамсаргүй урт string (`openssl rand -hex 32`)
   - `PORT` — hosting өөрөө тохируулдаг бол хэрэггүй, эсвэл `4100`
   - `FRONTEND_URL` — deploy хийсэн frontend-ийн бодит домэйн (жишээ: `https://kreativ.vercel.app`)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` — Google Cloud Console-оос (README-ийн "Google OAuth тохируулах" хэсэг), redirect URI-г **production домэйнд** тааруулж шинэчилнэ
4. **Migration/seed гараар хийх шаардлагагүй** — Dockerfile-ийн CMD нь сервер
   асах бүрдээ эхлээд `npx prisma migrate deploy`, дараа нь `npm run seed`
   ажиллуулдаг (Render-ийн Free төлөвлөгөө Shell/One-off Jobs өгдөггүй тул
   гараар ажиллуулах боломжгүй байсныг шийдсэн хувилбар). Хоёул idempotent
   (`migrate deploy` зөвхөн pending migration-уудыг хэрэглэнэ, seed нь
   upsert-суурьтай) тул сервер restart болгонд дахин ажиллахад аюулгүй.
   Shell-тэй plan/hosting дээр ажиллаж байгаа бол `npm run seed`-ийг
   Dockerfile-ээс хасаад (эсвэл орхиод) demo дата биш бодит production дата
   ашиглахыг хүсвэл өөрөө удирдаж болно.

## 4. Frontend hosting (Vercel / Netlify — static Vite build)

1. Root directory: repo-ийн үндэс (`src/`-ийг агуулсан хэсэг), build command
   `npm run build`, output `dist/`.
2. Орчны хувьсагч: `VITE_API_URL` = backend-ийн production URL
   (жишээ: `https://kreativ-backend.up.railway.app`).
3. Backend-ийн `FRONTEND_URL` env-ийг яг энэ frontend домэйнтой тааруулж
   шинэчлэх шаардлагатай (CORS + Google OAuth redirect-ийн аль алинд нь).

## 5. Live URL / Sprint Acceptance Criteria шалгах жагсаалт

- [ ] GitHub Repository үүсгэгдэж, код push хийгдсэн
- [ ] Backend deploy хийгдэж, `/health` production URL дээр 200 буцаадаг
- [ ] Frontend deploy хийгдэж, Live URL нээгддэг
- [ ] Production `FRONTEND_URL`/`VITE_API_URL`/Google redirect URI бүгд бодит домэйнтой тохирсон
- [ ] `/docs` (Swagger) production дээр ачаалагддаг
- [ ] Seed эсвэл жинхэнэ бүртгэлээр demo хийж болохуйц дата байгаа
