import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Parcel } from "@/types";

interface ParcelCardProps {
  parcel: Parcel;
  isOwned?: boolean;
}

export function ParcelCard({ parcel, isOwned = false }: ParcelCardProps) {
  const formattedArea =
    typeof parcel.area === "number"
      ? new Intl.NumberFormat("en-IN", {
          maximumFractionDigits: 2,
        }).format(parcel.area)
      : parcel.area;

  return (
    <Card className="hover:border-slate-300 transition-colors">
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
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            ID: {parcel.id.slice(0, 8)}...
          </span>
          <Link
            href={`/properties/${parcel.id}`}
            className="inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-md text-xs px-3 py-1.5 gap-1.5 bg-emerald-900 text-white hover:bg-emerald-800 focus:ring-emerald-800 shadow-xs"
          >
            <span>View Parcel</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
