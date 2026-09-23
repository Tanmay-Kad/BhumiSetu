export interface GeoJsonObject {
  type: string;
  coordinates: unknown[];
  [key: string]: unknown;
}

export interface Parcel {
  id: string;
  ulpin: string;
  surveyNumber: string;
  village: string;
  taluk: string;
  district: string;
  area: number;
  landUse: string;
  zoning: string;
  distanceMeters?: number;
  geometry?: GeoJsonObject | null;
  createdAt?: string;
  updatedAt?: string;
}

export type ParcelSummary = Parcel;

export interface ParcelPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ParcelSearchParams {
  ulpin?: string;
  surveyNumber?: string;
  village?: string;
  taluk?: string;
  district?: string;
  landUse?: string;
  zoning?: string;
  page?: number;
  limit?: number;
}

export interface ParcelSearchResponse {
  status: "success";
  data: Parcel[];
  pagination: ParcelPagination;
}

export interface ParcelDetailResponse {
  status: "success";
  data: Parcel;
}

export interface MyPropertiesResponse {
  status: "success";
  data: Parcel[];
}

export interface ParcelDossierOwner {
  id: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
}

export interface ParcelDossierData {
  summary: {
    ulpin: string;
    surveyNumber: string;
    area: number;
    landUse: string;
    zoning: string;
    ownerCount: number;
  };
  location: {
    village: string;
    taluk: string;
    district: string;
  };
  parcel: Parcel;
  ownerships: ParcelDossierOwner[];
}

export interface ParcelDossierResponse {
  status: "success";
  data: ParcelDossierData;
}
