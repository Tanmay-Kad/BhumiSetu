-- CreateIndex
CREATE INDEX IF NOT EXISTS "parcels_geography_idx" ON "parcels" USING GIST ((( "geometry"::geography )));
