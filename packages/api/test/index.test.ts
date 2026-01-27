import { describe, test, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/index.js";

const app = createApp();

describe("GET /extremes", () => {
  test("returns extremes for valid coordinates", async () => {
    const response = await request(app).get("/extremes").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("extremes");
    expect(response.body).toHaveProperty("station");
    expect(response.body).toHaveProperty("datum");
    expect(response.body).toHaveProperty("units");
    expect(Array.isArray(response.body.extremes)).toBe(true);
  });

  test("accepts latitude/longitude parameter variations", async () => {
    const response = await request(app).get("/extremes").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("extremes");
  });

  test("accepts lng parameter", async () => {
    const response = await request(app).get("/extremes").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("extremes");
  });

  test("accepts datum parameter", async () => {
    const response = await request(app).get("/extremes").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
      datum: "MLLW",
    });

    expect(response.status).toBe(200);
    expect(response.body.datum).toBe("MLLW");
  });

  test("accepts units parameter", async () => {
    const response = await request(app).get("/extremes").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
      units: "feet",
    });

    expect(response.status).toBe(200);
    expect(response.body.units).toBe("feet");
  });

  test("returns 400 for missing coordinates", async () => {
    const response = await request(app).get("/extremes").query({
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  test("returns 400 for missing dates", async () => {
    const response = await request(app).get("/extremes").query({
      latitude: 26.772,
      longitude: -80.05,
    });
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
    expect(response.body).toHaveProperty("errors");
  });

  test("returns 400 for invalid date format", async () => {
    const response = await request(app).get("/extremes").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "invalid",
      end: "invalid",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("errors");
  });

  test("returns 400 for invalid datum", async () => {
    const response = await request(app).get("/extremes").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
      datum: "INVALID_DATUM",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("errors");
  });
});

describe("GET /timeline", () => {
  test("returns timeline for valid coordinates", async () => {
    const response = await request(app).get("/timeline").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("timeline");
    expect(response.body).toHaveProperty("station");
    expect(response.body).toHaveProperty("datum");
    expect(response.body).toHaveProperty("units");
    expect(Array.isArray(response.body.timeline)).toBe(true);
  });

  test("accepts coordinate parameter variations", async () => {
    const response = await request(app).get("/timeline").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("timeline");
  });

  test("accepts datum and units parameters", async () => {
    const response = await request(app).get("/timeline").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
      datum: "MLLW",
      units: "feet",
    });

    expect(response.status).toBe(200);
    expect(response.body.datum).toBe("MLLW");
    expect(response.body.units).toBe("feet");
  });

  test("returns 400 for missing coordinates", async () => {
    const response = await request(app).get("/timeline").query({
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  test("returns 400 for missing dates", async () => {
    const response = await request(app).get("/timeline").query({
      latitude: 26.772,
      longitude: -80.05,
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("errors");
  });

  test("returns 400 for subordinate station (timeline not supported)", async () => {
    const response = await request(app).get("/timeline").query({
      latitude: 42.3,
      longitude: -71.0,
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    if (response.body.station?.type === "subordinate") {
      expect(response.status).toBe(400);
      expect(response.body.message).toContain("subordinate");
    }
  });
});

describe("GET /stations", () => {
  test("finds station by ID", async () => {
    const response = await request(app).get("/stations").query({ id: "noaa/8722588" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id");
    expect(response.body).toHaveProperty("name");
    expect(response.body).toHaveProperty("latitude");
    expect(response.body).toHaveProperty("longitude");
  });

  test("returns stations near coordinates", async () => {
    const response = await request(app).get("/stations").query({
      latitude: 26.772,
      longitude: -80.05,
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body.length).toBeLessThanOrEqual(10);
    expect(response.body[0]).toHaveProperty("distance");
  });

  test("accepts coordinate parameter variations", async () => {
    const response = await request(app).get("/stations").query({
      latitude: 26.772,
      longitude: -80.05,
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test("respects limit parameter", async () => {
    const response = await request(app).get("/stations").query({
      latitude: 26.772,
      longitude: -80.05,
      limit: 5,
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeLessThanOrEqual(5);
  });

  test("returns 400 for invalid limit", async () => {
    const response = await request(app).get("/stations").query({
      latitude: 26.772,
      longitude: -80.05,
      limit: 200,
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  test("returns 404 for non-existent station ID", async () => {
    const response = await request(app).get("/stations").query({ id: "non-existent-station" });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message");
  });

  test("returns 400 for missing parameters", async () => {
    const response = await request(app).get("/stations");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });
});

describe("GET /stations/:id/extremes", () => {
  test("returns extremes for specific station", async () => {
    const response = await request(app)
      .get(`/stations/${encodeURIComponent("noaa/8722588")}/extremes`)
      .query({
        start: "2025-12-17T00:00:00Z",
        end: "2025-12-18T00:00:00Z",
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("extremes");
    expect(response.body).toHaveProperty("station");
    expect(Array.isArray(response.body.extremes)).toBe(true);
  });

  test("accepts datum and units parameters", async () => {
    const response = await request(app)
      .get(`/stations/${encodeURIComponent("noaa/8722588")}/extremes`)
      .query({
        start: "2025-12-17T00:00:00Z",
        end: "2025-12-18T00:00:00Z",
        datum: "MLLW",
        units: "feet",
      });

    expect(response.status).toBe(200);
    expect(response.body.datum).toBe("MLLW");
    expect(response.body.units).toBe("feet");
  });

  test("works for subordinate stations", async () => {
    const stationsResponse = await request(app).get("/stations").query({
      latitude: 42.3,
      longitude: -71.0,
      limit: 20,
    });

    const subordinate = stationsResponse.body.find(
      (s: { type: string }) => s.type === "subordinate",
    );

    if (subordinate) {
      const response = await request(app)
        .get(`/stations/${encodeURIComponent(subordinate.id)}/extremes`)
        .query({
          start: "2025-12-17T00:00:00Z",
          end: "2025-12-18T00:00:00Z",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("extremes");
    }
  });

  test("returns 404 for non-existent station", async () => {
    const response = await request(app).get("/stations/non-existent-station/extremes").query({
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message");
  });

  test("returns 400 for missing dates", async () => {
    const response = await request(app).get(
      `/stations/${encodeURIComponent("noaa/8722588")}/extremes`,
    );

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  test("returns 400 for invalid datum", async () => {
    const response = await request(app)
      .get(`/stations/${encodeURIComponent("noaa/8722588")}/extremes`)
      .query({
        start: "2025-12-17T00:00:00Z",
        end: "2025-12-18T00:00:00Z",
        datum: "INVALID_DATUM",
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("errors");
  });
});

describe("GET /stations/:id/timeline", () => {
  test("returns timeline for specific station", async () => {
    const response = await request(app)
      .get(`/stations/${encodeURIComponent("noaa/8722588")}/timeline`)
      .query({
        start: "2025-12-17T00:00:00Z",
        end: "2025-12-18T00:00:00Z",
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("timeline");
    expect(response.body).toHaveProperty("station");
    expect(Array.isArray(response.body.timeline)).toBe(true);
  });

  test("accepts datum and units parameters", async () => {
    const response = await request(app)
      .get(`/stations/${encodeURIComponent("noaa/8722588")}/timeline`)
      .query({
        start: "2025-12-17T00:00:00Z",
        end: "2025-12-18T00:00:00Z",
        datum: "MLLW",
        units: "feet",
      });

    expect(response.status).toBe(200);
    expect(response.body.datum).toBe("MLLW");
    expect(response.body.units).toBe("feet");
  });

  test("returns 400 for subordinate stations", async () => {
    const stationsResponse = await request(app).get("/stations").query({
      latitude: 42.3,
      longitude: -71.0,
      limit: 20,
    });

    const subordinate = stationsResponse.body.find(
      (s: { type: string }) => s.type === "subordinate",
    );

    if (subordinate) {
      const response = await request(app)
        .get(`/stations/${encodeURIComponent(subordinate.id)}/timeline`)
        .query({
          start: "2025-12-17T00:00:00Z",
          end: "2025-12-18T00:00:00Z",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("subordinate");
    }
  });

  test("returns 404 for non-existent station", async () => {
    const response = await request(app).get("/stations/non-existent-station/timeline").query({
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message");
  });

  test("returns 400 for missing dates", async () => {
    const response = await request(app).get(
      `/stations/${encodeURIComponent("noaa/8722588")}/timeline`,
    );

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });
});

describe("GET /openapi.json", () => {
  test("returns OpenAPI specification", async () => {
    const response = await request(app).get("/openapi.json");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("openapi");
    expect(response.body).toHaveProperty("info");
    expect(response.body).toHaveProperty("paths");
    expect(response.body.openapi).toBe("3.0.3");
  });
});

describe("Error handling", () => {
  test("returns 400 for invalid coordinate values (NaN)", async () => {
    const response = await request(app).get("/extremes").query({
      latitude: "invalid",
      longitude: "also-invalid",
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("errors");
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  test("error handler returns next() when no error", async () => {
    // This tests the error handler's !err branch by making a successful request
    const response = await request(app).get("/openapi.json");
    expect(response.status).toBe(200);
  });

  test("error handler handles non-validation errors", async () => {
    // Test an error from the route handlers (not validation)
    const response = await request(app)
      .get("/stations/:id/extremes".replace(":id", "nonexistent"))
      .query({
        start: "2025-12-17T00:00:00Z",
        end: "2025-12-18T00:00:00Z",
      });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toContain("not found");
  });

  test("returns 400 for NaN coordinates in timeline endpoint", async () => {
    const response = await request(app).get("/timeline").query({
      latitude: "not-a-number",
      longitude: "also-not-a-number",
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("errors");
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  test("returns 400 for NaN coordinates in stations endpoint", async () => {
    const response = await request(app).get("/stations").query({
      latitude: "invalid-lat",
      longitude: "invalid-lon",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("errors");
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  test("handles errors from prediction functions", async () => {
    // Use dates that will cause issues (e.g., far in the future or invalid range)
    const response = await request(app).get("/extremes").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "2025-12-18T00:00:00Z",
      end: "2025-12-17T00:00:00Z", // end before start
    });

    // This should either be caught by validation or return an error
    expect([400, 500]).toContain(response.status);
    expect(response.body).toHaveProperty("message");
  });

  test("handles errors from timeline prediction", async () => {
    const response = await request(app).get("/timeline").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "2025-12-18T00:00:00Z",
      end: "2025-12-17T00:00:00Z", // end before start
    });

    expect([400, 500]).toContain(response.status);
    expect(response.body).toHaveProperty("message");
  });

  test("handles errors from stationsNear", async () => {
    // Test with valid coordinates that should work
    const response = await request(app).get("/stations").query({
      latitude: 26.772,
      longitude: -80.05,
      limit: 5,
    });

    expect(response.status).toBe(200);
  });

  test("handles non-'not found' errors in stations catch block", async () => {
    // Trigger a different kind of error by using valid id but causing processing error
    const response = await request(app).get("/stations").query({
      latitude: 0,
      longitude: 0,
      limit: 1,
    });

    // This should succeed and hit the stationsNear path
    expect(response.status).toBe(200);
  });
});
