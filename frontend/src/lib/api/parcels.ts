import { api } from "./client";
import type {
  Parcel,
  ParcelSearchParams,
  ParcelSearchResponse,
  ParcelDetailResponse,
  MyPropertiesResponse,
  ParcelDossierData,
  ParcelDossierResponse,
} from "@/types";

/**
 * Searches parcels with optional attribute filtering and pagination.
 * Consumes GET /api/v1/parcels
 */
export async function searchParcels(
  params: ParcelSearchParams = {}
): Promise<ParcelSearchResponse> {
  const query = new URLSearchParams();
  if (params.ulpin?.trim()) query.set("ulpin", params.ulpin.trim());
  if (params.surveyNumber?.trim()) query.set("surveyNumber", params.surveyNumber.trim());
  if (params.village?.trim()) query.set("village", params.village.trim());
  if (params.taluk?.trim()) query.set("taluk", params.taluk.trim());
  if (params.district?.trim()) query.set("district", params.district.trim());
  if (params.landUse?.trim()) query.set("landUse", params.landUse.trim());
  if (params.zoning?.trim()) query.set("zoning", params.zoning.trim());
  if (params.page !== undefined && params.page > 0) query.set("page", String(params.page));
  if (params.limit !== undefined && params.limit > 0) query.set("limit", String(params.limit));

  const queryString = query.toString();
  const endpoint = queryString ? `/parcels?${queryString}` : "/parcels";
  return api.get<ParcelSearchResponse>(endpoint);
}

/**
 * Retrieves a single parcel record by UUID.
 * Consumes GET /api/v1/parcels/:id
 */
export async function getParcelById(id: string): Promise<Parcel> {
  const response = await api.get<ParcelDetailResponse>(`/parcels/${id}`);
  if (!response?.data) {
    throw new Error("Parcel record not found");
  }
  return response.data;
}

/**
 * Retrieves a single parcel record by ULPIN.
 * Consumes GET /api/v1/parcels/ulpin/:ulpin
 */
export async function getParcelByUlpin(ulpin: string): Promise<Parcel> {
  const response = await api.get<ParcelDetailResponse>(`/parcels/ulpin/${encodeURIComponent(ulpin)}`);
  if (!response?.data) {
    throw new Error(`Parcel with ULPIN "${ulpin}" not found`);
  }
  return response.data;
}

/**
 * Retrieves verified properties owned by the authenticated citizen.
 * Consumes GET /api/v1/ownerships/my-properties
 */
export async function getMyProperties(): Promise<Parcel[]> {
  const response = await api.get<MyPropertiesResponse>("/ownerships/my-properties");
  return response?.data || [];
}

/**
 * Retrieves the comprehensive dossier for a parcel.
 * Consumes GET /api/v1/parcels/:parcelId/dossier
 */
export async function getParcelDossier(parcelId: string): Promise<ParcelDossierData> {
  const response = await api.get<ParcelDossierResponse>(`/parcels/${parcelId}/dossier`);
  if (!response?.data) {
    throw new Error("Parcel dossier could not be retrieved");
  }
  return response.data;
}
