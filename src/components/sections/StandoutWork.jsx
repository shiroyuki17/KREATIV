import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNav } from "../../nav.jsx";
import { useHomeJobs, useHomeTalent, toJobCard, toTalentCard } from "../../lib/homeData.js";
import Reveal from "../fx/Reveal.jsx";

// Мэргэжилтний портфолио болон нээлттэй зарыг холиод нэг "хана" болгож
// харуулна. Өмнө нь энэ нь mock.js-ийн нэрээр хатуу бичсэн хүмүүс
// ("Ava Torres", "Tom Beck") болон ID-гаар сонгосон зарууд байв — DB-д
// байхгүй хүн дээр дарахад хоосон профайл нээгддэг байлаа.
//
// Бодит портфолиод градиент байдаггүй тул категориор өнгө оноож,
// өнгө нь өөрөө утга дамжуулна.
const CAT_GRAD = {
  Design: "from-brand/70 to-brand-soft/25",
  Dev: "from-neon/60 to-brand/25",
  AI: "from-violet/60 to-violet-soft/25",
  Motion: "from-mint/60 to-neon/25",
  Writing: "from-amber-400/55 to-rose-400/20",
  Marketing: "from-rose-400/55 to-violet/20",
};

// Талант, зар хоёрыг ээлжлүүлж, өндөр хайрцгуудыг тодорхой хэв маягаар
// байрлуулна — masonry нь санамсаргүй биш, тогтвортой харагдах ёстой.
const TALL_AT = new Set([0, 3, 6]);

function buildTiles(talent, jobs) {
  const tiles = [];
  const maxLen = Math.max(talent.length, jobs.length);

  for (let i = 0; i < maxLen && tiles.length < 8; i++) {
    if (talent[i]) tiles.push({ kind: "talent", data: talent[i] });
    if (tiles.length >= 8) break;
    // Хоёр талант тутамд нэг зар — зөвхөн талант байвал зар нь алгасагдана.
    if (i % 2 === 1 && jobs[Math.floor(i / 2)]) {
      tiles.push({ kind: "job", data: jobs[Math.floor(i / 2)] });
    }
  }
  return tiles.map((t, i) => ({ ...t, tall: TALL_AT.has(i) }));
}

export default function StandoutWork() {
  const { nav } = useNav();
  const jobs = useHomeJobs();
  const talent = useHomeTalent();

  const loading = jobs == null || talent == null;
  const tiles = loading ? [] : buildTiles(talent, jobs);

  // Харуулах юу ч байхгүй бол хэсгийг бүхэлд нь нуух — "Standout work
  // making waves" гэсэн гарчиг доор хоосон тор үлдээхээс дээр.
  if (!loading && tiles.length === 0) return null;

  return (
    <section className="relative py-10 md:py-16">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-soft">
              — On KREATIV right now
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">
              Standout work making waves
            </h2>
          </div>
        </Reveal>

        <div className="mt-7 grid auto-rows-[140px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((t, i) => {
            const motionProps = {
              initial: { opacity: 0, scale: 0.94 },
              whileInView: { opacity: 1, scale: 1 },
              viewport: { once: true, margin: "-60px" },
              transition: { duration: 0.45, delay: (i % 4) * 0.06, ease: [0.22, 1, 0.36, 1] },
              whileHover: { scale: 1.03 },
              className: t.tall ? "row-span-2" : "",
            };

            if (t.kind === "talent") {
              const f = toTalentCard(t.data);
              // Портфолио байвал эхний ажлынх нь нэрийг, үгүй бол албан
              // тушаалыг нь харуулна — хоосон шошго гаргахгүй.
              const caption = t.data.portfolio?.[0]?.title || f.role;
              return (
                <motion.button
                  key={`t-${f.userId}`}
                  {...motionProps}
                  onClick={() => nav("profile", { userId: f.userId })}
                  className={`${motionProps.className} group relative overflow-hidden rounded-2xl bg-gradient-to-br text-left ${CAT_GRAD[f.cat] || CAT_GRAD.Dev}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="absolute inset-x-3 bottom-3 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="text-[12px] font-semibold text-white">{f.name}</p>
                    <p className="line-clamp-1 text-[10.5px] text-white/70">{caption}</p>
                  </div>
                </motion.button>
              );
            }

            const job = toJobCard(t.data);
            return (
              <motion.button
                key={`j-${job.id}`}
                {...motionProps}
                onClick={() => nav("project", job.raw)}
                className={`${motionProps.className} group relative flex flex-col justify-end overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] p-3.5 text-left transition-colors hover:border-brand/40`}
              >
                <p className="line-clamp-3 text-[12.5px] font-semibold leading-snug text-white/85">
                  {job.title}
                </p>
                <p className="mt-2 text-[11px] font-bold text-mint">{job.budget}</p>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => nav("find-work")}
            className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-6 py-3 text-[13px] font-semibold text-white/80 transition-colors hover:border-white/25 hover:text-white"
          >
            Explore all briefs
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
