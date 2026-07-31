// NFR-7 — Ажиглалт. Жинхэнэ Sentry/Datadog зэрэг гуравдагч үйлчилгээний
// account/DSN байхгүй тул stdout руу бүтэцтэй (structured) JSON мөр бүрээр
// бичнэ — Render/Docker log collector аль ч JSON log aggregator-т шууд
// дамжуулагдах боломжтой (Sentry холбогдоход энэ функцийн доторх implementation-ыг
// сольсноос өөр өөрчлөлт хэрэггүй байхаар тусгаарлав).
export function logEvent(name, props = {}) {
  console.log(JSON.stringify({ t: 'event', name, ...props, at: new Date().toISOString() }));
}

export function logError(err, context = {}) {
  console.error(JSON.stringify({
    t: 'error',
    message: err?.message,
    stack: err?.stack,
    ...context,
    at: new Date().toISOString(),
  }));
}
