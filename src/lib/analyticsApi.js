import { apiJson, publicJson } from "./apiClient.js";

// { freelancers, clients, jobs, openJobs, completedJobs } — нэвтрэлт шаардахгүй.
export const fetchPublicStats = () => publicJson("/analytics/public");

// Нэвтэрсэн хэрэглэгчийн өөрийн товчоо (client/freelancer хэсэгтэй).
export const fetchAnalyticsSummary = () => apiJson("/analytics/summary");
