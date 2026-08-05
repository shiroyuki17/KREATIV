// Жагсаалт ачааллаж байх үед хоосон/цагаан дэлгэц харагдахаас сэргийлнэ —
// EmptyState-тэй ижил конвенцоор, ирэх жинхэнэ card-уудын хэлбэртэй
// pulsing placeholder-үүд харуулна.
function Bar({ className }) {
  return <div className={`animate-pulse-soft rounded-md bg-white/[0.06] ${className}`} />;
}

// FindWork/FindTalent-ийн жагсаалтын карттай ойролцоо байршилтай skeleton.
export function CardSkeleton() {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-start justify-between gap-3">
        <Bar className="h-5 w-16" />
        <Bar className="h-3 w-10" />
      </div>
      <Bar className="mt-4 h-4 w-full" />
      <Bar className="mt-2 h-4 w-2/3" />
      <div className="mt-4 flex gap-1.5">
        <Bar className="h-5 w-14" />
        <Bar className="h-5 w-16" />
        <Bar className="h-5 w-12" />
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-white/8 pt-5">
        <Bar className="h-5 w-16" />
        <Bar className="h-9 w-20 rounded-xl" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6, className = "" }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
