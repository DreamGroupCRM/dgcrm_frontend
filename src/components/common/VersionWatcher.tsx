// V_22.0 — "cache the cache": detects when a new deploy has shipped while
// this tab has an older build already loaded, and reloads automatically
// instead of leaving the user on stale JS. public/version.json is
// rewritten with a fresh timestamp on every build (see
// scripts/generate-version.cjs, wired via package.json's "prebuild"
// script) — this polls it periodically and compares against the version
// this page itself was loaded with.
import { useEffect, useRef } from 'react';

const POLL_INTERVAL_MS = 5 * 60 * 1000;

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
  const loadedVersionRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      loadedVersionRef.current = await fetchServerVersion();
    };
    init();

    const interval = setInterval(async () => {
      if (cancelled || !loadedVersionRef.current) return;
      const current = await fetchServerVersion();
      // A brand-new deploy always writes a strictly larger timestamp — a
      // missing/unreadable response (current === null) is never treated as
      // "newer", so a flaky request never triggers a spurious reload.
      if (current && current !== loadedVersionRef.current) {
        window.location.reload();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return null;
};

export default VersionWatcher;
