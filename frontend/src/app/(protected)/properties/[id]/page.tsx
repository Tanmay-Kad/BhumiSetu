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
import { getParcelById } from "@/lib/api/parcels";
import { getErrorMessage } from "@/lib/api/errors";
import type { Parcel } from "@/types";

export default function ParcelDetailPage() {
  const { id } = useParams() as { id: string };
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadParcel = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getParcelById(id);
      setParcel(data);
    } catch (err) {
      setError(getErrorMessage(err));
      setParcel(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadParcel();
  }, [loadParcel]);

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading parcel details">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !parcel) {
    return (
      <div className="space-y-6">
        <Link
          href="/properties"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 hover:text-emerald-950"
        >
          <span>← Back to Properties & Land Search</span>
        </Link>
        <ErrorState
          title="Parcel Record Not Found"
          message={error || "The requested land parcel record could not be found or has been withdrawn."}
          onRetry={loadParcel}
        />
      </div>
    );
  }

  const formattedArea =
    typeof parcel.area === "number"
      ? new Intl.NumberFormat("en-IN", {
          maximumFractionDigits: 2,
        }).format(parcel.area)
      : parcel.area;

  // Geometry insights
  const hasGeometry = !!parcel.geometry;
  const geometryType = parcel.geometry?.type || "None";
  const coordinatesCount =
    parcel.geometry && Array.isArray(parcel.geometry.coordinates)
      ? parcel.geometry.coordinates.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          href="/properties"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 hover:text-emerald-950"
        >
          <span>← Back to Properties & Land Search</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-emerald-950 bg-emerald-50 px-3 py-1 rounded border border-emerald-200">
              {parcel.ulpin}
            </span>
            {hasGeometry && (
              <Badge variant="info">
                GIS Geometry Verified
              </Badge>
            )}
            <Badge variant="neutral">
              Survey No. {parcel.surveyNumber}
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 pt-1">
            Parcel Cadastral Record
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Official cadastral entry for {parcel.village}, Taluk {parcel.taluk}, District {parcel.district}.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/properties/${parcel.id}/dossier`}
            className="inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-md text-xs px-3 py-2 gap-1.5 bg-emerald-900 text-white hover:bg-emerald-800 focus:ring-emerald-800 shadow-xs"
          >
            <span>View Parcel Dossier</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Administrative & Geographic Location */}
        <Card>
          <CardHeader>
            <CardTitle>Administrative Location</CardTitle>
            <CardDescription>Cadastral jurisdiction and revenue boundaries</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-medium">ULPIN (Bhu-Aadhaar)</span>
              <span className="font-mono font-bold text-slate-900">{parcel.ulpin}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Survey Number</span>
              <span className="font-semibold text-slate-800">{parcel.surveyNumber}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Village</span>
              <span className="font-medium text-slate-800">{parcel.village}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Taluk</span>
              <span className="font-medium text-slate-800">{parcel.taluk}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-medium">District</span>
              <span className="font-medium text-slate-800">{parcel.district}</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Regulatory & Land Attributes */}
        <Card>
          <CardHeader>
            <CardTitle>Land Use & Regulatory Classification</CardTitle>
            <CardDescription>Permitted planning classification and spatial extent</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Total Registered Area</span>
              <span className="font-semibold text-slate-900 text-sm">
                {formattedArea} <span className="text-xs font-normal text-slate-500">sq meters</span>
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Approved Land Use</span>
              <span className="font-medium text-slate-800">{parcel.landUse || "General"}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Zoning Classification</span>
              <span className="font-mono font-medium text-slate-800">{parcel.zoning || "Unspecified"}</span>
            </div>
            {parcel.createdAt && (
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Registered Date</span>
                <span className="text-slate-700">
                  {new Date(parcel.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-medium">System UUID</span>
              <span className="font-mono text-[11px] text-slate-500">{parcel.id}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card 3: GIS Spatial Boundaries & PostGIS Metadata */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cadastral Spatial Geometry</CardTitle>
              <CardDescription>
                Geographic boundary data indexed in PostgreSQL / PostGIS
              </CardDescription>
            </div>
            {hasGeometry ? (
              <Badge variant="success">Active Geometry</Badge>
            ) : (
              <Badge variant="neutral">Attribute Record Only</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasGeometry ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-medium">
                    Geometry Type
                  </span>
                  <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                    {geometryType}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-medium">
                    Coordinate System
                  </span>
                  <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                    WGS 84 (SRID 4326)
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-medium">
                    Polygon Rings
                  </span>
                  <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                    {coordinatesCount} boundary ring(s)
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-xs text-slate-600 flex items-start gap-3">
                <span className="p-1 rounded bg-blue-100 text-blue-700 shrink-0">
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
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </span>
                <div className="space-y-1">
                  <p className="font-medium text-slate-800">
                    Spatial Polygon Validated
                  </p>
                  <p className="text-slate-500 leading-relaxed">
                    This parcel possesses certified spatial boundary vertices indexed via PostgreSQL PostGIS. Full interactive cadastral layer rendering will be enabled in the upcoming GIS map viewer module.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-3">
              Spatial polygon boundaries are not yet digitally mapped for this parcel. Contact the Survey and Land Records department to request cadastral digitisation.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
