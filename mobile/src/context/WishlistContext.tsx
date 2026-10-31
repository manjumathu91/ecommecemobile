import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { wishlistApi } from '@/api/services';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface WishlistApi {
  ids: Set<number>;
  has: (productId: number) => boolean;
  toggle: (productId: number) => Promise<void>;
  refresh: () => Promise<void>;
}
const WishlistContext = createContext<WishlistApi>(null as unknown as WishlistApi);
export const useWishlist = () => useContext(WishlistContext);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const toast = useToast();
  const [ids, setIds] = useState<Set<number>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const items = await wishlistApi.list();
      setIds(new Set(items.map((i) => i.product.id)));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
    else setIds(new Set());
  }, [user, refresh]);

  const toggle = useCallback(
    async (productId: number) => {
      const wasIn = ids.has(productId);
      // optimistic update, rolled back if the server call fails
      setIds((prev) => {
        const next = new Set(prev);
        wasIn ? next.delete(productId) : next.add(productId);
        return next;
      });
      try {
        await (wasIn ? wishlistApi.remove(productId) : wishlistApi.add(productId));
      } catch (e) {
        setIds((prev) => {
          const next = new Set(prev);
          wasIn ? next.add(productId) : next.delete(productId);
          return next;
        });
        toast.show(e instanceof Error ? e.message : 'Could not update wishlist', 'error');
      }
    },
    [ids, toast],
  );

  const value = useMemo(() => ({ ids, has: (id: number) => ids.has(id), toggle, refresh }), [ids, toggle, refresh]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
