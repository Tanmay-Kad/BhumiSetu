const { Prisma } = require("@prisma/client");
const prisma = require("../utils/prisma");

const parcelProjection = Prisma.sql`
  "id",
  "ulpin",
  "surveyNumber",
  "village",
  "taluk",
  "district",
  "area",
  "landUse",
  "zoning",
  CASE
    WHEN "geometry" IS NULL THEN NULL
    ELSE ST_AsGeoJSON("geometry")::json
  END AS "geometry",
  "createdAt",
  "updatedAt"
`;

const nearbyProjection = (lng, lat) => Prisma.sql`
  "id",
  "ulpin",
  "surveyNumber",
  "village",
  "taluk",
  "district",
  "area",
  "landUse",
  "zoning",
  ROUND(
    ST_Distance("geometry"::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography)::numeric,
    2
  )::float AS "distanceMeters",
  CASE
    WHEN "geometry" IS NULL THEN NULL
    ELSE ST_AsGeoJSON("geometry")::json
  END AS "geometry",
  "createdAt",
  "updatedAt"
`;

/**
 * Searches parcels with optional attribute filtering and pagination.
 */
const searchParcels = async ({
  ulpin,
  surveyNumber,
  village,
  taluk,
  district,
  landUse,
  zoning,
  page = 1,
  limit = 20,
}) => {
  const conditions = [];

  if (ulpin) {
    conditions.push(Prisma.sql`"ulpin" ILIKE ${`%${ulpin}%`}`);
  }
  if (surveyNumber) {
    conditions.push(Prisma.sql`"surveyNumber" ILIKE ${`%${surveyNumber}%`}`);
  }
  if (village) {
    conditions.push(Prisma.sql`"village" ILIKE ${`%${village}%`}`);
  }
  if (taluk) {
    conditions.push(Prisma.sql`"taluk" ILIKE ${`%${taluk}%`}`);
  }
  if (district) {
    conditions.push(Prisma.sql`"district" ILIKE ${`%${district}%`}`);
  }
  if (landUse) {
    conditions.push(Prisma.sql`"landUse" ILIKE ${`%${landUse}%`}`);
  }
  if (zoning) {
    conditions.push(Prisma.sql`"zoning" ILIKE ${`%${zoning}%`}`);
  }

  const whereClause =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

  const countResult = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM "parcels"
    ${whereClause}
  `;
  const total = countResult[0]?.count || 0;

  const offset = (page - 1) * limit;
  const parcels = await prisma.$queryRaw`
    SELECT ${parcelProjection}
    FROM "parcels"
    ${whereClause}
    ORDER BY "createdAt" DESC, "id" ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return {
    parcels,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

/**
 * Retrieves parcels intersecting a bounding box envelope.
 */
const getParcelsInBbox = async ({
  minLng,
  minLat,
  maxLng,
  maxLat,
  page = 1,
  limit = 20,
}) => {
  const bboxFilter = Prisma.sql`
    WHERE "geometry" IS NOT NULL
      AND ST_Intersects("geometry", ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))
  `;

  const countResult = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM "parcels"
    ${bboxFilter}
  `;
  const total = countResult[0]?.count || 0;

  const offset = (page - 1) * limit;
  const parcels = await prisma.$queryRaw`
    SELECT ${parcelProjection}
    FROM "parcels"
    ${bboxFilter}
    ORDER BY "createdAt" DESC, "id" ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return {
    parcels,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

/**
 * Retrieves parcels within a given radius (in meters) of a point, sorted by distance.
 */
const getParcelsNearby = async ({
  lng,
  lat,
  radiusMeters,
  page = 1,
  limit = 20,
}) => {
  const nearbyFilter = Prisma.sql`
    WHERE "geometry" IS NOT NULL
      AND ST_DWithin("geometry"::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})
  `;

  const countResult = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM "parcels"
    ${nearbyFilter}
  `;
  const total = countResult[0]?.count || 0;

  const offset = (page - 1) * limit;
  const parcels = await prisma.$queryRaw`
    SELECT ${nearbyProjection(lng, lat)}
    FROM "parcels"
    ${nearbyFilter}
    ORDER BY ST_Distance("geometry"::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) ASC, "id" ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return {
    parcels,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

module.exports = {
  parcelProjection,
  searchParcels,
  getParcelsInBbox,
  getParcelsNearby,
};
