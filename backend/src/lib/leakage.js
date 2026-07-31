// FR-2.3 / FR-3.4 / FR-5.2 / NFR-3 — гэрээ байгуулагдахаас өмнө холбоо барих
// мэдээлэл (утас, имэйл, гадаад мессенжер) солилцохыг илрүүлэх энгийн шүүлт.
// Зорилго: БЛОКЛОХ биш, ИЛРҮҮЛЖ анхааруулах + moderation queue рүү унагаах
// (PRD-ийн "илрүүлэх шүүлт + анхааруулга" — хориглолт биш, платформ дээр
// үлдэх сэдэл нь чухал гэдгийг NFR-3 өөрөө онцолсон).
const MN_PHONE = /(?:\+?976[\s.-]?)?\b[7-9]\d{3}[\s.-]?\d{4}\b/g;
const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const SOCIAL = /\b(whatsapp|wechat|viber|telegram|t\.me|facebook\.com|fb\.com|instagram\.com|imo\b)/gi;

export function detectLeakage(text) {
  if (!text) return { flagged: false, reasons: [] };
  const reasons = [];
  if (MN_PHONE.test(text)) reasons.push('утасны дугаар');
  MN_PHONE.lastIndex = 0;
  if (EMAIL.test(text)) reasons.push('имэйл хаяг');
  EMAIL.lastIndex = 0;
  if (SOCIAL.test(text)) reasons.push('гадаад мессенжер/сошиал холбоос');
  SOCIAL.lastIndex = 0;
  return { flagged: reasons.length > 0, reasons };
}
