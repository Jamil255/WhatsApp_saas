const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030/api';

type ApiOptions = RequestInit & { auth?: boolean };

function clearStoredSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('wa_access_token');
  window.localStorage.removeItem('wa_refresh_token');
  window.localStorage.removeItem('wa_user');
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function refreshAccessToken() {
  if (typeof window === 'undefined') return null;
  const refreshToken = window.localStorage.getItem('wa_refresh_token');
  if (!refreshToken) return null;
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) {
    clearStoredSession();
    return null;
  }
  const body = await response.json().catch(() => ({}));
  const result = body?.data ?? body;
  if (!result?.accessToken) return null;
  window.localStorage.setItem('wa_access_token', result.accessToken);
  if (result.refreshToken)
    window.localStorage.setItem('wa_refresh_token', result.refreshToken);
  return result.accessToken as string;
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { auth = true, headers, ...init } = options;

  async function request(token: string | null) {
    const isFormData =
      typeof FormData !== 'undefined' && init.body instanceof FormData;
    return fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body && !isFormData
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  }

  let token =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('wa_access_token')
      : null;
  let response = await request(token);
  if (response.status === 401 && auth && !path.startsWith('/auth/')) {
    token = await refreshAccessToken();
    if (token) response = await request(token);
  }

  if (response.status === 401 && auth) {
    clearStoredSession();
    if (
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login')
    ) {
      window.location.assign('/login?reason=access-restricted');
    }
  }

  const body =
    response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      body?.error?.message ||
      body?.message ||
      body?.error ||
      'Something went wrong. Please try again.';
    throw new ApiError(
      Array.isArray(message) ? message.join(', ') : String(message),
      response.status,
      body?.error?.code,
      body?.error && typeof body.error === 'object' ? body.error : undefined,
    );
  }
  return (body?.data ?? body) as T;
}

export async function apiFetchBlob(path: string): Promise<Blob> {
  async function request(token: string | null) {
    return fetch(`${API_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  let token =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('wa_access_token')
      : null;
  let response = await request(token);
  if (response.status === 401 && !path.startsWith('/auth/')) {
    token = await refreshAccessToken();
    if (token) response = await request(token);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      String(
        body?.error?.message || body?.message || 'Media could not be loaded.',
      ),
      response.status,
      body?.error?.code,
    );
  }
  return response.blob();
}

export async function login(email: string, password: string) {
  const result = await apiFetch<{
    accessToken: string;
    refreshToken: string;
    user: AppUser;
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    auth: false,
  });
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('wa_access_token', result.accessToken);
    window.localStorage.setItem('wa_refresh_token', result.refreshToken);
    window.localStorage.setItem('wa_user', JSON.stringify(result.user));
  }
  return result;
}

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'tenant_admin' | 'tenant_agent';
  tenantId?: string;
};

export type SessionStatus = {
  status:
    | 'connected'
    | 'connecting'
    | 'pending_verification'
    | 'disconnected'
    | 'destroyed'
    | 'no_session'
    | 'error';
  phoneNumber?: string | null;
  connectedAt?: string | null;
  lastHeartbeatAt?: string | null;
};

export const apiBaseUrl = API_URL;
