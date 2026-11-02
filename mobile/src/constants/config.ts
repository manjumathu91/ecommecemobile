
import { Platform } from 'react-native';

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  'https://ecommecemobile.onrender.com/api';

console.log('[API URL CHECK]:', API_URL);

export const MEDIA_FALLBACK =
  'https://placehold.co/600x600/png?text=No+image';