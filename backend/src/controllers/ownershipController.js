const { Prisma } = require("@prisma/client");
const prisma = require("../utils/prisma");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidId = (value) => typeof value === "string" && UUID_PATTERN.test(value);

const propertyProjection = Prisma.sql`
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
  END AS "geometry"
`;

const createOwnership = async (req, res, next) => {
  try {
    const { parcelId } = req.body ?? {};

    if (!isValidId(parcelId)) {
      return res.status(400).json({ status: "error", message: "A valid parcelId is required" });
    }

    const parcel = await prisma.parcel.findUnique({
      where: { id: parcelId },
      select: { id: true },
    });

    if (!parcel) {
      return res.status(404).json({ status: "error", message: "Parcel not found" });
    }

    const existingOwnership = await prisma.ownership.findUnique({
      where: {
        userId_parcelId: {
          userId: req.user.id,
          parcelId,
        },
      },
      select: { id: true },
    });

    if (existingOwnership) {
      return res.status(409).json({
        status: "error",
        message: "You are already associated with this parcel",
      });
    }

    const ownership = await prisma.ownership.create({
      data: {
        userId: req.user.id,
        parcelId,
      },
      select: {
        id: true,
        userId: true,
        parcelId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({ status: "success", data: ownership });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        status: "error",
        message: "You are already associated with this parcel",
      });
    }

    return next(error);
  }
};

const getMyProperties = async (req, res, next) => {
  try {
    const properties = await prisma.$queryRaw`
      SELECT ${propertyProjection}
      FROM "ownerships" o
      INNER JOIN "parcels" p ON p."id" = o."parcelId"
      WHERE o."userId" = ${req.user.id}
      ORDER BY o."createdAt" DESC
    `;

    return res.status(200).json({ status: "success", data: properties });
  } catch (error) {
    return next(error);
  }
};

const getOwnershipsByParcel = async (req, res, next) => {
  try {
    const { parcelId } = req.params;

    if (!isValidId(parcelId)) {
      return res.status(400).json({ status: "error", message: "A valid parcelId is required" });
    }

    const parcel = await prisma.parcel.findUnique({
      where: { id: parcelId },
      select: { id: true },
    });

    if (!parcel) {
      return res.status(404).json({ status: "error", message: "Parcel not found" });
    }

    const ownerships = await prisma.ownership.findMany({
      where: { parcelId },
      select: {
        id: true,
        userId: true,
        parcelId: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.status(200).json({
      status: "success",
      data: {
        parcelId,
        ownerships,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createOwnership,
  getMyProperties,
  getOwnershipsByParcel,
};
