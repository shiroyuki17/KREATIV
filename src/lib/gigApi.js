import { apiJson, publicJson } from "./apiClient.js";

function query(params) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  return q ? `?${q}` : "";
}

// { gigs, total, page, pageSize, totalPages } — нийтэд нээлттэй
export const fetchGigs = (params = {}) => publicJson(`/gigs${query(params)}`);
export const fetchGig = (id) => publicJson(`/gigs/${id}`);

export const fetchMyGigs = () => apiJson("/gigs/mine");
export const uploadGigImage = (file) => {
  const form = new FormData();
  form.append("image", file);
  return apiJson("/gigs/image", { method: "POST", body: form });
};
export const createGig = (data) => apiJson("/gigs", { method: "POST", body: data });
export const updateGig = (id, data) => apiJson(`/gigs/${id}`, { method: "PATCH", body: data });
export const deleteGig = (id) => apiJson(`/gigs/${id}`, { method: "DELETE" });

// Захиалга — Job+Proposal+Contract-ыг доторлогоо талд автоматаар үүсгээд,
// шинэ гэрээний id-г буцаана (client нь My Projects руу орж fund хийнэ).
export const orderGig = (id) => apiJson(`/gigs/${id}/order`, { method: "POST" });
