/**
 * Centralized frontend environment configuration.
 * Uses NEXT_PUBLIC_ variables safely.
 */
export const env = {
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:5000/api/v1",
} as const;
