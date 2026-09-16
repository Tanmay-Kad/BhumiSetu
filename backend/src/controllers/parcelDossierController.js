const { Prisma } = require("@prisma/client");
const prisma = require("../utils/prisma");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidId = (value) => typeof value === "string" && UUID_PATTERN.test(value);

const ownershipJson = Prisma.sql`
  COALESCE(
    json_agg(
      json_build_object(
        'id', o."id",
        'user', json_build_object(
          'id', u."id",
          'name', u."name",
          'role', u."role"
        )
      )
      ORDER BY o."createdAt"
    ) FILTER (WHERE o."id" IS NOT NULL),
    '[]'::json
  ) AS "ownerships"
`;

const getParcelDossier = async (req, res, next) => {
  try {
    const { parcelId } = req.params;

    if (!isValidId(parcelId)) {
      return res.status(400).json({ status: "error", message: "A valid parcelId is required" });
    }

    const dossiers = await prisma.$queryRaw`
      SELECT
        p."id",
        p."ulpin",
        p."surveyNumber",
        p."village",
        p."taluk",
        p."district",
        p."area",
        p."landUse",
        p."zoning",
        CASE
          WHEN p."geometry" IS NULL THEN NULL
          ELSE ST_AsGeoJSON(p."geometry")::json
        END AS "geometry",
        COUNT(o."id")::integer AS "ownerCount",
        ${ownershipJson}
      FROM "parcels" p
      LEFT JOIN "ownerships" o ON o."parcelId" = p."id"
      LEFT JOIN "users" u ON u."id" = o."userId"
      WHERE p."id" = ${parcelId}
      GROUP BY p."id"
    `;

    const dossier = dossiers[0];

    if (!dossier) {
      return res.status(404).json({ status: "error", message: "Parcel not found" });
    }

    const { ownerCount, ownerships, ...parcel } = dossier;

    return res.status(200).json({
      status: "success",
      data: {
        summary: {
          ulpin: parcel.ulpin,
          surveyNumber: parcel.surveyNumber,
          area: parcel.area,
          landUse: parcel.landUse,
          zoning: parcel.zoning,
          ownerCount,
        },
        location: {
          village: parcel.village,
          taluk: parcel.taluk,
          district: parcel.district,
        },
        parcel,
        ownerships,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getParcelDossier,
};
