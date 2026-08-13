import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

// Real SMTP (Gmail, SendGrid, Resend г.м) тохируулагдвал шууд түүгээр
// явуулна; SMTP_HOST/USER/PASS .env-д байхгүй бол Ethereal-ийн үнэгэн,
// автоматаар үүсдэг тест inbox руу орно (илгээсэн имэйл бодит хаяг руу
// очихгүй ч console дээрх preview URL-аар агуулгыг бүрэн харах боломжтой).
export function smtpConfigured() {
  return !!(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS);
}

let transporterPromise;

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = smtpConfigured()
      ? Promise.resolve(
          nodemailer.createTransport({
            host: config.SMTP_HOST,
            port: config.SMTP_PORT || 587,
            secure: config.SMTP_SECURE ?? false,
            auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
          })
        )
      : (async () => {
          const testAccount = await nodemailer.createTestAccount();
          return nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: { user: testAccount.user, pass: testAccount.pass },
          });
        })();
  }
  return transporterPromise;
}

// Fire-and-forget: имэйл явуулж чадаагүй ч гол урсгал (бүртгэл/зар нийтлэх)
// амжилтгүй болох ёсгүй тул алдааг зөвхөн log хийнэ, дээш шидэхгүй.
export async function sendMail({ to, subject, html }) {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: config.SMTP_FROM || '"KREATIV" <noreply@kreativ.mn>',
      to,
      subject,
      html,
    });
    const preview = nodemailer.getTestMessageUrl(info);
    console.log(`[mail] "${subject}" → ${to}${preview ? ` — preview: ${preview}` : ' — sent via real SMTP'}`);
  } catch (err) {
    console.error('[mail] илгээхэд алдаа гарлаа:', err.message);
  }
}
