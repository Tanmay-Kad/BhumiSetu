"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchCitizenDashboard } from "@/lib/api/dashboard";
import { getErrorMessage } from "@/lib/api/errors";
import type { CitizenDashboardData } from "@/types";

export interface UseCitizenDashboardReturn {
  data: CitizenDashboardData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCitizenDashboard(): UseCitizenDashboardReturn {
  const [data, setData] = useState<CitizenDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);

  const loadData = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchCitizenDashboard();
      if (isMountedRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(getErrorMessage(err));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadData();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadData]);

  return {
    data,
    isLoading,
    error,
    refetch: loadData,
  };
}
