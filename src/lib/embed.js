// Portfolio-ийн embedUrl-ыг iframe болгоход зориулсан ЦАГААН ЖАГСААЛТ.
//
// Яагаад цагаан жагсаалт: embedUrl-ыг хэрэглэгч өөрөө бичдэг. Дурын хаягийг
// iframe-д тавих нь тэр сайтад манай хуудсан дотор код гүйцэтгэх боломж
// өгнө — фишинг, clickjacking, хэрэглэгчийн үйлдлийг хуурах эрсдэлтэй.
// Тиймээс зөвхөн танигдсан хостуудыг, зөвхөн тэдний ЖИНХЭНЭ embed хаяг
// болгож хөрвүүлж зөвшөөрнө.
//
// Хөрвүүлэлт хийхийн шалтгаан: хүн ихэвчлэн хуваалцах хаягаа (watch?v=…,
// figma.com/file/…) тавьдаг ч тэдгээр нь iframe-д ажилладаггүй.

/** @returns {{ src: string, title: string } | null} */
export function toEmbed(rawUrl) {
  let u;
  try {
    u = new URL(String(rawUrl || "").trim());
  } catch {
    return null;
  }
  // http:// зөвшөөрөхгүй — mixed content блоклогдоно.
  if (u.protocol !== "https:") return null;

  const host = u.hostname.replace(/^www\./, "");

  // ── YouTube ──
  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = u.searchParams.get("v") || (u.pathname.startsWith("/embed/") ? u.pathname.slice(7) : "");
    if (!/^[\w-]{6,20}$/.test(id)) return null;
    return { src: `https://www.youtube-nocookie.com/embed/${id}`, title: "YouTube video" };
  }
  if (host === "youtu.be") {
    const id = u.pathname.slice(1);
    if (!/^[\w-]{6,20}$/.test(id)) return null;
    return { src: `https://www.youtube-nocookie.com/embed/${id}`, title: "YouTube video" };
  }

  // ── Vimeo ──
  if (host === "vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    if (!/^\d{5,12}$/.test(id)) return null;
    return { src: `https://player.vimeo.com/video/${id}`, title: "Vimeo video" };
  }

  // ── Loom ──
  if (host === "loom.com") {
    const id = u.pathname.split("/").filter(Boolean).pop();
    if (!/^[a-f0-9]{20,40}$/i.test(id || "")) return null;
    return { src: `https://www.loom.com/embed/${id}`, title: "Loom recording" };
  }

  // ── Figma ── (file / design / proto / board бүгд ижил embed-ээр ажиллана)
  if (host === "figma.com") {
    if (!/^\/(file|design|proto|board)\//.test(u.pathname)) return null;
    return {
      src: `https://www.figma.com/embed?embed_host=kreativ&url=${encodeURIComponent(u.toString())}`,
      title: "Figma file",
    };
  }

  // Танихгүй хост — iframe-д тавихгүй. Дуудагч тал линк болгон харуулна.
  return null;
}
