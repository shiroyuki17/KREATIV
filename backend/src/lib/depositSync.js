// Stripe-ийн хэтэвч цэнэглэлтийг DB рүү бичих ГАНЦ эх сурвалж.
//
// subscriptionSync.js-тэй яг ижил шалтгаанаар: цэнэглэлт зөвхөн webhook
// ирэхэд л COMPLETED болдог байсан тул webhook тохируулаагүй/түр унасан
// үед хэрэглэгч Stripe дээр төлчихөөд үлдэгдэл нь 0 хэвээр үлддэг.
//
// Энэ нь төлбөрийг ХУУРАМЧААР баталгаажуулж байгаа хэрэг биш — Stripe-аас
// "энэ session үнэхээр төлөгдсөн үү?" гэж асууж, түүний хариултыг л бичнэ.
// Клиент юу ч илгээхгүй; бид өөрсдийн хадгалсан session ID-г шалгана.
import prisma from './prisma.js';
import * as stripe from './payments/stripe.js';
import { createNotification } from '../routes/notification.routes.js';
import { logError, logEvent } from './logger.js';

/** PENDING цэнэглэлтийг COMPLETED болгож, мэдэгдэл илгээнэ. */
export async function completeDeposit(tx) {
  const updated = await prisma.transaction.update({
    where: { id: tx.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
  createNotification({
    userId: tx.userId,
    type: 'payment',
    text: `$${updated.amount.toLocaleString('en-US')} үлдэгдэлд амжилттай нэмэгдлээ`,
    link: 'payments',
  });
  return updated;
}

/**
 * Тухайн хэрэглэгчийн PENDING Stripe цэнэглэлтүүдийг Stripe-аас асууж тулгана.
 *
 * Хугацаа нь дууссан (expired) session-ийг FAILED болгоно — эс тэгвээс
 * төлөөгүй оролдлого "хүлээгдэж байна" гэж мөнхөд өлгөөтэй үлдэнэ.
 *
 * @returns {Promise<number>} шинэчлэгдсэн гүйлгээний тоо
 */
export async function reconcilePendingDeposits(userId) {
  if (!stripe.isConfigured()) return 0;

  const pending = await prisma.transaction.findMany({
    where: {
      userId,
      kind: 'DEPOSIT',
      status: 'PENDING',
      stripeSessionId: { not: null },
    },
    take: 10,
  });
  if (!pending.length) return 0;

  let changed = 0;
  for (const tx of pending) {
    try {
      const session = await stripe.retrieveSession(tx.stripeSessionId);
      if (session?.payment_status === 'paid') {
        await completeDeposit(tx);
        logEvent('stripe.deposit.reconciled', { transactionId: tx.id, amount: tx.amount });
        changed++;
      } else if (session?.status === 'expired') {
        await prisma.transaction.update({ where: { id: tx.id }, data: { status: 'FAILED' } });
        logEvent('stripe.deposit.expired', { transactionId: tx.id });
        changed++;
      }
      // status === 'open' — хэрэглэгч яг одоо төлж байж болно, хүлээнэ.
    } catch (err) {
      // Stripe унасан — хуудас унагаах шалтгаан биш.
      logError(err, { where: 'reconcilePendingDeposits', transactionId: tx.id });
    }
  }
  return changed;
}
