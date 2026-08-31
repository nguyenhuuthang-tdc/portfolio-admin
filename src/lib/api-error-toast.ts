import toast from 'react-hot-toast';
import { ApiClientError, normalizeApiError } from './api-error';

export function showApiError(
  error: unknown,
  fallback = 'Request failed',
  options?: { id?: string }
): ApiClientError {
  const apiError = normalizeApiError(error);
  const genericError =
    apiError.code === 'UNKNOWN_ERROR' ||
    (apiError.code === 'REQUEST_FAILED' && apiError.message === 'Request failed');
  const message =
    apiError.code === 'RATE_LIMITED'
      ? apiError.message
      : genericError
        ? fallback
        : apiError.message || fallback;

  toast.error(message, {
    id: options?.id ?? (apiError.code === 'RATE_LIMITED' ? 'api-rate-limited' : undefined),
  });
  return apiError;
}
