import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const opticsRoot = path.join(root, "docs", "research", "indicator-optics");

const expectedCandidates = new Set([
  "phenolphthalein-neutral-lactone",
  "phenolphthalein-quinoid-base",
  "phenolphthalein-strong-acid-cation",
  "phenolphthalein-ordinary-aqueous",
  "methyl-orange-acid",
  "methyl-orange-base",
]);

function fail(message) {
  throw new Error(`indicator optical profile check failed: ${message}`);
}

function must(condition, message) {
  if (!condition) fail(message);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    fail(`${path.relative(root, filePath)} is not readable JSON (${error.message})`);
  }
}

async function readText(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    fail(`${path.relative(root, filePath)} is not readable (${error.message})`);
  }
}

function isRelativeFileName(value, suffix) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.includes("/") &&
    !value.includes("\\") &&
    value.endsWith(suffix)
  );
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

function contentHash(payload) {
  return `sha256:${createHash("sha256")
    .update(canonicalJson(payload), "utf8")
    .digest("hex")}`;
}

function profilePayload(profile) {
  const payload = { ...profile };
  delete payload.profileHash;
  return payload;
}

function checkSourceFields(entry) {
  const source = entry.source;
  must(source && typeof source === "object", `${entry.candidateId} source is required`);
  for (const field of [
    "citation",
    "sourceUrl",
    "accessedOn",
    "licenseOrPermission",
    "extractionMethod",
    "rawDataLocation",
    "reportedPrecision",
  ]) {
    must(
      typeof source[field] === "string" && source[field].trim().length > 0,
      `${entry.candidateId} source.${field} is required`,
    );
  }
  must(/^https:\/\//.test(source.sourceUrl), `${entry.candidateId} source URL must be HTTPS`);
  must(/^\d{4}-\d{2}-\d{2}$/.test(source.accessedOn), `${entry.candidateId} source access date must be ISO-8601`);
  must(
    ["open", "permission-recorded", "not-admitted"].includes(source.licenseOrPermission),
    `${entry.candidateId} has an unknown license/permission status`,
  );
  must(
    source.extractionMethod === "literature-review" ||
      source.extractionMethod === "machine-readable" ||
      source.extractionMethod === "digitized",
    `${entry.candidateId} has an unknown extraction method`,
  );
  must(source.conditions && typeof source.conditions === "object", `${entry.candidateId} source conditions are required`);
  for (const field of [
    "solvent",
    "temperature",
    "concentration",
    "pathLength",
    "acidityOrIonicStrength",
  ]) {
    must(
      typeof source.conditions[field] === "string" && source.conditions[field].trim().length > 0,
      `${entry.candidateId} source.conditions.${field} is required`,
    );
  }
}

async function checkQuantitativeEntry(entry, opticsRoot) {
  must(
    entry.source.licenseOrPermission === "open" ||
      entry.source.licenseOrPermission === "permission-recorded",
    `${entry.candidateId} quantitative source needs open rights or recorded permission`,
  );
  must(isRelativeFileName(entry.profileArtifact, ".profile.json"), `${entry.candidateId} profile artifact is required`);
  must(isRelativeFileName(entry.reviewRecord, ".review.md"), `${entry.candidateId} review record is required`);

  const profile = await readJson(path.join(opticsRoot, entry.profileArtifact));
  const review = await readText(path.join(opticsRoot, entry.reviewRecord));
  const manifest = await readJson(path.join(root, "contracts", "version-manifest.json"));
  must(
    profile.profileVersion === manifest.representation.indicatorOpticalProfile,
    `${entry.candidateId} profile version must come from the central version manifest`,
  );
  must(profile.reviewStatus === "quantitative", `${entry.candidateId} profile must be quantitative`);
  must(Array.isArray(profile.formSpectra) && profile.formSpectra.length > 0, `${entry.candidateId} needs form spectra`);
  must(profile.transform === "sRGB-IEC-61966-2-1", `${entry.candidateId} needs the pinned colour transform`);
  must(typeof profile.profileHash === "string" && profile.profileHash.startsWith("sha256:"), `${entry.candidateId} profile hash is required`);
  must(profile.profileHash === contentHash(profilePayload(profile)), `${entry.candidateId} profile hash does not match payload`);
  const colourimetryArtifact = await readJson(path.join(
    root,
    "packages",
    "render",
    "src",
    "observable",
    "colourimetry-cie-d65-1931-2deg-5nm.json",
  ));
  const expectedWavelengths = colourimetryArtifact.wavelengthNanometres;
  must(colourimetryArtifact.status === "production", "production colourimetry artifact must be admitted");
  must(Array.isArray(expectedWavelengths) && expectedWavelengths.length === 81, "production colourimetry must contain 81 wavelengths");
  must(expectedWavelengths[0] === 380 && expectedWavelengths.at(-1) === 780, "production colourimetry must cover 380–780 nm");
  must(colourimetryArtifact.wavelengthIntervalNanometres <= 5, "production colourimetry spacing must be at most 5 nm");
  must(Array.isArray(colourimetryArtifact.d65RelativePower) && colourimetryArtifact.d65RelativePower.length === expectedWavelengths.length, "D65 array must match the production wavelength grid");
  must(Array.isArray(colourimetryArtifact.cie1931XBar) && colourimetryArtifact.cie1931XBar.length === expectedWavelengths.length, "CIE X-bar array must match the production wavelength grid");
  must(Array.isArray(colourimetryArtifact.cie1931YBar) && colourimetryArtifact.cie1931YBar.length === expectedWavelengths.length, "CIE Y-bar array must match the production wavelength grid");
  must(Array.isArray(colourimetryArtifact.cie1931ZBar) && colourimetryArtifact.cie1931ZBar.length === expectedWavelengths.length, "CIE Z-bar array must match the production wavelength grid");
  must(expectedWavelengths.every((wavelength, index) => index === 0 || wavelength - expectedWavelengths[index - 1] === 5), "production colourimetry grid must be uniformly sampled at 5 nm");
  must(colourimetryArtifact.source?.illuminantMd5 === "03d4eb9b837c60671627c946fb534deb", "CIE D65 source checksum drifted");
  must(colourimetryArtifact.source?.observerMd5 === "17cca777db64b17170f06f67ce9d3ab7", "CIE observer source checksum drifted");
  must(Array.isArray(colourimetryArtifact.transform?.sRgbD65WhitePoint) && colourimetryArtifact.transform.sRgbD65WhitePoint.length === 3, "CIE artifact must declare the sRGB D65 reference white");
  for (const form of profile.formSpectra) {
    must(Array.isArray(form.samples) && form.samples.length === expectedWavelengths.length, `${entry.candidateId}/${form.formId} must use the complete production grid`);
    must(["napierian", "decadic"].includes(form.epsilonConvention), `${entry.candidateId}/${form.formId} must declare epsilon convention`);
    must(form.samples.every((sample, index) => sample.wavelengthNanometres === expectedWavelengths[index]), `${entry.candidateId}/${form.formId} grid differs from production colourimetry`);
  }
  must(/decision:\s*quantitative/i.test(review), `${entry.candidateId} review must record quantitative decision`);
  must(/profile hash/i.test(review), `${entry.candidateId} review must record the profile hash`);
  must(
    !(/lambdaMax/i.test(review) && !/samples|spectrum|spectr/i.test(review)),
    `${entry.candidateId} cannot use lambdaMax as its only evidence`,
  );

  if (entry.candidateId === "phenolphthalein-ordinary-aqueous") {
    must(/Kouderis[\s,]+Tsigoias[\s,]+Siafarika[\s,]+(?:and|&)\s*Kalampounias/i.test(entry.source.citation), "ordinary phenolphthalein source authors are not faithful");
    must(!/Alim\s+et\s+al/i.test(entry.source.citation), "ordinary phenolphthalein source must not name Alim et al.");
    must(/380[–-]780\s*nm/i.test(entry.source.rawDataLocation), "ordinary profile source must record the full visible extraction range");
    must(/552\s*nm/i.test(entry.source.rawDataLocation), "ordinary profile source must retain the UCRL 552 nm anchor");
    must(/Napierian/i.test(entry.source.reportedPrecision), "ordinary profile source must record the UCRL logarithm convention");
    must(/20\.00\s*±\s*0\.01\s*°C/i.test(entry.source.conditions.temperature), "ordinary profile temperature must match the cited experiment");
    must(/5e-5\s*mol\/L/i.test(entry.source.conditions.concentration), "ordinary profile concentration must match the cited experiment");
    must(/1\s*cm\s+quartz/i.test(entry.source.conditions.pathLength), "ordinary profile path must match the cited experiment");
    must(/sodium carbonate[\s\S]*0\.02\s*mol\/L[\s\S]*pH[\s\S]*10/i.test(entry.source.conditions.acidityOrIonicStrength), "ordinary profile medium and pH must be recorded");
    must(profile.conditions.temperature.min.value === 293.15 && profile.conditions.temperature.max.value === 293.15, "ordinary profile temperature coverage must stay at the cited 20 °C condition");
    must(profile.conditions.concentration.min.value === 5e-5 && profile.conditions.concentration.max.value === 5e-5, "ordinary profile concentration coverage must stay at the cited concentration");
    must(profile.conditions.pathLength.min.value === 10 && profile.conditions.pathLength.max.value === 10, "ordinary profile path coverage must stay at 10 mm");
    must(profile.conditions.ionicStrengthMolal.min.value === 0.02 && profile.conditions.ionicStrengthMolal.max.value === 0.06, "ordinary profile ionic-strength transfer range must be explicit and narrow");
    must(profile.conditions.ph?.min === 9.5 && profile.conditions.ph?.max === 10.5, "ordinary profile acidity transfer range must be explicit and narrow");
    must(/strong-acid[\s\S]{0,120}(?:orange|cation)[\s\S]{0,120}(?:refusal|not implemented|not emitted)/i.test(review), "ordinary profile review must retain the strong-acid orange refusal boundary");
    must(/81\s+(?:sample|point)|5\s*nm/i.test(review), "ordinary profile review must record full-grid sampling");
    must(/20%|uncertainty/i.test(review), "ordinary profile review must record extraction uncertainty");
    const runtimeProfile = await readJson(path.join(
      root,
      "packages",
      "render",
      "src",
      "observable",
      "phenolphthalein-ordinary-aqueous.profile.json",
    ));
    must(
      canonicalJson(runtimeProfile) === canonicalJson(profile),
      `${entry.candidateId} runtime profile must equal the reviewed evidence artifact`,
    );
  }
}

export async function checkIndicatorOpticalProfiles(registryRoot = opticsRoot) {
  const registry = await readJson(path.join(registryRoot, "profile-registry.json"));
  must(registry.registryId === "chemrealm-indicator-optical-profiles", "registry id is not pinned");
  must(registry.policy === "refusal-first", "registry must be refusal-first");
  must(Array.isArray(registry.entries), "registry entries are required");
  must(registry.colourimetry?.status === "production", "registry must admit the production colourimetry transform");
  must(registry.colourimetry?.referenceData === "colourimetry-d65-cie-srgb.reference.json", "registry colourimetry reference link drifted");
  must(registry.entries.length === expectedCandidates.size, "registry candidate count changed without review");

  const candidateIds = new Set();
  for (const entry of registry.entries) {
    must(!candidateIds.has(entry.candidateId), `duplicate candidate ${entry.candidateId}`);
    candidateIds.add(entry.candidateId);
    must(expectedCandidates.has(entry.candidateId), `unexpected candidate ${entry.candidateId}`);
    must(entry.profileId === entry.candidateId, `${entry.candidateId} profile identity drift`);
    must(typeof entry.indicatorId === "string" && entry.indicatorId.length > 0, `${entry.candidateId} indicator identity is required`);
    must(typeof entry.formId === "string" && entry.formId.length > 0, `${entry.candidateId} form identity is required`);
    must(isRelativeFileName(entry.sourceRecord, ".source.md"), `${entry.candidateId} source record must be a local packet`);
    must(!Object.hasOwn(entry, "lambdaMax"), `${entry.candidateId} cannot use lambdaMax as a profile substitute`);
    const sourcePath = path.join(registryRoot, entry.sourceRecord);
    await access(sourcePath).catch(() => fail(`${entry.candidateId} source record is missing`));
    const sourceText = await readText(sourcePath);
    must(sourceText.includes(entry.candidateId), `${entry.candidateId} source packet identity is missing`);
    must(/review status/i.test(sourceText), `${entry.candidateId} source packet has no review status`);
    checkSourceFields(entry);

    if (entry.reviewStatus === "qualitative-only") {
      must(/quantitative profile:\s*\*\*NOT ADMITTED\*\*/i.test(sourceText), `${entry.candidateId} source packet must state quantitative non-admission`);
      must(entry.profileArtifact === null, `${entry.candidateId} qualitative entry cannot point to a profile`);
      must(entry.reviewRecord === null, `${entry.candidateId} qualitative entry cannot point to a review`);
      must(typeof entry.admissionReason === "string" && /qualitative|not admitted/i.test(entry.admissionReason), `${entry.candidateId} needs a refusal reason`);
      must(entry.source.licenseOrPermission === "not-admitted", `${entry.candidateId} qualitative source rights must not be overstated`);
      must(entry.source.extractionMethod === "literature-review", `${entry.candidateId} non-admitted source cannot claim numeric extraction`);
      must(
        !/\d/.test(entry.source.reportedPrecision) ||
          /not promoted|not admitted|not claimed|not applicable/i.test(entry.source.reportedPrecision),
        `${entry.candidateId} cannot invent quantitative precision for a qualitative source`,
      );
    } else if (entry.reviewStatus === "quantitative") {
      must(/quantitative profile:\s*\*\*ADMITTED\*\*/i.test(sourceText), `${entry.candidateId} source packet must state quantitative admission`);
      await checkQuantitativeEntry(entry, registryRoot);
    } else {
      fail(`${entry.candidateId} has unknown review status ${entry.reviewStatus}`);
    }
  }
  must(candidateIds.size === expectedCandidates.size, "one or more expected candidates are missing");

  const colourimetryRef = await readJson(path.join(registryRoot, "colourimetry-d65-cie-srgb.reference.json"));
  const colourimetrySource = await readText(path.join(registryRoot, "colourimetry-d65-cie-srgb.source.md"));
  must(colourimetryRef.status === "production", "colourimetry production artifact must be admitted");
  must(colourimetryRef.sourceRecord === "colourimetry-d65-cie-srgb.source.md", "colourimetry source link drifted");
  must(colourimetryRef.illuminant === "CIE D65", "D65 reference is required");
  must(colourimetryRef.observer === "CIE 1931 2-degree", "CIE 1931 2-degree observer is required");
  must(colourimetryRef.transform === "sRGB IEC 61966-2-1", "sRGB transform reference is required");
  must(colourimetryRef.artifact === "packages/render/src/observable/colourimetry-cie-d65-1931-2deg-5nm.json", "colourimetry production artifact link drifted");
  must(colourimetryRef.wavelengthIntervalNanometres <= 5, "colourimetry reference spacing must be at most 5 nm");
  must(colourimetryRef.wavelengthRangeNanometres?.min === 380 && colourimetryRef.wavelengthRangeNanometres?.max === 780, "colourimetry reference range must be 380–780 nm");
  must(/production colourimetry artifact|admitted production/i.test(colourimetrySource), "colourimetry source packet must describe the admitted production artifact");
  must(/blank[\s\S]{0,160}(?:normaliz|white)/i.test(colourimetrySource), "colourimetry source packet must describe blank normalization");

  console.log(`indicator optical profile evidence: PASS (${registry.entries.length} candidates; quantitative profiles admitted: ${registry.entries.filter((entry) => entry.reviewStatus === "quantitative").length})`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await checkIndicatorOpticalProfiles();
}
