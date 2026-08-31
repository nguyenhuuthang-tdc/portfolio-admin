import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from '@/lib/auth';
import { showApiError } from '@/lib/api-error-toast';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await authService.login(email, password);
      queryClient.setQueryData(['me'], user);
      navigate('/');
    } catch (error) {
      const apiError = showApiError(error, 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-neutral-100 mb-1">
            <span className="text-violet-400">winphony</span>
            <span className="text-neutral-500">/admin</span>
          </h1>
          <p className="text-sm text-neutral-500">Sign in to manage your portfolio</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-6"
        >
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-neutral-100 placeholder:text-neutral-600"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-neutral-100 placeholder:text-neutral-600"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading
              ? 'Signing in...'
              : 'Sign In'
			}
          </button>
        </form>
      </div>
    </div>
  );
}
