// ==========================================
// DGCRM — LAZY PAGES WITH BACKGROUND PRELOAD
// ==========================================
// Every routed page is its own code chunk (React.lazy), so the first load
// only downloads what the opened page needs. lazyPage() also remembers
// each page's loader so preloadPages() can fetch them all in the
// background once the browser is idle — the first click on any page then
// opens instantly instead of waiting for its chunk.
import { lazy, ComponentType } from 'react';

const loaders: Array<() => Promise<unknown>> = [];

export function lazyPage<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  loaders.push(factory);
  return lazy(factory);
}

let started = false;

/** Fetches every registered page chunk, a few at a time, during idle time.
 * Safe to call repeatedly; runs once. Failures are ignored (the page just
 * loads on demand as usual). */
export function preloadPages(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  const ric = (window as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  const idle = (cb: () => void) => { if (ric) ric(cb, { timeout: 3000 }); else setTimeout(cb, 1500); };
  const queue = [...loaders];
  const next = () => {
    const batch = queue.splice(0, 3);
    if (batch.length === 0) return;
    Promise.allSettled(batch.map((load) => load())).then(() => idle(next));
  };
  idle(next);
}
