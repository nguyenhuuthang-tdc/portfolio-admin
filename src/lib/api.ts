import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const isLoginRequest = (url?: string) =>
  url?.split('?')[0].endsWith('/api/v1/auth/login') ?? false;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry && !isLoginRequest(err.config.url)) {
      err.config._retry = true;
      try {
        await axios.post(`${API_URL}/api/v1/auth/refresh`, {}, { withCredentials: true });
        return api(err.config);
      } catch {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);
