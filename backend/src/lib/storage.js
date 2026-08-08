// Оруулсан файлыг хадгалах давхарга — S3-нийцтэй объект хадгалалт ЭСВЭЛ
// локал диск.
//
// Яагаад: өмнө нь аватар болон чатын хавсралт зөвхөн `backend/uploads/`
// хавтсанд, диск дээр хадгалагддаг байв. Render (болон ихэнх контейнер
// hosting)-ийн файл систем нь түр зуурынх — deploy эсвэл restart болгонд
// БҮХ оруулсан файл алга болдог. Хэрэглэгчийн аватар, чатаар илгээсэн
// гэрээ, макет бүгд чимээгүй устаж, DB-д зөвхөн эвдэрсэн URL үлддэг.
//
// Тохиргоо (заавал биш): S3_BUCKET + S3_ACCESS_KEY_ID + S3_SECRET_ACCESS_KEY
// гурвуулаа өгөгдсөн үед л объект хадгалалт асна. Үгүй бол QPay/Anthropic-
// тэй ижил зарчмаар локал диск рүү автоматаар унана — dev орчинд ямар ч
// данс шаардахгүй ажиллана.
//
// Cloudflare R2, Backblaze B2, MinIO зэрэг нь S3 API-тай нийцтэй тул
// S3_ENDPOINT-ыг зааж өгөхөд ижилхэн ажиллана.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.join(__dirname, '../../uploads');

export const usingObjectStorage = !!(
  config.S3_BUCKET && config.S3_ACCESS_KEY_ID && config.S3_SECRET_ACCESS_KEY
);

// S3 клиентийг зөвхөн хэрэгтэй үед нь ачаална — тохируулаагүй байхад
// (dev, тест) 10 МБ гаруй SDK-г санах ойд оруулах шаардлагагүй.
let clientPromise = null;
function getClient() {
  if (!clientPromise) {
    clientPromise = import('@aws-sdk/client-s3').then(({ S3Client, PutObjectCommand, DeleteObjectCommand }) => ({
      PutObjectCommand,
      DeleteObjectCommand,
      client: new S3Client({
        region: config.S3_REGION,
        // R2/MinIO гэх мэт AWS бус нийлүүлэгчид эндпойнт заана. AWS S3
        // ашиглаж байгаа бол хоосон орхиход SDK өөрөө зөв хаяг сонгоно.
        ...(config.S3_ENDPOINT ? { endpoint: config.S3_ENDPOINT, forcePathStyle: true } : {}),
        credentials: {
          accessKeyId: config.S3_ACCESS_KEY_ID,
          secretAccessKey: config.S3_SECRET_ACCESS_KEY,
        },
      }),
    }));
  }
  return clientPromise;
}

const EXT_BY_MIME = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
};

/** Таамаглашгүй нэр — өөр хэрэглэгчийн файлыг нэрээр нь таамаглаж татахаас сэргийлнэ. */
export function buildKey(folder, userId, file) {
  const ext = EXT_BY_MIME[file.mimetype] || path.extname(file.originalname || '') || '';
  return `${folder}/${userId}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

/**
 * Файлыг хадгалаад ХАДГАЛАХ ХАЯГИЙГ буцаана.
 *
 * @returns {Promise<string>} S3 горимд бүтэн https:// URL, локал горимд
 *   `/uploads/...` гэсэн харьцангуй зам. Frontend-ийн avatarSrc()/fileSrc()
 *   хоёуланг нь аль хэдийн зохицуулдаг тул нэмэлт өөрчлөлт шаардахгүй.
 */
export async function saveUpload(folder, userId, file) {
  const key = buildKey(folder, userId, file);

  if (!usingObjectStorage) {
    const dest = path.join(UPLOAD_ROOT, key);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, file.buffer);
    return `/uploads/${key}`;
  }

  const { client, PutObjectCommand } = await getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      // Файлыг browser-т шууд харуулна (татаж авахаас илүү) — аватар,
      // чатын зурагт зайлшгүй.
      ContentDisposition: 'inline',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  // S3_PUBLIC_URL нь CDN/custom domain (R2-ийн r2.dev эсвэл өөрийн домэйн).
  // Зааж өгөөгүй бол bucket-ийн шууд хаягийг угсарна.
  const base = config.S3_PUBLIC_URL
    || (config.S3_ENDPOINT
      ? `${config.S3_ENDPOINT.replace(/\/$/, '')}/${config.S3_BUCKET}`
      : `https://${config.S3_BUCKET}.s3.${config.S3_REGION}.amazonaws.com`);
  return `${base.replace(/\/$/, '')}/${key}`;
}

/**
 * Хуучин файлыг устгана (жишээ нь аватараа солиход). Best-effort —
 * амжилтгүй болсон ч гол үйлдлийг (шинэ аватар хадгалах) зогсоохгүй.
 */
export async function deleteUpload(storedUrl) {
  if (!storedUrl) return;
  try {
    if (!usingObjectStorage) {
      if (!storedUrl.startsWith('/uploads/')) return;
      await fs.unlink(path.join(UPLOAD_ROOT, storedUrl.slice('/uploads/'.length)));
      return;
    }
    // Бүтэн URL-аас key-г сэргээнэ — зам нь үргэлж `<folder>/<file>` хоёр хэсэг.
    const parts = storedUrl.split('/');
    const key = parts.slice(-2).join('/');
    const { client, DeleteObjectCommand } = await getClient();
    await client.send(new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: key }));
  } catch {
    /* устгаж чадсангүй — өөрчлөлтийг зогсоох шалтгаан биш */
  }
}
