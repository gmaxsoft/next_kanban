import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    // Domyślny limit body Server Actions to 1 MB — za mało na awatary/czat/załączniki zadań.
    // Limity w aplikacji: awatar 2 MB, czat 10 MB, załącznik zadania 20 MB (+ narzut multipart).
    serverActions: {
      bodySizeLimit: "25mb",
    },
    // proxy.ts klonuje body żądań (domyślnie 10 MB); podniesione, by duże uploady nie były ucinane.
    proxyClientMaxBodySize: "51mb",
  },
};

export default nextConfig;
