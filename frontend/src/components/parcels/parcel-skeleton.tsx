import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ParcelSkeleton() {
  return (
    <Card className="p-5 space-y-4">
      <CardContent className="p-0 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>

        <Skeleton className="h-9 w-full rounded-md" />

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}
