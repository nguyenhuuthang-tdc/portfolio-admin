import axios from 'axios';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function parseRetryAfter(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.ceil(value));
  }
  if (typeof value !== 'string' || !value.trim()) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(1, Math.ceil(seconds));

  const resetAt = Date.parse(value);
  if (!Number.isNaN(resetAt)) {
    return Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  }
  return undefined;
}

export function normalizeApiError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error;

  if (!axios.isAxiosError(error)) {
    return new ApiClientError('An unexpected error occurred', 0, 'UNKNOWN_ERROR');
  }

  if (!error.response) {
    return new ApiClientError('Cannot connect to the server', 0, 'NETWORK_ERROR');
  }

  const body = error.response.data;
  const normalized = body?.error;

  return new ApiClientError(
    normalized?.message ?? 'Request failed',
    error.response.status,
    normalized?.code ?? 'REQUEST_FAILED',
    normalized?.details
  );
}
