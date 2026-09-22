import { api } from "@/lib/api/client";
import type { CitizenDashboardResponse, CitizenDashboardData } from "@/types";

/**
 * Fetches dashboard summary and recent applications for the authenticated citizen.
 * Calls GET /api/v1/dashboard/citizen
 */
export async function fetchCitizenDashboard(): Promise<CitizenDashboardData> {
  const response = await api.get<CitizenDashboardResponse>("/dashboard/citizen");
  if (!response || !response.data) {
    throw new Error("Invalid dashboard data received from server");
  }
  return response.data;
}
