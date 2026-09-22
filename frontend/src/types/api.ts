export interface ApiResponse<T = unknown> {
  status: "success";
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  [key: string]: unknown;
}

export interface ApiErrorResponse {
  status: "error";
  message: string;
  [key: string]: unknown;
}
