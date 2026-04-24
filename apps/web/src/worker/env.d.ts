/// <reference types="vite/client" />

declare global {
  // biome-ignore lint/style/noNamespace: Cloudflare Worker types require namespace augmentation.
  namespace Cloudflare {
    interface Env {
      PROXY_SECRET: string;
      TOKEN_ENCRYPTION_KEY: string;
    }
  }
}

export {};
