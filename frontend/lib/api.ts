const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3030/api";

type ApiOptions = RequestInit & { auth?: boolean };

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { auth = true, headers, ...init } = options;
  const token = typeof window !== "undefined" ? window.localStorage.getItem("wa_access_token") : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message || body?.error || "Something went wrong. Please try again.");
  }
  return (body?.data ?? body) as T;
}

export async function login(email: string, password: string) {
  const result = await apiFetch<{ accessToken: string; refreshToken: string; user: AppUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    auth: false,
  });
  if (typeof window !== "undefined") {
    window.localStorage.setItem("wa_access_token", result.accessToken);
    window.localStorage.setItem("wa_refresh_token", result.refreshToken);
    window.localStorage.setItem("wa_user", JSON.stringify(result.user));
  }
  return result;
}

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "tenant_admin" | "tenant_agent";
  tenantId?: string;
};

export type SessionStatus = {
  status: "connected" | "connecting" | "pending_verification" | "disconnected" | "error";
  phoneNumber?: string | null;
  connectedAt?: string | null;
  lastHeartbeatAt?: string | null;
};

export const apiBaseUrl = API_URL;
