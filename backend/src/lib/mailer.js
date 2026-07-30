import nodemailer from 'nodemailer';

// Demo-safe email sending: real SMTP account/API key байхгүй тул Ethereal
// (nodemailer-ийн үнэгэн, автоматаар үүсдэг тест inbox) ашиглана. Илгээсэн
// имэйл бодит хаяг руу очихгүй ч preview URL-аар (console дээр) агуулгыг нь
// бүрэн харах боломжтой — жинхэнэ SMTP/SES key орж ирэхэд getTransporter-ийг
// солиход л бэлэн бүтэц.
let transporterPromise;

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
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
      from: '"KREATIV" <noreply@kreativ.mn>',
      to,
      subject,
      html,
    });
    console.log(`[mail] "${subject}" → ${to} — preview: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (err) {
    console.error('[mail] илгээхэд алдаа гарлаа:', err.message);
  }
}
