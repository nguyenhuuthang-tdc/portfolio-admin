const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

/** Browser URL for a stored path or legacy absolute /uploads URL. */
export function mediaUrl(src: string | null | undefined): string | null {
  if (!src) return null;
  if (src.startsWith('data:')) return src;

  if (src.startsWith('http://') || src.startsWith('https://')) {
    try {
      const parsed = new URL(src);
      if (parsed.pathname.startsWith('/uploads/')) {
        return `${API_ORIGIN}${parsed.pathname}`;
      }
    } catch {
      return src;
    }
    return src;
  }

  if (src.startsWith('/uploads/') || src.startsWith('uploads/')) {
    return `${API_ORIGIN}${src.startsWith('/') ? src : `/${src}`}`;
  }

  return src.startsWith('/') ? src : `/${src}`;
}

/** Path (or external URL) to persist in the API. */
export function toStoredMediaPath(src: string | null | undefined): string | null {
  if (src == null) return null;
  const trimmed = src.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const pathname = new URL(trimmed).pathname;
      if (pathname.startsWith('/uploads/')) return pathname;
      return trimmed;
    } catch {
      return trimmed;
    }
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}
