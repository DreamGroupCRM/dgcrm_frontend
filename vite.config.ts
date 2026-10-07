import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// The build's own version — the same value scripts/generate-version.cjs
// (npm "prebuild") just wrote to public/version.json. Baked into the JS
// bundle so VersionWatcher can tell "this page is an older build than the
// one now deployed" (see VersionWatcher.tsx). Empty in dev / when the file
// is missing, which turns the watcher off.
const readBuildVersion = (): string => {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'public', 'version.json'), 'utf8');
    const v = JSON.parse(raw)?.version;
    return typeof v === 'string' ? v : '';
  } catch {
    return '';
  }
};

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

export default defineConfig(({ command }) => ({
  plugins: [react(), serverStartPlugin()],
  define: {
    __APP_BUILD_VERSION__: JSON.stringify(command === 'build' ? readBuildVersion() : ''),
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
}))
