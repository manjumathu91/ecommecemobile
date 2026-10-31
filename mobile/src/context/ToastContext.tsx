import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Snackbar } from 'react-native-paper';
import { colors } from '@/constants/theme';

type Kind = 'info' | 'success' | 'error';
interface ToastApi {
  show: (message: string, kind?: Kind) => void;
}
const ToastContext = createContext<ToastApi>({ show: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: Kind } | null>(null);
  const show = useCallback((message: string, kind: Kind = 'info') => setToast({ message, kind }), []);
  const api = useMemo(() => ({ show }), [show]);
  const bg = toast?.kind === 'error' ? colors.danger : toast?.kind === 'success' ? colors.success : '#334155';
  return (
    <ToastContext.Provider value={api}>
      {children}
      <Snackbar visible={!!toast} onDismiss={() => setToast(null)} duration={3500} style={{ backgroundColor: bg }} action={{ label: 'OK', textColor: '#fff', onPress: () => setToast(null) }}>
        {toast?.message ?? ''}
      </Snackbar>
    </ToastContext.Provider>
  );
}
