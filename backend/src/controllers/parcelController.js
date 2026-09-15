const { randomUUID } = require("crypto");
const { Prisma } = require("@prisma/client");
const prisma = require("../utils/prisma");
const { normaliseParcelInput, validateParcelInput } = require("../utils/parcelValidation");

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

const getParcels = async (req, res, next) => {
  try {
    const parcels = await prisma.$queryRaw`
      SELECT ${parcelProjection}
      FROM "parcels"
      ORDER BY "createdAt" DESC
    `;

    res.status(200).json({ status: "success", data: parcels });
  } catch (error) {
    next(error);
  }
};

const getParcelById = async (req, res, next) => {
  try {
    const parcels = await prisma.$queryRaw`
      SELECT ${parcelProjection}
      FROM "parcels"
      WHERE "id" = ${req.params.id}
    `;
    const parcel = parcels[0];

    if (!parcel) {
      return res.status(404).json({ status: "error", message: "Parcel not found" });
    }

    return res.status(200).json({ status: "success", data: parcel });
  } catch (error) {
    return next(error);
  }
};

const getParcelByUlpin = async (req, res, next) => {
  try {
    const parcels = await prisma.$queryRaw`
      SELECT ${parcelProjection}
      FROM "parcels"
      WHERE "ulpin" = ${req.params.ulpin}
    `;
    const parcel = parcels[0];

    if (!parcel) {
      return res.status(404).json({ status: "error", message: "Parcel not found" });
    }

    return res.status(200).json({ status: "success", data: parcel });
  } catch (error) {
    return next(error);
  }
};

const createParcel = async (req, res, next) => {
  try {
    const parcel = normaliseParcelInput(req.body);
    const validationError = validateParcelInput(parcel);

    if (validationError) {
      return res.status(400).json({ status: "error", message: validationError });
    }

    const existingParcel = await prisma.parcel.findUnique({
      where: { ulpin: parcel.ulpin },
      select: { id: true },
    });
    if (existingParcel) {
      return res.status(409).json({ status: "error", message: "ULPIN is already registered" });
    }

    const id = randomUUID();
    let createdParcels;

    if (parcel.geometry) {
      const geometryJson = JSON.stringify(parcel.geometry);
      createdParcels = await prisma.$queryRaw`
        WITH input_geometry AS (
          SELECT ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}), 4326) AS geometry
        )
        INSERT INTO "parcels" (
          "id", "ulpin", "surveyNumber", "village", "taluk", "district", "area",
          "geometry", "landUse", "zoning", "createdAt", "updatedAt"
        )
        SELECT
          ${id}, ${parcel.ulpin}, ${parcel.surveyNumber}, ${parcel.village},
          ${parcel.taluk}, ${parcel.district}, ${parcel.area}, input_geometry.geometry,
          ${parcel.landUse}, ${parcel.zoning}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM input_geometry
        WHERE ST_IsValid(input_geometry.geometry)
        RETURNING ${parcelProjection}
      `;
    } else {
      createdParcels = await prisma.$queryRaw`
        INSERT INTO "parcels" (
          "id", "ulpin", "surveyNumber", "village", "taluk", "district", "area",
          "landUse", "zoning", "createdAt", "updatedAt"
        )
        VALUES (
          ${id}, ${parcel.ulpin}, ${parcel.surveyNumber}, ${parcel.village},
          ${parcel.taluk}, ${parcel.district}, ${parcel.area}, ${parcel.landUse},
          ${parcel.zoning}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING ${parcelProjection}
      `;
    }

    const createdParcel = createdParcels[0];
    if (!createdParcel) {
      return res.status(400).json({ status: "error", message: "Geometry is not valid" });
    }

    return res.status(201).json({ status: "success", data: createdParcel });
  } catch (error) {
    if (error.code === "P2002" || error.meta?.code === "23505") {
      return res.status(409).json({ status: "error", message: "ULPIN is already registered" });
    }

    return next(error);
  }
};

module.exports = {
  getParcels,
  getParcelById,
  getParcelByUlpin,
  createParcel,
};
