import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cartApi } from '@/api/services';
import type { Cart } from '@/types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface CartApi {
  cart: Cart | null;
  count: number;
  refresh: () => Promise<void>;
  add: (productId: number, qty?: number) => Promise<boolean>;
  setQty: (productId: number, qty: number) => Promise<boolean>;
  remove: (productId: number) => Promise<boolean>;
}
const CartContext = createContext<CartApi>(null as unknown as CartApi);
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const toast = useToast();
  const [cart, setCart] = useState<Cart | null>(null);

  const refresh = useCallback(async () => {
    try {
      setCart(await cartApi.get()); // the cart lives in MySQL, so it is restored after login/app restart
    } catch {
      /* shown by the screen that needs it */
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
    else setCart(null);
  }, [user, refresh]);

  const run = useCallback(
    async (fn: () => Promise<Cart>, okMessage?: string) => {
      try {
        setCart(await fn());
        if (okMessage) toast.show(okMessage, 'success');
        return true;
      } catch (e) {
        toast.show(e instanceof Error ? e.message : 'Could not update cart', 'error');
        return false;
      }
    },
    [toast],
  );

  const value = useMemo<CartApi>(
    () => ({
      cart,
      count: cart?.item_count ?? 0,
      refresh,
      add: (id, qty = 1) => run(() => cartApi.add(id, qty), 'Added to cart'),
      setQty: (id, qty) => run(() => cartApi.update(id, qty)),
      remove: (id) => run(() => cartApi.remove(id), 'Removed from cart'),
    }),
    [cart, refresh, run],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
