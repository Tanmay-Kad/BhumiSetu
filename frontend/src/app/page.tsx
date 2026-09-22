import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Banner / Nav */}
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-900 text-white font-bold text-base">
              BS
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight block leading-tight">
                BhumiSetu
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">
                Digital Land Governance
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" size="sm">
                Register Citizen
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 text-center flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
          National Land Governance Portal
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-3xl">
          Unified, Parcel-Centric Land Management & Approvals
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
          BhumiSetu connects citizens, town planning departments, tree authorities,
          and revenue offices with high-precision PostGIS spatial mapping, automated
          department routing, and transparent application tracking.
        </p>

        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link href="/login">
            <Button variant="primary" size="lg" className="min-w-[160px]">
              Access Portal
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="secondary" size="lg" className="min-w-[160px]">
              Register Citizen
            </Button>
          </Link>
        </div>

        {/* Civic highlights grid */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left w-full">
          <div className="civic-card p-6 bg-white rounded-lg border border-slate-200 shadow-xs">
            <div className="h-8 w-8 rounded-md bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-sm mb-3">
              GIS
            </div>
            <h2 className="text-sm font-bold text-slate-900">PostGIS Spatial Foundation</h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              ULPIN-indexed spatial cadastral parcels with bounding-box queries and meter-accurate proximity searches.
            </p>
          </div>

          <div className="civic-card p-6 bg-white rounded-lg border border-slate-200 shadow-xs">
            <div className="h-8 w-8 rounded-md bg-blue-50 text-blue-800 flex items-center justify-center font-bold text-sm mb-3">
              WF
            </div>
            <h2 className="text-sm font-bold text-slate-900">Automated Workflow Routing</h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              End-to-end multi-department routing across Town Planning, Revenue, and Tree Authorities.
            </p>
          </div>

          <div className="civic-card p-6 bg-white rounded-lg border border-slate-200 shadow-xs">
            <div className="h-8 w-8 rounded-md bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-sm mb-3">
              AUD
            </div>
            <h2 className="text-sm font-bold text-slate-900">Audit Trails & Security</h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Immutable state-transition logs, physical document storage consistency, and role-based permissions.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>© 2026 BhumiSetu Platform. Public Sector Land Administration Portal.</p>
      </footer>
    </div>
  );
}
