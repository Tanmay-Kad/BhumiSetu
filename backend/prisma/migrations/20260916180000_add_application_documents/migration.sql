-- Store application document metadata only. Binary content remains in future object storage.
CREATE TYPE "DocumentType" AS ENUM (
  'IDENTITY_PROOF',
  'SALE_DEED',
  'LAND_RECORD',
  'SITE_PLAN',
  'BUILDING_PLAN',
  'PROPERTY_TAX_RECEIPT',
  'TREE_RELATED_DOCUMENT',
  'UTILITY_DOCUMENT',
  'OTHER'
);

CREATE TABLE "application_documents" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "documentType" "DocumentType" NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "application_documents_applicationId_idx"
  ON "application_documents"("applicationId");
CREATE INDEX "application_documents_uploadedById_idx"
  ON "application_documents"("uploadedById");
CREATE INDEX "application_documents_documentType_idx"
  ON "application_documents"("documentType");
CREATE INDEX "application_documents_uploadedAt_idx"
  ON "application_documents"("uploadedAt");

ALTER TABLE "application_documents"
  ADD CONSTRAINT "application_documents_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "applications"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "application_documents"
  ADD CONSTRAINT "application_documents_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
