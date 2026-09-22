import React from "react";
import type { Metadata } from "next";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, EmptyState } from "@/components/ui";

export const metadata: Metadata = {
  title: "My Properties | BhumiSetu",
  description: "View and manage your verified cadastral parcel ownerships.",
};

export default function PropertiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          My Properties
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Registered land parcels and verified cadastral titles under your identity.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Owned Parcels</CardTitle>
          <CardDescription>Cadastral parcels registered in BhumiSetu</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Property Records Portal"
            description="Your verified parcels will be loaded via GET /api/v1/ownerships/my-properties."
          />
        </CardContent>
      </Card>
    </div>
  );
}
