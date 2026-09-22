import React from "react";
import { ProtectedRoute } from "@/components/auth";
import { AppShell } from "@/components/layout";

export default function ProtectedCitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["CITIZEN"]}>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}
