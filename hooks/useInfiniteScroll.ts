
import { useState, useEffect, useRef, useMemo } from 'react';

export const useInfiniteScroll = <T,>(items: T[], batchSize: number = 20) => {
  const [limit, setLimit] = useState(batchSize);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Reset limit when the source list changes (e.g., filter applied)
  useEffect(() => {
    setLimit(batchSize);
  }, [items, batchSize]);

  const visibleItems = useMemo(() => items.slice(0, limit), [items, limit]);
  const hasMore = limit < items.length;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setLimit((prev) => Math.min(prev + batchSize, items.length));
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, items.length, batchSize]);

  return { visibleItems, observerTarget, hasMore };
};
