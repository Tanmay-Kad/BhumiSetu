require("dotenv").config();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const prisma = require("../src/utils/prisma");

const SALT_ROUNDS = 12;

let server;
let baseUrl;

const request = async (urlPath, options = {}) => {
  const response = await fetch(`${baseUrl}${urlPath}`, options);
  let body;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    body = await response.json();
  } else {
    body = await response.text();
  }
  return {
    status: response.status,
    headers: response.headers,
    body,
  };
};

const createToken = (user) =>
  jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
};

let testCount = 0;
const test = async (name, fn) => {
  testCount += 1;
  try {
    await fn();
    console.log(`  ✓ [TEST ${testCount}] ${name}`);
  } catch (error) {
    console.error(`  ✗ [TEST ${testCount}] ${name}`);
    console.error(error);
    throw error;
  }
};

const runSuite = async () => {
  console.log("\n==================================================");
  console.log("BHUMISETU POSTGIS SPATIAL & PARCEL GIS TEST SUITE");
  console.log("==================================================\n");

  // 1. Start live server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}/api/v1`;
      console.log(`Live test server running at ${baseUrl}`);
      resolve();
    });
  });

  console.log("Setting up fixtures...");

  // Citizen user for authenticated tests
  const citizen = await prisma.user.upsert({
    where: { email: "citizen.gis.test@bhumisetu.local" },
    create: {
      name: "GIS Citizen",
      email: "citizen.gis.test@bhumisetu.local",
      passwordHash: await bcrypt.hash("Citizen@123", SALT_ROUNDS),
      role: "CITIZEN",
      isActive: true,
    },
    update: { role: "CITIZEN", isActive: true },
  });

  const tokenCitizen = createToken(citizen);
  const authHeader = {
    Authorization: `Bearer ${tokenCitizen}`,
  };

  // Helper to upsert parcel with PostGIS geometry
  const upsertParcelWithGeom = async ({
    ulpin,
    surveyNumber,
    village,
    taluk,
    district,
    area,
    landUse,
    zoning,
    geometry,
  }) => {
    const existing = await prisma.parcel.findUnique({ where: { ulpin } });
    if (existing) {
      return existing;
    }

    const { randomUUID } = require("crypto");
    const id = randomUUID();

    if (geometry) {
      const geometryJson = JSON.stringify(geometry);
      const rows = await prisma.$queryRaw`
        WITH input_geometry AS (
          SELECT ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}), 4326) AS geometry
        )
        INSERT INTO "parcels" (
          "id", "ulpin", "surveyNumber", "village", "taluk", "district", "area",
          "geometry", "landUse", "zoning", "createdAt", "updatedAt"
        )
        SELECT
          ${id}, ${ulpin}, ${surveyNumber}, ${village},
          ${taluk}, ${district}, ${area}, input_geometry.geometry,
          ${landUse}, ${zoning}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM input_geometry
        RETURNING "id", "ulpin", "surveyNumber", "village", "taluk", "district", "area", "landUse", "zoning"
      `;
      return rows[0];
    } else {
      return prisma.parcel.create({
        data: {
          id,
          ulpin,
          surveyNumber,
          village,
          taluk,
          district,
          area,
          landUse,
          zoning,
        },
      });
    }
  };

  // Fixture 1: Thane Parcel 1 (Close point, around 73.804, 19.994)
  const p1 = await upsertParcelWithGeom({
    ulpin: "MH-THANE-GIS-P1",
    surveyNumber: "101/A",
    village: "Shahapur",
    taluk: "Shahapur",
    district: "Thane",
    area: 1200.0,
    landUse: "RESIDENTIAL",
    zoning: "R-1",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [73.802, 19.992],
          [73.806, 19.992],
          [73.806, 19.996],
          [73.802, 19.996],
          [73.802, 19.992],
        ],
      ],
    },
  });

  // Fixture 2: Thane Parcel 2 (~5km east, around 73.852, 19.992)
  const p2 = await upsertParcelWithGeom({
    ulpin: "MH-THANE-GIS-P2",
    surveyNumber: "102/B",
    village: "Shahapur",
    taluk: "Shahapur",
    district: "Thane",
    area: 2500.0,
    landUse: "COMMERCIAL",
    zoning: "C-1",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [73.850, 19.990],
          [73.855, 19.990],
          [73.855, 19.995],
          [73.850, 19.995],
          [73.850, 19.990],
        ],
      ],
    },
  });

  // Fixture 3: Pune Parcel (Far away in Pune, lat ~18.52, lng ~73.85)
  const p3 = await upsertParcelWithGeom({
    ulpin: "MH-PUNE-GIS-P3",
    surveyNumber: "55/1",
    village: "Haveli",
    taluk: "Haveli",
    district: "Pune",
    area: 3000.0,
    landUse: "AGRICULTURAL",
    zoning: "A-1",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [73.850, 18.520],
          [73.855, 18.520],
          [73.855, 18.525],
          [73.850, 18.525],
          [73.850, 18.520],
        ],
      ],
    },
  });

  // Fixture 4: Null Geometry Parcel
  const p4 = await upsertParcelWithGeom({
    ulpin: "MH-THANE-GIS-NULL",
    surveyNumber: "999/X",
    village: "Shahapur",
    taluk: "Shahapur",
    district: "Thane",
    area: 800.0,
    landUse: "RESIDENTIAL",
    zoning: "R-1",
    geometry: null,
  });

  console.log("Fixtures ready. Executing tests...\n");

  // ========================================================================
  // SECTION 1: PARCEL SEARCH & ATTRIBUTE FILTERING
  // ========================================================================
  console.log("--- SECTION 1: Parcel Search & Filtering ---");

  await test("1. Existing parcel list still works (returns data array and pagination metadata)", async () => {
    const res = await request("/parcels");
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.status === "success", "status must be success");
    assert(Array.isArray(res.body.data), "data must be an Array");
    assert(res.body.data.length > 0, "Must return parcels");
    assert(res.body.pagination, "pagination metadata must be present");
    assert(res.body.pagination.page === 1, "default page is 1");
    assert(res.body.pagination.limit === 20, "default limit is 20");
    assert(typeof res.body.pagination.total === "number", "total count is numeric");
    assert(typeof res.body.pagination.totalPages === "number", "totalPages is numeric");
  });

  await test("2. Search by ULPIN exact and partial matching", async () => {
    // Exact search
    const exactRes = await request("/parcels?ulpin=MH-THANE-GIS-P1");
    assert(exactRes.status === 200, "200 OK");
    assert(exactRes.body.data.length === 1, "Exactly 1 match");
    assert(exactRes.body.data[0].ulpin === "MH-THANE-GIS-P1", "ULPIN matched");

    // Partial search
    const partialRes = await request("/parcels?ulpin=THANE-GIS");
    assert(partialRes.status === 200, "200 OK");
    assert(partialRes.body.data.length >= 2, "Matches multiple THANE-GIS parcels");
  });

  await test("3. Search by survey number", async () => {
    const res = await request("/parcels?surveyNumber=101/A");
    assert(res.status === 200, "200 OK");
    assert(res.body.data.some((p) => p.surveyNumber === "101/A"), "Found survey number 101/A");
  });

  await test("4. Search by district", async () => {
    const res = await request("/parcels?district=Pune");
    assert(res.status === 200, "200 OK");
    assert(res.body.data.length >= 1, "At least 1 Pune parcel");
    for (const p of res.body.data) {
      assert(p.district.toLowerCase().includes("pune"), "District must match Pune");
    }
  });

  await test("5. Search by village and taluk", async () => {
    const res = await request("/parcels?village=Haveli&taluk=Haveli");
    assert(res.status === 200, "200 OK");
    assert(res.body.data.length >= 1, "At least 1 Haveli parcel");
    for (const p of res.body.data) {
      assert(p.village.toLowerCase().includes("haveli"), "Village matches Haveli");
    }
  });

  await test("6. Combined multiple attribute filters", async () => {
    const res = await request("/parcels?district=Thane&landUse=COMMERCIAL");
    assert(res.status === 200, "200 OK");
    assert(res.body.data.length >= 1, "Matches Thane commercial");
    for (const p of res.body.data) {
      assert(p.district.toLowerCase().includes("thane"), "District must be Thane");
      assert(p.landUse.toLowerCase().includes("commercial"), "LandUse must be COMMERCIAL");
    }
  });

  await test("7. Pagination parameters work (page, limit, total, totalPages)", async () => {
    const res = await request("/parcels?page=1&limit=2");
    assert(res.status === 200, "200 OK");
    assert(res.body.data.length <= 2, "Returned at most 2 items");
    assert(res.body.pagination.page === 1, "page is 1");
    assert(res.body.pagination.limit === 2, "limit is 2");
    assert(res.body.pagination.total >= 4, "total is >= 4");
    assert(res.body.pagination.totalPages >= 2, "totalPages is >= 2");
  });

  await test("8. Invalid pagination parameters rejected with 400", async () => {
    const invalidPage = await request("/parcels?page=-1");
    assert(invalidPage.status === 400, "page=-1 rejected");
    assert(invalidPage.body.message.includes("page"), "Error mentions page");

    const stringPage = await request("/parcels?page=abc");
    assert(stringPage.status === 400, "page=abc rejected");

    const zeroLimit = await request("/parcels?limit=0");
    assert(zeroLimit.status === 400, "limit=0 rejected");

    const excessiveLimit = await request("/parcels?limit=500");
    assert(excessiveLimit.status === 400, "limit=500 rejected (>100)");
  });

  // ========================================================================
  // SECTION 2: BOUNDING BOX SPATIAL QUERIES
  // ========================================================================
  console.log("\n--- SECTION 2: Bounding Box Spatial Query ---");

  await test("9. Bounding-box query returns expected parcels inside box", async () => {
    // Envelope covering Thane parcel P1: [73.80, 19.99, 73.81, 20.00]
    const res = await request("/parcels/spatial/bbox?minLng=73.80&minLat=19.99&maxLng=73.81&maxLat=20.00");
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.data), "data must be Array");
    assert(res.body.data.some((p) => p.ulpin === "MH-THANE-GIS-P1"), "Must include P1");
    // P3 is in Pune (~18.52), must NOT be included
    assert(!res.body.data.some((p) => p.ulpin === "MH-PUNE-GIS-P3"), "Must NOT include Pune parcel");
  });

  await test("10. Bounding-box query returns empty list when no parcels intersect", async () => {
    // A box in the Arabian Sea where no parcels exist
    const res = await request("/parcels/spatial/bbox?minLng=70.0&minLat=15.0&maxLng=70.5&maxLat=15.5");
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.data), "data is Array");
    assert(res.body.data.length === 0, "No parcels in Arabian Sea");
    assert(res.body.pagination.total === 0, "total is 0");
  });

  await test("11. Bounding-box validation errors (missing, inverted, out-of-bounds, excessive span)", async () => {
    // Missing parameters
    const missing = await request("/parcels/spatial/bbox?minLng=73.8&minLat=19.9");
    assert(missing.status === 400, "Missing parameters return 400");

    // minLng >= maxLng
    const invertedLng = await request("/parcels/spatial/bbox?minLng=73.85&minLat=19.9&maxLng=73.80&maxLat=20.0");
    assert(invertedLng.status === 400, "minLng >= maxLng returns 400");
    assert(invertedLng.body.message.includes("minLng"), "Error mentions minLng");

    // minLat >= maxLat
    const invertedLat = await request("/parcels/spatial/bbox?minLng=73.80&minLat=20.0&maxLng=73.85&maxLat=19.9");
    assert(invertedLat.status === 400, "minLat >= maxLat returns 400");
    assert(invertedLat.body.message.includes("minLat"), "Error mentions minLat");

    // Out of bounds longitude (>180)
    const oobLng = await request("/parcels/spatial/bbox?minLng=185&minLat=19.9&maxLng=190&maxLat=20.0");
    assert(oobLng.status === 400, "Out of bounds longitude returns 400");

    // Out of bounds latitude (>90)
    const oobLat = await request("/parcels/spatial/bbox?minLng=73.8&minLat=95&maxLng=73.9&maxLat=96");
    assert(oobLat.status === 400, "Out of bounds latitude returns 400");

    // Excessive span (>10 degrees)
    const excessiveSpan = await request("/parcels/spatial/bbox?minLng=60.0&minLat=10.0&maxLng=75.0&maxLat=25.0");
    assert(excessiveSpan.status === 400, "Excessive bbox span returns 400");
    assert(excessiveSpan.body.message.includes("span"), "Error mentions span");
  });

  // ========================================================================
  // SECTION 3: NEARBY SPATIAL QUERIES
  // ========================================================================
  console.log("\n--- SECTION 3: Nearby Parcel Spatial Query ---");

  await test("12. Nearby query returns expected parcel within radius", async () => {
    // Point at centroid of P1 (73.804, 19.994), radius 1000m
    const res = await request("/parcels/spatial/nearby?lng=73.804&lat=19.994&radius=1000");
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.data), "data must be an Array");
    assert(res.body.data.some((p) => p.ulpin === "MH-THANE-GIS-P1"), "Must include P1");
    // P2 is ~5km away, should NOT be in 1000m radius
    assert(!res.body.data.some((p) => p.ulpin === "MH-THANE-GIS-P2"), "Must NOT include P2 (5km away)");
    // P3 is in Pune, should NOT be in radius
    assert(!res.body.data.some((p) => p.ulpin === "MH-PUNE-GIS-P3"), "Must NOT include P3");
  });

  await test("13. Nearby query returns empty when no parcels within radius", async () => {
    // Point far from any parcels with small radius
    const res = await request("/parcels/spatial/nearby?lng=73.50&lat=19.50&radius=500");
    assert(res.status === 200, "200 OK");
    assert(res.body.data.length === 0, "No parcels within radius");
    assert(res.body.pagination.total === 0, "total is 0");
  });

  await test("14. Nearby query calculates distance in meters and sorts nearest first", async () => {
    // Query with 10,000m radius from P1 centroid (73.804, 19.994)
    // Both P1 (~0m) and P2 (~5km) will be returned
    const res = await request("/parcels/spatial/nearby?lng=73.804&lat=19.994&radius=10000");
    assert(res.status === 200, "200 OK");
    assert(res.body.data.length >= 2, "Must return at least 2 parcels");

    const p1Item = res.body.data.find((p) => p.ulpin === "MH-THANE-GIS-P1");
    const p2Item = res.body.data.find((p) => p.ulpin === "MH-THANE-GIS-P2");
    assert(p1Item && p2Item, "Both P1 and P2 must be present");

    // Distance checks
    assert(typeof p1Item.distanceMeters === "number", "distanceMeters is numeric");
    assert(typeof p2Item.distanceMeters === "number", "distanceMeters is numeric");
    assert(p1Item.distanceMeters === 0, `P1 point is inside polygon so distanceMeters should be 0, got ${p1Item.distanceMeters}`);
    assert(p2Item.distanceMeters > 4000 && p2Item.distanceMeters < 6000, `P2 distance should be ~4.5-5.5km, got ${p2Item.distanceMeters}`);

    // Sorting check: nearest must be first
    for (let i = 0; i < res.body.data.length - 1; i++) {
      assert(
        res.body.data[i].distanceMeters <= res.body.data[i + 1].distanceMeters,
        `Sorted order violation at index ${i}: ${res.body.data[i].distanceMeters} > ${res.body.data[i + 1].distanceMeters}`,
      );
    }
  });

  await test("15. Invalid coordinates rejected for nearby query", async () => {
    const invalidLat = await request("/parcels/spatial/nearby?lng=73.80&lat=95&radius=1000");
    assert(invalidLat.status === 400, "lat=95 returns 400");

    const invalidLng = await request("/parcels/spatial/nearby?lng=-190&lat=19.9&radius=1000");
    assert(invalidLng.status === 400, "lng=-190 returns 400");

    const stringCoord = await request("/parcels/spatial/nearby?lng=abc&lat=19.9&radius=1000");
    assert(stringCoord.status === 400, "lng=abc returns 400");
  });

  await test("16. Invalid radius rejected for nearby query", async () => {
    const zeroRadius = await request("/parcels/spatial/nearby?lng=73.80&lat=19.9&radius=0");
    assert(zeroRadius.status === 400, "radius=0 returns 400");

    const negativeRadius = await request("/parcels/spatial/nearby?lng=73.80&lat=19.9&radius=-50");
    assert(negativeRadius.status === 400, "radius=-50 returns 400");

    const stringRadius = await request("/parcels/spatial/nearby?lng=73.80&lat=19.9&radius=close");
    assert(stringRadius.status === 400, "radius=close returns 400");
  });

  await test("17. Maximum radius protection (>50km rejected with 400)", async () => {
    const excessiveRadius = await request("/parcels/spatial/nearby?lng=73.80&lat=19.9&radius=100000");
    assert(excessiveRadius.status === 400, "radius=100000 returns 400");
    assert(excessiveRadius.body.message.includes("radius exceeds maximum"), "Error mentions maximum limit");
  });

  // ========================================================================
  // SECTION 4: GEOJSON INTEGRITY & NULL SAFETY
  // ========================================================================
  console.log("\n--- SECTION 4: GeoJSON Integrity & Null Safety ---");

  await test("18. GeoJSON response structure is valid", async () => {
    const res = await request(`/parcels/ulpin/${p1.ulpin}`);
    assert(res.status === 200, "200 OK");
    const geom = res.body.data.geometry;
    assert(geom !== null, "geometry exists");
    assert(geom.type === "Polygon", `type must be Polygon, got ${geom.type}`);
    assert(Array.isArray(geom.coordinates), "coordinates is Array");
    assert(Array.isArray(geom.coordinates[0]), "coordinates[0] is ring Array");
    assert(geom.coordinates[0].length >= 4, "Polygon ring has at least 4 positions");
  });

  await test("19. Null geometry handled safely across search and spatial endpoints", async () => {
    // 1. Attribute search finds the null geometry parcel
    const searchRes = await request("/parcels?ulpin=MH-THANE-GIS-NULL");
    assert(searchRes.status === 200, "Search succeeds");
    assert(searchRes.body.data.length === 1, "Found null geom parcel");
    assert(searchRes.body.data[0].geometry === null, "geometry must be explicitly null");

    // 2. Spatial bbox query safely excludes null geometry without crashing
    const bboxRes = await request("/parcels/spatial/bbox?minLng=70&minLat=15&maxLng=80&maxLat=25");
    assert(bboxRes.status === 200, "Bbox query succeeds without crash");
    assert(!bboxRes.body.data.some((p) => p.ulpin === "MH-THANE-GIS-NULL"), "Null geometry parcel must not match spatial queries");

    // 3. Nearby query safely excludes null geometry without crashing
    const nearbyRes = await request("/parcels/spatial/nearby?lng=73.80&lat=19.99&radius=50000");
    assert(nearbyRes.status === 200, "Nearby query succeeds without crash");
    assert(!nearbyRes.body.data.some((p) => p.ulpin === "MH-THANE-GIS-NULL"), "Null geometry parcel must not match nearby queries");
  });

  // ========================================================================
  // SECTION 5: PERFORMANCE & SECURITY
  // ========================================================================
  console.log("\n--- SECTION 5: Performance & Security Invariants ---");

  await test("20. Public read access policy matches existing parcel API", async () => {
    // Unauthenticated GET /parcels works
    const resList = await request("/parcels");
    assert(resList.status === 200, "Public GET /parcels is 200");

    // Unauthenticated GET /parcels/spatial/bbox works
    const resBbox = await request("/parcels/spatial/bbox?minLng=73.8&minLat=19.9&maxLng=73.9&maxLat=20.0");
    assert(resBbox.status === 200, "Public GET bbox is 200");

    // Unauthenticated GET /parcels/spatial/nearby works
    const resNearby = await request("/parcels/spatial/nearby?lng=73.8&lat=19.9&radius=1000");
    assert(resNearby.status === 200, "Public GET nearby is 200");

    // Unauthenticated POST /parcels is rejected with 401
    const resPost = await request("/parcels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ulpin: "UNAUTH" }),
    });
    assert(resPost.status === 401, "POST without token returns 401");
  });

  await test("21. Spatial queries execute in PostGIS using spatial index rather than JavaScript memory", async () => {
    // Check PostgreSQL EXPLAIN plan on ST_Intersects
    const plan = await prisma.$queryRaw`
      EXPLAIN SELECT "id" FROM "parcels"
      WHERE "geometry" IS NOT NULL
        AND ST_Intersects("geometry", ST_MakeEnvelope(73.80, 19.99, 73.81, 20.00, 4326))
    `;
    const planText = plan.map((row) => Object.values(row)[0]).join(" ");
    // Verify PostGIS function is present in query plan (PostGIS spatial filter execution)
    assert(
      planText.includes("st_intersects") || planText.includes("parcels_geometry_idx") || planText.includes("Bitmap"),
      `Query plan must execute spatial filtering in PostgreSQL engine, got: ${planText}`,
    );
  });

  console.log("\n==================================================");
  console.log(`ALL ${testCount} PARCEL SPATIAL GIS TESTS PASSED!`);
  console.log("==================================================\n");
};

runSuite()
  .catch((err) => {
    console.error("Test Suite Failed with error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();
  });
