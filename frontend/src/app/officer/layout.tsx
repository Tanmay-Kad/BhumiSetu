import React from "react";
import { ProtectedRoute } from "@/components/auth";
import { AppShell } from "@/components/layout";

export default function OfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["OFFICER", "ADMIN"]}>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}
