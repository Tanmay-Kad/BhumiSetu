"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, EmptyState, Badge } from "@/components/ui";

export default function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Administration Console
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome, {user?.name || user?.email || "Admin"}. System-wide portal metrics, inter-departmental analytics, and audit management.
          </p>
        </div>
        <div>
          <Badge variant="danger" className="text-sm py-1 px-3">
            Role: Administrator
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
            <CardDescription>Configured administrative authorities</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500 leading-relaxed">
              Town Planning (TPD), Tree Authority (TREE), Revenue (REV), and Utilities (UTIL).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Volume</CardTitle>
            <CardDescription>Cross-departmental applications</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500 leading-relaxed">
              Consolidated application volume, pending reviews, and throughput rates.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit & Compliance</CardTitle>
            <CardDescription>System logs & integrity checks</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500 leading-relaxed">
              Immutable state audit histories and storage consistency verifications.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cross-Departmental Overview</CardTitle>
          <CardDescription>Consolidated statistics across authorities</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Admin Metrics Ready"
            description="The administrative foundation is configured. System-wide summaries and per-department breakdowns will connect to /api/v1/dashboard/officer (admin mode) in the dashboard phase."
          />
        </CardContent>
      </Card>
    </div>
  );
}
