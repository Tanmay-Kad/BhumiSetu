import React from "react";
import type { Metadata } from "next";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, EmptyState } from "@/components/ui";

export const metadata: Metadata = {
  title: "My Applications | BhumiSetu",
  description: "View and track the status of your land governance applications.",
};

export default function ApplicationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          My Applications
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Track building permissions, tree authority clearances, and mutation requests.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submitted Applications</CardTitle>
          <CardDescription>Live application lifecycle tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Applications Portal"
            description="Your application portfolio will be loaded from GET /api/v1/applications."
          />
        </CardContent>
      </Card>
    </div>
  );
}
