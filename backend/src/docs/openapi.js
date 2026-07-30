// Day 10 deliverable: "API Documentation (Swagger)". Гараар бичсэн OpenAPI 3.0
// spec — одоо байгаа бүх route-той (Auth/Profile/Jobs) тааруулсан.
// swagger-ui-express-ээр /docs дээр serve хийгдэнэ (src/index.js харах).

const errorSchema = {
  type: 'object',
  properties: { error: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] } },
};

const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string', nullable: true },
    phone: { type: 'string', nullable: true },
    avatarUrl: { type: 'string', nullable: true },
    role: { type: 'string', enum: ['USER', 'ADMIN'] },
  },
};

const authTokens = {
  type: 'object',
  properties: {
    user: userSchema,
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
  },
};

const jobSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    description: { type: 'string' },
    category: { type: 'string', enum: ['Design', 'Dev', 'AI', 'Motion', 'Writing', 'Marketing'] },
    skills: { type: 'array', items: { type: 'string' } },
    languages: { type: 'array', items: { type: 'string' } },
    budgetType: { type: 'string', enum: ['FIXED', 'HOURLY'] },
    budgetMin: { type: 'integer', nullable: true },
    budgetMax: { type: 'integer', nullable: true },
    status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELLED'] },
    deadline: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    client: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string', nullable: true },
        orgName: { type: 'string', nullable: true },
        verifiedPayer: { type: 'boolean' },
        ratingAvg: { type: 'number' },
      },
    },
  },
};

const bearerAuth = [{ bearerAuth: [] }];

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Kreativ Backend API',
    version: '1.0.0',
    description:
      'Freelance marketplace backend — Auth (JWT + Google OAuth2), Profile, Jobs (CRUD/хайлт/pagination). ' +
      'Бүх демо seed акаунтын нууц үг: `password123`.',
  },
  servers: [{ url: 'http://localhost:4100', description: 'Local dev' }],
  tags: [
    { name: 'Auth', description: 'Бүртгэл, нэвтрэлт, token, Google OAuth2' },
    { name: 'Profile', description: 'Freelancer/Client профайл + portfolio' },
    { name: 'Jobs', description: 'Ажлын зар CRUD, хайлт, шүүлт, pagination' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: { User: userSchema, AuthTokens: authTokens, Job: jobSchema, Error: errorSchema },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Бүртгүүлэх',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 8 },
              name: { type: 'string' },
              phone: { type: 'string', description: '8 орон', example: '99112233' },
            },
          } } },
        },
        responses: {
          201: { description: 'Амжилттай', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } } },
          400: { description: 'Validation алдаа', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Имэйл/утас давхардсан', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Нэвтрэх',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['email', 'password'],
            properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
          } } },
        },
        responses: {
          200: { description: 'Амжилттай', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } } },
          401: { description: 'Имэйл/нууц үг буруу', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'], summary: 'Access token сэргээх (refresh token rotation)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } } },
        responses: {
          200: { description: 'Шинэ token хос', content: { 'application/json': { schema: { type: 'object', properties: { accessToken: { type: 'string' }, refreshToken: { type: 'string' } } } } } },
          401: { description: 'Token хүчингүй/дууссан', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'], summary: 'Гарах (refresh token хүчингүй болгох)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } } },
        responses: { 200: { description: 'Гарлаа' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'], summary: 'Өөрийн профайл', security: bearerAuth,
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          401: { description: 'Нэвтрээгүй', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/google': {
      get: {
        tags: ['Auth'], summary: 'Google зөвшөөрлийн дэлгэц рүү redirect',
        responses: { 302: { description: 'accounts.google.com руу redirect' }, 501: { description: 'GOOGLE_CLIENT_ID тохируулаагүй' } },
      },
    },
    '/auth/google/callback': {
      get: {
        tags: ['Auth'], summary: 'Google-аас буцаж ирэх callback',
        parameters: [
          { name: 'code', in: 'query', schema: { type: 'string' } },
          { name: 'state', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 302: { description: 'Frontend #/auth-callback руу token-той redirect' } },
      },
    },
    '/profile/avatar': {
      post: {
        tags: ['Profile'], summary: 'Профайлын зураг оруулах (PNG/JPG, ≤2MB)', security: bearerAuth,
        requestBody: { required: true, content: { 'multipart/form-data': { schema: {
          type: 'object', properties: { avatar: { type: 'string', format: 'binary' } },
        } } } },
        responses: {
          200: { description: 'Шинэчлэгдсэн хэрэглэгч (avatarUrl-тай)', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          400: { description: 'Буруу файлын төрөл эсвэл хэт том' },
        },
      },
    },
    '/profile/freelancer': {
      post: {
        tags: ['Profile'], summary: 'Freelancer профайл үүсгэх/шинэчлэх (upsert)', security: bearerAuth,
        requestBody: { content: { 'application/json': { schema: {
          type: 'object',
          properties: {
            headline: { type: 'string', maxLength: 120 },
            bio: { type: 'string', maxLength: 2000 },
            skills: { type: 'array', items: { type: 'string' } },
            priceMin: { type: 'integer' },
            priceMax: { type: 'integer' },
          },
        } } } },
        responses: { 200: { description: 'Профайл (+ completeness)' }, 401: { description: 'Нэвтрээгүй' } },
      },
    },
    '/profile/freelancer/me': {
      get: { tags: ['Profile'], summary: 'Өөрийн freelancer профайл', security: bearerAuth, responses: { 200: { description: 'OK' }, 404: { description: 'Профайл байхгүй' } } },
    },
    '/profile/freelancer/{userId}': {
      get: {
        tags: ['Profile'], summary: 'Нийтэд харагдах freelancer профайл',
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' }, 404: { description: 'Олдсонгүй' } },
      },
    },
    '/profile/freelancer/portfolio': {
      post: {
        tags: ['Profile'], summary: 'Portfolio item нэмэх', security: bearerAuth,
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['title'],
          properties: { title: { type: 'string' }, description: { type: 'string' }, images: { type: 'array', items: { type: 'string', format: 'uri' } }, link: { type: 'string', format: 'uri' } },
        } } } },
        responses: { 201: { description: 'Үүссэн' }, 400: { description: 'Профайл байхгүй эсвэл validation алдаа' } },
      },
    },
    '/profile/freelancer/portfolio/{id}': {
      delete: {
        tags: ['Profile'], summary: 'Portfolio item устгах (эзэмшигч л)', security: bearerAuth,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Устгагдсан' }, 404: { description: 'Олдсонгүй' } },
      },
    },
    '/profile/client': {
      post: {
        tags: ['Profile'], summary: 'Client профайл үүсгэх/шинэчлэх (upsert)', security: bearerAuth,
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { orgName: { type: 'string', maxLength: 120 } } } } } },
        responses: { 200: { description: 'Профайл (+ completeness)' } },
      },
    },
    '/profile/client/me': {
      get: { tags: ['Profile'], summary: 'Өөрийн client профайл', security: bearerAuth, responses: { 200: { description: 'OK' }, 404: { description: 'Профайл байхгүй' } } },
    },
    '/profile/client/{userId}': {
      get: {
        tags: ['Profile'], summary: 'Нийтэд харагдах client профайл',
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK' }, 404: { description: 'Олдсонгүй' } },
      },
    },
    '/jobs': {
      get: {
        tags: ['Jobs'], summary: 'Ажлын зарын жагсаалт (нийтэд, хайлт/шүүлт/pagination)',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Гарчиг/тайлбараар хайх' },
          { name: 'category', in: 'query', schema: { type: 'string', enum: ['Design', 'Dev', 'AI', 'Motion', 'Writing', 'Marketing'] } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['FIXED', 'HOURLY'] } },
          { name: 'skills', in: 'query', schema: { type: 'string' }, description: 'Таслалаар тусгаарласан, ж: React,Figma' },
          { name: 'minBudget', in: 'query', schema: { type: 'integer' } },
          { name: 'maxBudget', in: 'query', schema: { type: 'integer' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELLED'] }, description: 'Анхны утга: OPEN' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 12, maximum: 50 } },
        ],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: {
            type: 'object', properties: { jobs: { type: 'array', items: { $ref: '#/components/schemas/Job' } }, total: { type: 'integer' }, page: { type: 'integer' }, pageSize: { type: 'integer' }, totalPages: { type: 'integer' } },
          } } } },
        },
      },
      post: {
        tags: ['Jobs'], summary: 'Ажлын зар нийтлэх (зөвхөн client профайлтай)', security: bearerAuth,
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['title', 'description', 'category'],
          properties: {
            title: { type: 'string', minLength: 5 }, description: { type: 'string', minLength: 20 },
            category: { type: 'string', enum: ['Design', 'Dev', 'AI', 'Motion', 'Writing', 'Marketing'] },
            skills: { type: 'array', items: { type: 'string' } }, languages: { type: 'array', items: { type: 'string' } },
            budgetType: { type: 'string', enum: ['FIXED', 'HOURLY'] }, budgetMin: { type: 'integer' }, budgetMax: { type: 'integer' },
          },
        } } } },
        responses: { 201: { description: 'Үүссэн', content: { 'application/json': { schema: { $ref: '#/components/schemas/Job' } } } }, 403: { description: 'Client профайлгүй' } },
      },
    },
    '/jobs/mine': {
      get: { tags: ['Jobs'], summary: 'Өөрийн бүх зар (статусаас үл хамааран)', security: bearerAuth, responses: { 200: { description: 'OK' }, 403: { description: 'Client профайлгүй' } } },
    },
    '/jobs/{id}': {
      get: {
        tags: ['Jobs'], summary: 'Нэг зарын дэлгэрэнгүй',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Job' } } } }, 404: { description: 'Олдсонгүй' } },
      },
      patch: {
        tags: ['Jobs'], summary: 'Зар засах (эзэмшигч client л)', security: bearerAuth,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', description: 'jobCreateSchema-тай ижил талбарууд, бүгд optional' } } } },
        responses: { 200: { description: 'Шинэчлэгдсэн' }, 403: { description: 'Эзэмшигч биш' }, 404: { description: 'Олдсонгүй' } },
      },
      delete: {
        tags: ['Jobs'], summary: 'Зар устгах (эзэмшигч client л)', security: bearerAuth,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 204: { description: 'Устгагдсан' }, 403: { description: 'Эзэмшигч биш' }, 404: { description: 'Олдсонгүй' } },
      },
    },
    '/analytics/summary': {
      get: {
        tags: ['Jobs'], summary: 'Client/Freelancer dashboard analytics (Day 9)', security: bearerAuth,
        description: 'req.clientProfile болон/эсвэл req.freelancerProfile байгаагаас хамаарч харгалзах хэсгүүдийг буцаана.',
        responses: { 200: { description: 'OK' }, 401: { description: 'Нэвтрээгүй' } },
      },
    },
  },
};
