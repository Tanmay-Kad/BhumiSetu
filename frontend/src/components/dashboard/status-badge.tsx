import React from "react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { ApplicationStatus, ApplicationType } from "@/types";

interface ApplicationStatusConfig {
  label: string;
  variant: BadgeProps["variant"];
  dotClass: string;
  description: string;
}

const STATUS_CONFIG: Record<ApplicationStatus, ApplicationStatusConfig> = {
  DRAFT: {
    label: "Draft",
    variant: "neutral",
    dotClass: "bg-slate-400",
    description: "Application is saved as a draft and not yet submitted for review",
  },
  SUBMITTED: {
    label: "Submitted",
    variant: "info",
    dotClass: "bg-blue-500",
    description: "Application has been submitted and is awaiting departmental assignment",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    variant: "info",
    dotClass: "bg-indigo-500",
    description: "Application is currently being examined by the assigned verification officer",
  },
  ADDITIONAL_INFO_REQUIRED: {
    label: "Action Required",
    variant: "warning",
    dotClass: "bg-amber-500 animate-pulse",
    description: "Reviewing officer has requested additional documents or clarifications from you",
  },
  RESUBMITTED: {
    label: "Resubmitted",
    variant: "info",
    dotClass: "bg-sky-500",
    description: "Additional information has been provided and the application is back under review",
  },
  APPROVED: {
    label: "Approved",
    variant: "success",
    dotClass: "bg-emerald-600",
    description: "Application has been formally approved by the competent authority",
  },
  APPROVED_WITH_CONDITIONS: {
    label: "Approved with Conditions",
    variant: "success",
    dotClass: "bg-teal-600",
    description: "Application approved subject to compliance with specific stipulations",
  },
  REJECTED: {
    label: "Rejected",
    variant: "danger",
    dotClass: "bg-rose-500",
    description: "Application has been rejected by the reviewing department",
  },
  COMPLETED: {
    label: "Completed",
    variant: "success",
    dotClass: "bg-emerald-700",
    description: "All formal processing, inspections, and certificate issuances are complete",
  },
  CANCELLED: {
    label: "Cancelled",
    variant: "neutral",
    dotClass: "bg-slate-400",
    description: "Application was withdrawn or cancelled",
  },
};

export function ApplicationStatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    variant: "neutral" as const,
    dotClass: "bg-slate-400",
    description: `Status: ${status}`,
  };

  return (
    <Badge
      variant={config.variant}
      className={className}
      title={config.description}
      aria-label={`Status: ${config.label}`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full inline-block ${config.dotClass}`}
        aria-hidden="true"
      />
      {config.label}
    </Badge>
  );
}

export function formatApplicationType(type: ApplicationType | string): string {
  switch (type) {
    case "BUILDING_PERMISSION":
      return "Building Permission";
    case "TREE_CUTTING":
      return "Tree Felling Permission";
    case "UTILITY_CONNECTION":
      return "Utility Connection";
    case "LAND_USE_CHANGE":
      return "Land Use Conversion (NA)";
    case "OTHER":
      return "General Land Service";
    default:
      return type.replace(/_/g, " ");
  }
}
