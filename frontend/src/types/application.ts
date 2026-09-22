export type ApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ADDITIONAL_INFO_REQUIRED"
  | "RESUBMITTED"
  | "APPROVED"
  | "APPROVED_WITH_CONDITIONS"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELLED";

export type ApplicationType =
  | "BUILDING_PERMISSION"
  | "TREE_CUTTING"
  | "UTILITY_CONNECTION"
  | "LAND_USE_CHANGE"
  | "OTHER";

export interface ApplicationParcel {
  id: string;
  ulpin: string;
  surveyNumber: string;
  village: string;
  taluk: string;
  district: string;
  area: number;
  landUse: string;
  zoning: string;
}

export interface ApplicationDepartment {
  id: string;
  name: string;
  code: string;
}

export interface ApplicationCitizen {
  id: string;
  name: string;
  email: string;
}

export interface ApplicationSummary {
  id: string;
  applicationNumber: string;
  type: ApplicationType;
  status: ApplicationStatus;
  description: string;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  parcel?: ApplicationParcel;
  department?: ApplicationDepartment | null;
  citizen?: ApplicationCitizen;
}
