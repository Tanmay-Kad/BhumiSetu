/**
 * Token Management Service for BhumiSetu Frontend
 *
 * NOTE ON SECURITY:
 * Storing JWT tokens in localStorage enables client-side Authorization: Bearer <token>
 * headers across API calls in this decoupled architecture.
 *
 * Security Trade-off:
 * While localStorage is simple and standard for decoupled SPA prototypes, it is accessible
 * by client-side JavaScript (XSS vulnerable). For high-assurance banking or production deployments,
 * server-set HttpOnly, Secure, SameSite cookies are recommended.
 */

const TOKEN_KEY = "bhumisetu_auth_token";

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error("Failed to persist auth token in localStorage", error);
  }
}

export function removeToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error("Failed to remove auth token from localStorage", error);
  }
}
