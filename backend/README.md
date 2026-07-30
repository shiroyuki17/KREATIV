# Kreativ Backend

Express + **Prisma 7.8** дээр суурилсан backend (ESM, PostgreSQL, JWT).
`../src/data/*Mock.js`-д байсан frontend mock өгөгдлийг бодит API-аар солих эхний
алхам. PRD-ийн бүх модуль биш — одоогоор: **Auth + Profile** (FR-1) болон
**Job CRUD** (FR-2, хайлт/шүүлт/pagination-той) хийгдсэн.

Энэ нь `Downloads/auth-service.zip`-д байсан auth microservice-ийг суурь болгож,
MariaDB→PostgreSQL руу хөрвүүлж, profile модуль нэмж өргөтгөсөн.

## Хурдан эхлэх

```bash
cd backend
npm install
cp .env.example .env          # PostgreSQL DATABASE_URL + JWT secret-үүдийг засна
npm run prisma:generate
npm run prisma:migrate
npm run seed                  # демо client/freelancer акаунт + 8 ажлын зар (шаардлагагүй бол алгасаж болно)
npm run dev                   # http://localhost:4000
```

Бүх seed акаунтын нууц үг: `password123` (жишээ: `nova@demo.kreativ.mn`, `daniel@demo.kreativ.mn`).

PostgreSQL локал ажиллуулаагүй бол хамгийн хурдан арга: `docker run --name kreativ-pg -e POSTGRES_PASSWORD=password -e POSTGRES_DB=kreativ_db -p 5432:5432 -d postgres:16`

## Endpoint-ууд

### Auth (`/auth`)

| Method | Зам | Тайлбар |
|--------|-----|---------|
| POST | `/auth/register` | Бүртгүүлэх (email, password, name?, phone?) |
| POST | `/auth/login` | Нэвтрэх |
| POST | `/auth/refresh` | Token шинэчлэх (rotation) |
| POST | `/auth/logout` | Гарах |
| GET | `/auth/me` | Профайл (🔒) |
| GET | `/auth/google` | Google-ийн зөвшөөрлийн дэлгэц рүү redirect |
| GET | `/auth/google/callback` | Google-аас буцаж ирэх callback (frontend рүү дахин redirect хийнэ) |

### Profile (`/profile`)

| Method | Зам | Тайлбар |
|--------|-----|---------|
| POST | `/profile/freelancer` | Freelancer профайл үүсгэх/шинэчлэх (🔒, upsert) |
| GET | `/profile/freelancer/me` | Өөрийн freelancer профайл (🔒) |
| GET | `/profile/freelancer/:userId` | Нийтэд харагдах freelancer профайл |
| POST | `/profile/freelancer/portfolio` | Portfolio item нэмэх (🔒) |
| DELETE | `/profile/freelancer/portfolio/:id` | Portfolio item устгах (🔒, эзэмшигч) |
| POST | `/profile/client` | Client профайл үүсгэх/шинэчлэх (🔒, upsert) |
| GET | `/profile/client/me` | Өөрийн client профайл (🔒) |
| GET | `/profile/client/:userId` | Нийтэд харагдах client профайл |
| POST | `/profile/avatar` | Профайлын зураг оруулах (🔒, `multipart/form-data`, талбар: `avatar`, PNG/JPG ≤2MB) |

Оруулсан зураг `backend/uploads/avatars/`-д хадгалагдаж, `/uploads/avatars/<file>`
замаар статик serve хийгдэнэ (production-д S3/Cloud Storage руу шилжихэд
зориулж `middleware/upload.js`-ийн `UPLOAD_ROOT`-ыг тусад нь гаргасан).

### Jobs (`/jobs`)

| Method | Зам | Тайлбар |
|--------|-----|---------|
| POST | `/jobs` | Зар нийтлэх (🔒, зөвхөн client профайлтай — RBAC) |
| GET | `/jobs` | Жагсаалт: `?q=&category=&type=FIXED\|HOURLY&skills=a,b&minBudget=&maxBudget=&status=&page=&pageSize=` |
| GET | `/jobs/mine` | Өөрийн бүх зар, статусаас үл хамааран (🔒) |
| GET | `/jobs/:id` | Нэг зарын дэлгэрэнгүй |
| PATCH | `/jobs/:id` | Зар засах (🔒, эзэмшигч client-ий OwnJob л) |
| DELETE | `/jobs/:id` | Зар устгах (🔒, эзэмшигч client-ий OwnJob л) |

`category` нь `["Design","Dev","AI","Motion","Writing","Marketing"]`-ийн аль нэг
байх ёстой (frontend-ийн `FindWork.jsx`-ийн `CATS`-тай тааруулсан).

### Analytics (`/analytics`) — Day 9

| Method | Зам | Тайлбар |
|--------|-----|---------|
| GET | `/analytics/summary` | Client/Freelancer dashboard тоо баримт (🔒, эзэмшдэг профайлаас нь хамаарч client/freelancer хэсгүүд бөглөгдөнө эсвэл null) |

### Бусад (Day 10)

| Method | Зам | Тайлбар |
|--------|-----|---------|
| GET | `/health` | Сервер амьд эсэх |
| GET | `/metrics` | Үндсэн monitoring: нийт хүсэлт/алдаа, статус кодоор |
| GET | `/docs` | Swagger UI (OpenAPI 3.0, бүх endpoint) |
| GET | `/openapi.json` | Түүхий OpenAPI spec |

🔒 = `Authorization: Bearer <accessToken>` шаардана.

Нэг `User` account зэрэг `freelancerProfile` **БА** `clientProfile`-той байж болно
(PRD 1.4-т заасны дагуу — role enum биш, хоёр optional 1:1 хамаарал).

## Google OAuth тохируулах

Кодыг бичсэн, гэхдээ ажиллуулахын тулд **та өөрөө** Google Cloud Console-оос
Client ID/Secret үүсгэх шаардлагатай (энэ хэсгийг зуучлан хийх боломжгүй):

1. https://console.cloud.google.com/ → шинэ project үүсгэ (эсвэл байгааг ашигла).
2. **APIs & Services → OAuth consent screen** → "External" сонгоод үндсэн
   мэдээллийг (app name, support email) бөглөнө. Testing горимд өөрийн Google
   акаунтаа "Test users"-д нэмэх шаардлагатай (production-д publish хийтэл).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   → Application type: **Web application**.
4. **Authorized redirect URIs**-д яг үүнийг нэм:
   ```
   http://localhost:4100/auth/google/callback
   ```
   (production-д deploy хийхдээ жинхэнэ domain-аа нэмнэ.)
5. Үүссэн **Client ID** болон **Client Secret**-ийг хуулж `backend/.env`-д тавь:
   ```env
   GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="GOCSPX-xxxxx"
   GOOGLE_REDIRECT_URI="http://localhost:4100/auth/google/callback"
   ```
6. Сервэрээ дахин эхлүүлнэ (`npm run dev`). `GOOGLE_CLIENT_ID`-г тавихаас өмнө
   `/auth/google` нь `501 Not Implemented` буцаана — энэ бол зориудаар,
   тохируулаагүй үед clear алдаа өгөхийн тулд.

**Урсгал:** Frontend "Continue with Google" товч → `GET /auth/google`
(state-ийг httpOnly cookie-д хадгалаад Google руу redirect) → хэрэглэгч Google
дээр зөвшөөрнө → `GET /auth/google/callback` (code-ийг token-оор солиод, User-ийг
`googleId`-аар олно/үүсгэнэ, эсвэл ижил email-тэй акаунттай холбоно) → манай JWT
access/refresh token-той хамт frontend-ийн `#/auth-callback` руу redirect →
`AuthCallback.jsx` token-ийг хадгалаад `/auth/me`-ээр хэрэглэгчийг татаж dashboard
руу шилжинэ.

## ОРООГҮЙ зүйлс (дараагийн ажлаар)

- **Утасны OTP баталгаажуулалт** (PRD FR-1.1) — `phone` талбар хадгалагдана,
  гэхдээ SMS-ээр баталгаажуулдаггүй (жинхэнэ SMS provider сонгох шаардлагатай)
- **Frontend integration** (Day 8) — **Auth (`Auth.jsx`: signup/login/logout,
  Google OAuth callback) одоо бодит `/auth` API-тай холбогдсон** — жинхэнэ
  хэрэглэгч үүсгэгдэж, JWT хадгалагдаж, logout нь refresh token-ыг server талд
  ч хүчингүй болгодог. Гэхдээ `FindWork.jsx`, `PostJob.jsx`,
  `ClientDashboard.jsx`, `Onboarding.jsx` (профайл мэдээлэл цуглуулдаг ч
  хаана ч илгээдэггүй) зэрэг бусад бүх хэсэг `src/data/*.js`-ийн mock
  өгөгдөл дээрээ хэвээр — `/jobs`, `/profile` API-тай холбогдоогүй.
- **Payment Integration (QPay)** (Day 9) — код бичигдээгүй: жинхэнэ QPay
  мерчант акаунт/API key байхгүй тул (Google OAuth-той адилаар) энэ бол таны
  акаунт үүсгэсний дараа хийгдэх ажил.
- **Email Notification** (Day 9) — код бичигдээгүй: SMTP эсвэл Resend/SendGrid
  зэрэг үйлчилгээний API key хэрэгтэй.
- **Spline Integration** (Day 9) — код бичигдээгүй: таны Spline акаунтаас
  бодит 3D scene-ийн embed URL шаардлагатай.
- **Deploy / GitHub Repository** (Day 10) — `Dockerfile`, `docker-compose.yml`,
  `DEPLOY.md` бэлэн (доор харах), гэхдээ жинхэнэ `git init`/push, hosting
  акаунт сонголт, бодит Live URL — эдгээрийг зөвхөн та хийж чадна.
- PRD-ийн бусад бүх модуль: Proposal, Contract, Milestone, Escrow, Ledger,
  Dispute, Chat, Review — эдгээр нь дараагийн slice-үүд.

## Аюулгүй байдал (security hardening)

- **Helmet** — стандарт HTTP security header-үүд (`X-Frame-Options`, `X-Content-Type-Options: nosniff`, HSTS, `X-Powered-By` устгасан г.м). Swagger UI-г эвдэхгүйн тулд зөвхөн CSP-г API route-уудад унтраасан.
- **Rate limiting** (`express-rate-limit`) — `/auth/register`, `/auth/login`, `/auth/refresh` дээр 15 минутанд 20 оролдлого (brute-force/credential-stuffing хамгаалалт); бусад бүх route дээр 15 минутанд 600 хүсэлт (суурь DoS хамгаалалт).
- **Refresh token reuse detection** — аль хэдийн rotate хийгдсэн (revoked) refresh token дахин ирвэл хулгайлагдсан гэж үзэж, тухайн хэрэглэгчийн БҮХ session-ийг хүчингүй болгодог.
- **JWT jti** — refresh token бүрт санамсаргүй nonce (`jti`) нэмсэн (ижил секундэд хоёр token гарвал байт-байтаараа давхцаж, DB-ийн unique constraint дээр 500 өгдөг байсан жинхэнэ багийг засав).
- **Central error handler** — `err.status`/`statusCode`-ийг хүндэтгэдэг болсон (өмнө нь бүх алдаа, тэр дундаа буруу JSON гэх мэт client-ийн алдааг ч 500 гэж буцааж, `/metrics`-ийн 5xx тоолуурыг гуйвуулдаг байсан).
- **Body size limit** — `express.json({ limit: '100kb' })`, том payload-аар DoS хийхээс сэргийлнэ.
- **`trust proxy`** — reverse proxy (Railway/Render) ард зөв `req.ip` (rate limit key) авахын тулд.
- Бүх prod dependency `npm audit` цэвэр (0 vulnerabilities, Prisma 7.9.1 хүртэл ахиулсан).
- **Багийн засвар**: `PATCH /jobs/:id` нь `status`-ыг validation schema-д ороогүй байснаас client өөрийн зарыг `IN_PROGRESS`/`CLOSED`/`CANCELLED` болгож чадахгүй (validation-оор чимээгүй hasагдаж, no-op болдог) байсныг `jobUpdateSchema`-д `status` нэмж засав.
- **Мэдэгдэж буй дутагдал**: frontend access/refresh token-оо `localStorage`-д хадгалдаг (XSS-д эмзэг) — энэ нь Day 8 интеграц эхлэхээс өмнө өөрчлөгдөөгүй, учир нь одоогоор зөвхөн Google OAuth callback л жинхэнэ token ашигладаг. Интеграц хийхдээ httpOnly refresh cookie + in-memory access token руу шилжихийг зөвлөж байна.

## Deploy

`Dockerfile` + `docker-compose.yml` + алхам алхмаар заавар: [`DEPLOY.md`](./DEPLOY.md).

## Санамж

- `Role` enum (`USER`/`ADMIN`) нь **auth-level эрх** (админ панелд хандах эсэх) —
  frontend-ийн `AppShell.jsx`-ийн admin-gating-тэй ижил санаа. Энэ нь
  freelancer/client-ыг ялгаагаа**гүй** — тэр ялгаа `FreelancerProfile`/`ClientProfile`
  байгаа эсэхээр тодорхойлогдоно.
- `priceMin`/`priceMax`, `skills[]` — PostgreSQL native array ашигласан тул
  MariaDB-тэй байсан auth-service-ээс ялгаатайгаар join хүснэгт хэрэггүй.
- Профайлын "бүрэн байдал" (`completeness`) хадгалагддаггүй, хүсэлт бүрт
  тооцоологддог — ямар ч тохиолдолд синк алдагдахгүй.