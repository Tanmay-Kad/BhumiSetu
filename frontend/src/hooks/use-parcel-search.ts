"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { searchParcels } from "@/lib/api/parcels";
import { getErrorMessage } from "@/lib/api/errors";
import type { Parcel, ParcelSearchParams, ParcelPagination } from "@/types";

export interface UseParcelSearchResult {
  results: Parcel[];
  pagination: ParcelPagination | null;
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
  params: ParcelSearchParams;
  search: (customParams?: Partial<ParcelSearchParams>) => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  reset: () => void;
  setParams: React.Dispatch<React.SetStateAction<ParcelSearchParams>>;
}

const DEFAULT_LIMIT = 10;

export function useParcelSearch(initialParams: ParcelSearchParams = {}): UseParcelSearchResult {
  const [params, setParams] = useState<ParcelSearchParams>({
    limit: DEFAULT_LIMIT,
    page: 1,
    ...initialParams,
  });
  const [results, setResults] = useState<Parcel[]>([]);
  const [pagination, setPagination] = useState<ParcelPagination | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const executeSearch = useCallback(
    async (searchParams: ParcelSearchParams) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      setIsLoading(true);
      setError(null);

      try {
        const response = await searchParcels(searchParams);
        if (isMountedRef.current) {
          setResults(response.data || []);
          setPagination(response.pagination || null);
          setHasSearched(true);
          setError(null);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(getErrorMessage(err));
          setResults([]);
          setPagination(null);
          setHasSearched(true);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
        inFlightRef.current = false;
      }
    },
    []
  );

  const search = useCallback(
    async (customParams?: Partial<ParcelSearchParams>) => {
      const mergedParams: ParcelSearchParams = {
        ...params,
        ...customParams,
        page: 1, // Reset to page 1 on new search
      };
      setParams(mergedParams);
      await executeSearch(mergedParams);
    },
    [params, executeSearch]
  );

  const goToPage = useCallback(
    async (targetPage: number) => {
      if (pagination && (targetPage < 1 || targetPage > pagination.totalPages)) {
        return;
      }
      const updatedParams = { ...params, page: targetPage };
      setParams(updatedParams);
      await executeSearch(updatedParams);
    },
    [params, pagination, executeSearch]
  );

  const reset = useCallback(() => {
    setParams({
      ulpin: "",
      surveyNumber: "",
      village: "",
      taluk: "",
      district: "",
      landUse: "",
      zoning: "",
      page: 1,
      limit: DEFAULT_LIMIT,
    });
    setResults([]);
    setPagination(null);
    setError(null);
    setHasSearched(false);
  }, []);

  return {
    results,
    pagination,
    isLoading,
    error,
    hasSearched,
    params,
    search,
    goToPage,
    reset,
    setParams,
  };
}
