import { publicJson } from "./apiClient.js";

// Холбоо барих формын хүсэлт.
//
// Өмнө нь энэ хуудсанд ямар ч API дуудлага байгаагүй — товч дарахад
// `setSent(true)` гэж төлөв солиод "Message sent" гэж харуулдаг байв.
// Нэвтрэлт шаардахгүй (бүртгэлгүй хүн ч бичиж чадна) тул publicJson.
export const sendContactMessage = (payload) =>
  publicJson("/support/contact", { method: "POST", body: payload });
