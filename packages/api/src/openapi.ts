import pkg from "../package.json" with { type: "json" };
import { schemas } from "@neaps/schemas";

export default {
  openapi: "3.0.3",
  info: {
    title: "Neaps Tide Prediction API",
    version: pkg.version,
    description: "HTTP JSON API for tide predictions using harmonic constituents",
    license: {
      name: "MIT",
    },
  },
  paths: {
    "/tides/extremes": {
      get: {
        summary: "Get extremes prediction for a location",
        description:
          "Returns high and low tide predictions for the nearest station to the given coordinates",
        parameters: [
          { $ref: "#/components/parameters/latitude" },
          { $ref: "#/components/parameters/longitude" },
          { $ref: "#/components/parameters/start" },
          { $ref: "#/components/parameters/end" },
          { $ref: "#/components/parameters/datum" },
          { $ref: "#/components/parameters/units" },
        ],
        responses: {
          "200": {
            description: "Successful prediction",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ExtremesResponse",
                },
              },
            },
          },
          "400": {
            description: "Invalid parameters",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/tides/timeline": {
      get: {
        summary: "Get timeline prediction for a location",
        description: "Returns water level predictions at regular intervals for the nearest station",
        parameters: [
          { $ref: "#/components/parameters/latitude" },
          { $ref: "#/components/parameters/longitude" },
          { $ref: "#/components/parameters/start" },
          { $ref: "#/components/parameters/end" },
          { $ref: "#/components/parameters/datum" },
          { $ref: "#/components/parameters/units" },
        ],
        responses: {
          "200": {
            description: "Successful prediction",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TimelineResponse",
                },
              },
            },
          },
          "400": {
            description: "Invalid parameters",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/tides/stations/{source}/{id}": {
      get: {
        summary: "Get station by ID",
        description: "Find a station by its ID",
        parameters: [
          { $ref: "#/components/parameters/stationSource" },
          { $ref: "#/components/parameters/stationId" },
        ],
        responses: {
          "200": {
            description: "Station found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Station",
                },
              },
            },
          },
          "404": {
            description: "Station not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/tides/stations": {
      get: {
        summary: "Find stations",
        description:
          "Search stations by name/ID, find stations near the given coordinates, or list all stations when no filters are provided",
        parameters: [
          {
            name: "query",
            in: "query",
            description: "Full-text search query (name, ID, or location)",
            required: false,
            schema: {
              type: "string",
            },
          },
          {
            name: "latitude",
            in: "query",
            description: "Latitude for proximity search",
            required: false,
            schema: {
              type: "number",
              minimum: -90,
              maximum: 90,
            },
          },
          {
            name: "longitude",
            in: "query",
            description: "Longitude for proximity search",
            required: false,
            schema: {
              type: "number",
              minimum: -180,
              maximum: 180,
            },
          },
          {
            name: "maxResults",
            in: "query",
            description: "Maximum number of stations to return",
            required: false,
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 10,
            },
          },
          {
            name: "maxDistance",
            in: "query",
            description: "Maximum search radius for proximity search",
            required: false,
            schema: {
              type: "number",
              minimum: 0,
            },
          },
        ],
        responses: {
          "200": {
            description: "Stations found",
            content: {
              "application/json": {
                schema: {
                  anyOf: [
                    {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/Station",
                      },
                    },
                    {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/StationSummary",
                      },
                    },
                  ],
                },
              },
            },
          },
          "400": {
            description: "Invalid parameters",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/tides/stations/{source}/{id}/extremes": {
      get: {
        summary: "Get extremes prediction for a specific station",
        parameters: [
          { $ref: "#/components/parameters/stationSource" },
          { $ref: "#/components/parameters/stationId" },
          { $ref: "#/components/parameters/start" },
          { $ref: "#/components/parameters/end" },
          { $ref: "#/components/parameters/datum" },
          { $ref: "#/components/parameters/units" },
        ],
        responses: {
          "200": {
            description: "Successful prediction",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ExtremesResponse",
                },
              },
            },
          },
          "400": {
            description: "Invalid parameters",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "404": {
            description: "Station not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/tides/stations/{source}/{id}/timeline": {
      get: {
        summary: "Get timeline prediction for a specific station",
        parameters: [
          { $ref: "#/components/parameters/stationSource" },
          { $ref: "#/components/parameters/stationId" },
          { $ref: "#/components/parameters/start" },
          { $ref: "#/components/parameters/end" },
          { $ref: "#/components/parameters/datum" },
          { $ref: "#/components/parameters/units" },
        ],
        responses: {
          "200": {
            description: "Successful prediction",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TimelineResponse",
                },
              },
            },
          },
          "400": {
            description: "Invalid parameters",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "404": {
            description: "Station not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/tides/openapi.json": {
      get: {
        summary: "Get OpenAPI specification",
        responses: {
          "200": {
            description: "OpenAPI specification",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    parameters: {
      latitude: {
        name: "latitude",
        in: "query",
        description: "Latitude",
        required: true,
        schema: {
          type: "number",
          minimum: -90,
          maximum: 90,
        },
      },
      longitude: {
        name: "longitude",
        in: "query",
        description: "Longitude",
        required: true,
        schema: {
          type: "number",
          minimum: -180,
          maximum: 180,
        },
      },
      start: {
        name: "start",
        in: "query",
        required: false,
        description: "Start date/time (ISO 8601 format, defaults to now)",
        schema: {
          type: "string",
          format: "date-time",
        },
      },
      end: {
        name: "end",
        in: "query",
        required: false,
        description: "End date/time (ISO 8601 format, defaults to 7 days from start)",
        schema: {
          type: "string",
          format: "date-time",
        },
      },
      datum: {
        name: "datum",
        in: "query",
        required: false,
        description: "Vertical datum (defaults to MLLW if available)",
        schema: {
          type: "string",
          enum: ["MLLW", "MLW", "MTL", "MSL", "MHW", "MHHW"],
        },
      },
      units: {
        name: "units",
        in: "query",
        required: false,
        description: "Units for water levels (defaults to meters)",
        schema: {
          type: "string",
          enum: ["meters", "feet"],
          default: "meters",
        },
      },
      stationSource: {
        name: "source",
        in: "path",
        required: true,
        description: "Station source (e.g., 'noaa', 'ticon')",
        schema: {
          type: "string",
        },
      },
      stationId: {
        name: "id",
        in: "path",
        required: true,
        description: "Station ID within the source (e.g., '8722588', 'some-dash-string')",
        schema: {
          type: "string",
        },
      },
    },
    schemas: {
      ...schemas,
      Extreme: {
        type: "object",
        properties: {
          time: {
            type: "string",
            format: "date-time",
          },
          level: {
            type: "number",
          },
          high: {
            type: "boolean",
          },
          low: {
            type: "boolean",
          },
          label: {
            type: "string",
          },
        },
        required: ["time", "level", "high", "low", "label"],
      },
      PredictionResponse: {
        type: "object",
        required: ["datum", "units", "station"],
        properties: {
          datum: {
            type: "string",
          },
          units: {
            type: "string",
            enum: ["meters", "feet"],
          },
          station: {
            $ref: "#/components/schemas/Station",
          },
          distance: {
            type: "number",
          },
        },
      },
      ExtremesResponse: {
        allOf: [
          { $ref: "#/components/schemas/PredictionResponse" },
          {
            type: "object",
            properties: {
              extremes: {
                type: "array",
                items: {
                  $ref: "#/components/schemas/Extreme",
                },
              },
            },
          },
        ],
      },
      TimelineEntry: {
        type: "object",
        properties: {
          time: {
            type: "string",
            format: "date-time",
          },
          level: {
            type: "number",
          },
        },
        required: ["time", "level"],
      },
      TimelineResponse: {
        allOf: [
          { $ref: "#/components/schemas/PredictionResponse" },
          {
            type: "object",
            properties: {
              timeline: {
                type: "array",
                items: {
                  $ref: "#/components/schemas/TimelineEntry",
                },
              },
            },
          },
        ],
      },
      Error: {
        type: "object",
        properties: {
          message: {
            type: "string",
          },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                path: { type: "string" },
                message: { type: "string" },
                errorCode: { type: "string" },
              },
            },
          },
        },
        required: ["message"],
      },
    },
  },
} as const;
