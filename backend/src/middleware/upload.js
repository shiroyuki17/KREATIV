import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.join(__dirname, '../../uploads');
const AVATAR_DIR = path.join(UPLOAD_ROOT, 'avatars');
const CHAT_DIR = path.join(UPLOAD_ROOT, 'chat');
fs.mkdirSync(AVATAR_DIR, { recursive: true });
fs.mkdirSync(CHAT_DIR, { recursive: true });

const ALLOWED = { 'image/png': '.png', 'image/jpeg': '.jpg' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = ALLOWED[file.mimetype];
    cb(null, `${req.user.id}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (!ALLOWED[file.mimetype]) {
    return cb(new Error('Зөвхөн PNG эсвэл JPG зураг оруулна уу'));
  }
  cb(null, true);
}

// Day 7 deliverable: "File Upload (шаардлагатай бол)". Диск дээр хадгалдаг —
// production-д S3/Cloud Storage руу шилжих боломжтойгоор AVATAR_DIR-ийг
// тусад нь тодорхойлсон.
export const uploadAvatar = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB, frontend-ийн заасан хязгаартай тааруулсан
  fileFilter,
}).single('avatar');

// FR-2.1: чатад зураг/PDF/zip хавсаргах. Anthropic/QPay-той адил диск дээр
// хадгалдаг — Render-ийн үнэгүй/стандарт web service дээр disk нь redeploy
// бүрд арилдгийг анхаарах хэрэгтэй (production-д удаан хугацаанд найдвартай
// байлгах бол S3/Cloudflare R2 руу шилжих ёстой, энэ бол эхний бодит алхам).
const CHAT_ALLOWED = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
};

const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CHAT_DIR),
  filename: (req, file, cb) => {
    const ext = CHAT_ALLOWED[file.mimetype] || path.extname(file.originalname) || '';
    cb(null, `${req.user.id}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

function chatFileFilter(req, file, cb) {
  if (!CHAT_ALLOWED[file.mimetype]) {
    return cb(new Error('Зөвхөн зураг, PDF эсвэл ZIP файл хавсаргаж болно'));
  }
  cb(null, true);
}

export const uploadChatFile = multer({
  storage: chatStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: chatFileFilter,
}).single('file');
