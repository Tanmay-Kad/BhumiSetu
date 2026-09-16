-- Preserve legacy applications before replacing the status enum.
-- Existing PENDING records represent applications already awaiting processing.
BEGIN;
ALTER TABLE "applications" ALTER COLUMN "status" DROP DEFAULT;
CREATE TYPE "ApplicationStatus_new" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED', 'RESUBMITTED', 'APPROVED', 'APPROVED_WITH_CONDITIONS', 'REJECTED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "applications" ALTER COLUMN "status" TYPE "ApplicationStatus_new" USING (
  CASE WHEN "status"::text = 'PENDING' THEN 'SUBMITTED' ELSE "status"::text END
)::"ApplicationStatus_new";
ALTER TYPE "ApplicationStatus" RENAME TO "ApplicationStatus_old";
ALTER TYPE "ApplicationStatus_new" RENAME TO "ApplicationStatus";
DROP TYPE "ApplicationStatus_old";
ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- Add workflow routing and review metadata.
ALTER TABLE "applications"
ADD COLUMN "assignedOfficerId" TEXT,
ADD COLUMN "decisionAt" TIMESTAMP(3),
ADD COLUMN "decisionRemarks" TEXT,
ADD COLUMN "departmentId" TEXT,
ADD COLUMN "reviewRemarks" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "submittedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");
CREATE INDEX "applications_citizenId_idx" ON "applications"("citizenId");
CREATE INDEX "applications_parcelId_idx" ON "applications"("parcelId");
CREATE INDEX "applications_status_idx" ON "applications"("status");
CREATE INDEX "applications_departmentId_idx" ON "applications"("departmentId");
CREATE INDEX "applications_assignedOfficerId_idx" ON "applications"("assignedOfficerId");
CREATE INDEX "applications_createdAt_idx" ON "applications"("createdAt");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
