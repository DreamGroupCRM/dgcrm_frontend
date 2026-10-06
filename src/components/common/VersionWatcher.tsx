// V_22.0 / V_25.0 — detects that the page in this tab is an older build
// than the one now deployed, and reloads it.
//
// public/version.json is rewritten with a fresh timestamp on every build
// (scripts/generate-version.cjs, package.json "prebuild"), and the SAME
// value is baked into this bundle as __APP_BUILD_VERSION__ (vite.config.ts).
// So "server version !== my own version" means a newer build is live.
//
// The earlier version took its baseline from the SERVER on mount instead
// of from the bundle. A page whose index.html/JS came out of the browser
// cache then fetched the NEW version.json as its "own" version and never
// noticed it was stale — which is why a normal window kept showing the old
// build until it was opened in Incognito.
//
// location.reload() always re-validates the page itself with the server
// (index.html is served Cache-Control: no-cache by public/web.config), and
// the new index.html points at the new content-hashed /assets/ files.
import { useEffect } from 'react';

const POLL_INTERVAL_MS = 60 * 1000;
// One automatic reload per deployed version per tab — if something between
// the browser and the server still hands back the old page, the user must
// not be stuck in a reload loop.
const RELOADED_FOR_KEY = 'dgcrm:reloaded-for-version';

async function fetchServerVersion(): Promise<string | null> {
  try {
    // Cache-bust the request itself — an intermediary/browser cache
    // serving back the OLD version.json would defeat the whole check.
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.version === 'string' ? data.version : null;
  } catch {
    return null;
  }
}

const VersionWatcher: React.FC = () => {
  useEffect(() => {
    const ownVersion = __APP_BUILD_VERSION__;
    // Dev server (or a build without version.json): nothing to compare.
    if (!ownVersion) return;

    let cancelled = false;
    const check = async () => {
      const current = await fetchServerVersion();
      // A missing/unreadable response is never treated as "newer".
      if (cancelled || !current || current === ownVersion) return;
      try {
        if (sessionStorage.getItem(RELOADED_FOR_KEY) === current) return;
        sessionStorage.setItem(RELOADED_FOR_KEY, current);
      } catch { /* storage blocked — still reload once below */ }
      window.location.reload();
    };

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    // Coming back to a tab left open across a deploy: check right away
    // rather than waiting for the next poll.
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
};

export default VersionWatcher;
