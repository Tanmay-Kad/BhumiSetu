import React from "react";
import type { Metadata } from "next";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, EmptyState } from "@/components/ui";

export const metadata: Metadata = {
  title: "Notifications | BhumiSetu",
  description: "View official notices, status updates, and department requests.",
};

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Official Notifications
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Stay informed on review decisions, hearing dates, and action items.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
          <CardDescription>Real-time official updates</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Notification Center"
            description="Notifications are synchronized with GET /api/v1/notifications."
          />
        </CardContent>
      </Card>
    </div>
  );
}
