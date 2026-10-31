

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  /** Reload silently every time the screen regains focus. */
  refetchOnFocus?: boolean;

  /** Poll interval in ms while the screen is focused. */
  pollMs?: number;

  /** Set false to prevent automatic fetching until enabled. */
  enabled?: boolean;
}

export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  opts: Options = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const mounted = useRef(true);
  const firstFocus = useRef(true);

  const enabled = opts.enabled !== false;

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent' = 'initial') => {
      if (!enabled) return;

      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);

      try {
        const result = await fetcherRef.current();

        if (!mounted.current) return;

        setData(result);
        setError(null);

      } catch (e) {
        if (mounted.current && mode !== 'silent') {
          setError(
            e instanceof Error
              ? e.message
              : 'Something went wrong',
          );
        }

      } finally {
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [enabled],
  );

  // Fetch when dependencies change, but only when enabled.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (enabled) {
      load('initial');
    }
  }, [...deps, enabled]);

  useFocusEffect(
    useCallback(() => {
      if (
        enabled &&
        opts.refetchOnFocus &&
        !firstFocus.current
      ) {
        load('silent');
      }

      firstFocus.current = false;

      if (!enabled || !opts.pollMs) {
        return undefined;
      }

      const interval = setInterval(
        () => load('silent'),
        opts.pollMs,
      );

      return () => clearInterval(interval);

    }, [load, enabled, opts.refetchOnFocus, opts.pollMs]),
  );

  return {
    data,
    setData,
    loading,
    refreshing,
    error,
    reload: () => load('initial'),
    refresh: () => load('refresh'),
  };
}
