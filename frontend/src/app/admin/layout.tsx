import React from "react";
import { ProtectedRoute } from "@/components/auth";
import { AppShell } from "@/components/layout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}
