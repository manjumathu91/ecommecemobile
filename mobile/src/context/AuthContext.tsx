

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { authApi } from '@/api/services';

import { configureClient } from '@/api/client';

import { registerForPush } from '@/services/push';

import type { User } from '@/types';

import { flags, tokens } from '@/utils/storage';

import { useToast } from './ToastContext';

// ======================================================
// AUTH CONTEXT TYPE
// ======================================================

interface AuthApi {

  user: User | null;

  loading: boolean;

  onboarded: boolean;

  // Email waiting for verification
  verificationEmail: string | null;

  login: (
    email: string,
    password: string
  ) => Promise<void>;

  register: (
    body: {
      email: string;
      password: string;
      first_name: string;
      last_name?: string;
      phone?: string;
    }
  ) => Promise<void>;

  clearVerificationEmail: () => void;

  logout: () => Promise<void>;

  setUser: (u: User) => void;

  finishOnboarding: () => Promise<void>;

}

// ======================================================
// CREATE CONTEXT
// ======================================================

const AuthContext = createContext<AuthApi>(
  null as unknown as AuthApi
);

export const useAuth = () => useContext(AuthContext);

// ======================================================
// AUTH PROVIDER
// ======================================================

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  const toast = useToast();

  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);

  const [onboarded, setOnboarded] = useState(false);

  const [verificationEmail, setVerificationEmail] =
    useState<string | null>(null);

  // ====================================================
  // CONFIGURE API CLIENT
  // ====================================================

  useEffect(() => {

    configureClient({

      onAuthLost: () => setUser(null),

      notify: (message) =>
        toast.show(message, 'error'),

    });

  }, [toast]);

  // ====================================================
  // RESTORE SESSION ON APP START
  // ====================================================

  useEffect(() => {

    let mounted = true;

    const restoreSession = async () => {

      try {

        const onboardedStatus =
          await flags.isOnboarded();

        if (mounted) {
          setOnboarded(onboardedStatus);
        }

        if (await tokens.getAccess()) {

          const profile = await authApi.profile();

          if (mounted) {

            setUser(profile);

            registerForPush();

          }

        }

      } catch {

        // Invalid/expired session or offline.
        // Interceptor handles expired token cleanup.

      } finally {

        if (mounted) {
          setLoading(false);
        }

      }

    };

    restoreSession();

    return () => {
      mounted = false;
    };

  }, []);

  // ====================================================
  // LOGIN
  // ====================================================

  const login = useCallback(
    async (email: string, password: string) => {

      const normalizedEmail =
        email.trim().toLowerCase();

      // Backend rejects unverified accounts.
      const response = await authApi.login(
        normalizedEmail,
        password
      );

      await tokens.set(
        response.access,
        response.refresh
      );

      const profile = await authApi.profile();

      setUser(profile);

      setVerificationEmail(null);

      registerForPush();

    },
    []
  );

  // ====================================================
  // REGISTER
  // EMAIL VERIFICATION REQUIRED
  // ====================================================

  const register = useCallback(
    async (body: {
      email: string;
      password: string;
      first_name: string;
      last_name?: string;
      phone?: string;
    }) => {

      const normalizedEmail =
        body.email.trim().toLowerCase();

      // Create account and send verification email.
      // The backend does NOT return JWT tokens here.

      await authApi.register({

        ...body,

        email: normalizedEmail,

        first_name: body.first_name.trim(),

        last_name: (body.last_name ?? '').trim(),

        phone: (body.phone ?? '').trim(),

      });

      // Save email for the verification screen.
      setVerificationEmail(normalizedEmail);

      // IMPORTANT:
      // Do not save JWT tokens here.
      // Do not set user here.
      // Do not register push notifications here.
      // User must verify email and login separately.

    },
    []
  );

  // ====================================================
  // CLEAR VERIFICATION EMAIL
  // ====================================================

  const clearVerificationEmail = useCallback(() => {

    setVerificationEmail(null);

  }, []);

  // ====================================================
  // LOGOUT
  // ====================================================

  const logout = useCallback(async () => {

    try {

      const refresh = await tokens.getRefresh();

      if (refresh) {

        await authApi.logout(refresh);

      }

    } catch {

      // Log out locally even if server call fails.

    }

    await tokens.clear();

    setUser(null);

    setVerificationEmail(null);

  }, []);

  // ====================================================
  // FINISH ONBOARDING
  // ====================================================

  const finishOnboarding = useCallback(async () => {

    await flags.setOnboarded();

    setOnboarded(true);

  }, []);

  // ====================================================
  // CONTEXT VALUE
  // ====================================================

  const value = useMemo(

    () => ({

      user,

      loading,

      onboarded,

      verificationEmail,

      login,

      register,

      clearVerificationEmail,

      logout,

      setUser,

      finishOnboarding,

    }),

    [
      user,
      loading,
      onboarded,
      verificationEmail,
      login,
      register,
      clearVerificationEmail,
      logout,
      finishOnboarding,
    ]

  );

  return (

    <AuthContext.Provider value={value}>

      {children}

    </AuthContext.Provider>

  );

}
