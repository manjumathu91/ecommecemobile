

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { ProductSummary } from '@/types';

// Browser storage is used only on Web.
// Native Android/iOS continue to use encrypted SecureStore.
function getWebStorage(): Storage {
  if (typeof window === 'undefined') {
    throw new Error('Browser storage is unavailable.');
  }

  return window.localStorage;
}

const ACCESS = 'access_token';
const REFRESH = 'refresh_token';

export const tokens = {
  async getAccess(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return getWebStorage().getItem(ACCESS);
    }

    return SecureStore.getItemAsync(ACCESS);
  },

  async getRefresh(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return getWebStorage().getItem(REFRESH);
    }

    return SecureStore.getItemAsync(REFRESH);
  },

  async set(access: string, refresh: string): Promise<void> {
    if (Platform.OS === 'web') {
      const storage = getWebStorage();
      storage.setItem(ACCESS, access);
      storage.setItem(REFRESH, refresh);
      return;
    }

    await SecureStore.setItemAsync(ACCESS, access);
    await SecureStore.setItemAsync(REFRESH, refresh);
  },

  async clear(): Promise<void> {
    if (Platform.OS === 'web') {
      const storage = getWebStorage();
      storage.removeItem(ACCESS);
      storage.removeItem(REFRESH);
      return;
    }

    await SecureStore.deleteItemAsync(ACCESS);
    await SecureStore.deleteItemAsync(REFRESH);
  },
};

const ONBOARDED = 'onboarding_done';
const SEARCHES = 'recent_searches';
const VIEWED = 'recently_viewed';

export const flags = {
  async isOnboarded() {
    return (await AsyncStorage.getItem(ONBOARDED)) === '1';
  },

  setOnboarded: () => AsyncStorage.setItem(ONBOARDED, '1'),
};

async function readList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export const recentSearches = {
  get: () => readList<string>(SEARCHES),

  async add(term: string) {
    const t = term.trim();
    if (!t) return;

    const list = (await readList<string>(SEARCHES))
      .filter((x) => x.toLowerCase() !== t.toLowerCase());

    await AsyncStorage.setItem(
      SEARCHES,
      JSON.stringify([t, ...list].slice(0, 8)),
    );
  },

  clear: () => AsyncStorage.removeItem(SEARCHES),
};

export const recentlyViewed = {
  get: () => readList<ProductSummary>(VIEWED),

  async add(p: ProductSummary) {
    const list = (await readList<ProductSummary>(VIEWED))
      .filter((x) => x.id !== p.id);

    await AsyncStorage.setItem(
      VIEWED,
      JSON.stringify([p, ...list].slice(0, 10)),
    );
  },

  clear: () => AsyncStorage.removeItem(VIEWED),
};
