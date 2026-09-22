export class ApiError extends Error {
  public statusCode: number;
  public data?: unknown;

  constructor(message: string, statusCode: number = 500, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.data = data;
  }
}

/**
 * Extracts a human-readable message from any unknown error.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.statusCode === 401) {
      return "Your session has expired. Please log in again.";
    }
    if (error.statusCode === 403) {
      return "You do not have permission to perform this action.";
    }
    if (error.statusCode === 404) {
      return error.message || "Requested resource was not found.";
    }
    return error.message;
  }

  if (error instanceof Error) {
    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      return "Unable to connect to the BhumiSetu server. Please check your connection.";
    }
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}
