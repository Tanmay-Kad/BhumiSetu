const PARCEL_GEOMETRY_TYPES = new Set(["Polygon", "MultiPolygon"]);
const MAX_BBOX_SPAN_DEGREES = 10;
const MAX_NEARBY_RADIUS_METERS = 50000; // 50 km

const normaliseParcelInput = (body = {}) => ({
  ulpin: typeof body.ulpin === "string" ? body.ulpin.trim() : "",
  surveyNumber: typeof body.surveyNumber === "string" ? body.surveyNumber.trim() : "",
  village: typeof body.village === "string" ? body.village.trim() : "",
  taluk: typeof body.taluk === "string" ? body.taluk.trim() : "",
  district: typeof body.district === "string" ? body.district.trim() : "",
  area: typeof body.area === "number" ? body.area : Number(body.area),
  landUse: typeof body.landUse === "string" ? body.landUse.trim() : "",
  zoning: typeof body.zoning === "string" ? body.zoning.trim() : "",
  geometry: body.geometry ?? null,
});

const validateParcelInput = (parcel) => {
  const requiredTextFields = [
    ["ulpin", parcel.ulpin],
    ["surveyNumber", parcel.surveyNumber],
    ["village", parcel.village],
    ["taluk", parcel.taluk],
    ["district", parcel.district],
    ["landUse", parcel.landUse],
    ["zoning", parcel.zoning],
  ];

  const missingField = requiredTextFields.find(([, value]) => !value);
  if (missingField) {
    return `${missingField[0]} is required`;
  }

  if (!Number.isFinite(parcel.area) || parcel.area <= 0) {
    return "area must be a positive number";
  }

  if (parcel.geometry !== null) {
    if (typeof parcel.geometry !== "object" || Array.isArray(parcel.geometry)) {
      return "geometry must be a GeoJSON object";
    }

    if (!PARCEL_GEOMETRY_TYPES.has(parcel.geometry.type) || !Array.isArray(parcel.geometry.coordinates)) {
      return "geometry must be a GeoJSON Polygon or MultiPolygon";
    }
  }

  return null;
};

/**
 * Validates and parses pagination query parameters.
 */
const validatePagination = (query = {}) => {
  let page = 1;
  let limit = 20;

  if (query.page !== undefined) {
    if (typeof query.page !== "string" || !/^\d+$/.test(query.page.trim())) {
      return { error: "page must be a positive integer" };
    }
    page = Number(query.page.trim());
    if (!Number.isSafeInteger(page) || page < 1) {
      return { error: "page must be a positive integer" };
    }
  }

  if (query.limit !== undefined) {
    if (typeof query.limit !== "string" || !/^\d+$/.test(query.limit.trim())) {
      return { error: "limit must be an integer between 1 and 100" };
    }
    limit = Number(query.limit.trim());
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      return { error: "limit must be an integer between 1 and 100" };
    }
  }

  return { value: { page, limit } };
};

/**
 * Validates bounding box query parameters: minLng, minLat, maxLng, maxLat.
 */
const validateBboxInput = (query = {}) => {
  const { minLng, minLat, maxLng, maxLat } = query;

  if (
    minLng === undefined ||
    minLat === undefined ||
    maxLng === undefined ||
    maxLat === undefined ||
    minLng === "" ||
    minLat === "" ||
    maxLng === "" ||
    maxLat === ""
  ) {
    return { error: "minLng, minLat, maxLng, and maxLat are all required query parameters" };
  }

  const parsedMinLng = Number(minLng);
  const parsedMinLat = Number(minLat);
  const parsedMaxLng = Number(maxLng);
  const parsedMaxLat = Number(maxLat);

  if (
    !Number.isFinite(parsedMinLng) ||
    !Number.isFinite(parsedMinLat) ||
    !Number.isFinite(parsedMaxLng) ||
    !Number.isFinite(parsedMaxLat)
  ) {
    return { error: "minLng, minLat, maxLng, and maxLat must be valid finite numbers" };
  }

  if (parsedMinLng < -180 || parsedMinLng > 180) {
    return { error: "minLng must be between -180 and 180 degrees" };
  }
  if (parsedMaxLng < -180 || parsedMaxLng > 180) {
    return { error: "maxLng must be between -180 and 180 degrees" };
  }
  if (parsedMinLat < -90 || parsedMinLat > 90) {
    return { error: "minLat must be between -90 and 90 degrees" };
  }
  if (parsedMaxLat < -90 || parsedMaxLat > 90) {
    return { error: "maxLat must be between -90 and 90 degrees" };
  }

  if (parsedMinLng >= parsedMaxLng) {
    return { error: "minLng must be strictly less than maxLng" };
  }
  if (parsedMinLat >= parsedMaxLat) {
    return { error: "minLat must be strictly less than maxLat" };
  }

  if (
    parsedMaxLng - parsedMinLng > MAX_BBOX_SPAN_DEGREES ||
    parsedMaxLat - parsedMinLat > MAX_BBOX_SPAN_DEGREES
  ) {
    return {
      error: `Bounding box dimensions exceed maximum allowed span of ${MAX_BBOX_SPAN_DEGREES} degrees`,
    };
  }

  return {
    value: {
      minLng: parsedMinLng,
      minLat: parsedMinLat,
      maxLng: parsedMaxLng,
      maxLat: parsedMaxLat,
    },
  };
};

/**
 * Validates nearby query parameters: lng, lat, radius (in meters).
 */
const validateNearbyInput = (query = {}) => {
  const { lng, lat, radius } = query;

  if (
    lng === undefined ||
    lat === undefined ||
    radius === undefined ||
    lng === "" ||
    lat === "" ||
    radius === ""
  ) {
    return { error: "lng, lat, and radius are all required query parameters" };
  }

  const parsedLng = Number(lng);
  const parsedLat = Number(lat);
  const parsedRadius = Number(radius);

  if (
    !Number.isFinite(parsedLng) ||
    !Number.isFinite(parsedLat) ||
    !Number.isFinite(parsedRadius)
  ) {
    return { error: "lng, lat, and radius must be valid finite numbers" };
  }

  if (parsedLng < -180 || parsedLng > 180) {
    return { error: "lng must be between -180 and 180 degrees" };
  }
  if (parsedLat < -90 || parsedLat > 90) {
    return { error: "lat must be between -90 and 90 degrees" };
  }

  if (parsedRadius <= 0) {
    return { error: "radius must be a positive number greater than 0" };
  }

  if (parsedRadius > MAX_NEARBY_RADIUS_METERS) {
    return {
      error: `radius exceeds maximum allowed limit of ${MAX_NEARBY_RADIUS_METERS} meters (50km)`,
    };
  }

  return {
    value: {
      lng: parsedLng,
      lat: parsedLat,
      radiusMeters: parsedRadius,
    },
  };
};

module.exports = {
  PARCEL_GEOMETRY_TYPES,
  MAX_BBOX_SPAN_DEGREES,
  MAX_NEARBY_RADIUS_METERS,
  normaliseParcelInput,
  validateParcelInput,
  validatePagination,
  validateBboxInput,
  validateNearbyInput,
};
