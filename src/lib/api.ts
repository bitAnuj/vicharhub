export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

const ACCESS_KEY = "vh_access_token";

function readAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

function writeAccessToken(token: string) {
  try {
    localStorage.setItem(ACCESS_KEY, token);
  } catch {
    return;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (typeof data.accessToken !== "string" || !data.accessToken) return null;
    writeAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

function buildHeaders(body: unknown, token: string | null): HeadersInit | undefined {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return Object.keys(headers).length > 0 ? headers : undefined;
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const isAuthRoute = path.startsWith("/api/auth/");
  const send = (token: string | null): Promise<Response> =>
    fetch(path, {
      method: options.method ?? "GET",
      headers: buildHeaders(options.body, token),
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: "include",
    });

  let response = await send(readAccessToken());

  if (response.status === 401 && !isAuthRoute) {
    const renewed = await refreshAccessToken();
    if (renewed) response = await send(renewed);
  }

  if (response.status === 401 && !isAuthRoute) {
    onUnauthorized?.();
    throw new ApiError("Session expired", 401);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError((data as { error?: string }).error ?? "Request failed", response.status);
  }
  return data as T;
}
