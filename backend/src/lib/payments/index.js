// Төлбөрийн провайдерын сонголт — storage.js-тэй ижил зарчим: тохиргоо
// байвал жинхэнэ, байхгүй бол демо.
//
// PAYMENT_PROVIDER='auto' (өгөгдмөл) үед тохируулагдсаныг нь сонгоно.
// Stripe нь QPay-аас түрүүлнэ: хоёуланг нь тохируулсан бол энэ нь ухамсартай
// сонголт байх магадлалтай (QPay-ийн түлхүүр орчинд үлдчихсэн байж болно),
// тодорхой болгохыг хүсвэл PAYMENT_PROVIDER-ыг шууд зааж өгнө.
import { config } from '../../config/env.js';
import * as qpay from '../qpay.js';
import * as stripe from './stripe.js';

export const PROVIDERS = { qpay, stripe };

/** @returns {'stripe' | 'qpay' | 'demo'} */
export function activeProvider() {
  // ⚠️ Тестүүд ХЭЗЭЭ Ч гуравдагч төлбөрийн үйлчилгээнд хандах ёсгүй.
  //
  // .env.test нь зөвхөн 8 хувьсагч тодорхойлдог бөгөөд config/env.js доторх
  // `dotenv/config` нь дутуугий нь `.env`-ээс нөхдөг. Иймд хөгжүүлэгч
  // STRIPE_SECRET_KEY-ээ .env-д нэмэнгүүт `npm test` бүр тухайн хүний
  // ЖИНХЭНЭ Stripe данс руу Checkout Session үүсгэж эхэлдэг байв — мөн
  // deposit нь webhook хүлээдэг тул үлдэгдэл хэзээ ч ороогүй, escrow-ийн
  // 8 тест унадаг байлаа.
  //
  // Тест бол дотоод ledger-ийн зан төлөвийг шалгах ёстой, Stripe-ийнхыг биш.
  if (config.NODE_ENV === 'test') return 'demo';

  const wanted = config.PAYMENT_PROVIDER;
  if (wanted === 'stripe') return stripe.isConfigured() ? 'stripe' : 'demo';
  if (wanted === 'qpay') return qpay.isConfigured() ? 'qpay' : 'demo';
  if (stripe.isConfigured()) return 'stripe';
  if (qpay.isConfigured()) return 'qpay';
  return 'demo';
}

/**
 * Демо төлбөр зөвшөөрөгдөх эсэх.
 *
 * Демо горим нь хэрэглэгчийг ямар ч мөнгө төлөлгүйгээр үлдэгдэлтэй
 * болгодог — өөрөөр хэлбэл production дээр энэ нь ил цоорхой. Тиймээс
 * production-д ЗӨВХӨН ALLOW_DEMO_PAYMENTS=true гэж САНААТАЙГААР
 * тохируулсан үед л ажиллана; өөр тохиолдолд төлбөрийн route-ууд
 * 503 буцааж, шалтгааныг нь хэлнэ.
 */
export function demoAllowed() {
  if (config.NODE_ENV !== 'production') return true;
  return config.ALLOW_DEMO_PAYMENTS === true;
}

/** Frontend-д харуулах төлөв — Payments хуудас үүгээр анхааруулга гаргана. */
export function paymentStatus() {
  const provider = activeProvider();
  return {
    provider,
    live: provider !== 'demo',
    // Stripe test mode-д жинхэнэ мөнгө хөдлөхгүй — UI дээр үүнийг ил хэлэх
    // ёстой, эс тэгвээс "төлчихлөө" гэж эндүүрнэ.
    testMode: provider === 'stripe' ? stripe.isTestMode() : provider === 'demo',
    demoAllowed: demoAllowed(),
  };
}

export { qpay, stripe };
