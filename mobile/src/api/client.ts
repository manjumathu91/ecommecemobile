import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '@/constants/config';
import { tokens } from '@/utils/storage';

export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;
  isNetwork: boolean;
  constructor(message: string, status = 0, fields: Record<string, string> = {}, isNetwork = false) {
    super(message);
    this.status = status;
    this.fields = fields;
    this.isNetwork = isNetwork;
  }
}

interface Handlers {
  onAuthLost: () => void;
  notify: (message: string) => void;
}
let handlers: Handlers = { onAuthLost: () => {}, notify: () => {} };
export const configureClient = (h: Handlers) => {
  handlers = h;
};

type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean; _retryCount?: number };

const api = axios.create({ baseURL: API_URL, timeout: 15000 });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const AUTH_FREE = ['/auth/login/', '/auth/register/', '/auth/token/refresh/', '/auth/forgot-password/', '/auth/reset-password/'];

/** Turns the backend's {"success": false, "error": {message, details}} (or a network failure) into an ApiError. */
function toApiError(error: AxiosError): ApiError {
  if (!error.response) {
    return new ApiError('Cannot reach the server. Check your internet connection.', 0, {}, true);
  }
  const data = error.response.data as any;
  const message: string = data?.error?.message ?? data?.detail ?? 'Something went wrong. Please try again.';
  const fields: Record<string, string> = {};
  const details = data?.error?.details;
  if (details && typeof details === 'object') {
    for (const [key, value] of Object.entries(details)) {
      fields[key] = Array.isArray(value) ? String(value[0]) : String(value);
    }
  }
  // Prefer a concrete field message over the generic "Validation failed".
  const first = Object.values(fields)[0];
  return new ApiError(message === 'Validation failed' && first ? first : message, error.response.status, fields);
}

api.interceptors.request.use(async (config) => {
  const token = await tokens.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string> | null = null;
async function refreshAccessToken(): Promise<string> {
  const refresh = await tokens.getRefresh();
  if (!refresh) throw new Error('no refresh token');
  const { data } = await axios.post(`${API_URL}/auth/token/refresh/`, { refresh }, { timeout: 15000 });
  await tokens.set(data.access, data.refresh ?? refresh); // the backend rotates refresh tokens
  return data.access as string;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    if (!original) return Promise.reject(toApiError(error));
    const url = original.url ?? '';

    // 401 -> refresh the access token once (shared by all concurrent requests) and replay the call.
    if (error.response?.status === 401 && !original._retried && !AUTH_FREE.some((p) => url.includes(p))) {
      original._retried = true;
      try {
        refreshing = refreshing ?? refreshAccessToken().finally(() => { refreshing = null; });
        const token = await refreshing;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        await tokens.clear();
        handlers.onAuthLost();
        return Promise.reject(new ApiError('Your session expired. Please log in again.', 401));
      }
    }

    // Safe retry with backoff for idempotent GETs on network errors / 5xx.
    const method = (original.method ?? 'get').toLowerCase();
    const transient = !error.response || error.response.status >= 500;
    if (method === 'get' && transient && (original._retryCount ?? 0) < 2) {
      original._retryCount = (original._retryCount ?? 0) + 1;
      await sleep(500 * 2 ** (original._retryCount - 1));
      return api(original);
    }
    const apiError = toApiError(error);
    if (apiError.isNetwork) handlers.notify(apiError.message);
    return Promise.reject(apiError);
  },
);

export default api;
