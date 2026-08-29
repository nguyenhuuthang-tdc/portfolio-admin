import { api } from './api';

export interface AuthUser {
  id: number;
  email: string;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthUser> {
    const res = await api.post('/api/v1/auth/login', { email, password });
    return res.data.data.user;
  },

  async logout(): Promise<void> {
    await api.post('/api/v1/auth/logout');
  },

  async me(): Promise<AuthUser> {
    const res = await api.get('/api/v1/auth/me');
    return res.data.data;
  },
};
