// Жинхэнэ QPay Merchant API v2 client (https://developer.qpay.mn баримт
// бичгийн дагуу). Мерчант эрх (QPAY_USERNAME/PASSWORD/INVOICE_CODE) хараахан
// байхгүй тул isConfigured() false үед payment.routes.js демо горим руугаа
// автоматаар унана — энэ файл зөвхөн config орж ирсний дараа идэвхждэг.
import { config } from '../config/env.js';

export function isConfigured() {
  return !!(config.QPAY_BASE_URL && config.QPAY_USERNAME && config.QPAY_PASSWORD && config.QPAY_INVOICE_CODE);
}

// Access token 1 цаг хүчинтэй тул процессийн дотор кэшилнэ — хүсэлт бүрт
// дахин auth хийхгүй.
let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) return cachedToken;

  const basic = Buffer.from(`${config.QPAY_USERNAME}:${config.QPAY_PASSWORD}`).toString('base64');
  const res = await fetch(`${config.QPAY_BASE_URL}/v2/auth/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!res.ok) throw new Error(`QPay auth амжилтгүй: ${res.status} ${await res.text()}`);
  const data = await res.json();

  cachedToken = data.access_token;
  // Тэс дуустал хүлээхгүй, 60 секундийн зайтай сэргээнэ
  cachedTokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

async function qpayFetch(path, options = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${config.QPAY_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`QPay API алдаа (${path}): ${res.status} ${JSON.stringify(data)}`);
  return data;
}

// ── Invoice үүсгэх (deposit) ──
// senderInvoiceNo нь манай талын Transaction.id — QPay-ийн invoice бүрийг
// манай ledger-тэй нэг нэгээр холбоход хэрэглэнэ.
export async function createInvoice({ amount, senderInvoiceNo, description }) {
  const data = await qpayFetch('/v2/invoice', {
    method: 'POST',
    body: JSON.stringify({
      invoice_code: config.QPAY_INVOICE_CODE,
      sender_invoice_no: senderInvoiceNo,
      invoice_receiver_code: 'terminal',
      invoice_description: description || 'KREATIV escrow deposit',
      amount,
      callback_url: config.QPAY_CALLBACK_URL,
    }),
  });
  return {
    invoiceId: data.invoice_id,
    qrText: data.qr_text,
    qrImage: data.qr_image,
    urls: data.urls || [],
  };
}

// ── Төлбөр шалгах ── QPay-ийн webhook нь зөвхөн "шалгаач" гэсэн дохио,
// төлбөрийн жинхэнэ баталгааг үргэлж энэ дуудлагаар нотолно (QPay-ийн
// албан ёсны зөвлөмж — webhook payload-д итгэхгүй).
export async function checkPayment(invoiceId) {
  const data = await qpayFetch('/v2/payment/check', {
    method: 'POST',
    body: JSON.stringify({ object_type: 'INVOICE', object_id: invoiceId }),
  });
  const rows = data.rows || [];
  const paid = rows.some((r) => r.payment_status === 'PAID');
  return { paid, rows };
}
