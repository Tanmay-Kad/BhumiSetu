"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, EmptyState } from "@/components/ui";

export default function CitizenDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Citizen Portal Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Welcome back, {user?.name || user?.email}. Manage your land records, applications, and updates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>My Properties</CardTitle>
            <CardDescription>Associated cadastral parcels</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500 leading-relaxed">
              View verified parcel titles, ULPIN identifiers, and spatial records.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            <CardDescription>Submissions & status tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500 leading-relaxed">
              Track building permissions, land-use mutations, and department reviews.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Official correspondence</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500 leading-relaxed">
              Real-time notices on review progress and additional information requests.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Live application history and department routing</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Dashboard Integration Ready"
            description="The dashboard foundation is established. Live status metrics and real-time summaries will connect to /api/v1/dashboard/citizen in the dashboard phase."
          />
        </CardContent>
      </Card>
    </div>
  );
}
