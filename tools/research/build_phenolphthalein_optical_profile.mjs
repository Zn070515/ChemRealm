#!/usr/bin/env node

/**
 * Rebuild the admitted ordinary-aqueous phenolphthalein profile from the
 * reviewed, relative digitisation.  The CSV is deliberately not an absolute
 * spectrum: its visible trace is scaled to the independent UCRL Napierian
 * epsilon anchor at 552 nm.  Samples after 620 nm are an explicit
 * below-sensitivity zero extension, not source measurements.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawPath = path.join(
  root,
  "docs",
  "research",
  "indicator-optics",
  "raw",
  "phenolphthalein-kouderis-figure1-digitized.csv",
);
const templatePath = path.join(
  root,
  "packages",
  "render",
  "src",
  "observable",
  "phenolphthalein-ordinary-aqueous.profile.json",
);
const outputPath = templatePath;

const ANCHOR_WAVELENGTH_NANOMETRES = 552;
const ANCHOR_EPSILON_NAPIERIAN = 2.935e4;
const GRID_START = 380;
const GRID_END = 780;
const GRID_STEP = 5;

function fail(message) {
  throw new Error(`phenolphthalein optical profile build failed: ${message}`);
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

function profileHash(profile) {
  const payload = { ...profile };
  delete payload.profileHash;
  return `sha256:${createHash("sha256").update(canonicalJson(payload), "utf8").digest("hex")}`;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const header = lines.shift();
  if (header !== "wavelength_nm,source_relative_absorbance,extraction_class,extraction_note") {
    fail("raw CSV header changed");
  }
  return lines.map((line, index) => {
    const fields = line.split(",");
    if (fields.length !== 4) fail(`raw CSV row ${index + 2} must contain four fields`);
    const wavelength = Number(fields[0]);
    const relativeAbsorbance = Number(fields[1]);
    if (!Number.isInteger(wavelength) || !Number.isFinite(relativeAbsorbance) || relativeAbsorbance < 0) {
      fail(`raw CSV row ${index + 2} contains an invalid numeric value`);
    }
    if (!fields[2] || !fields[3]) fail(`raw CSV row ${index + 2} needs extraction metadata`);
    return {
      wavelength,
      relativeAbsorbance,
      extractionClass: fields[2],
      extractionNote: fields[3],
    };
  });
}

function validateRows(rows) {
  if (rows.length < 2) fail("raw trace needs at least two points");
  for (let index = 1; index < rows.length; index += 1) {
    if (rows[index].wavelength <= rows[index - 1].wavelength) {
      fail("raw trace wavelengths must be strictly increasing");
    }
  }
  if (rows[0].wavelength > GRID_START || rows.at(-1).wavelength < GRID_END) {
    fail("raw trace must cover the complete production grid");
  }
  const extensionRows = rows.filter((row) => row.extractionClass === "below-sensitivity-extension");
  if (extensionRows.length === 0 || extensionRows.some((row) => row.relativeAbsorbance !== 0)) {
    fail("below-sensitivity extension must be explicit zero data");
  }
  const anchorRows = rows.filter((row) => row.wavelength === 550 || row.wavelength === 555);
  if (anchorRows.length !== 2 || anchorRows.some((row) => row.extractionClass !== "figure-1-digitized")) {
    fail("552 nm anchor neighbourhood must contain the two digitised source points");
  }
}

function interpolate(rows, wavelength) {
  const exact = rows.find((row) => row.wavelength === wavelength);
  if (exact !== undefined) return exact.relativeAbsorbance;
  const upperIndex = rows.findIndex((row) => row.wavelength > wavelength);
  if (upperIndex <= 0) fail(`cannot interpolate wavelength ${wavelength}`);
  const lower = rows[upperIndex - 1];
  const upper = rows[upperIndex];
  const fraction = (wavelength - lower.wavelength) / (upper.wavelength - lower.wavelength);
  return lower.relativeAbsorbance + (upper.relativeAbsorbance - lower.relativeAbsorbance) * fraction;
}

function buildProfile(template, rows) {
  const anchorLower = interpolate(rows, 550);
  const anchorUpper = interpolate(rows, 555);
  const anchorRelativeAbsorbance = anchorLower + ((ANCHOR_WAVELENGTH_NANOMETRES - 550) / 5) * (anchorUpper - anchorLower);
  if (!(anchorRelativeAbsorbance > 0)) fail("552 nm anchor interpolation must be positive");

  const profile = structuredClone(template);
  const form = profile.formSpectra.find((candidate) => candidate.formId === "quinoid-base");
  if (form === undefined) fail("template does not contain quinoid-base form");
  form.samples = Array.from(
    { length: ((GRID_END - GRID_START) / GRID_STEP) + 1 },
    (_, index) => {
      const wavelength = GRID_START + index * GRID_STEP;
      return {
        wavelengthNanometres: wavelength,
        // The source trace is graphical. Keep the derived epsilon at the
        // profile's declared two-decimal reporting precision instead of
        // persisting binary floating-point multiplication noise.
        epsilon: Math.round(
          ((interpolate(rows, wavelength) / anchorRelativeAbsorbance) * ANCHOR_EPSILON_NAPIERIAN) * 100,
        ) / 100,
      };
    },
  );
  profile.profileHash = profileHash(profile);
  return profile;
}

const rows = parseCsv(await readFile(rawPath, "utf8"));
validateRows(rows);
const template = JSON.parse(await readFile(templatePath, "utf8"));
const generated = buildProfile(template, rows);
const expected = `${JSON.stringify(generated, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const currentText = await readFile(outputPath, "utf8");
  if (JSON.stringify(JSON.parse(currentText)) !== JSON.stringify(generated)) {
    fail("checked-in profile is not reproducible from the raw digitisation");
  }
  console.log(`phenolphthalein profile build: PASS (${generated.profileHash})`);
} else {
  await writeFile(outputPath, expected, "utf8");
  console.log(`phenolphthalein profile rebuilt: ${generated.profileHash}`);
}
