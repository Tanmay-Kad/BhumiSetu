"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useCitizenDashboard } from "@/hooks/use-citizen-dashboard";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  EmptyState,
  ErrorState,
} from "@/components/ui";
import {
  ApplicationStatusBadge,
  formatApplicationType,
  CitizenDashboardSkeleton,
} from "@/components/dashboard";
import type { ApplicationSummary } from "@/types";

export default function CitizenDashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useCitizenDashboard();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper date formatter
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Not submitted";
    try {
      const d = new Date(dateString);
      return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(d);
    } catch {
      return dateString;
    }
  };

  if (isLoading && !data) {
    return <CitizenDashboardSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Citizen Portal Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, {user?.name || user?.email}.
          </p>
        </div>
        <ErrorState
          title="Unable to Load Dashboard Data"
          message={error}
          onRetry={refetch}
        />
      </div>
    );
  }

  const summary = data?.summary || {
    totalApplications: 0,
    draftApplications: 0,
    submittedApplications: 0,
    underReviewApplications: 0,
    additionalInfoRequired: 0,
    resubmittedApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    completedApplications: 0,
    cancelledApplications: 0,
  };

  const parcels = data?.parcels || { ownedCount: 0 };
  const notifications = data?.notifications || { unreadCount: 0 };
  const recentApplications: ApplicationSummary[] = data?.recentApplications || [];

  const inProgressCount =
    summary.submittedApplications +
    summary.underReviewApplications +
    summary.resubmittedApplications;

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.name || user?.email || "Citizen"}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage your land records, applications and approvals from one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5"
            aria-label="Refresh dashboard data"
          >
            <svg
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-emerald-700" : "text-slate-600"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </Button>

          <Link
            href="/applications"
            className="inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-md text-xs px-2.5 py-1.5 gap-1.5 bg-emerald-900 text-white hover:bg-emerald-800 focus:ring-emerald-800 shadow-xs"
          >
            <span>View All Applications</span>
          </Link>
        </div>
      </div>

      {/* 2. Attention Section */}
      {summary.additionalInfoRequired > 0 ? (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-amber-950 shadow-xs"
          role="region"
          aria-label="Action required on applications"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-100 p-2 text-amber-700 shrink-0">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-amber-900">
                Action Required: Additional Information Requested
              </h2>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                You have {summary.additionalInfoRequired}{" "}
                {summary.additionalInfoRequired === 1 ? "application" : "applications"}{" "}
                requiring supplementary documents or clarification before review can proceed.
              </p>
            </div>
          </div>
          <Link
            href="/applications"
            className="shrink-0 inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-md text-xs px-2.5 py-1.5 gap-1.5 bg-amber-800 text-white hover:bg-amber-900 focus:ring-amber-800 shadow-xs"
          >
            Review Requests →
          </Link>
        </div>
      ) : (
        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 flex items-center justify-between gap-4 text-emerald-950"
          role="region"
          aria-label="Application status summary"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-100 p-1.5 text-emerald-700 shrink-0">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-900">
                All Applications in Good Standing
              </p>
              <p className="text-xs text-emerald-800/90">
                No pending actions or information requests require your input at this time.
              </p>
            </div>
          </div>
          <Link
            href="/applications"
            className="text-xs font-medium text-emerald-800 hover:text-emerald-950 underline underline-offset-2 shrink-0 hidden sm:inline-block"
          >
            Track status
          </Link>
        </div>
      )}

      {/* 3. Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Properties Card */}
        <Card className="hover:border-slate-300 transition-colors">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">
                  Owned Properties
                </span>
                <span className="p-1.5 rounded-md bg-emerald-50 text-emerald-700">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {parcels.ownedCount}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {parcels.ownedCount === 1
                  ? "Cadastral parcel registered"
                  : "Cadastral parcels registered"}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                href="/properties"
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center justify-between"
              >
                <span>View Land Records</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Total Applications Card */}
        <Card className="hover:border-slate-300 transition-colors">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">
                  Total Filings
                </span>
                <span className="p-1.5 rounded-md bg-blue-50 text-blue-700">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {summary.totalApplications}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Across all departmental services
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                href="/applications"
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center justify-between"
              >
                <span>All Applications</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* In Review & Pending Card */}
        <Card className="hover:border-slate-300 transition-colors">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">
                  In Progress
                </span>
                <span className="p-1.5 rounded-md bg-indigo-50 text-indigo-700">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {inProgressCount}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {summary.underReviewApplications} under review ·{" "}
                {summary.submittedApplications + summary.resubmittedApplications} submitted
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                href="/applications"
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center justify-between"
              >
                <span>Track Progress</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card className="hover:border-slate-300 transition-colors">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">
                  Unread Notices
                </span>
                <span className="p-1.5 rounded-md bg-amber-50 text-amber-700">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {notifications.unreadCount}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Official notices & workflow updates
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                href="/notifications"
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center justify-between"
              >
                <span>View Notifications</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Complete Application Status Breakdown */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3">
          <div>
            <CardTitle>Application Status Overview</CardTitle>
            <CardDescription>
              Complete breakdown of all service filings by workflow stage
            </CardDescription>
          </div>
          <span className="text-xs text-slate-400 font-normal mt-1 sm:mt-0">
            Total recorded: {summary.totalApplications}
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Draft */}
            <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-600">Draft</span>
                <span className="h-2 w-2 rounded-full bg-slate-400" />
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {summary.draftApplications}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Unsubmitted</p>
            </div>

            {/* Submitted */}
            <div className="p-3.5 rounded-lg border border-blue-200/60 bg-blue-50/30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-blue-900">Submitted</span>
                <span className="h-2 w-2 rounded-full bg-blue-500" />
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {summary.submittedApplications}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Awaiting assignment</p>
            </div>

            {/* Under Review */}
            <div className="p-3.5 rounded-lg border border-indigo-200/60 bg-indigo-50/30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-indigo-900">Under Review</span>
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {summary.underReviewApplications}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Active examination</p>
            </div>

            {/* Action Required */}
            <div
              className={`p-3.5 rounded-lg border ${
                summary.additionalInfoRequired > 0
                  ? "border-amber-300 bg-amber-50/60"
                  : "border-slate-200/80 bg-slate-50/50"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-xs font-medium ${
                    summary.additionalInfoRequired > 0
                      ? "text-amber-900 font-semibold"
                      : "text-slate-600"
                  }`}
                >
                  Action Required
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    summary.additionalInfoRequired > 0
                      ? "bg-amber-500 animate-pulse"
                      : "bg-slate-300"
                  }`}
                />
              </div>
              <div
                className={`text-xl font-semibold ${
                  summary.additionalInfoRequired > 0
                    ? "text-amber-900"
                    : "text-slate-900"
                }`}
              >
                {summary.additionalInfoRequired}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Citizen response needed</p>
            </div>

            {/* Resubmitted */}
            <div className="p-3.5 rounded-lg border border-sky-200/60 bg-sky-50/30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-sky-900">Resubmitted</span>
                <span className="h-2 w-2 rounded-full bg-sky-500" />
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {summary.resubmittedApplications}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Updated by you</p>
            </div>

            {/* Approved */}
            <div className="p-3.5 rounded-lg border border-emerald-200/70 bg-emerald-50/30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-emerald-900">Approved</span>
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {summary.approvedApplications}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Incl. conditional approvals
              </p>
            </div>

            {/* Completed */}
            <div className="p-3.5 rounded-lg border border-emerald-200/50 bg-emerald-50/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-emerald-900">Completed</span>
                <span className="h-2 w-2 rounded-full bg-emerald-700" />
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {summary.completedApplications}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Formally finalized</p>
            </div>

            {/* Rejected */}
            <div className="p-3.5 rounded-lg border border-rose-200/60 bg-rose-50/30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-rose-900">Rejected</span>
                <span className="h-2 w-2 rounded-full bg-rose-500" />
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {summary.rejectedApplications}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Declined filings</p>
            </div>

            {/* Cancelled */}
            <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-600">Cancelled</span>
                <span className="h-2 w-2 rounded-full bg-slate-400" />
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {summary.cancelledApplications}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Withdrawn filings</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Recent Applications List */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4">
          <div>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>
              Your latest submitted or drafted service filings
            </CardDescription>
          </div>
          <Link
            href="/applications"
            className="mt-2 sm:mt-0 inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-md text-xs px-2.5 py-1.5 gap-1.5 bg-transparent text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400"
          >
            View All Applications →
          </Link>
        </CardHeader>
        <CardContent>
          {recentApplications.length === 0 ? (
            <EmptyState
              title="No Applications Filed Yet"
              description="You have not submitted any property or land service applications. When you submit an application, its live progress and department reviews will be tracked here."
              action={
                <Link
                  href="/applications"
                  className="inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-md text-xs px-2.5 py-1.5 gap-1.5 bg-emerald-900 text-white hover:bg-emerald-800 focus:ring-emerald-800 shadow-xs"
                >
                  Browse Available Services
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {recentApplications.map((app) => (
                <div
                  key={app.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {app.applicationNumber}
                      </span>
                      <ApplicationStatusBadge status={app.status} />
                      <span className="text-xs font-medium text-slate-700">
                        {formatApplicationType(app.type)}
                      </span>
                    </div>

                    {/* Parcel Details */}
                    {app.parcel && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <span className="text-slate-400 font-medium">ULPIN:</span>
                          <span className="font-mono text-slate-700">
                            {app.parcel.ulpin}
                          </span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>
                          Survey: <strong className="text-slate-700">{app.parcel.surveyNumber}</strong>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>
                          {app.parcel.village}, {app.parcel.district}
                        </span>
                      </div>
                    )}

                    {/* Department Assignment & Dates */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      {app.department ? (
                        <span>
                          Department:{" "}
                          <strong className="text-slate-700 font-medium">
                            {app.department.name} ({app.department.code})
                          </strong>
                        </span>
                      ) : (
                        <span className="italic text-slate-400">
                          Department: Not yet assigned
                        </span>
                      )}
                      <span className="text-slate-300">•</span>
                      <span>
                        Filed:{" "}
                        <span className="text-slate-700">
                          {formatDate(app.submittedAt || app.createdAt)}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <Link
                      href="/applications"
                      className="inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-md text-xs px-2.5 py-1.5 gap-1.5 bg-transparent text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400"
                    >
                      View Status
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
