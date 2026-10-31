
import { Platform } from 'react-native';

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'web'
    ? 'http://127.0.0.1:8000/api'
    : 'http://10.0.2.2:8000/api');
    console.log('[API URL CHECK]:', API_URL);

export const MEDIA_FALLBACK =
  'https://placehold.co/600x600/png?text=No+image';