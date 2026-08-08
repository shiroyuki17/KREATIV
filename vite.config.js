import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // strictPort: Google OAuth-ийн урсгал backend-ийн FRONTEND_URL руу буцаж
    // redirect хийдэг тул dev порт таамаглашгүй байж болохгүй. Өмнө нь
    // false байсан тул 5173 завгүй үед Vite чимээгүйхэн 5174 руу үсэрч,
    // нэвтэрсний дараа хэрэглэгчийг ажиллаагүй порт руу шиддэг байв.
    port: 5173,
    strictPort: true,
    proxy: {
      // Одоогоор ашиглагдахгүй: клиент нь VITE_API_URL (өгөгдмөл нь
      // http://localhost:4100) руу шууд ханддаг. Backend-ийн бодит порттой
      // (4100) тааруулж үлдээв — өмнө нь 4000 гэж бичээстэй байсан тул
      // хэрэв хэн нэгэн /api proxy руу шилжвэл чимээгүй унах байлаа.
      "/api": {
        target: "http://localhost:4100",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
