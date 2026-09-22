export interface ParcelSummary {
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
  geometry?: {
    type: string;
    coordinates: unknown[];
  } | null;
  createdAt?: string;
  updatedAt?: string;
}
