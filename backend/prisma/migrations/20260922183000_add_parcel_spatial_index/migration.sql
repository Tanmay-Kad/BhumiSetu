-- CreateIndex
CREATE INDEX IF NOT EXISTS "parcels_geometry_idx" ON "parcels" USING GIST ("geometry");
