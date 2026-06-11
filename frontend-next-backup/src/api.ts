import { useAuth } from '@clerk/clerk-react';
import { useEffect, useMemo, useState } from 'react';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

type ApiRequestOptions = RequestInit & {
  json?: unknown;
  token?: string | null;
};

function getBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (!baseUrl) {
    throw new ApiError('VITE_API_URL is not configured', 500, null);
  }

  return baseUrl.replace(/\/$/, '');
}

async function resolveToken(explicitToken?: string | null): Promise<string | null> {
  if (explicitToken !== undefined) {
    return explicitToken;
  }

  return null;
}

export async function apiFetch(path: string, options: ApiRequestOptions = {}): Promise<Response> {
  const { json, token, ...requestOptions } = options;
  const resolvedToken = await resolveToken(token);
  const headers = new Headers(requestOptions.headers);

  if (resolvedToken) {
    headers.set('Authorization', `Bearer ${resolvedToken}`);
  }

  let body = requestOptions.body;
  if (json !== undefined) {
    body = JSON.stringify(json);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(`${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`, {
    ...requestOptions,
    body,
    headers,
  });

  if (!response.ok) {
    let data: unknown = null;

    try {
      data = await response.clone().json();
    } catch {
      try {
        data = await response.text();
      } catch {
        data = null;
      }
    }

    throw new ApiError(response.statusText || 'Request failed', response.status, data);
  }

  return response;
}

export async function get<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await apiFetch(path, { ...options, method: 'GET' });
  return response.json() as Promise<T>;
}

export async function post<T>(path: string, body?: unknown, options: ApiRequestOptions = {}): Promise<T> {
  const response = await apiFetch(path, { ...options, method: 'POST', json: body });
  return response.json() as Promise<T>;
}

export async function patch<T>(path: string, body?: unknown, options: ApiRequestOptions = {}): Promise<T> {
  const response = await apiFetch(path, { ...options, method: 'PATCH', json: body });
  return response.json() as Promise<T>;
}

export async function del<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await apiFetch(path, { ...options, method: 'DELETE' });
  return response.json() as Promise<T>;
}

export function useApiClient() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!isLoaded) {
      return () => {
        active = false;
      };
    }

    if (!isSignedIn) {
      setToken(null);
      return () => {
        active = false;
      };
    }

    void getToken()
      .then(resolvedToken => {
        if (active) {
          setToken(resolvedToken);
        }
      })
      .catch(() => {
        if (active) {
          setToken(null);
        }
      });

    return () => {
      active = false;
    };
  }, [getToken, isLoaded, isSignedIn]);

  return useMemo(() => {
    return {
      token,
      get: <T,>(path: string, options: ApiRequestOptions = {}) => get<T>(path, { ...options, token }),
      post: <T,>(path: string, body?: unknown, options: ApiRequestOptions = {}) => post<T>(path, body, { ...options, token }),
      patch: <T,>(path: string, body?: unknown, options: ApiRequestOptions = {}) => patch<T>(path, body, { ...options, token }),
      del: <T,>(path: string, options: ApiRequestOptions = {}) => del<T>(path, { ...options, token }),
    };
  }, [token]);
}

export async function checkUsernameAvailability(username: string, options: ApiRequestOptions = {}) {
  return get<{ available: boolean }>(`/api/users/check-username?u=${encodeURIComponent(username)}`, options);
}