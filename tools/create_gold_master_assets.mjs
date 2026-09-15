import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const repositoryRoot = process.cwd();
const outputRoot = join(repositoryRoot, "assets", "apparatus", "catalog", "gold-master");
const sourcePath = join(repositoryRoot, "packages", "render", "src", "assets", "gold-master-construction.json");
const manifestPath = join(repositoryRoot, "contracts", "version-manifest.json");
const masterRoot = join(repositoryRoot, "assets", "apparatus", "masters");
const lods = ["master", "scene", "preview", "thumbnail"];
const lodDetail = { master: "full", scene: "scene", preview: "catalog", thumbnail: "identity" };
const cleanSvg = (svg) => svg.replace(/[ \t]+$/gm, "");
const source = JSON.parse(await readFile(sourcePath, "utf8"));
const versionManifest = JSON.parse(await readFile(manifestPath, "utf8"));
const packageSchemaVersion = versionManifest.representation.apparatusGoldMasterPackage;
const manualMasterDirectories = new Map();
for (const entry of await readdir(masterRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const masterPath = join(masterRoot, entry.name, "master.svg");
  const master = await readFile(masterPath, "utf8");
  const identity = master.match(/data-asset-id="([^"]+)"/);
  if (identity?.[1] !== undefined) manualMasterDirectories.set(identity[1], entry.name);
}
const specifications = source.specifications.filter((asset) => manualMasterDirectories.has(asset.specificationId));

if (source.coordinateUnit !== "mm") throw new Error("Gold Master source must use millimetres");
if (!Number.isInteger(packageSchemaVersion)) throw new Error("Gold Master package schema version must come from the central version manifest");
if (!Array.isArray(source.specifications) || specifications.length === 0) throw new Error("Gold Master source has no manual specifications");

const round = (value) => Number(value.toFixed(3));
const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function rootAttributes(svg) {
  const match = svg.match(/^<svg\b([^>]*)>/);
  if (!match) throw new Error("master SVG must have a root svg element");
  return { full: match[0], attributes: match[1] ?? "" };
}

function topLevelLayerGroups(svg) {
  const groups = [];
  const tokenPattern = /<g\b[^>]*data-layer="([^"]+)"[^>]*>|<g\b[^>]*>|<\/g>/g;
  let match;
  let depth = 0;
  let start = -1;
  let name = "";
  while ((match = tokenPattern.exec(svg)) !== null) {
    const token = match[0];
    if (token.startsWith("</g")) {
      if (depth > 0) depth -= 1;
      if (depth === 0 && start >= 0) {
        groups.push({ name, start, end: tokenPattern.lastIndex });
        start = -1;
        name = "";
      }
      continue;
    }
    const layerName = match[1];
    if (depth === 0 && layerName !== undefined) {
      start = match.index;
      name = layerName;
    }
    if (token.endsWith("/>") || token.endsWith(" />")) continue;
    depth += 1;
  }
  if (depth !== 0 || start >= 0) throw new Error("master SVG has unbalanced groups");
  return groups;
}

function compileLod(masterSvg, asset, lod) {
  const root = rootAttributes(masterSvg);
  const allowed = new Set(asset.lodVisibility[lod]);
  const groups = topLevelLayerGroups(masterSvg);
  const bodyStart = masterSvg.indexOf(">", root.full.length - 1) + 1;
  const bodyEnd = masterSvg.lastIndexOf("</svg>");
  if (bodyStart <= 0 || bodyEnd <= bodyStart) throw new Error(`invalid master SVG body: ${asset.specificationId}`);
  let body = masterSvg.slice(bodyStart, bodyEnd);
  for (const group of [...groups].reverse()) {
    const localStart = group.start - bodyStart;
    const localEnd = group.end - bodyStart;
    if (localStart < 0 || localEnd > body.length) throw new Error(`master layer outside root body: ${asset.specificationId}`);
    if (!allowed.has(group.name)) {
      body = `${body.slice(0, localStart)}${body.slice(localEnd)}`;
    }
  }
  const attrs = ` data-lod="${lod}" data-lod-detail="${lodDetail[lod]}" data-lod-visible-roles="${esc(asset.lodVisibility[lod].join("|"))}" data-dimensions-mm="${esc(asset.physicalEnvelopeMm.join(" "))}" data-body-dimensions-mm="${esc(asset.bodyEnvelopeMm.join(" "))}" data-asset-version="${esc(versionManifest.representation.apparatusAsset)}"`;
  const rootWithMetadata = root.full.replace(/>$/, `${attrs}>`);
  return `${rootWithMetadata}${body}</svg>`;
}

async function readMaster(asset) {
  const directory = manualMasterDirectories.get(asset.specificationId);
  if (directory === undefined) throw new Error(`manual master directory missing: ${asset.specificationId}`);
  const masterPath = join(masterRoot, directory, "master.svg");
  const svg = await readFile(masterPath, "utf8");
  const root = rootAttributes(svg);
  if (!root.attributes.includes(`data-asset-id="${asset.specificationId}"`)) {
    throw new Error(`master asset identity mismatch: ${asset.specificationId}`);
  }
  if (!root.attributes.includes('data-master-authored="true"')) {
    throw new Error(`master is not marked as manually authored: ${asset.specificationId}`);
  }
  const expectedViewBox = `viewBox="0 0 ${asset.physicalEnvelopeMm[0]} ${asset.physicalEnvelopeMm[1]}"`;
  if (!root.attributes.includes(expectedViewBox)) throw new Error(`master viewBox does not match physical envelope: ${asset.specificationId}`);
  return svg;
}

function embeddedMaster(svg, asset, x, y, scale, reviewMode) {
  const root = rootAttributes(svg);
  const [width, height] = asset.physicalEnvelopeMm;
  const inner = svg.slice(svg.indexOf(">", root.full.length - 1) + 1, svg.lastIndexOf("</svg>"));
  return `<svg x="${round(x)}" y="${round(y)}" width="${round(width * scale)}" height="${round(height * scale)}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" data-source-asset-id="${asset.specificationId}" data-source-lod="master" data-mm-to-px="${scale}" data-review-mode="${reviewMode}">${inner}</svg>`;
}

function physicalComparison(assets, masterSvgs) {
  const scale = 1;
  const rows = [
    { title: "Burettes", assets: assets.filter((item) => item.familyId === "burette"), y: 100 },
    { title: "Beakers", assets: assets.filter((item) => item.familyId === "beaker"), y: 960 },
    { title: "Erlenmeyer flasks", assets: assets.filter((item) => item.familyId === "conical-flask"), y: 1170 },
  ];
  const markup = [];
  for (const row of rows) {
    markup.push(`<text x="20" y="${row.y - 22}" fill="#23312c" font-family="Arial,sans-serif" font-size="18" font-weight="700">${row.title}</text>`);
    let x = 70;
    for (const asset of row.assets) {
      markup.push(`<g data-review-family="${asset.familyId}">${embeddedMaster(masterSvgs.get(asset.specificationId), asset, x, row.y, scale, "measurement-valid")}<text x="${round(x)}" y="${round(row.y + asset.physicalEnvelopeMm[1] + 20)}" fill="#23312c" font-family="Arial,sans-serif" font-size="10">${esc(asset.specificationId)} · ${asset.physicalEnvelopeMm[0]} × ${asset.physicalEnvelopeMm[1]} mm</text></g>`);
      x += asset.physicalEnvelopeMm[0] + 85;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 1840" data-review-mode="measurement-valid" data-review-source="embedded-manual-master" data-coordinate-unit="review-px" data-mm-to-px="${scale}" role="img" aria-labelledby="physical-title physical-desc"><title id="physical-title">Gold Master physical-scale comparison</title><desc id="physical-desc">Embedded manual masters use a shared ${scale} px per millimetre comparison scale. This is dimensional review evidence, not a certified engineering drawing.</desc><rect width="760" height="1840" fill="#f5f7f4"/><text x="20" y="45" fill="#23312c" font-family="Arial,sans-serif" font-size="14" font-weight="700">COMMON SCALE 1 px/mm</text>${markup.join("")}</svg>`;
}

function normalizedComparison(assets, masterSvgs) {
  const cells = assets.map((asset, index) => {
    const x = 30 + (index % 4) * 120;
    const y = 100 + Math.floor(index / 4) * 350;
    const scale = Math.min(100 / asset.physicalEnvelopeMm[0], 240 / asset.physicalEnvelopeMm[1]);
    return `<g data-review-family="${asset.familyId}">${embeddedMaster(masterSvgs.get(asset.specificationId), asset, x, y, scale, "visual-only")}<text x="${x}" y="${y + 265}" fill="#eef4f1" font-family="Arial,sans-serif" font-size="9">${esc(asset.specificationId)}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 820" data-review-mode="visual-only" data-review-source="embedded-manual-master" data-coordinate-unit="review-px" role="img" aria-labelledby="normalized-title normalized-desc"><title id="normalized-title">Gold Master normalized-shape comparison</title><desc id="normalized-desc">Visual-only comparison with changed geometry parameters normalized for shape comparison; it must not supply quantitative readings.</desc><rect width="500" height="820" fill="#26332e"/><text x="20" y="25" fill="#eef4f1" font-family="Arial,sans-serif" font-size="13" font-weight="700">CHEMREALM GOLD MASTER · NORMALIZED SHAPE</text>${cells}<text x="20" y="805" fill="#b9c9c0" font-family="Arial,sans-serif" font-size="8">Not measurement evidence. Use the physical-scale sheet for common millimetre scale.</text></svg>`;
}

const masterSvgs = new Map();
for (const asset of specifications) masterSvgs.set(asset.specificationId, await readMaster(asset));

await mkdir(join(outputRoot, "states"), { recursive: true });
await mkdir(join(outputRoot, "fixture"), { recursive: true });
await mkdir(join(outputRoot, "qa"), { recursive: true });
for (const asset of specifications) {
  const assetRoot = join(outputRoot, asset.specificationId);
  await mkdir(assetRoot, { recursive: true });
  for (const lod of lods) await writeFile(join(assetRoot, `${lod}.svg`), cleanSvg(compileLod(masterSvgs.get(asset.specificationId), asset, lod)) + "\n", "utf8");
}

const stateVariants = [
  { id: "empty", visibleLayers: ["apparatus-body", "rim-or-mouth", "contact-surface"], description: "Clean geometry with no runtime quantity baked into the asset." },
  { id: "filled", visibleLayers: ["apparatus-body", "rim-or-mouth", "marking-when-present", "contact-surface", "liquid", "meniscus"], description: "State-derived liquid and meniscus overlays supplied by Observable/RenderState." },
  { id: "connected", visibleLayers: ["apparatus-body", "connection-port", "detachable", "connection-highlight"], description: "Semantic detachable connection state; scene composition owns visible clamps." },
];
const stateManifest = { schemaVersion: packageSchemaVersion, source: "RenderState apparatus state contract", variants: stateVariants, assets: specifications.map((asset) => ({ assetId: asset.specificationId, supportedVariants: asset.familyId === "burette" ? ["empty", "filled", "connected"] : ["empty", "filled"] })) };
const manifest = {
  schemaVersion: packageSchemaVersion,
  status: "gold-master-candidate",
  sourceOfTruth: "packages/render/src/assets/gold-master-construction.json",
  assetVersionSource: "contracts/version-manifest.json#representation.apparatusAsset",
  catalogVersionSource: "contracts/version-manifest.json#representation.apparatusCatalog",
  visualFamily: source.visualFamily,
  coordinateUnit: "mm",
  viewMode: "manual-master-compilation",
  lods,
  backgrounds: ["dark-neutral", "light-neutral"],
  statePackage: { manifest: "states/manifest.json", variants: stateVariants.map((item) => item.id), source: "RenderState apparatus state contract" },
  deterministicFixture: "fixture/render-fixture.json",
  backgroundQaStatus: "candidate-package-only; owner capture review pending",
  comparisonSheets: ["qa/comparison-sheet-physical-scale.svg", "qa/comparison-sheet-normalized-shape.svg"],
  assets: specifications.map((asset) => ({ assetId: asset.specificationId, specificationId: asset.specificationId, assetStatus: "candidate", familyId: asset.familyId, capacityMl: asset.capacityMl, bodyDimensionsMm: asset.bodyEnvelopeMm, dimensionsMm: asset.physicalEnvelopeMm, materialProfile: asset.materialProfile, anatomy: asset.anatomy, landmarksMm: asset.landmarksMm, identityLayers: asset.identityLayers, marking: asset.marking, lodVisibility: asset.lodVisibility, provenanceRefs: asset.provenance.map((item) => item.sourceId), lodFiles: { master: "master.svg", scene: "scene.svg", preview: "preview.svg", thumbnail: "thumbnail.svg" } })),
};
const deterministicFixture = { schemaVersion: packageSchemaVersion, fixtureId: "m6-gold-master-static-review", renderMode: "asset-package-review", source: manifest.sourceOfTruth, assetIds: specifications.map((asset) => asset.specificationId), backgrounds: manifest.backgrounds, lods, stateManifest: "states/manifest.json", reviewSheets: manifest.comparisonSheets };
const sourceRecord = `# Gold Master Candidate source record

This package is a bounded **Gold Master Candidate**, not an owner-approved Gold Master. The manual masters under <code>assets/apparatus/masters/</code> are the sole visual source. This compiler validates them, filters named layers for approved LODs, and writes review packages; it does not draw apparatus silhouettes or measurement scales.

The construction record supplies instrument identity, dimensions, marking semantics, anatomy, and provenance. A marking's range/direction/calibration is authoritative data; no capacity-derived generic ladder is permitted.

## Review boundary

Contract Audit, Instrument Audit, Render Geometry Audit and owner Art Direction Review are separate gates. Structural output, hashes, and path counts cannot substitute for visual review. Dark/light and full/thumbnail captures remain pending owner review.
`;
const qaReadme = `# Gold Master Candidate QA

Regenerate with <code>node tools/create_gold_master_assets.mjs</code>. The compiler is deterministic and local-only. It reads the central instrument source and manual masters; it does not generate vessel geometry.

Review every first-wave master at full-size and thumbnail scale on dark-neutral and light-neutral backgrounds. Check the source record, marking direction/range, physical comparison sheet, and profile identity separately. Path count and file size are diagnostics only.
`;
const license = "# Asset license\n\nOriginal ChemRealm Gold Master Candidate vector construction, manifests, comparison sheets and QA records are distributed under PolyForm Noncommercial 1.0.0, subject to the repository license and third-party notices. External sources are cited for research and structural anchors only; no third-party artwork, photograph, texture, font or brand mark is redistributed.\n";

await writeFile(join(outputRoot, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
await writeFile(join(outputRoot, "source-record.md"), sourceRecord, "utf8");
await writeFile(join(outputRoot, "license.md"), license, "utf8");
await writeFile(join(outputRoot, "qa", "README.md"), qaReadme, "utf8");
await writeFile(join(outputRoot, "states", "manifest.json"), JSON.stringify(stateManifest, null, 2) + "\n", "utf8");
await writeFile(join(outputRoot, "fixture", "render-fixture.json"), JSON.stringify(deterministicFixture, null, 2) + "\n", "utf8");
await writeFile(join(outputRoot, "qa", "comparison-sheet-physical-scale.svg"), cleanSvg(physicalComparison(specifications, masterSvgs)) + "\n", "utf8");
await writeFile(join(outputRoot, "qa", "comparison-sheet-normalized-shape.svg"), cleanSvg(normalizedComparison(specifications, masterSvgs)) + "\n", "utf8");
console.log(`Compiled ${specifications.length} manual Gold Master assets × ${lods.length} LODs from ${sourcePath}`);
