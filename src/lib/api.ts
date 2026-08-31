import axios, { AxiosResponse } from 'axios';
import { normalizeApiError } from './api-error';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const SAFE_METHODS = new Set(['get', 'head', 'options']);

let csrfToken: string | null = null;
let refreshPromise: Promise<void> | null = null;

function captureCsrfToken(response: AxiosResponse): void {
  const token = response.data?.data?.csrfToken;
  if (typeof token === 'string' && token.length > 0) csrfToken = token;
}

export function clearCsrfToken(): void {
  csrfToken = null;
}

async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  const response = await axios.get(`${API_URL}/api/v1/auth/csrf`, {
    withCredentials: true,
  });
  captureCsrfToken(response);
  if (!csrfToken) throw new Error('CSRF token was not issued');
  return csrfToken;
}

async function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      csrfToken = null;
      const token = await ensureCsrfToken();
      try {
        const response = await axios.post(
          `${API_URL}/api/v1/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: { 'X-CSRF-Token': token },
          }
        );
        captureCsrfToken(response);
      } catch (error) {
        if (!axios.isAxiosError(error) || error.response?.status !== 409) throw error;
        csrfToken = null;
        await ensureCsrfToken();
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase() ?? 'get';
  if (!SAFE_METHODS.has(method) && csrfToken) {
    config.headers.set('X-CSRF-Token', csrfToken);
  }
  return config;
});

const isRecoveryRequest = (url?: string) => {
  const path = url?.split('?')[0] ?? '';
  return [
    '/api/v1/auth/login',
    '/api/v1/auth/logout',
    '/api/v1/auth/refresh',
    '/api/v1/auth/csrf',
  ].some((suffix) => path.endsWith(suffix));
};

api.interceptors.response.use(
  (response) => {
    captureCsrfToken(response);
    return response;
  },
  async (error) => {
    if (
      error.response?.status === 403 &&
      error.response?.data?.error?.code === 'CSRF_INVALID' &&
      !error.config?._csrfRetry
    ) {
      error.config._csrfRetry = true;
      csrfToken = null;
      try {
        await ensureCsrfToken();
        return api(error.config);
      } catch {
        clearCsrfToken();
      }
    }

    if (error.response?.status === 401 && !error.config?._retry && !isRecoveryRequest(error.config?.url)) {
      error.config._retry = true;
      try {
        await refreshSession();
        return api(error.config);
      } catch {
        clearCsrfToken();
        if (window.location.pathname !== '/login') window.location.href = '/login';
      }
    }
    return Promise.reject(normalizeApiError(error));
  }
);
