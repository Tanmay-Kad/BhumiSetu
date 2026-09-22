"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, EmptyState, Badge } from "@/components/ui";

export default function OfficerDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Department Officer Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Departmental workflow, review queue, and application decision console.
          </p>
        </div>
        {user?.department && (
          <div>
            <Badge variant="info" className="text-sm py-1 px-3">
              Department: {user.department}
            </Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Review Queue</CardTitle>
            <CardDescription>Submitted & resubmitted applications</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500 leading-relaxed">
              Applications requiring immediate review initiation or decision submission.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Awaiting Citizen</CardTitle>
            <CardDescription>Additional information requested</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pending clarifications and document resubmissions from applicant citizens.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completed Decisions</CardTitle>
            <CardDescription>Approved and rejected records</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500 leading-relaxed">
              Archived decisions with conditions, endorsements, and official remarks.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department Activity</CardTitle>
          <CardDescription>Live application processing queue</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Officer Metrics Ready"
            description="The officer foundation is configured. Live departmental counts and workload metrics will connect to /api/v1/dashboard/officer in the dashboard phase."
          />
        </CardContent>
      </Card>
    </div>
  );
}
