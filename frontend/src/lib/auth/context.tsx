"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { getToken, setToken, removeToken } from "@/lib/auth/token";
import type {
  User,
  Role,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  CurrentUserResponse,
} from "@/types";

interface AuthContextType {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<User>;
  register: (data: RegisterRequest) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const refreshUser = useCallback(async (): Promise<User | null> => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return null;
    }

    try {
      const response = await api.get<CurrentUserResponse>("/auth/me");
      if (response && response.user) {
        const fullUser: User = {
          id: response.user.id,
          email: response.user.email,
          role: response.user.role,
          name: response.user.name,
          department: response.user.department,
        };
        setUser(fullUser);
        return fullUser;
      }
      setUser(null);
      return null;
    } catch {
      removeToken();
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (credentials: LoginRequest): Promise<User> => {
    const response = await api.post<AuthResponse>("/auth/login", credentials, {
      requiresAuth: false,
    });

    if (response.token && response.user) {
      setToken(response.token);
      setUser(response.user);
      return response.user;
    }

    throw new Error("Invalid response received from authentication server");
  };

  const register = async (data: RegisterRequest): Promise<User> => {
    const response = await api.post<AuthResponse>("/auth/register", data, {
      requiresAuth: false,
    });

    if (response.token && response.user) {
      setToken(response.token);
      setUser(response.user);
      return response.user;
    }

    throw new Error("Registration succeeded but no session token was provided");
  };

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
