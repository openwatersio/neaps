import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";
import type { OpenAPI3 } from "openapi-typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const schema = JSON.parse(
  readFileSync(resolve(__dirname, "../station.schema.json"), "utf-8"),
);

const outputDir = resolve(__dirname, "../src/generated");
mkdirSync(outputDir, { recursive: true });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pick only OpenAPI 3.0.3-compatible keys from a leaf property definition */
function scalar(prop: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const key of ["type", "description", "enum", "format"]) {
    if (key in prop) result[key] = prop[key];
  }
  return result;
}

// ---------------------------------------------------------------------------
// Phase 1 — structured OpenAPI schemas → schemas.ts
//
// Produces allOf / oneOf / $ref objects that are spread directly into the
// openapi.ts components.schemas block.  The three normalizations applied to
// the JSON schema are:
//   1. $defs.offsets.properties.height.properties.type — bare { enum },
//      needs type: "string"
//   2. properties.source.properties.id.type — ["string","number"],
//      collapse to "string"
//   3. properties.source.properties.name — stray "name" key (typo for
//      "description"), strip it
// ---------------------------------------------------------------------------

// HarmonicConstituent — verbatim from harmonic_constituents.items
const hcDef = schema.properties.harmonic_constituents.items;
const HarmonicConstituent = {
  type: "object",
  required: hcDef.required,
  properties: Object.fromEntries(
    Object.keys(hcDef.properties).map((k: string) => [k, scalar(hcDef.properties[k])]),
  ),
};

// Offsets — from $defs.offsets + normalization #1
const offsetsDef = schema.$defs.offsets;
const Offsets = {
  type: "object",
  description: offsetsDef.description,
  required: offsetsDef.required,
  properties: {
    reference: scalar(offsetsDef.properties.reference),
    height: {
      type: "object",
      description: offsetsDef.properties.height.description,
      required: offsetsDef.properties.height.required,
      properties: {
        high: scalar(offsetsDef.properties.height.properties.high),
        low: scalar(offsetsDef.properties.height.properties.low),
        // Normalization #1: bare { enum } → add type: "string"
        type: { type: "string", enum: offsetsDef.properties.height.properties.type.enum },
      },
    },
    time: {
      type: "object",
      description: offsetsDef.properties.time.description,
      required: offsetsDef.properties.time.required,
      properties: {
        high: scalar(offsetsDef.properties.time.properties.high),
        low: scalar(offsetsDef.properties.time.properties.low),
      },
    },
  },
};

// StationSummary — 9-field projection; required = intersection with root required
const SUMMARY_FIELDS = [
  "id",
  "name",
  "latitude",
  "longitude",
  "region",
  "country",
  "continent",
  "timezone",
  "type",
];
const StationSummary = {
  type: "object",
  required: SUMMARY_FIELDS.filter((f) => schema.required.includes(f)),
  properties: Object.fromEntries(SUMMARY_FIELDS.map((f) => [f, scalar(schema.properties[f])])),
};

// Source — normalizations #2 and #3 applied
function buildSource() {
  const raw = schema.properties.source;
  const properties: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(raw.properties) as [string, Record<string, unknown>][]) {
    if (key === "id") {
      // Normalization #2: type ["string","number"] → "string"
      properties[key] = { ...scalar(val), type: "string" };
    } else if (key === "name") {
      // Normalization #3: strip stray "name" key (typo for "description")
      const { name: _stray, ...rest } = val;
      properties[key] = scalar(rest);
    } else {
      properties[key] = scalar(val);
    }
  }
  return {
    type: "object",
    ...(raw.description && { description: raw.description }),
    required: raw.required,
    properties,
  };
}

// License — direct extraction
function buildLicense() {
  const raw = schema.properties.license;
  return {
    type: "object",
    ...(raw.description && { description: raw.description }),
    required: raw.required,
    properties: Object.fromEntries(
      Object.keys(raw.properties).map((k: string) => [k, scalar(raw.properties[k])]),
    ),
  };
}

// Station — allOf [StationSummary $ref, oneOf [reference, subordinate], {source, license, disclaimers}]
const Station = {
  allOf: [
    { $ref: "#/components/schemas/StationSummary" },
    {
      oneOf: [
        {
          type: "object",
          required: ["type", "harmonic_constituents", "datums"],
          properties: {
            type: { type: "string", enum: ["reference"] },
            harmonic_constituents: {
              type: "array",
              items: { $ref: "#/components/schemas/HarmonicConstituent" },
            },
            datums: {
              type: "object",
              additionalProperties: { type: "number" },
            },
          },
        },
        {
          type: "object",
          required: ["type", "offsets"],
          properties: {
            type: { type: "string", enum: ["subordinate"] },
            offsets: { $ref: "#/components/schemas/Offsets" },
          },
        },
      ],
    },
    {
      type: "object",
      required: ["source", "license"],
      properties: {
        source: buildSource(),
        license: buildLicense(),
        disclaimers: scalar(schema.properties.disclaimers),
      },
    },
  ],
};

const schemas = { StationSummary, Station, HarmonicConstituent, Offsets };

writeFileSync(
  resolve(outputDir, "schemas.ts"),
  `// Generated by scripts/generate.ts — do not edit\n` +
    `export const schemas = ${JSON.stringify(schemas, null, 2)} as const;\n`,
);
console.log("[generate] wrote src/generated/schemas.ts");

// ---------------------------------------------------------------------------
// Phase 2 — flat types via openapiTS → types.ts
//
// A flat Station (no allOf/oneOf) where harmonic_constituents and datums are
// required on every station (empty for subordinate — matches tide-database's
// TS types) and offsets is optional.
// ---------------------------------------------------------------------------

const flatStation = {
  type: "object",
  required: [
    ...StationSummary.required,
    "harmonic_constituents",
    "datums",
    "source",
    "license",
  ],
  properties: {
    ...StationSummary.properties,
    harmonic_constituents: {
      type: "array",
      items: { $ref: "#/components/schemas/HarmonicConstituent" },
    },
    datums: {
      type: "object",
      additionalProperties: { type: "number" },
    },
    offsets: { $ref: "#/components/schemas/Offsets" },
    source: buildSource(),
    license: buildLicense(),
    disclaimers: scalar(schema.properties.disclaimers),
  },
};

const flatSpec = {
  openapi: "3.0.3",
  info: { title: "Neaps station types", version: "0.0.0" },
  paths: {},
  components: {
    schemas: {
      StationSummary,
      Station: flatStation,
      HarmonicConstituent,
      Offsets,
    },
  },
};

const ast = await openapiTS(flatSpec as OpenAPI3);
writeFileSync(resolve(outputDir, "types.ts"), astToString(ast));
console.log("[generate] wrote src/generated/types.ts");
