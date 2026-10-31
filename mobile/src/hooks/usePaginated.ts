import { useCallback, useEffect, useRef, useState } from 'react';
import type { Paginated } from '@/types';

/** Infinite-scroll list: loadMore() fetches the next page; reset happens when `deps` change. */
export function usePaginated<T>(fetchPage: (page: number) => Promise<Paginated<T>>, deps: unknown[] = []) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const busy = useRef(false);
  const generation = useRef(0);

  const loadPage = useCallback(async (p: number, mode: 'initial' | 'more' | 'refresh') => {
    if (busy.current && mode === 'more') return;
    busy.current = true;
    const gen = generation.current;
    if (mode === 'initial') setLoading(true);
    if (mode === 'more') setLoadingMore(true);
    if (mode === 'refresh') setRefreshing(true);
    try {
      const res = await fetchRef.current(p);
      if (gen !== generation.current) return; // filters changed while loading: drop stale result
      setItems((prev) => (p === 1 ? res.results : [...prev, ...res.results]));
      setPage(p);
      setHasMore(!!res.next);
      setTotal(res.count);
      setError(null);
    } catch (e) {
      if (gen === generation.current) setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      busy.current = false;
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    generation.current += 1;
    busy.current = false;
    setItems([]);
    loadPage(1, 'initial');
  }, deps);

  return {
    items, total, loading, loadingMore, refreshing, error, hasMore,
    loadMore: () => hasMore && loadPage(page + 1, 'more'),
    refresh: () => loadPage(1, 'refresh'),
    reload: () => loadPage(1, 'initial'),
  };
}
