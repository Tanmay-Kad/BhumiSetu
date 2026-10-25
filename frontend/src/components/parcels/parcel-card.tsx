import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Parcel } from "@/types";

interface ParcelCardProps {
  parcel: Parcel;
  isOwned?: boolean;
  isSelected?: boolean;
  onSelect?: (parcel: Parcel) => void;
  onFocusMap?: (parcel: Parcel) => void;
}

export function ParcelCard({
  parcel,
  isOwned = false,
  isSelected = false,
  onSelect,
  onFocusMap,
}: ParcelCardProps) {
  const formattedArea =
    typeof parcel.area === "number"
      ? new Intl.NumberFormat("en-IN", {
          maximumFractionDigits: 2,
        }).format(parcel.area)
      : parcel.area;

  return (
    <Card
      onClick={() => onSelect?.(parcel)}
      className={`transition-all duration-200 cursor-pointer ${
        isSelected
          ? "ring-2 ring-emerald-700 border-emerald-600 bg-emerald-50/30 shadow-sm"
          : "hover:border-slate-300 hover:shadow-xs"
      }`}
    >
      <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
        <div className="space-y-3">
          {/* Top Identifiers Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-emerald-950 bg-emerald-50/80 px-2.5 py-1 rounded border border-emerald-200">
                {parcel.ulpin}
              </span>
              {isOwned && (
                <Badge variant="success">Verified Owner</Badge>
              )}
            </div>
            {parcel.geometry && (
              <Badge variant="info" className="text-[11px] gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
                GIS Spatial Geometry
              </Badge>
            )}
          </div>

          {/* Key Attributes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-medium">
                Survey Number
              </span>
              <span className="font-semibold text-slate-800 text-sm">
                {parcel.surveyNumber || "—"}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-medium">
                Parcel Area
              </span>
              <span className="font-semibold text-slate-800 text-sm">
                {formattedArea} <span className="text-xs font-normal text-slate-500">sq m</span>
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-medium">
                Land Classification
              </span>
              <span className="font-medium text-slate-700">
                {parcel.landUse || "General"}
                {parcel.zoning ? ` (${parcel.zoning})` : ""}
              </span>
            </div>
          </div>

          {/* Location Bar */}
          <div className="rounded-md bg-slate-50 p-2.5 text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-slate-400 font-medium">Location:</span>
            <span className="font-medium text-slate-800">{parcel.village}</span>
            <span className="text-slate-300">•</span>
            <span>Taluk: <strong className="text-slate-700">{parcel.taluk}</strong></span>
            <span className="text-slate-300">•</span>
            <span>District: <strong className="text-slate-700">{parcel.district}</strong></span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400 font-mono">
            ID: {parcel.id.slice(0, 8)}...
          </span>
          <div className="flex items-center gap-2">
            {parcel.geometry && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onFocusMap) {
                    onFocusMap(parcel);
                  } else {
                    onSelect?.(parcel);
                  }
                }}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100/80 px-2 py-1 rounded border border-emerald-200 transition-colors"
                title="Zoom and focus on this parcel polygon on the map"
              >
                <svg className="h-3 w-3 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Focus Map</span>
              </button>
            )}
            <Link
              href={`/properties/${parcel.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-md text-xs px-3 py-1.5 gap-1.5 bg-emerald-900 text-white hover:bg-emerald-800 focus:ring-emerald-800 shadow-xs"
            >
              <span>View Parcel</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
