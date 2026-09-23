"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Select,
  EmptyState,
  ErrorState,
} from "@/components/ui";
import { ParcelCard, ParcelSkeleton } from "@/components/parcels";
import { useParcelSearch } from "@/hooks/use-parcel-search";
import { getMyProperties } from "@/lib/api/parcels";
import type { Parcel } from "@/types";

export default function PropertiesPage() {
  const {
    results,
    pagination,
    isLoading,
    error,
    hasSearched,
    search,
    goToPage,
    reset,
  } = useParcelSearch();

  // Primary search state
  const [primaryQuery, setPrimaryQuery] = useState("");
  const [queryMode, setQueryMode] = useState<"auto" | "ulpin" | "survey">("auto");

  // Secondary/Expandable filters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [village, setVillage] = useState("");
  const [taluk, setTaluk] = useState("");
  const [district, setDistrict] = useState("");
  const [landUse, setLandUse] = useState("");
  const [zoning, setZoning] = useState("");

  // Citizen Owned Properties state (Step 7 lightweight integration)
  const [myProperties, setMyProperties] = useState<Parcel[]>([]);
  const [isLoadingOwned, setIsLoadingOwned] = useState(true);
  const [showOwnedSection, setShowOwnedSection] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getMyProperties()
      .then((data) => {
        if (isMounted) {
          setMyProperties(data);
          setIsLoadingOwned(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoadingOwned(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    let ulpinParam: string | undefined = undefined;
    let surveyParam: string | undefined = undefined;

    const trimmed = primaryQuery.trim();
    if (trimmed) {
      if (queryMode === "ulpin") {
        ulpinParam = trimmed;
      } else if (queryMode === "survey") {
        surveyParam = trimmed;
      } else {
        // Auto-detection:
        // Survey numbers usually contain slashes (e.g. 42/A) or are short numbers
        if (trimmed.includes("/") || /^\d+$/.test(trimmed)) {
          surveyParam = trimmed;
        } else {
          ulpinParam = trimmed;
        }
      }
    }

    search({
      ulpin: ulpinParam,
      surveyNumber: surveyParam,
      village: village.trim() || undefined,
      taluk: taluk.trim() || undefined,
      district: district.trim() || undefined,
      landUse: landUse || undefined,
      zoning: zoning.trim() || undefined,
    });
  };

  const handleReset = () => {
    setPrimaryQuery("");
    setQueryMode("auto");
    setVillage("");
    setTaluk("");
    setDistrict("");
    setLandUse("");
    setZoning("");
    reset();
  };

  return (
    <div className="space-y-8">
      {/* 1. Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          My Properties & Land Search
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
          Search verified cadastral land records across registered taluks and districts using official
          identifiers (ULPIN / Survey Number) or administrative location filters.
        </p>
      </div>

      {/* 2. Citizen Owned Properties Section (Step 7 Lightweight Summary) */}
      <Card className="border-emerald-200/80 bg-emerald-50/20 shadow-xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-emerald-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-emerald-100 text-emerald-800">
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
              <CardTitle className="text-base text-emerald-950">
                My Registered Properties
              </CardTitle>
            </div>
            <CardDescription className="text-emerald-800/80">
              Verified title ownerships officially linked to your citizen profile
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={() => setShowOwnedSection((prev) => !prev)}
            className="text-xs font-medium text-emerald-800 hover:text-emerald-950 underline underline-offset-2 mt-2 sm:mt-0 text-left focus:outline-none focus:ring-1 focus:ring-emerald-700 rounded"
          >
            {showOwnedSection ? "Hide Registered Parcels" : `Show Registered Parcels (${myProperties.length})`}
          </button>
        </CardHeader>
        {showOwnedSection && (
          <CardContent className="pt-4">
            {isLoadingOwned ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ParcelSkeleton />
              </div>
            ) : myProperties.length === 0 ? (
              <div className="text-xs text-slate-500 py-2">
                No land parcels are currently registered under your citizen profile. Use the land search below to verify parcel records or file a title deed registration application.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myProperties.map((parcel) => (
                  <ParcelCard key={parcel.id} parcel={parcel} isOwned={true} />
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* 3. Search Interface Card */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-4 border-b border-slate-100">
          <CardTitle className="text-lg text-slate-900">
            Cadastral Land Search
          </CardTitle>
          <CardDescription>
            Query the central land repository by unique property identifiers or regional filters
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            {/* Primary Search Bar */}
            <div className="space-y-2">
              <label
                htmlFor="primary-search-input"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Search by ULPIN or Survey Number
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
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
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    id="primary-search-input"
                    type="text"
                    value={primaryQuery}
                    onChange={(e) => setPrimaryQuery(e.target.value)}
                    placeholder="e.g. MH-THANE-001-2026 or 42/A"
                    className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>

                {/* Explicit mode dropdown for precision */}
                <div className="w-full sm:w-40 shrink-0">
                  <select
                    value={queryMode}
                    onChange={(e) => setQueryMode(e.target.value as "auto" | "ulpin" | "survey")}
                    aria-label="Identifier filter mode"
                    className="w-full rounded-md border border-slate-300 bg-white py-2 px-3 text-xs text-slate-700 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="ulpin">ULPIN Only</option>
                    <option value="survey">Survey No. Only</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    {isLoading ? "Searching..." : "Search Parcels"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Tip: Enter a 14-digit ULPIN code (e.g. MH-THANE-001-2026) or a village survey number (e.g. 42/A).
              </p>
            </div>

            {/* Expandable Secondary Filters */}
            <div className="border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="flex items-center gap-1.5 text-xs font-medium text-emerald-800 hover:text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-700 rounded py-1"
                aria-expanded={showAdvanced}
              >
                <svg
                  className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span>{showAdvanced ? "Hide Advanced Location & Land Use Filters" : "Show Advanced Location & Land Use Filters"}</span>
              </button>

              {showAdvanced && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 bg-slate-50/70 p-4 rounded-lg border border-slate-200/80">
                  <div>
                    <label htmlFor="filter-village" className="block text-xs font-medium text-slate-700 mb-1">
                      Village
                    </label>
                    <Input
                      id="filter-village"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder="e.g. Shahapur"
                      className="bg-white text-xs h-8"
                    />
                  </div>

                  <div>
                    <label htmlFor="filter-taluk" className="block text-xs font-medium text-slate-700 mb-1">
                      Taluk
                    </label>
                    <Input
                      id="filter-taluk"
                      value={taluk}
                      onChange={(e) => setTaluk(e.target.value)}
                      placeholder="e.g. Shahapur"
                      className="bg-white text-xs h-8"
                    />
                  </div>

                  <div>
                    <label htmlFor="filter-district" className="block text-xs font-medium text-slate-700 mb-1">
                      District
                    </label>
                    <Input
                      id="filter-district"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g. Thane"
                      className="bg-white text-xs h-8"
                    />
                  </div>

                  <div>
                    <label htmlFor="filter-landuse" className="block text-xs font-medium text-slate-700 mb-1">
                      Land Use
                    </label>
                    <Select
                      id="filter-landuse"
                      value={landUse}
                      onChange={(e) => setLandUse(e.target.value)}
                      className="bg-white text-xs h-8"
                    >
                      <option value="">All Land Uses</option>
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Agricultural">Agricultural</option>
                      <option value="Industrial">Industrial</option>
                      <option value="Mixed Use">Mixed Use</option>
                    </Select>
                  </div>

                  <div>
                    <label htmlFor="filter-zoning" className="block text-xs font-medium text-slate-700 mb-1">
                      Zoning
                    </label>
                    <Input
                      id="filter-zoning"
                      value={zoning}
                      onChange={(e) => setZoning(e.target.value)}
                      placeholder="e.g. R1"
                      className="bg-white text-xs h-8"
                    />
                  </div>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 4. Results & States Section */}
      <section aria-labelledby="results-heading" className="space-y-4">
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4" aria-busy="true" aria-label="Loading parcel search results">
            <div className="text-xs text-slate-500 font-medium animate-pulse">
              Searching cadastral registry records...
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ParcelSkeleton />
              <ParcelSkeleton />
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <ErrorState
            title="Search Request Failed"
            message={error}
            onRetry={() => handleSearchSubmit()}
          />
        )}

        {/* Initial Empty State (Before any search) */}
        {!isLoading && !error && !hasSearched && (
          <Card className="border-dashed border-slate-300 bg-slate-50/50">
            <CardContent className="p-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
              </div>
              <h2 id="results-heading" className="text-base font-semibold text-slate-800">
                Search the Cadastral Land Registry
              </h2>
              <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                Enter an official 14-digit ULPIN identifier, village survey number, or specify regional filters above to locate parcel geometry, land classification, and regulatory zoning details.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Quick search examples:</span>
                <button
                  type="button"
                  onClick={() => {
                    setPrimaryQuery("MH-THANE-001-2026");
                    search({ ulpin: "MH-THANE-001-2026" });
                  }}
                  className="text-xs font-mono bg-white px-2.5 py-1 rounded border border-slate-200 text-emerald-800 hover:border-emerald-300"
                >
                  MH-THANE-001-2026
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrimaryQuery("42/A");
                    search({ surveyNumber: "42/A" });
                  }}
                  className="text-xs font-mono bg-white px-2.5 py-1 rounded border border-slate-200 text-emerald-800 hover:border-emerald-300"
                >
                  Survey 42/A
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Zero Results Found State */}
        {!isLoading && !error && hasSearched && results.length === 0 && (
          <EmptyState
            title="No Matching Land Parcels Found"
            description="No parcels in the central registry matched your search parameters. Please verify the identifier spelling, check survey numbering format, or broaden location filters."
            action={
              <Button variant="outline" size="sm" onClick={handleReset}>
                Reset Search Filters
              </Button>
            }
          />
        )}

        {/* Results List */}
        {!isLoading && !error && hasSearched && results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h2 id="results-heading" className="text-sm font-semibold text-slate-800">
                Matching Parcels ({pagination?.total ?? results.length})
              </h2>
              {pagination && (
                <span className="text-xs text-slate-500">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((parcel) => (
                <ParcelCard key={parcel.id} parcel={parcel} />
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="pt-4 flex items-center justify-between border-t border-slate-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  ← Previous
                </Button>

                <div className="text-xs text-slate-600 font-medium">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next →
                </Button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
