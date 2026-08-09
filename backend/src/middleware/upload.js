// Multer нь зөвхөн ХҮЛЭЭН АВЧ шалгах үүрэгтэй — хаана хадгалахыг
// src/lib/storage.js шийднэ (S3-нийцтэй объект хадгалалт эсвэл локал диск).
//
// Өмнө нь энд multer.diskStorage шууд ашиглаж, файлыг `backend/uploads/`
// руу бичдэг байсан тул хадгалах байршил route-ын кодод хатуу шигдсэн
// байв. Одоо memoryStorage ашиглаж, буферийг storage давхаргад дамжуулна —
// ингэснээр диск ⇄ S3 солих нь env хувьсагчийн асуудал болж хялбарлана.
//
// Санах ойд хадгалах нь энд аюулгүй: хязгаар нь аватарт 2 МБ, чатын
// хавсралтад 15 МБ бөгөөд буфер нь хүсэлт дуусмагц чөлөөлөгдөнө.
import multer from 'multer';
import { UPLOAD_ROOT } from '../lib/storage.js';

export { UPLOAD_ROOT };

const ALLOWED = { 'image/png': '.png', 'image/jpeg': '.jpg' };

function fileFilter(req, file, cb) {
  if (!ALLOWED[file.mimetype]) {
    return cb(new Error('Зөвхөн PNG эсвэл JPG зураг оруулна уу'));
  }
  cb(null, true);
}

export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB, frontend-ийн заасан хязгаартай тааруулсан
  fileFilter,
}).single('avatar');

// FR-2.1: чатад зураг/PDF/zip хавсаргах.
const CHAT_ALLOWED = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
};

function chatFileFilter(req, file, cb) {
  if (!CHAT_ALLOWED[file.mimetype]) {
    return cb(new Error('Зөвхөн зураг, PDF эсвэл ZIP файл хавсаргаж болно'));
  }
  cb(null, true);
}

export const uploadChatFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: chatFileFilter,
}).single('file');

// Portfolio item зураг — аватартай ижил зөвшөөрөгдсөн формат, гэхдээ жижиг
// зураг биш (ажлын жишээ) тул хэмжээний хязгаарыг өргөвөр авав.
export const uploadPortfolioImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
}).single('image');
