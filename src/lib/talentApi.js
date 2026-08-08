// Талентын жагсаалт/профайл нь нийтийн endpoint — нэвтрэлт шаарддаггүй тул
// authed:false горимоор явна (тэгэхгүй бол хугацаа нь дууссан токен ирээд
// хэрэггүй refresh цикл өдөөнө).
import { publicJson } from "./apiClient.js";

// { freelancers, total, page, pageSize, totalPages }
export function fetchFreelancers(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  return publicJson(`/profile/freelancers${query ? `?${query}` : ""}`);
}

// A single public profile, keyed by the freelancer's userId
export function fetchFreelancerByUserId(userId) {
  return publicJson(`/profile/freelancer/${userId}`);
}
