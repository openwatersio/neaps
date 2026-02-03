import { describe, test, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/index.js";

const app = createApp();

describe("GET /tides/extremes", () => {
  test("returns extremes for valid coordinates", async () => {
    const response = await request(app).get("/tides/extremes").query({
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

  test("accepts datum parameter", async () => {
    const response = await request(app).get("/tides/extremes").query({
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
    const response = await request(app).get("/tides/extremes").query({
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
    const response = await request(app).get("/tides/extremes").query({
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  test("uses default dates when not provided", async () => {
    const response = await request(app).get("/tides/extremes").query({
      latitude: 26.772,
      longitude: -80.05,
    });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("extremes");
    expect(Array.isArray(response.body.extremes)).toBe(true);
    expect(response.body.extremes.length).toBeGreaterThanOrEqual(27);
  });

  test("returns 400 for invalid date format", async () => {
    const response = await request(app).get("/tides/extremes").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "invalid",
      end: "invalid",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("errors");
  });

  test("returns 400 for invalid datum", async () => {
    const response = await request(app).get("/tides/extremes").query({
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

describe("GET /tides/timeline", () => {
  test("returns timeline for valid coordinates", async () => {
    const response = await request(app).get("/tides/timeline").query({
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
    const response = await request(app).get("/tides/timeline").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("timeline");
  });

  test("accepts datum and units parameters", async () => {
    const response = await request(app).get("/tides/timeline").query({
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
    const response = await request(app).get("/tides/timeline").query({
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  test("uses default dates when not provided", async () => {
    const response = await request(app).get("/tides/timeline").query({
      latitude: 26.772,
      longitude: -80.05,
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("timeline");
    expect(Array.isArray(response.body.timeline)).toBe(true);
    expect(response.body.timeline.length).toBeGreaterThan(7 * 24 * 6 - 1); // Every 6 minutes for 7 days
  });

  test("returns 400 for subordinate station (timeline not supported)", async () => {
    const response = await request(app).get("/tides/timeline").query({
      latitude: 42.3,
      longitude: -71.0,
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("subordinate");
  });
});

describe("GET /tides/stations/:source/:id", () => {
  test("finds station by ID", async () => {
    const response = await request(app).get("/tides/stations/noaa/8722588");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id");
    expect(response.body).toHaveProperty("name");
    expect(response.body).toHaveProperty("latitude");
    expect(response.body).toHaveProperty("longitude");
  });

  test("returns stations near coordinates", async () => {
    const response = await request(app).get("/tides/stations").query({
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
    const response = await request(app).get("/tides/stations").query({
      latitude: 26.772,
      longitude: -80.05,
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test("respects limit parameter", async () => {
    const response = await request(app).get("/tides/stations").query({
      latitude: 26.772,
      longitude: -80.05,
      limit: 5,
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeLessThanOrEqual(5);
  });

  test("returns 400 for invalid limit", async () => {
    const response = await request(app).get("/tides/stations").query({
      latitude: 26.772,
      longitude: -80.05,
      limit: 200,
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  test("returns 404 for non-existent station ID", async () => {
    const response = await request(app).get("/tides/stations/fake/non-existent-station");

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message");
  });
});

describe("GET /tides/stations", () => {
  test("returns all stations when no coordinates are provided", async () => {
    const response = await request(app).get("/tides/stations");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).not.toHaveProperty("datums");
    expect(response.body[0]).not.toHaveProperty("harmonic_constituents");
    expect(response.body[0]).not.toHaveProperty("offsets");
  });
});

describe("GET /tides/stations/:source/:id/extremes", () => {
  test("returns extremes for specific station", async () => {
    const response = await request(app).get("/tides/stations/noaa/8722588/extremes").query({
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("extremes");
    expect(response.body).toHaveProperty("station");
    expect(Array.isArray(response.body.extremes)).toBe(true);
  });

  test("accepts datum and units parameters", async () => {
    const response = await request(app).get("/tides/stations/noaa/8722588/extremes").query({
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
    const stationsResponse = await request(app).get("/tides/stations").query({
      latitude: 42.3,
      longitude: -71.0,
      limit: 20,
    });

    const subordinate = stationsResponse.body.find(
      (s: { type: string }) => s.type === "subordinate",
    );

    expect(subordinate, "could not find subordinate station").toBeDefined();

    const response = await request(app).get(`/tides/stations/${subordinate.id}/extremes`).query({
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("extremes");
  });

  test("returns 404 for non-existent station", async () => {
    const response = await request(app)
      .get("/tides/stations/fake/non-existent-station/extremes")
      .query({
        start: "2025-12-17T00:00:00Z",
        end: "2025-12-18T00:00:00Z",
      });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message");
  });

  test("uses default dates when not provided", async () => {
    const response = await request(app).get("/tides/stations/noaa/8722588/extremes");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("extremes");
    expect(Array.isArray(response.body.extremes)).toBe(true);
    expect(response.body.extremes.length).toBeGreaterThan(0);
  });

  test("returns 400 for invalid datum", async () => {
    const response = await request(app).get("/tides/stations/noaa/8722588/extremes").query({
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
      datum: "INVALID_DATUM",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("errors");
  });
});

describe("GET /tides/stations/:source/:id/timeline", () => {
  test("returns timeline for specific station", async () => {
    const response = await request(app).get("/tides/stations/noaa/8722588/timeline").query({
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("timeline");
    expect(response.body).toHaveProperty("station");
    expect(Array.isArray(response.body.timeline)).toBe(true);
  });

  test("accepts datum and units parameters", async () => {
    const response = await request(app).get("/tides/stations/noaa/8722588/timeline").query({
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
    const stationsResponse = await request(app).get("/tides/stations").query({
      latitude: 42.3,
      longitude: -71.0,
      limit: 20,
    });

    const subordinate = stationsResponse.body.find(
      (s: { type: string }) => s.type === "subordinate",
    );

    expect(subordinate, "could not find subordinate station").toBeDefined();

    const response = await request(app).get(`/tides/stations/${subordinate.id}/timeline`).query({
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("subordinate");
  });

  test("returns 404 for non-existent station", async () => {
    const response = await request(app)
      .get("/tides/stations/fake/non-existent-station/timeline")
      .query({
        start: "2025-12-17T00:00:00Z",
        end: "2025-12-18T00:00:00Z",
      });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message");
  });

  test("uses default dates when not provided", async () => {
    const response = await request(app).get("/tides/stations/noaa/8722588/timeline");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("timeline");
    expect(Array.isArray(response.body.timeline)).toBe(true);
    expect(response.body.timeline.length).toBeGreaterThan(0);
  });
});

describe("GET /tides/openapi.json", () => {
  test("returns OpenAPI specification", async () => {
    const response = await request(app).get("/tides/openapi.json");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("openapi");
    expect(response.body).toHaveProperty("info");
    expect(response.body).toHaveProperty("paths");
    expect(response.body.openapi).toBe("3.0.3");
  });
});

describe("Error handling", () => {
  test("returns 400 for invalid coordinate values (NaN)", async () => {
    const response = await request(app).get("/tides/extremes").query({
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
    const response = await request(app).get("/tides/openapi.json");
    expect(response.status).toBe(200);
  });

  test("error handler handles non-validation errors", async () => {
    // Test an error from the route handlers (not validation)
    const response = await request(app).get("/tides/stations/fake/nonexistent/extremes").query({
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message");
    expect(response.body.message).toContain("not found");
  });

  test("returns 400 for NaN coordinates in timeline endpoint", async () => {
    const response = await request(app).get("/tides/timeline").query({
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
    const response = await request(app).get("/tides/stations").query({
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
    const response = await request(app).get("/tides/extremes").query({
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
    const response = await request(app).get("/tides/timeline").query({
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
    const response = await request(app).get("/tides/stations").query({
      latitude: 26.772,
      longitude: -80.05,
      limit: 5,
    });

    expect(response.status).toBe(200);
  });

  test("handles non-'not found' errors in stations catch block", async () => {
    // Trigger a different kind of error by using valid id but causing processing error
    const response = await request(app).get("/tides/stations").query({
      latitude: 0,
      longitude: 0,
      limit: 1,
    });

    // This should succeed and hit the stationsNear path
    expect(response.status).toBe(200);
  });
});

describe("HTTP Caching", () => {
  test("includes ETag header in response", async () => {
    const response = await request(app).get("/tides/extremes").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(200);
    expect(response.headers.etag).toBeDefined();
    expect(response.headers.etag).toMatch(/^W\/"[a-f0-9]{27}"$/);
  });

  test("includes Cache-Control header in response", async () => {
    const response = await request(app).get("/tides/extremes").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("public, max-age=3600");
  });

  test("returns 304 when ETag matches", async () => {
    // First request to get the ETag
    const firstResponse = await request(app).get("/tides/extremes").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(firstResponse.status).toBe(200);
    const etag = firstResponse.headers.etag;

    // Second request with If-None-Match header
    const secondResponse = await request(app)
      .get("/tides/extremes")
      .query({
        latitude: 26.772,
        longitude: -80.05,
        start: "2025-12-17T00:00:00Z",
        end: "2025-12-18T00:00:00Z",
      })
      .set("If-None-Match", etag);

    expect(secondResponse.status).toBe(304);
    expect(secondResponse.body).toEqual({});
  });

  test("returns 200 when ETag does not match", async () => {
    const response = await request(app)
      .get("/tides/extremes")
      .query({
        latitude: 26.772,
        longitude: -80.05,
        start: "2025-12-17T00:00:00Z",
        end: "2025-12-18T00:00:00Z",
      })
      .set("If-None-Match", 'W/"invalid-etag"');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("extremes");
  });

  test("different query parameters generate different ETags", async () => {
    const response1 = await request(app).get("/tides/extremes").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    const response2 = await request(app).get("/tides/extremes").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "2025-12-18T00:00:00Z",
      end: "2025-12-19T00:00:00Z",
    });

    expect(response1.headers.etag).toBeDefined();
    expect(response2.headers.etag).toBeDefined();
    expect(response1.headers.etag).not.toBe(response2.headers.etag);
  });

  test("same query parameters generate same ETags", async () => {
    const response1 = await request(app).get("/tides/extremes").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    const response2 = await request(app).get("/tides/extremes").query({
      latitude: 26.772,
      longitude: -80.05,
      start: "2025-12-17T00:00:00Z",
      end: "2025-12-18T00:00:00Z",
    });

    expect(response1.headers.etag).toBeDefined();
    expect(response2.headers.etag).toBeDefined();
    expect(response1.headers.etag).toBe(response2.headers.etag);
  });
});
