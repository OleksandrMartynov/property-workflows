import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AI document parsing (ADR 0008): файл до 1 МБ плюс текст документа в одній формі Server Action; типова межа
  // тіла — рівно 1 МБ, тож файл на межі не пройшов би. Функція Vercel приймає до 4,5 МБ.
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
