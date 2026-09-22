import { env } from "@/config/env";
import { getToken, removeToken } from "@/lib/auth/token";
import { ApiError } from "./errors";

interface RequestOptions extends Omit<RequestInit, "body"> {
  requiresAuth?: boolean;
  body?: unknown;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { requiresAuth = true, headers: customHeaders, body, ...rest } = options;

  // Build clean URL
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${env.apiBaseUrl}${normalizedEndpoint}`;

  const headers = new Headers(customHeaders);
  if (!headers.has("Content-Type") && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (requiresAuth) {
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers,
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new ApiError(
      "Unable to connect to the BhumiSetu server. Please verify your connection.",
      0,
      error
    );
  }

  // Handle unauthorized/expired token globally
  if (response.status === 401 && requiresAuth) {
    removeToken();
  }

  // Parse JSON response safely
  let responseData: Record<string, unknown> | null = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      responseData = (await response.json()) as Record<string, unknown>;
    } catch {
      responseData = null;
    }
  }

  if (!response.ok) {
    const errorMessage =
      (typeof responseData?.message === "string" ? responseData.message : null) ||
      (typeof responseData?.error === "string" ? responseData.error : null) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(errorMessage, response.status, responseData);
  }

  return responseData as unknown as T;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "POST", body }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "PATCH", body }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};
