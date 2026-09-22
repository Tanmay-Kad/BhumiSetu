import type { ApplicationSummary } from "./application";

export interface CitizenDashboardSummary {
  totalApplications: number;
  draftApplications: number;
  submittedApplications: number;
  underReviewApplications: number;
  additionalInfoRequired: number;
  resubmittedApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  completedApplications: number;
  cancelledApplications: number;
}

export interface CitizenDashboardParcels {
  ownedCount: number;
}

export interface CitizenDashboardNotifications {
  unreadCount: number;
}

export interface CitizenDashboardData {
  summary: CitizenDashboardSummary;
  parcels: CitizenDashboardParcels;
  notifications: CitizenDashboardNotifications;
  recentApplications: ApplicationSummary[];
}

export interface CitizenDashboardResponse {
  status: "success";
  data: CitizenDashboardData;
}
