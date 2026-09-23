"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  ErrorState,
  Skeleton,
} from "@/components/ui";
import { getParcelDossier } from "@/lib/api/parcels";
import { getErrorMessage } from "@/lib/api/errors";
import type { ParcelDossierData } from "@/types";

export default function ParcelDossierPage() {
  const { id } = useParams() as { id: string };
  const [dossier, setDossier] = useState<ParcelDossierData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDossier = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getParcelDossier(id);
      setDossier(data);
    } catch (err) {
      setError(getErrorMessage(err));
      setDossier(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDossier();
  }, [loadDossier]);

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading parcel dossier">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="space-y-6">
        <Link
          href={`/properties/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 hover:text-emerald-950"
        >
          <span>← Back to Parcel Details</span>
        </Link>
        <ErrorState
          title="Dossier Not Available"
          message={error || "The dossier for this parcel could not be retrieved."}
          onRetry={loadDossier}
        />
      </div>
    );
  }

  const { summary, location, ownerships } = dossier;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/properties/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 hover:text-emerald-950"
        >
          <span>← Back to Parcel Details</span>
        </Link>
      </div>

      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="font-mono text-sm font-bold text-emerald-950 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
            {summary.ulpin}
          </span>
          <Badge variant="neutral">Dossier Overview</Badge>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Parcel Dossier Summary
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Consolidated legal and cadastral record for survey number {summary.surveyNumber}, {location.village}, {location.district}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ownership Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Title & Ownership Records</CardTitle>
            <CardDescription>Verified proprietary interests on record</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Registered Owners</span>
              <span className="font-bold text-slate-800">{summary.ownerCount}</span>
            </div>
            {ownerships.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No active individual citizen titles are registered on this parcel.
              </p>
            ) : (
              <div className="space-y-2 pt-1">
                {ownerships.map((owner) => (
                  <div
                    key={owner.id}
                    className="p-3 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 block">
                        {owner.user.name}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        Role: {owner.user.role}
                      </span>
                    </div>
                    <Badge variant="success">Verified</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cadastral Jurisdiction */}
        <Card>
          <CardHeader>
            <CardTitle>Cadastral Jurisdiction</CardTitle>
            <CardDescription>Administrative registry details</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Village</span>
              <span className="font-medium text-slate-800">{location.village}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Taluk</span>
              <span className="font-medium text-slate-800">{location.taluk}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-medium">District</span>
              <span className="font-medium text-slate-800">{location.district}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Land Classification</span>
              <span className="font-medium text-slate-800">{summary.landUse} ({summary.zoning})</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notice on future workflows */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4 text-xs text-slate-600 flex items-start gap-3">
          <span className="p-1 rounded bg-emerald-100 text-emerald-800 shrink-0">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <div className="space-y-1">
            <p className="font-semibold text-slate-800">
              Full Application History & Document Records
            </p>
            <p className="text-slate-500 leading-relaxed">
              Comprehensive historical application timeline and downloadable property mutation extracts are part of the upcoming full dossier release.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
