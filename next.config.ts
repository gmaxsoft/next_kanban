import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    // Domyślny limit body Server Actions to 1 MB — za mało na awatary/czat/załączniki.
    // Limity w aplikacji: awatar 2 MB, czat 10 MB, ticket do 20 plików / 40 MB łącznie (+ narzut multipart).
    serverActions: {
      bodySizeLimit: "45mb",
    },
    // proxy.ts klonuje body żądań (domyślnie 10 MB); podniesione, by duże uploady nie były ucinane.
    proxyClientMaxBodySize: "51mb",
  },
};

export default nextConfig;
