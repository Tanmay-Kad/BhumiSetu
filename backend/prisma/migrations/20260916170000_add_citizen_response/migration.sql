-- Preserve all existing application records while adding citizen resubmission context.
ALTER TABLE "applications" ADD COLUMN "citizenResponse" TEXT;
