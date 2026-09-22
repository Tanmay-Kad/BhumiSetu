"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Spinner, ErrorState, Button } from "@/components/ui";
import type { Role } from "@/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Spinner size="lg" className="text-emerald-800" />
        <p className="text-xs font-medium text-slate-500 tracking-wide uppercase">
          Verifying credentials...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Will redirect in useEffect
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    const fallbackPath =
      role === "OFFICER"
        ? "/officer/dashboard"
        : role === "ADMIN"
        ? "/admin/dashboard"
        : "/dashboard";

    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <ErrorState
          title="Access Restricted"
          message={`Your account role (${role}) is not authorized to access this section.`}
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.replace(fallbackPath)}
            >
              Return to Your Dashboard
            </Button>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
