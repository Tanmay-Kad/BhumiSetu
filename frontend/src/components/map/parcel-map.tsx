"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { Parcel } from "@/types";

// Dynamically import inner Leaflet map with SSR disabled
const ParcelMapInner = dynamic(() => import("./parcel-map-inner"), {
  ssr: false,
  loading: () => <MapLoadingSkeleton />,
});

export interface ParcelMapProps {
  parcels: Parcel[];
  selectedParcelId?: string | null;
  onSelectParcel?: (parcel: Parcel) => void;
  isLoading?: boolean;
  className?: string;
}

function MapLoadingSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative flex h-full min-h-[350px] w-full flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-100/80 p-6 ${className}`}
      aria-busy="true"
      aria-label="Loading interactive GIS cadastral map"
    >
      <div className="flex flex-col items-center space-y-3 text-center">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
          <svg
            className="h-6 w-6 animate-spin text-emerald-700"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-800">
            Initialising Cadastral Map Engine
          </p>
          <p className="text-xs text-slate-500">
            Loading OpenStreetMap base tiles & spatial boundary index...
          </p>
        </div>
      </div>
    </div>
  );
}

export function ParcelMap({
  parcels,
  selectedParcelId,
  onSelectParcel,
  isLoading = false,
  className = "",
}: ParcelMapProps) {
  const parcelsWithGeom = parcels.filter(
    (p) => p.geometry && Array.isArray((p.geometry as { coordinates?: unknown }).coordinates)
  );

  return (
    <div
      className={`relative h-full w-full min-h-[340px] ${className}`}
      role="region"
      aria-label="Interactive Cadastral GIS Parcel Map"
    >
      {/* Map Instance */}
      <ParcelMapInner
        parcels={parcels}
        selectedParcelId={selectedParcelId}
        onSelectParcel={onSelectParcel}
        className="h-full w-full"
      />

      {/* Top Left Status / Count Badge */}
      {parcelsWithGeom.length > 0 && !isLoading && (
        <div className="absolute top-3 left-12 z-10">
          <div className="flex items-center gap-1.5 rounded-md bg-white/95 px-2.5 py-1 text-[11px] font-medium text-slate-800 shadow-md ring-1 ring-slate-900/10 backdrop-blur-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>
              {parcelsWithGeom.length === 1
                ? "1 parcel boundary mapped"
                : `${parcelsWithGeom.length} parcel boundaries mapped`}
            </span>
          </div>
        </div>
      )}

      {/* State Overlay: Search results exist, but none have geometry */}
      {parcels.length > 0 && parcelsWithGeom.length === 0 && !isLoading && (
        <div className="absolute top-3 left-12 right-12 z-10 pointer-events-none">
          <div className="mx-auto max-w-md rounded-md bg-amber-50/95 p-3 text-xs text-amber-900 shadow-md ring-1 ring-amber-300 backdrop-blur-xs pointer-events-auto flex items-start gap-2.5">
            <span className="p-0.5 text-amber-700 shrink-0">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <div>
              <p className="font-semibold text-amber-950">Map boundaries are not available for the selected parcels.</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                The returned land records are active in the registry, but digital PostGIS polygon vertices have not yet been surveyed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-xs">
          <div className="flex items-center gap-2.5 rounded-lg bg-white px-4 py-2.5 shadow-lg border border-slate-200">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-800 border-t-transparent" />
            <span className="text-xs font-semibold text-slate-800">
              Updating cadastral layer...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ParcelMap;
