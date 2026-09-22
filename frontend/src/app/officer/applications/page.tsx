import React from "react";
import type { Metadata } from "next";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, EmptyState } from "@/components/ui";

export const metadata: Metadata = {
  title: "Workflow Inbox | BhumiSetu",
  description: "Review and process incoming departmental applications.",
};

export default function OfficerApplicationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Department Workflow Inbox
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review submissions, request additional information, and issue formal decisions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Applications Under Review</CardTitle>
          <CardDescription>Department-scoped application queue</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Workflow Queue Portal"
            description="Active applications will be loaded from GET /api/v1/officer/applications."
          />
        </CardContent>
      </Card>
    </div>
  );
}
