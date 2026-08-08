import { describe, it, expect } from 'vitest';
import { sanitizeFilters } from './jobSearchAI.js';

const SKILLS = ['React', 'TypeScript', 'Figma', 'Node.js'];

// sanitizeFilters бол загварын гаргасныг шүүх ХАМГИЙН СҮҮЛЧИЙН хамгаалалт.
// Gemini-ийн responseSchema нь ихэнх тохиолдолд хангалттай ч тэр нь загварыг
// ЧИГЛҮҮЛДЭГ болохоос баталгаа биш — тиймээс сервер тал дээр дахин шалгана.
describe('sanitizeFilters', () => {
  it('зөвшөөрөгдөөгүй категорийг хаяна', () => {
    expect(sanitizeFilters({ category: 'Blockchain' }, SKILLS).category).toBeUndefined();
    expect(sanitizeFilters({ category: 'Dev' }, SKILLS).category).toBe('Dev');
  });

  it('DB-д байхгүй ур чадварын тагийг хаяна', () => {
    // Загвар "React.js" гэж бичвэл (бодит таг нь "React") 0 үр дүн гарна —
    // тиймээс таарахгүйг нь оруулахгүй.
    const out = sanitizeFilters({ skills: ['React', 'React.js', 'Rust'] }, SKILLS);
    expect(out.skills).toBe('React');
  });

  it('бүх таг таарахгүй бол skills талбарыг огт нэмэхгүй', () => {
    expect(sanitizeFilters({ skills: ['Cobol'] }, SKILLS).skills).toBeUndefined();
  });

  it('ур чадварын жагсаалт хоосон үед (шинэ DB) цагаан жагсаалтаар шүүхгүй', () => {
    expect(sanitizeFilters({ skills: ['Anything'] }, []).skills).toBe('Anything');
  });

  it('буруу төрлийн budget-ыг хаяна', () => {
    const out = sanitizeFilters({ minBudget: 'олон', maxBudget: NaN }, SKILLS);
    expect(out.minBudget).toBeUndefined();
    expect(out.maxBudget).toBeUndefined();
  });

  it('сөрөг болон хэт том дүнг хаяна', () => {
    expect(sanitizeFilters({ minBudget: -50 }, SKILLS).minBudget).toBeUndefined();
    expect(sanitizeFilters({ maxBudget: 99_999_999 }, SKILLS).maxBudget).toBeUndefined();
  });

  // Загвар мужийг эсрэгээр өгвөл (min > max) хэзээ ч үр дүн гарахгүй —
  // алдаа шидэхийн оронд сольж засах нь хэрэглэгчид илүү хэрэгтэй.
  it('эсрэгээр өгсөн төсвийн мужийг сольж засна', () => {
    const out = sanitizeFilters({ minBudget: 9000, maxBudget: 1000 }, SKILLS);
    expect(out.minBudget).toBe(1000);
    expect(out.maxBudget).toBe(9000);
  });

  it('зөвхөн FIXED/HOURLY-г хүлээн авна', () => {
    expect(sanitizeFilters({ type: 'HOURLY' }, SKILLS).type).toBe('HOURLY');
    expect(sanitizeFilters({ type: 'MONTHLY' }, SKILLS).type).toBeUndefined();
  });

  it('q-г 200 тэмдэгтээр таслана', () => {
    const out = sanitizeFilters({ q: 'x'.repeat(500) }, SKILLS);
    expect(out.q.length).toBe(200);
  });

  // ХАМГИЙН ЧУХАЛ: загвар status/moderationStatus зэрэг шүүлтийг өөрчилж
  // чадах ёсгүй — эс тэвэл модерациас хасагдсан зар хайлтаар гоожно.
  it('танихгүй талбаруудыг бүрмөсөн үл тоомсорлоно', () => {
    const out = sanitizeFilters(
      { status: 'CANCELLED', moderationStatus: 'REJECTED', pageSize: 9999, evil: true },
      SKILLS
    );
    expect(out).toEqual({});
  });
});
