import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export function CitizenDashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading citizen dashboard" aria-busy="true">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Attention / Alert Banner Skeleton */}
      <Skeleton className="h-20 w-full rounded-lg" />

      {/* Primary Metrics Grid Skeleton (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-36" />
          </Card>
        ))}
      </div>

      {/* Status Breakdown Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-72" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="p-3 rounded-md bg-slate-50 border border-slate-100 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-10" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Applications Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-8 w-28" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
