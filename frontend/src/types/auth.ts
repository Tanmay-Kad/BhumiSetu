export type Role = "CITIZEN" | "OFFICER" | "ADMIN";

export interface User {
  id: string;
  name?: string;
  email: string;
  phone?: string | null;
  role: Role;
  isActive?: boolean;
  department?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  status: "success";
  message?: string;
  token: string;
  user: User;
}

export interface CurrentUserResponse {
  status: "success";
  user: {
    id: string;
    email: string;
    role: Role;
    name?: string;
    department?: string | null;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
}
