export type NotificationType =
  | "APPLICATION_SUBMITTED"
  | "APPLICATION_UNDER_REVIEW"
  | "APPLICATION_ADDITIONAL_INFO_REQUIRED"
  | "APPLICATION_RESUBMITTED"
  | "APPLICATION_APPROVED"
  | "APPLICATION_APPROVED_WITH_CONDITIONS"
  | "APPLICATION_REJECTED"
  | "APPLICATION_CANCELLED";

export interface Notification {
  id: string;
  userId: string;
  applicationId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  application?: {
    id: string;
    applicationNumber: string;
    type: string;
    status: string;
  } | null;
}
