import { useCallback, useEffect, useRef, useState } from 'react';

// ==========================================
// DGCRM — LAZY LOADING ON SCROLL
// ==========================================
// Returns a ref for an invisible sentinel element placed after a list's last
// row. When the sentinel comes within `prefetchPx` of the visible screen,
// `onLoadMore` runs — early enough that the next batch is usually rendered
// before the user reaches the bottom, so scrolling never waits.
//
// The observer uses the viewport as its root (null), which also respects
// any scrolling/clipping ancestor, so it works whichever element actually
// scrolls the page. It is re-created after every batch (`itemCount`
// changes): if the sentinel is still near the screen once the new rows
// render (a tall screen, a short batch), the next batch loads straight away
// instead of stalling.
export function useInfiniteScroll({
  hasMore, loading, onLoadMore, itemCount, prefetchPx = 800,
}: {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  itemCount: number;
  prefetchPx?: number;
}) {
  const [sentinel, setSentinel] = useState<Element | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!sentinel || !hasMore || loading) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) onLoadMoreRef.current();
    }, { root: null, rootMargin: `0px 0px ${prefetchPx}px 0px` });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, hasMore, loading, itemCount, prefetchPx]);

  return useCallback((el: Element | null) => setSentinel(el), []);
}
