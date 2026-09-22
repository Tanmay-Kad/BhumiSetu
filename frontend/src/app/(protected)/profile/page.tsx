"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from "@/components/ui";

export default function ProfilePage() {
  const { user, role } = useAuth();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          User Profile
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Your identity and access credentials on the BhumiSetu platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Verified personal details</CardDescription>
            </div>
            {role && (
              <Badge
                variant={
                  role === "ADMIN"
                    ? "danger"
                    : role === "OFFICER"
                    ? "info"
                    : "success"
                }
              >
                {role}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                User Identifier
              </label>
              <p className="text-xs font-mono text-slate-700 mt-0.5 break-all">
                {user?.id || "N/A"}
              </p>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Full Name
              </label>
              <p className="text-sm font-medium text-slate-900 mt-0.5">
                {user?.name || "Not provided"}
              </p>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Email Address
              </label>
              <p className="text-sm font-medium text-slate-900 mt-0.5">
                {user?.email || "N/A"}
              </p>
            </div>

            {user?.department && (
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Department
                </label>
                <p className="text-sm font-medium text-slate-900 mt-0.5">
                  {user.department}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
