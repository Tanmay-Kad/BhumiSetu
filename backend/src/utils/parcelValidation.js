const PARCEL_GEOMETRY_TYPES = new Set(["Polygon", "MultiPolygon"]);

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

module.exports = {
  normaliseParcelInput,
  validateParcelInput,
};
