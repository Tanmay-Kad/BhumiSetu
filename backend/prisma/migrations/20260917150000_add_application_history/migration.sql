-- Add ApplicationAction enum
CREATE TYPE "ApplicationAction" AS ENUM (
  'APPLICATION_CREATED',
  'APPLICATION_SUBMITTED',
  'REVIEW_STARTED',
  'ADDITIONAL_INFO_REQUESTED',
  'APPLICATION_RESUBMITTED',
  'APPLICATION_APPROVED',
  'APPLICATION_APPROVED_WITH_CONDITIONS',
  'APPLICATION_REJECTED',
  'APPLICATION_CANCELLED'
);

-- Create application_history table
CREATE TABLE "application_history" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" "ApplicationAction" NOT NULL,
  "fromStatus" "ApplicationStatus",
  "toStatus" "ApplicationStatus" NOT NULL,
  "remarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "application_history_pkey" PRIMARY KEY ("id")
);

-- Create indexes for application_history
CREATE INDEX "application_history_applicationId_idx" ON "application_history"("applicationId");
CREATE INDEX "application_history_actorId_idx" ON "application_history"("actorId");
CREATE INDEX "application_history_createdAt_idx" ON "application_history"("createdAt");

-- Add foreign key constraints
ALTER TABLE "application_history"
ADD CONSTRAINT "application_history_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "applications"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "application_history"
ADD CONSTRAINT "application_history_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
