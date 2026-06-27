import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const serverStartPlugin = (): Plugin => {
  // ✅ Captured ONCE when Vite process starts — not on every page request
  // This is the key fix: Date.now() must live here, outside transformIndexHtml
  const startTime = Date.now().toString();

  return {
    name: 'dgcrm-server-start',
    transformIndexHtml() {
      // transformIndexHtml runs on every request in dev mode
      // but startTime is already fixed from above — so it never changes mid-session
      return [
        {
          tag: 'script',
          injectTo: 'head-prepend',
          children: `window.__VITE_START__ = '${startTime}';`,
        },
      ];
    },
  };
};

export default defineConfig({
  plugins: [react(), serverStartPlugin()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})