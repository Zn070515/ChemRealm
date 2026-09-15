import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const outputRoot = join(process.cwd(), "assets", "apparatus", "catalog", "gold-master");
const lods = ["master", "scene", "preview", "thumbnail"];
const lodDetail = { master: "full", scene: "scene", preview: "catalog", thumbnail: "identity" };

const entries = [
  {
    assetId: "burette-acid-25ml-class-as", familyId: "burette", capacityMl: 25, dimensionsMm: [30, 820, 30],
    title: "Acid burette, 25 mL, rotary-valve family", actuatorKind: "rotary-valve", materialProfile: "burette-glass-ptfe", template: "burette-acid",
    anatomy: ["graduated-tube", "open-mouth", "rim", "ptfe-stopcock-body", "rotary-key", "outlet-tip", "support-interface", "detachable-actuator"],
    landmarksMm: { mouthOuterDiameter: 16, tubeOuterDiameter: 15, graduatedLength: 720, stopcockCenterFromBottom: 52, tipLength: 48, supportInterfaceHeight: 12 },
    identityLayers: ["body", "glass-back", "glass-front", "rim", "graduation", "stopcock", "stopcock-key", "tip", "support-interface", "highlight", "detachable"],
    provenanceRefs: ["duran-burette-25ml-class-as", "duran-burette-ptfe-stopcock", "jy-t-0655-2025", "chemrealm-visual-proportion-anchor"],
  },
  {
    assetId: "burette-alkali-50ml-class-b", familyId: "burette", capacityMl: 50, dimensionsMm: [36, 900, 36],
    title: "Alkali burette, 50 mL, pinch-valve family", actuatorKind: "pinch-valve", materialProfile: "burette-glass-rubber", template: "burette-alkali",
    anatomy: ["graduated-tube", "open-mouth", "rim", "lower-glass-connector", "rubber-delivery-tube", "glass-bead", "pinch-region", "outlet-tip", "support-interface", "detachable-actuator"],
    landmarksMm: { mouthOuterDiameter: 18, tubeOuterDiameter: 18, graduatedLength: 790, connectorCenterFromBottom: 60, tipLength: 56, supportInterfaceHeight: 12 },
    identityLayers: ["body", "glass-back", "glass-front", "rim", "graduation", "lower-connector", "rubber-tube", "glass-bead", "pinch-region", "tip", "support-interface", "highlight", "detachable"],
    provenanceRefs: ["jy-t-0655-2025", "chemrealm-visual-proportion-anchor"],
  },
  {
    assetId: "beaker-100ml", familyId: "beaker", capacityMl: 100, dimensionsMm: [52, 72, 52], title: "Beaker, 100 mL",
    materialProfile: "open-borosilicate-vessel", template: "beaker",
    anatomy: ["straight-wall-body", "open-rim", "integrated-pour-spout", "interior-cavity", "graduation-marks", "flat-contact-foot"],
    landmarksMm: { mouthOuterDiameter: 52, wallHeight: 64, rimThickness: 2.4, spoutMaxProjection: 11, flatBaseWidth: 48, graduationStartHeight: 20 },
    identityLayers: ["body", "glass-back", "glass-front", "rim", "spout", "graduation", "contact-base", "highlight"],
    provenanceRefs: ["jy-t-0655-2025", "chemrealm-visual-proportion-anchor"],
  },
  {
    assetId: "beaker-250ml", familyId: "beaker", capacityMl: 250, dimensionsMm: [70, 95, 70], title: "Beaker, 250 mL",
    materialProfile: "open-borosilicate-vessel", template: "beaker",
    anatomy: ["straight-wall-body", "open-rim", "integrated-pour-spout", "interior-cavity", "graduation-marks", "flat-contact-foot"],
    landmarksMm: { mouthOuterDiameter: 70, wallHeight: 85, rimThickness: 2.6, spoutMaxProjection: 15, flatBaseWidth: 65, graduationStartHeight: 26 },
    identityLayers: ["body", "glass-back", "glass-front", "rim", "spout", "graduation", "contact-base", "highlight"],
    provenanceRefs: ["jy-t-0655-2025", "chemrealm-visual-proportion-anchor"],
  },
  {
    assetId: "beaker-1000ml", familyId: "beaker", capacityMl: 1000, dimensionsMm: [112, 165, 112], title: "Beaker, 1000 mL",
    materialProfile: "open-borosilicate-vessel", template: "beaker",
    anatomy: ["straight-wall-body", "open-rim", "integrated-pour-spout", "interior-cavity", "graduation-marks", "flat-contact-foot"],
    landmarksMm: { mouthOuterDiameter: 112, wallHeight: 150, rimThickness: 3.2, spoutMaxProjection: 24, flatBaseWidth: 104, graduationStartHeight: 44 },
    identityLayers: ["body", "glass-back", "glass-front", "rim", "spout", "graduation", "contact-base", "highlight"],
    provenanceRefs: ["jy-t-0655-2025", "chemrealm-visual-proportion-anchor"],
  },
  {
    assetId: "conical-flask-100ml", familyId: "conical-flask", capacityMl: 100, dimensionsMm: [62, 105, 62], title: "Erlenmeyer flask, 100 mL",
    materialProfile: "curved-borosilicate-vessel", template: "flask",
    anatomy: ["flat-contact-foot", "curved-conical-body", "shoulder-transition", "cylindrical-neck", "open-mouth-rim", "interior-cavity"],
    landmarksMm: { mouthOuterDiameter: 22, neckOuterDiameter: 18, neckLength: 34, shoulderTransitionHeight: 22, maxBodyDiameter: 54, bottomCornerRadius: 8, flatBaseWidth: 48 },
    identityLayers: ["body", "shoulder", "neck", "rim", "contact-base", "glass-back", "glass-front", "highlight"],
    provenanceRefs: ["jy-t-0655-2025", "chemrealm-visual-proportion-anchor"],
  },
  {
    assetId: "conical-flask-250ml", familyId: "conical-flask", capacityMl: 250, dimensionsMm: [85, 145, 85], title: "Erlenmeyer flask, 250 mL",
    materialProfile: "curved-borosilicate-vessel", template: "flask",
    anatomy: ["flat-contact-foot", "curved-conical-body", "shoulder-transition", "cylindrical-neck", "open-mouth-rim", "interior-cavity"],
    landmarksMm: { mouthOuterDiameter: 28, neckOuterDiameter: 23, neckLength: 48, shoulderTransitionHeight: 30, maxBodyDiameter: 74, bottomCornerRadius: 10, flatBaseWidth: 65 },
    identityLayers: ["body", "shoulder", "neck", "rim", "contact-base", "glass-back", "glass-front", "highlight"],
    provenanceRefs: ["duran-erlenmeyer-250ml", "jy-t-0655-2025", "chemrealm-visual-proportion-anchor"],
  },
  {
    assetId: "conical-flask-500ml", familyId: "conical-flask", capacityMl: 500, dimensionsMm: [102, 186, 102], title: "Erlenmeyer flask, 500 mL",
    materialProfile: "curved-borosilicate-vessel", template: "flask",
    anatomy: ["flat-contact-foot", "curved-conical-body", "shoulder-transition", "cylindrical-neck", "open-mouth-rim", "interior-cavity"],
    landmarksMm: { mouthOuterDiameter: 34, neckOuterDiameter: 28, neckLength: 62, shoulderTransitionHeight: 38, maxBodyDiameter: 88, bottomCornerRadius: 12, flatBaseWidth: 78 },
    identityLayers: ["body", "shoulder", "neck", "rim", "contact-base", "glass-back", "glass-front", "highlight"],
    provenanceRefs: ["jy-t-0655-2025", "chemrealm-visual-proportion-anchor"],
  },
];

const materialProfiles = {
  "burette-glass-ptfe": { glass: ["#8ebbc2", ".14", "#f7ffff", ".36", "#b9e0e2", ".10", "#6f9ba2", ".18"], edge: "#527f86" },
  "burette-glass-rubber": { glass: ["#9bc5c8", ".12", "#faffff", ".34", "#c8e6e6", ".09", "#71969a", ".16"], edge: "#5d8589" },
  "open-borosilicate-vessel": { glass: ["#a9cbd0", ".10", "#ffffff", ".28", "#d5ebec", ".08", "#72969a", ".14"], edge: "#70979b" },
  "curved-borosilicate-vessel": { glass: ["#a7c5cd", ".12", "#ffffff", ".31", "#d2e9eb", ".10", "#628b94", ".17"], edge: "#638b93" },
};

const n = (value) => Number(value.toFixed(2));
const escapeXml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const layer = (name, content, attributes = "") => "<g data-layer=\"" + name + "\"" + (attributes ? " " + attributes : "") + ">" + content + "</g>";
const emptyRuntimeLayer = (name, description) => layer(name, "<desc>" + description + "; supplied by RenderState at runtime.</desc>", "data-runtime=\"true\" opacity=\"0\"");
const shadow = (cx, cy, rx, ry, prefix, opacity = ".13") => "<ellipse cx=\"" + n(cx) + "\" cy=\"" + n(cy) + "\" rx=\"" + n(rx) + "\" ry=\"" + n(ry) + "\" fill=\"#203137\" opacity=\"" + opacity + "\" filter=\"url(#" + prefix + "-shadow)\"/>";

const commonDefs = (prefix, materialProfile) => {
  const profile = materialProfiles[materialProfile];
  const glass = profile.glass;
  return [
    "<defs>",
    "<linearGradient id=\"" + prefix + "-glass\" x1=\"0\" x2=\"1\" y1=\"0\" y2=\"0\"><stop offset=\"0\" stop-color=\"" + glass[0] + "\" stop-opacity=\"" + glass[1] + "\"/><stop offset=\".14\" stop-color=\"" + glass[2] + "\" stop-opacity=\"" + glass[3] + "\"/><stop offset=\".42\" stop-color=\"" + glass[4] + "\" stop-opacity=\"" + glass[5] + "\"/><stop offset=\"1\" stop-color=\"" + glass[6] + "\" stop-opacity=\"" + glass[7] + "\"/></linearGradient>",
    "<linearGradient id=\"" + prefix + "-edge\" x1=\"0\" x2=\"1\"><stop offset=\"0\" stop-color=\"" + profile.edge + "\" stop-opacity=\".34\"/><stop offset=\".5\" stop-color=\"#d9eff0\" stop-opacity=\".62\"/><stop offset=\"1\" stop-color=\"" + profile.edge + "\" stop-opacity=\".30\"/></linearGradient>",
    "<linearGradient id=\"" + prefix + "-ptfe\" x1=\"0\" x2=\"1\"><stop offset=\"0\" stop-color=\"#d5d8d3\"/><stop offset=\".42\" stop-color=\"#f5f4ea\"/><stop offset=\"1\" stop-color=\"#9da49d\"/></linearGradient>",
    "<linearGradient id=\"" + prefix + "-rubber\" x1=\"0\" x2=\"1\"><stop offset=\"0\" stop-color=\"#3d4a4a\"/><stop offset=\".5\" stop-color=\"#8a9890\"/><stop offset=\"1\" stop-color=\"#253131\"/></linearGradient>",
    "<filter id=\"" + prefix + "-shadow\" x=\"-30%\" y=\"-40%\" width=\"160%\" height=\"190%\"><feGaussianBlur stdDeviation=\"5\"/></filter>",
    "<style>.glass-fill{fill:url(#" + prefix + "-glass)}.glass-edge{fill:none;stroke:url(#" + prefix + "-edge);stroke-linecap:round;stroke-linejoin:round}.detail{stroke:#49686d;stroke-linecap:round;stroke-linejoin:round;fill:none}.highlight{stroke:#f7ffff;stroke-linecap:round;stroke-linejoin:round;fill:none}.ptfe-fill{fill:url(#" + prefix + "-ptfe)}.rubber-fill{fill:url(#" + prefix + "-rubber)}</style>",
    "</defs>",
  ].join("");
};

const tickLines = ({ x, y, length, height, count, majorEvery, strokeWidth, lod }) => {
  const lines = [];
  for (let index = 0; index <= count; index += 1) {
    const major = index % majorEvery === 0;
    const medium = index % Math.max(1, Math.floor(majorEvery / 2)) === 0;
    if (lod === "thumbnail" && !major) continue;
    if (lod === "preview" && !major && !medium) continue;
    const tickLength = major ? length : medium ? length * .68 : length * .42;
    const tickStroke = major ? strokeWidth : medium ? strokeWidth * .78 : strokeWidth * .58;
    const yy = y + height * index / count;
    lines.push("<path d=\"M" + n(x) + " " + n(yy) + "h" + n(tickLength) + "\" class=\"detail\" stroke-width=\"" + n(tickStroke) + "\"/>");
  }
  return lines.join("");
};

const graduationLabels = ({ x, y, height, count, capacityMl, lod }) => {
  if (lod === "thumbnail") return "";
  const labels = [];
  const majorEvery = 10;
  for (let index = 0; index <= count; index += majorEvery) {
    const yy = y + height * index / count;
    const value = capacityMl * index / count;
    labels.push("<text x=\"" + n(x) + "\" y=\"" + n(yy + 3) + "\" fill=\"#49686d\" font-family=\"Arial, sans-serif\" font-size=\"" + (lod === "master" ? "9" : "7") + "\">" + value.toFixed(0) + "</text>");
  }
  return labels.join("");
};

const constructionDetails = (lod, x, y, width, height) => {
  const count = { master: 4, scene: 2, preview: 1, thumbnail: 0 }[lod];
  const paths = [];
  for (let index = 0; index < count; index += 1) {
    const yy = y + height * (index + 1) / (count + 1);
    paths.push("<path d=\"M" + n(x + index * 3) + " " + n(yy) + "h" + n(width - index * 6) + "\" class=\"glass-edge\" stroke-width=\"" + (lod === "master" ? "1.4" : "1") + "\" opacity=\".34\"/>");
  }
  return paths.join("");
};

const svgDocument = ({ asset, lod, viewBox, content }) => {
  const titleId = asset.assetId + "-" + lod + "-title";
  const descId = asset.assetId + "-" + lod + "-desc";
  return [
    "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"" + viewBox.join(" ") + "\" data-asset-id=\"" + asset.assetId + "\" data-specification-id=\"" + asset.assetId + "\" data-family-id=\"" + asset.familyId + "\" data-capacity-ml=\"" + asset.capacityMl + "\" data-dimensions-mm=\"" + asset.dimensionsMm.join(" ") + "\" data-material-profile=\"" + asset.materialProfile + "\"" + (asset.actuatorKind ? " data-actuator-kind=\"" + asset.actuatorKind + "\"" : "") + " data-lod=\"" + lod + "\" data-lod-detail=\"" + lodDetail[lod] + "\" data-coordinate-unit=\"mm\" data-visual-role=\"apparatus-geometry\" data-view-mode=\"" + (lod === "master" ? "construction" : lod === "scene" ? "experiment-world" : "catalog-preview") + "\" data-measurement-qualified=\"false\" data-anatomy=\"" + escapeXml(asset.anatomy.join("|")) + "\" role=\"img\" aria-labelledby=\"" + titleId + " " + descId + "\">",
    "<title id=\"" + titleId + "\">" + escapeXml(asset.title) + " — " + lod + " construction</title>",
    "<desc id=\"" + descId + "\">Original ChemRealm apparatus geometry. This " + lod + " LOD preserves family anatomy and contains no runtime reading, liquid quantity or chemical colour.</desc>",
    commonDefs(asset.assetId, asset.materialProfile),
    content,
    "</svg>",
  ].join("\n").trimStart();
};

const buretteSvg = (asset, lod, acid) => {
  const compact = lod === "thumbnail";
  const height = acid ? 760 : 830;
  const bodyWidth = acid ? 36 : 42;
  const x = 144;
  const top = 52;
  const bodyBottom = top + height;
  const valveY = bodyBottom + 10;
  const tipBottom = valveY + (acid ? 132 : 148);
  const prefix = asset.assetId;
  const ticks = tickLines({ x: x + bodyWidth + 10, y: top + 26, length: compact ? 20 : 42, height: height - 52, count: 50, majorEvery: 10, strokeWidth: compact ? 2.8 : 3.4, lod });
  const labels = graduationLabels({ x: x + bodyWidth + 57, y: top + 26, height: height - 52, count: 50, capacityMl: asset.capacityMl, lod });
  const bodyPath = ["M", n(x + 2), n(top + 10), "Q", n(x + 2), n(top), n(x + 11), n(top), "H", n(x + bodyWidth - 11), "Q", n(x + bodyWidth - 2), n(top), n(x + bodyWidth - 2), n(top + 10), "V", n(bodyBottom - 34), "C", n(x + bodyWidth - 2), n(bodyBottom - 18), n(x + bodyWidth - 7), n(bodyBottom - 8), n(x + bodyWidth / 2), n(bodyBottom - 2), "C", n(x + 7), n(bodyBottom - 8), n(x + 2), n(bodyBottom - 18), n(x + 2), n(bodyBottom - 34), "Z"].join(" ");
  const rim = [
    "<ellipse cx=\"" + n(x + bodyWidth / 2) + "\" cy=\"" + top + "\" rx=\"" + n(bodyWidth / 2 + 3) + "\" ry=\"" + (compact ? "5" : "7") + "\" fill=\"#dceff0\" fill-opacity=\".36\" stroke=\"#6e9ba0\" stroke-width=\"" + (compact ? "1.8" : "2.4") + "\"/>",
    "<ellipse cx=\"" + n(x + bodyWidth / 2) + "\" cy=\"" + top + "\" rx=\"" + n(bodyWidth / 2 - 3) + "\" ry=\"" + (compact ? "2.2" : "3.5") + "\" fill=\"#ffffff\" fill-opacity=\".20\"/>",
    "<path d=\"M" + n(x - 3) + " " + n(top - 1) + "h" + n(bodyWidth + 6) + "\" class=\"glass-edge\" stroke-width=\"" + (compact ? "1.4" : "2") + "\"/>",
  ].join("");
  const back = "<path d=\"M" + n(x + 5) + " " + n(top + 24) + "v" + n(height - 66) + "\" class=\"glass-edge\" stroke-width=\"" + (compact ? "1.7" : "2.4") + "\" opacity=\".7\"/><path d=\"M" + n(x + bodyWidth - 5) + " " + n(top + 24) + "v" + n(height - 66) + "\" class=\"glass-edge\" stroke-width=\"" + (compact ? "1.3" : "1.8") + "\" opacity=\".42\"/>";
  const front = "<path d=\"M" + n(x + 9) + " " + n(top + 20) + "v" + n(height - 76) + "\" class=\"highlight\" stroke-width=\"" + (compact ? "2.4" : "4.2") + "\" opacity=\".42\"/><path d=\"M" + n(x + bodyWidth - 9) + " " + n(top + 36) + "v" + n(height - 94) + "\" class=\"highlight\" stroke-width=\"" + (compact ? "1.2" : "2") + "\" opacity=\".24\"/>";
  const tip = "<path d=\"M" + n(x + bodyWidth / 2) + " " + n(valveY + 23) + "v" + (acid ? "70" : "82") + "\" class=\"glass-edge\" stroke-width=\"" + (compact ? "4.5" : "7") + "\"/><path d=\"M" + n(x + bodyWidth / 2 + 2) + " " + n(valveY + 31) + "v" + (acid ? "58" : "70") + "\" class=\"highlight\" stroke-width=\"" + (compact ? "1.4" : "2.2") + "\" opacity=\".46\"/><path d=\"M" + n(x + bodyWidth / 2 - 7) + " " + n(tipBottom - 20) + "h14l-4 20h-6z\" class=\"glass-fill\"/><path d=\"M" + n(x + bodyWidth / 2 - 7) + " " + n(tipBottom - 20) + "h14\" class=\"glass-edge\" stroke-width=\"" + (compact ? "1.5" : "2.4") + "\"/>";
  const actuator = acid
    ? "<path d=\"M" + n(x - 14) + " " + n(valveY) + "h" + n(bodyWidth + 28) + "q5 0 5 5v18q0 5-5 5h-" + n(bodyWidth + 28) + "q-5 0-5-5v-18q0-5 5-5z\" class=\"ptfe-fill\"/><path d=\"M" + n(x - 14) + " " + n(valveY) + "h" + n(bodyWidth + 28) + "q5 0 5 5v18q0 5-5 5h-" + n(bodyWidth + 28) + "\" class=\"detail\" stroke-width=\"" + (compact ? "1.6" : "2.4") + "\"/><circle cx=\"" + n(x + bodyWidth / 2) + "\" cy=\"" + n(valveY + 14) + "\" r=\"" + (compact ? "7" : "10") + "\" fill=\"#eceee7\" class=\"detail\" stroke-width=\"1.8\"/>"
    : "<path d=\"M" + n(x + bodyWidth / 2 - 8) + " " + n(valveY - 4) + "v" + (compact ? "38" : "54") + "\" class=\"rubber-fill\" stroke=\"#5a6966\" stroke-width=\"" + (compact ? "8" : "12") + "\"/><path d=\"M" + n(x + bodyWidth / 2 - 8) + " " + n(valveY + (compact ? 16 : 23)) + "q16 -12 29 0\" class=\"rubber-fill\" stroke=\"#536360\" stroke-width=\"" + (compact ? "8" : "12") + "\" fill=\"none\"/><circle cx=\"" + n(x + bodyWidth / 2 + 4) + "\" cy=\"" + n(valveY + (compact ? 16 : 23)) + "\" r=\"" + (compact ? "9" : "13") + "\" fill=\"#c2d0ca\" class=\"detail\" stroke-width=\"1.8\"/><path d=\"M" + n(x + bodyWidth / 2 + 14) + " " + n(valveY + (compact ? 16 : 23)) + "h" + (compact ? "25" : "38") + "\" class=\"rubber-fill\" stroke=\"#536360\" stroke-width=\"" + (compact ? "7" : "10") + "\"/>";
  const support = "<path d=\"M" + n(x - 6) + " " + n(top + 22) + "h" + n(bodyWidth + 12) + "\" class=\"detail\" stroke-width=\"" + (compact ? "2" : "3") + "\" opacity=\".58\"/><path d=\"M" + n(x - 1) + " " + n(top + 24) + "v18h" + n(bodyWidth + 2) + "v-18\" class=\"glass-edge\" stroke-width=\"" + (compact ? "1.5" : "2.2") + "\" opacity=\".52\"/>";
  const key = acid
    ? "<path d=\"M" + n(x + bodyWidth / 2) + " " + n(valveY + 14) + "l" + (compact ? "17 -7" : "26 -10") + "\" class=\"detail\" stroke=\"#54645f\" stroke-width=\"" + (compact ? "3.2" : "4.8") + "\"/><path d=\"M" + n(x + bodyWidth / 2 + (compact ? 15 : 23)) + " " + n(valveY + (compact ? 7 : 4)) + "h" + (compact ? "9" : "13") + "\" class=\"ptfe-fill\" stroke=\"#64736c\" stroke-width=\"1.5\"/>"
    : "<path d=\"M" + n(x + bodyWidth / 2 - 20) + " " + n(valveY + 5) + "h" + (compact ? "10" : "15") + "v" + (compact ? "30" : "44") + "h-" + (compact ? "10" : "15") + "\" class=\"detail\" stroke-width=\"" + (compact ? "2.6" : "4") + "\" opacity=\".8\"/>";
  const details = constructionDetails(lod, x - 2, top + 44, bodyWidth + 4, height - 100);
  const contents = [
    lod === "master" ? "" : layer("shadow", shadow(x + bodyWidth / 2, tipBottom + 24, 66, compact ? 7 : 11, prefix)),
    layer("body", "<path d=\"" + bodyPath + "\" class=\"glass-fill\"/>", "data-part=\"burette.body\""),
    layer("glass-back", back, "data-part=\"burette.body\""), emptyRuntimeLayer("liquid", "Liquid column"), emptyRuntimeLayer("meniscus", "Meniscus"),
    layer("rim", rim, "data-part=\"burette.rim\""), layer("graduation", ticks + labels, "data-part=\"burette.scale\""),
    acid ? layer("stopcock", actuator, "data-part=\"burette.ptfe-stopcock\"") : layer("lower-connector", "<path d=\"M" + n(x + bodyWidth / 2 - 7) + " " + n(valveY - 2) + "h14v18h-14z\" class=\"glass-fill\"/><path d=\"M" + n(x + bodyWidth / 2 - 7) + " " + n(valveY - 2) + "h14\" class=\"glass-edge\" stroke-width=\"2\"/>", "data-part=\"burette.lower-connector\""),
    acid ? layer("stopcock-key", key, "data-part=\"burette.rotary-key\"") : layer("rubber-tube", actuator, "data-part=\"burette.rubber-delivery\""),
    acid ? "" : layer("glass-bead", "<circle cx=\"" + n(x + bodyWidth / 2 + 4) + "\" cy=\"" + n(valveY + 16) + "\" r=\"" + (compact ? "8" : "12") + "\" fill=\"#c2d0ca\" class=\"detail\" stroke-width=\"1.6\"/>", "data-part=\"burette.glass-bead\""),
    acid ? "" : layer("pinch-region", key, "data-part=\"burette.pinch\""),
    layer("tip", tip, "data-part=\"burette.outlet-tip\""), layer("support-interface", support, "data-part=\"burette.support-interface\""),
    layer("glass-front", front, "data-part=\"burette.body\""), layer("highlight", "<path d=\"M" + n(x + bodyWidth - 6) + " " + n(top + 46) + "v" + n(height - 116) + "\" class=\"highlight\" stroke-width=\"" + (compact ? "1.2" : "2") + "\" opacity=\".22\"/>"),
    layer("detachable", "<circle cx=\"" + n(x + bodyWidth / 2) + "\" cy=\"" + n(valveY + 14) + "\" r=\"" + (compact ? "11" : "16") + "\" fill=\"none\" stroke=\"#77aeb0\" stroke-width=\"1.6\" stroke-dasharray=\"4 5\" opacity=\".76\"/>", "data-part=\"burette.actuator\""),
    details ? layer("construction-detail", details) : "",
  ].filter(Boolean).join("\n  ");
  return svgDocument({ asset, lod, viewBox: [42, 18, 270, tipBottom + 62], content: contents });
};

const beakerSvg = (asset, lod) => {
  const compact = lod === "thumbnail";
  const [width, height] = asset.dimensionsMm;
  const prefix = asset.assetId;
  const bodyTop = 62;
  const bodyBottom = bodyTop + height * 1.12;
  const bodyLeft = 94;
  const bodyRight = bodyLeft + width * 1.52;
  const bodyWidth = bodyRight - bodyLeft;
  const spoutTip = bodyRight + Math.min(42, width * .58);
  const tickCount = Math.max(4, Math.round(asset.capacityMl / 25));
  const ticks = tickLines({ x: bodyRight - (compact ? 20 : 38), y: bodyTop + 34, length: compact ? 14 : 30, height: Math.max(45, height * .72), count: tickCount, majorEvery: Math.max(1, Math.round(tickCount / 4)), strokeWidth: compact ? 2.3 : 3, lod });
  const bodyPath = ["M", n(bodyLeft), n(bodyTop + 4), "L", n(bodyLeft + 5), n(bodyBottom - 10), "Q", n(bodyLeft + 8), n(bodyBottom + 7), n(bodyLeft + 22), n(bodyBottom + 9), "H", n(bodyRight - 22), "Q", n(bodyRight - 8), n(bodyBottom + 7), n(bodyRight - 5), n(bodyBottom - 10), "L", n(bodyRight), n(bodyTop + 5), "C", n(bodyRight + 8), n(bodyTop + 5), n(bodyRight + 17), n(bodyTop + 10), n(spoutTip), n(bodyTop + 23), "C", n(bodyRight + 22), n(bodyTop + 28), n(bodyRight + 10), n(bodyTop + 34), n(bodyRight - 2), n(bodyTop + 24), "L", n(bodyRight - 8), n(bodyBottom - 10), "Q", n(bodyRight - 11), n(bodyBottom + 13), n(bodyRight - 25), n(bodyBottom + 13), "H", n(bodyLeft + 25), "Q", n(bodyLeft + 11), n(bodyBottom + 13), n(bodyLeft + 8), n(bodyBottom - 10), "L", n(bodyLeft), n(bodyTop + 4), "Z"].join(" ");
  const rim = "<path d=\"M" + n(bodyLeft - 2) + " " + n(bodyTop) + "C" + n(bodyLeft + bodyWidth * .28) + " " + n(bodyTop - 5) + " " + n(bodyRight - bodyWidth * .24) + " " + n(bodyTop - 5) + " " + n(bodyRight + 4) + " " + n(bodyTop) + "\" class=\"glass-edge\" stroke-width=\"" + (compact ? "1.8" : "2.8") + "\"/><path d=\"M" + n(bodyLeft + 3) + " " + n(bodyTop + 5) + "C" + n(bodyLeft + bodyWidth * .28) + " " + n(bodyTop + 1) + " " + n(bodyRight - bodyWidth * .24) + " " + n(bodyTop + 1) + " " + n(bodyRight - 2) + " " + n(bodyTop + 5) + "\" class=\"highlight\" stroke-width=\"" + (compact ? "1.4" : "2.2") + "\" opacity=\".46\"/>";
  const spout = "<path d=\"M" + n(bodyRight - 5) + " " + n(bodyTop + 6) + "C" + n(bodyRight + 7) + " " + n(bodyTop + 7) + " " + n(bodyRight + 20) + " " + n(bodyTop + 14) + " " + n(spoutTip) + " " + n(bodyTop + 23) + "\" class=\"glass-edge\" stroke-width=\"" + (compact ? "1.8" : "2.8") + "\"/><path d=\"M" + n(bodyRight - 7) + " " + n(bodyTop + 19) + "C" + n(bodyRight + 5) + " " + n(bodyTop + 25) + " " + n(bodyRight + 14) + " " + n(bodyTop + 27) + " " + n(bodyRight + 22) + " " + n(bodyTop + 25) + "\" class=\"highlight\" stroke-width=\"" + (compact ? "1.2" : "2") + "\" opacity=\".42\"/>";
  const base = "<path d=\"M" + n(bodyLeft + 10) + " " + n(bodyBottom + 10) + "H" + n(bodyRight - 10) + "\" class=\"glass-edge\" stroke-width=\"" + (compact ? "3.2" : "5") + "\" opacity=\".72\"/><path d=\"M" + n(bodyLeft + 18) + " " + n(bodyBottom + 15) + "H" + n(bodyRight - 18) + "\" class=\"highlight\" stroke-width=\"" + (compact ? "1.4" : "2.2") + "\" opacity=\".42\"/>";
  const back = "<path d=\"M" + n(bodyLeft + 7) + " " + n(bodyTop + 20) + "v" + n(bodyBottom - bodyTop - 29) + "\" class=\"glass-edge\" stroke-width=\"" + (compact ? "1.3" : "2") + "\" opacity=\".54\"/><path d=\"M" + n(bodyRight - 8) + " " + n(bodyTop + 24) + "v" + n(bodyBottom - bodyTop - 34) + "\" class=\"glass-edge\" stroke-width=\"" + (compact ? "1.2" : "1.8") + "\" opacity=\".42\"/>";
  const front = "<path d=\"M" + n(bodyLeft + 18) + " " + n(bodyTop + 26) + "v" + n(bodyBottom - bodyTop - 38) + "\" class=\"highlight\" stroke-width=\"" + (compact ? "2.2" : "3.8") + "\" opacity=\".34\"/><path d=\"M" + n(bodyRight - 20) + " " + n(bodyTop + 32) + "v" + n(bodyBottom - bodyTop - 46) + "\" class=\"highlight\" stroke-width=\"" + (compact ? "1.1" : "1.8") + "\" opacity=\".20\"/>";
  const details = constructionDetails(lod, bodyLeft + 10, bodyTop + 28, bodyWidth - 20, bodyBottom - bodyTop - 54);
  const contents = [
    lod === "master" ? "" : layer("shadow", shadow((bodyLeft + bodyRight) / 2, bodyBottom + 27, bodyWidth * .54, compact ? 8 : 13, prefix)),
    layer("body", "<path d=\"" + bodyPath + "\" class=\"glass-fill\"/>", "data-part=\"vessel.body\""), layer("glass-back", back, "data-part=\"vessel.body\""),
    emptyRuntimeLayer("liquid", "Liquid interior"), emptyRuntimeLayer("meniscus", "Meniscus"), layer("rim", rim, "data-part=\"vessel.rim\""),
    layer("spout", spout, "data-part=\"vessel.spout\" data-spout-root=\"rim-continuity\""), layer("graduation", ticks, "data-part=\"vessel.scale\""),
    layer("contact-base", base, "data-part=\"vessel.contact-foot\""), layer("glass-front", front, "data-part=\"vessel.body\""),
    layer("highlight", "<path d=\"M" + n(bodyLeft + 26) + " " + n(bodyTop + 40) + "v" + n(Math.max(35, height * .74)) + "\" class=\"highlight\" stroke-width=\"" + (compact ? "1.2" : "2") + "\" opacity=\".26\"/>"),
    details ? layer("construction-detail", details) : "",
    layer("accessibility", "<rect x=\"" + n(bodyLeft - 12) + "\" y=\"" + n(bodyTop - 17) + "\" width=\"" + n(bodyWidth + 62) + "\" height=\"" + n(bodyBottom - bodyTop + 40) + "\" fill=\"none\" stroke=\"#79c5c8\" stroke-width=\"2\" stroke-dasharray=\"8 8\" opacity=\"0\"/>"),
  ].filter(Boolean).join("\n  ");
  return svgDocument({ asset, lod, viewBox: [35, 12, 360, Math.max(250, height + 115)], content: contents });
};

const flaskSvg = (asset, lod) => {
  const compact = lod === "thumbnail";
  const [width, height] = asset.dimensionsMm;
  const prefix = asset.assetId;
  const neckWidth = Math.max(32, width * .40);
  const neckTop = 38;
  const bodyTop = neckTop + height * .38;
  const bodyBottom = bodyTop + height * .63;
  const center = 185;
  const bodyHalf = width * .86;
  const left = center - bodyHalf;
  const right = center + bodyHalf;
  const shoulderLeft = center - neckWidth / 2;
  const shoulderRight = center + neckWidth / 2;
  const bodyPath = ["M", n(shoulderLeft), n(bodyTop), "C", n(shoulderLeft - 4), n(bodyTop + 22), n(left + 26), n(bodyBottom - 48), n(left + 8), n(bodyBottom - 20), "C", n(left - 4), n(bodyBottom - 2), n(left), n(bodyBottom + 11), n(left + 18), n(bodyBottom + 14), "C", n(left + 56), n(bodyBottom + 20), n(right - 56), n(bodyBottom + 20), n(right - 18), n(bodyBottom + 14), "C", n(right), n(bodyBottom + 11), n(right + 4), n(bodyBottom - 2), n(right - 8), n(bodyBottom - 20), "C", n(right - 26), n(bodyBottom - 48), n(shoulderRight + 4), n(bodyTop + 22), n(shoulderRight), n(bodyTop), "Z"].join(" ");
  const neck = "<path d=\"M" + n(shoulderLeft) + " " + n(bodyTop + 2) + "V" + n(neckTop + 6) + "Q" + n(shoulderLeft) + " " + n(neckTop) + " " + n(shoulderLeft + 6) + " " + n(neckTop) + "H" + n(shoulderRight - 6) + "Q" + n(shoulderRight) + " " + n(neckTop) + " " + n(shoulderRight) + " " + n(neckTop + 6) + "V" + n(bodyTop + 2) + "\" class=\"glass-fill\"/><path d=\"M" + n(shoulderLeft) + " " + n(bodyTop + 2) + "V" + n(neckTop + 6) + "Q" + n(shoulderLeft) + " " + n(neckTop) + " " + n(shoulderLeft + 6) + " " + n(neckTop) + "H" + n(shoulderRight - 6) + "Q" + n(shoulderRight) + " " + n(neckTop) + " " + n(shoulderRight) + " " + n(neckTop + 6) + "V" + n(bodyTop + 2) + "\" class=\"glass-edge\" stroke-width=\"" + (compact ? "1.8" : "2.7") + "\"/>";
  const rim = "<ellipse cx=\"" + n(center) + "\" cy=\"" + n(neckTop) + "\" rx=\"" + n(neckWidth / 2 + 5) + "\" ry=\"" + (compact ? "5.5" : "8") + "\" fill=\"#dceff0\" fill-opacity=\".34\" stroke=\"#719ba0\" stroke-width=\"" + (compact ? "1.8" : "2.5") + "\"/><ellipse cx=\"" + n(center) + "\" cy=\"" + n(neckTop) + "\" rx=\"" + n(neckWidth / 2 - 1) + "\" ry=\"" + (compact ? "2.5" : "4.5") + "\" fill=\"#ffffff\" fill-opacity=\".18\"/>";
  const shoulder = "<path d=\"M" + n(shoulderLeft + 8) + " " + n(bodyTop + 13) + "C" + n(shoulderLeft - 2) + " " + n(bodyTop + 34) + " " + n(left + 28) + " " + n(bodyBottom - 44) + " " + n(left + 16) + " " + n(bodyBottom - 25) + "\" class=\"highlight\" stroke-width=\"" + (compact ? "1.4" : "2.4") + "\" opacity=\".28\"/><path d=\"M" + n(shoulderRight - 8) + " " + n(bodyTop + 13) + "C" + n(shoulderRight + 2) + " " + n(bodyTop + 34) + " " + n(right - 28) + " " + n(bodyBottom - 44) + " " + n(right - 16) + " " + n(bodyBottom - 25) + "\" class=\"glass-edge\" stroke-width=\"" + (compact ? "1.2" : "1.8") + "\" opacity=\".38\"/>";
  const back = "<path d=\"M" + n(left + 14) + " " + n(bodyBottom - 22) + "C" + n(left + 32) + " " + n(bodyBottom - 50) + " " + n(shoulderLeft - 1) + " " + n(bodyTop + 32) + " " + n(shoulderLeft + 2) + " " + n(bodyTop + 14) + "\" class=\"glass-edge\" stroke-width=\"" + (compact ? "1.5" : "2.2") + "\" opacity=\".58\"/><path d=\"M" + n(right - 14) + " " + n(bodyBottom - 22) + "C" + n(right - 32) + " " + n(bodyBottom - 50) + " " + n(shoulderRight + 1) + " " + n(bodyTop + 32) + " " + n(shoulderRight - 2) + " " + n(bodyTop + 14) + "\" class=\"glass-edge\" stroke-width=\"" + (compact ? "1.2" : "1.8") + "\" opacity=\".34\"/>";
  const front = "<path d=\"M" + n(left + 30) + " " + n(bodyBottom - 26) + "C" + n(left + 52) + " " + n(bodyBottom - 46) + " " + n(center - 12) + " " + n(bodyTop + 68) + " " + n(center - 8) + " " + n(bodyTop + 34) + "\" class=\"highlight\" stroke-width=\"" + (compact ? "1.8" : "3.2") + "\" opacity=\".25\"/>";
  const base = "<path d=\"M" + n(left + 18) + " " + n(bodyBottom + 14) + "C" + n(left + 45) + " " + n(bodyBottom + 20) + " " + n(right - 45) + " " + n(bodyBottom + 20) + " " + n(right - 18) + " " + n(bodyBottom + 14) + "\" class=\"glass-edge\" stroke-width=\"" + (compact ? "4" : "6") + "\" opacity=\".68\"/><path d=\"M" + n(left + 32) + " " + n(bodyBottom + 19) + "H" + n(right - 32) + "\" class=\"highlight\" stroke-width=\"" + (compact ? "1.3" : "2.1") + "\" opacity=\".38\"/>";
  const details = constructionDetails(lod, left + 18, bodyTop + 38, right - left - 36, bodyBottom - bodyTop - 60);
  const contents = [
    lod === "master" ? "" : layer("shadow", shadow(center, bodyBottom + 30, bodyHalf * .78, compact ? 9 : 15, prefix)),
    layer("body", "<path d=\"" + bodyPath + "\" class=\"glass-fill\"/>", "data-part=\"vessel.body\""), layer("glass-back", back, "data-part=\"vessel.body\""),
    layer("shoulder", shoulder, "data-part=\"vessel.shoulder\""), layer("neck", neck, "data-part=\"vessel.neck\""), layer("rim", rim, "data-part=\"vessel.rim\""),
    emptyRuntimeLayer("liquid", "Liquid interior"), emptyRuntimeLayer("meniscus", "Meniscus"), layer("contact-base", base, "data-part=\"vessel.contact-foot\""),
    layer("glass-front", front, "data-part=\"vessel.body\""), layer("highlight", "<path d=\"M" + n(center - 10) + " " + n(bodyTop + 52) + "C" + n(center - 28) + " " + n(bodyTop + 82) + " " + n(center - 44) + " " + n(bodyBottom - 48) + " " + n(center - 53) + " " + n(bodyBottom - 30) + "\" class=\"highlight\" stroke-width=\"" + (compact ? "1.1" : "1.8") + "\" opacity=\".20\"/>"),
    details ? layer("construction-detail", details) : "",
    layer("accessibility", "<rect x=\"" + n(left - 15) + "\" y=\"" + n(neckTop - 18) + "\" width=\"" + n(right - left + 30) + "\" height=\"" + n(bodyBottom - neckTop + 45) + "\" fill=\"none\" stroke=\"#79c5c8\" stroke-width=\"2\" stroke-dasharray=\"8 8\" opacity=\"0\"/>"),
  ].filter(Boolean).join("\n  ");
  return svgDocument({ asset, lod, viewBox: [28, 12, 390, Math.max(270, height + 118)], content: contents });
};

const renderAsset = (asset, lod) => asset.template === "burette-acid"
  ? buretteSvg(asset, lod, true)
  : asset.template === "burette-alkali"
    ? buretteSvg(asset, lod, false)
    : asset.template === "beaker" ? beakerSvg(asset, lod) : flaskSvg(asset, lod);

const masterFragment = (asset) => {
  const source = renderAsset(asset, "master");
  const match = source.match(/viewBox="([^"]+)"/);
  if (!match) throw new Error("master asset has no viewBox: " + asset.assetId);
  return { viewBox: match[1], inner: source.slice(source.indexOf(">") + 1, source.lastIndexOf("</svg>")) };
};
const embeddedMaster = (asset, x, y, width, height) => {
  const fragment = masterFragment(asset);
  return "<svg x=\"" + x + "\" y=\"" + y + "\" width=\"" + width + "\" height=\"" + height + "\" viewBox=\"" + fragment.viewBox + "\" preserveAspectRatio=\"xMidYMid meet\" data-source-asset-id=\"" + asset.assetId + "\" data-source-lod=\"master\" data-review-source=\"generated-from-master\">" + fragment.inner + "</svg>";
};
const comparisonLabel = (asset) => asset.assetId + " · " + asset.dimensionsMm.slice(0, 2).join(" × ") + " mm · " + asset.anatomy.slice(0, 3).join(", ");

const physicalComparison = () => {
  const rows = [
    { title: "Burettes", assets: entries.filter((entry) => entry.familyId === "burette"), y: 130, height: 230 },
    { title: "Beakers", assets: entries.filter((entry) => entry.familyId === "beaker"), y: 390, height: 220 },
    { title: "Erlenmeyer flasks", assets: entries.filter((entry) => entry.familyId === "conical-flask"), y: 650, height: 230 },
  ];
  const markup = [];
  for (const row of rows) {
    markup.push("<text x=\"55\" y=\"" + (row.y - 20) + "\" fill=\"#17333a\" font-family=\"Arial, sans-serif\" font-size=\"20\" font-weight=\"700\">" + row.title + "</text>");
    row.assets.forEach((asset, index) => {
      const x = 100 + index * 470;
      markup.push("<g data-review-family=\"" + asset.familyId + "\">" + embeddedMaster(asset, x, row.y, 210, row.height) + "<text x=\"" + (x + 225) + "\" y=\"" + (row.y + 58) + "\" fill=\"#17333a\" font-family=\"Arial, sans-serif\" font-size=\"13\">" + escapeXml(comparisonLabel(asset)) + "</text></g>");
    });
  }
  return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1500 980\" data-review-mode=\"measurement-valid\" data-review-source=\"generated-from-master\" data-coordinate-unit=\"mm\" role=\"img\" aria-labelledby=\"title desc\"><title id=\"title\">Gold Master physical-scale comparison sheet</title><desc id=\"desc\">Measurement-anchored comparison derived from each checked-in master SVG. Declared dimensions are labels, not certified drawings.</desc><rect width=\"1500\" height=\"980\" fill=\"#f4f7f7\"/><g fill=\"#17333a\" font-family=\"Arial, sans-serif\"><text x=\"55\" y=\"55\" font-size=\"28\" font-weight=\"700\">CHEMREALM GOLD MASTER / PHYSICAL SCALE REVIEW</text><text x=\"55\" y=\"84\" font-size=\"15\">master-derived geometry · declared millimetre dimensions · visual review metadata</text></g>" + markup.join("") + "</svg>";
};

const normalizedComparison = () => {
  const cells = [];
  entries.forEach((asset, index) => {
    const x = 80 + (index % 4) * 350;
    const y = 120 + Math.floor(index / 4) * 330;
    cells.push("<g data-review-family=\"" + asset.familyId + "\">" + embeddedMaster(asset, x, y, 220, 230) + "<text x=\"" + x + "\" y=\"" + (y + 260) + "\" fill=\"#eef6f7\" font-family=\"Arial, sans-serif\" font-size=\"13\">" + escapeXml(asset.assetId) + "</text><text x=\"" + x + "\" y=\"" + (y + 280) + "\" fill=\"#b8d0d2\" font-family=\"Arial, sans-serif\" font-size=\"11\">" + escapeXml(asset.anatomy.slice(0, 3).join(" · ")) + "</text></g>");
  });
  return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1500 880\" data-review-mode=\"visual-only\" data-review-source=\"generated-from-master\" data-coordinate-unit=\"mm\" role=\"img\" aria-labelledby=\"title desc\"><title id=\"title\">Gold Master normalized-shape comparison sheet</title><desc id=\"desc\">Visual-only comparison derived from the actual master geometry. It exposes changed geometry parameters, family proportions and anatomy; it must never supply a quantitative reading.</desc><rect width=\"1500\" height=\"880\" fill=\"#202f34\"/><g fill=\"#eef6f7\" font-family=\"Arial, sans-serif\"><text x=\"55\" y=\"55\" font-size=\"28\" font-weight=\"700\">CHEMREALM GOLD MASTER / NORMALIZED SHAPE REVIEW</text><text x=\"55\" y=\"84\" font-size=\"15\" fill=\"#b8d0d2\">visual-only · common artboard · all cells are generated from master SVGs</text></g>" + cells.join("") + "<g fill=\"#b8d0d2\" font-family=\"Arial, sans-serif\" font-size=\"13\"><text x=\"55\" y=\"820\">Legend: proportions, shoulder curvature, neck length, spout continuity, graduation density and actuator anatomy are review dimensions.</text><text x=\"55\" y=\"842\">This sheet is visual-only; consult the physical-scale sheet for declared dimensions.</text></g></svg>";
};

const stateVariants = [
  { id: "empty", visibleLayers: ["apparatus-body", "rim-or-mouth", "contact-surface", "shadow"], description: "Geometry-only empty apparatus; no runtime quantity is baked into the master." },
  { id: "filled", visibleLayers: ["apparatus-body", "rim-or-mouth", "graduation-when-present", "contact-surface", "liquid", "meniscus", "shadow"], description: "State-derived liquid and meniscus overlays supplied by Observable/RenderState." },
  { id: "connected", visibleLayers: ["apparatus-body", "connection-port", "detachable", "connection-highlight", "shadow"], description: "Detachable-part connection state; declared only for burette specifications." },
];
const stateManifest = { schemaVersion: 1, source: "RenderState apparatus state contract", variants: stateVariants, assets: entries.map((entry) => ({ assetId: entry.assetId, supportedVariants: entry.familyId === "burette" ? ["empty", "filled", "connected"] : ["empty", "filled"] })) };
const deterministicFixture = { schemaVersion: 1, fixtureId: "m6-gold-master-static-review-v2", renderMode: "asset-package-review", source: "Gold Master manifest plus state manifest; no chemistry or runtime measurement values", assetIds: entries.map((entry) => entry.assetId), backgrounds: ["dark-neutral", "light-neutral"], lods, stateManifest: "states/manifest.json", reviewSheets: ["qa/comparison-sheet-physical-scale.svg", "qa/comparison-sheet-normalized-shape.svg"] };
const manifest = {
  schemaVersion: 2, assetVersionSource: "contracts/version-manifest.json#representation.apparatusAsset", catalogVersionSource: "contracts/version-manifest.json#representation.apparatusCatalog",
  visualFamily: "chemrealm-lab-v1", coordinateUnit: "mm", viewMode: "construction", lods, backgrounds: ["dark-neutral", "light-neutral"],
  statePackage: { manifest: "states/manifest.json", variants: stateVariants.map((variant) => variant.id), source: "RenderState apparatus state contract" },
  deterministicFixture: "fixture/render-fixture.json", backgroundQaStatus: "candidate-package-only; owner capture review pending",
  comparisonSheets: ["qa/comparison-sheet-physical-scale.svg", "qa/comparison-sheet-normalized-shape.svg"],
  assets: entries.map((entry) => ({ assetId: entry.assetId, specificationId: entry.assetId, familyId: entry.familyId, capacityMl: entry.capacityMl, dimensionsMm: entry.dimensionsMm, materialProfile: entry.materialProfile, anatomy: entry.anatomy, landmarksMm: entry.landmarksMm, identityLayers: entry.identityLayers, lodVisibility: lodDetail, ...(entry.actuatorKind ? { actuatorKind: entry.actuatorKind } : {}), provenanceRefs: entry.provenanceRefs, lodFiles: { master: "master.svg", scene: "scene.svg", preview: "preview.svg", thumbnail: "thumbnail.svg" } })),
};

const sourceRecord = "# M6 Gold Master source record\n\n"
  + "## Package identity\n\nThis package is a bounded owner-review Gold Master candidate for ChemRealm's original apparatus family. It contains acid/alkali burettes, three beaker capacities and three Erlenmeyer flask capacities. Every file is generated from the checked-in construction source tools/create_gold_master_assets.mjs; the generated SVGs are static review assets, not runtime chemistry data.\n\n"
  + "Regenerate with: node tools/create_gold_master_assets.mjs\n\n"
  + "## Originality boundary\n\nThe geometry, construction layers, gradients, proportions and comparison sheets are original ChemRealm work. NOBOOK and vendor references informed broad recognizability and apparatus structure only. No third-party asset, screenshot, icon, traced silhouette, texture, brand mark or distinctive layout is included.\n\n"
  + "## Family anatomy and landmark contract\n\nThe package does not use universal required layers. Each family owns its real anatomy: acid burettes use a PTFE stopcock body and rotary key; alkali burettes use a lower glass connector, rubber delivery tube, glass bead and pinch region; beakers use a rim-continuous spout and glass contact foot; Erlenmeyer flasks use a curved shoulder, cylindrical neck and flat contact foot. Fictitious base and hardware layers are prohibited.\n\n"
  + "Manifest landmarks are review anchors for mouth/neck diameter, graduated length, shoulder transition, spout projection, flat contact and actuator placement. They are visual proportion contracts, not certified metrology.\n\n"
  + "## Geometry provenance\n\n| Asset family | Source class | Anchors | Approximation boundary |\n|---|---|---|---|\n| Acid burette 25 mL | manufacturer-anchor + standard-family | DURAN 25 mL Class AS and PTFE stopcock records; JY/T 0655 family | SVG proportions are a visual master; calibration truth remains upstream |\n| Alkali burette 50 mL | standard-family | JY/T 0655 teaching-equipment family | pinch mechanism and proportions are approximate visual anchors |\n| Beakers 100/250/1000 mL | standard-family + approximate-visual | JY/T 0655 family and ChemRealm family proportions | capacity variants are visibly distinct but not certified drawings |\n| Erlenmeyer 100/250/500 mL | manufacturer-anchor + standard-family | DURAN 250 mL anchor; JY/T 0655 family | 100/500 mL proportions are approximate visual variants |\n\n"
  + "Declared dimensionsMm and landmarks are catalog geometry anchors. Runtime liquid level, meniscus, readings, optical observation and chemical colour never come from these SVGs.\n\n"
  + "## Material and contour decisions\n\n- Glass profiles are family-specific: the light direction is shared, but tint, edge restraint and opacity are not blindly reused across burette glass, open vessels and curved vessels.\n- No master includes a scene shadow. Shadows are scene-owned and appear only in scene/preview/thumbnail LODs.\n- Glass does not use a continuous equal-weight high-contrast closed contour. Edge cues are local, low-contrast rear/front accents with a restrained directional highlight.\n- Burette graduations are geometry marks only; runtime values are not baked into any LOD.\n- The acid burette exposes a glass/PTFE rotary mechanism; the alkali burette exposes a rubber-tube/glass-bead pinch mechanism. These are not interchangeable hardware tokens.\n\n"
  + "## LOD and comparison boundary\n\nMaster, scene, preview and thumbnail preserve family identity while removing construction detail deterministically. The comparison sheets embed the actual generated master SVGs, so they cannot silently drift to a hand-authored proxy silhouette. The physical sheet is measurement-anchored for declared dimensions; the normalized sheet is visual-only.\n\n"
  + "## State and fixture boundary\n\nThe states/manifest.json record declares reusable state-layer coverage. The SVGs intentionally expose empty runtime liquid and meniscus layers; Observable/RenderState supplies their values and effects. The fixture fixes the first review set, four LODs, two neutral backgrounds and the review sheets without embedding chemistry, quantities or readings.\n\n"
  + "## Review boundary\n\nThis package is implementation evidence only. Dark/light background captures, owner visual review, accessibility review and final visual acceptance remain open in docs/evidence/M6.md. It does not claim M6 S3.\n";
const qaReadme = "# Gold Master QA\n\n## Required matrix\n\nEvery asset is reviewed in master, scene, preview and thumbnail LOD at both dark-neutral and light-neutral backgrounds. The current package records deterministic family anatomy and LOD source; owner captures are still pending.\n\n| Check | Rule | Current package evidence |\n|---|---|---|\n| Family anatomy | real family-owned layers; no fictitious universal base/hardware | SVG data-layer records + manifest |\n| Landmark contract | mouth/neck/shoulder/spout/foot/actuator anchors are explicit | manifest landmarks + source record |\n| LOD identity | capacity, dimensions, family and actuator identity do not change | manifest + four LOD files per asset |\n| Material | family-specific restrained glass/PTFE/rubber values, local contour cues, no halo | candidate token checks; not visual acceptance |\n| Background | dark-neutral and light-neutral remain legible | manifest matrix; owner captures pending |\n| Runtime separation | no pH, reagent, reading, liquid quantity or chemical colour baked in | SVG package test |\n| Originality | no NOBOOK/vendor artwork or external references | source record + self-contained SVGs |\n| State coverage | declared empty/filled/connected variants remain RenderState-owned | states/manifest.json + deterministic fixture |\n| Comparison | physical and normalized sheets are derived from actual master SVGs | data-source-asset-id + data-source-lod=master |\n| Reproducibility | bounded asset set, LODs, backgrounds and review sheets are fixed | fixture/render-fixture.json |\n\n## Gold Master set\n\nburette-acid-25ml-class-as, burette-alkali-50ml-class-b, beaker-100ml, beaker-250ml, beaker-1000ml, conical-flask-100ml, conical-flask-250ml, conical-flask-500ml.\n\n## Reproduction\n\nRun node tools/create_gold_master_assets.mjs, then run the Gold Master package test from the repository root. The generator is deterministic and does not fetch external assets.\n";
const license = "# Asset license\n\nOriginal ChemRealm Gold Master vector construction, manifests, comparison sheets and QA records are distributed under PolyForm Noncommercial 1.0.0, subject to the repository license and third-party notices.\n\nExternal sources are cited for research and structural anchors only. No third-party artwork, photograph, texture, font or brand mark is redistributed.\n";

await mkdir(join(outputRoot, "qa"), { recursive: true });
await mkdir(join(outputRoot, "states"), { recursive: true });
await mkdir(join(outputRoot, "fixture"), { recursive: true });
for (const entry of entries) {
  const assetRoot = join(outputRoot, entry.assetId);
  await mkdir(assetRoot, { recursive: true });
  for (const lod of lods) await writeFile(join(assetRoot, lod + ".svg"), renderAsset(entry, lod), "utf8");
}
await writeFile(join(outputRoot, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
await writeFile(join(outputRoot, "source-record.md"), sourceRecord, "utf8");
await writeFile(join(outputRoot, "license.md"), license, "utf8");
await writeFile(join(outputRoot, "qa", "README.md"), qaReadme, "utf8");
await writeFile(join(outputRoot, "states", "manifest.json"), JSON.stringify(stateManifest, null, 2) + "\n", "utf8");
await writeFile(join(outputRoot, "fixture", "render-fixture.json"), JSON.stringify(deterministicFixture, null, 2) + "\n", "utf8");
await writeFile(join(outputRoot, "qa", "comparison-sheet-physical-scale.svg"), physicalComparison(), "utf8");
await writeFile(join(outputRoot, "qa", "comparison-sheet-normalized-shape.svg"), normalizedComparison(), "utf8");
console.log("Generated " + entries.length + " Gold Master assets × " + lods.length + " LODs under " + outputRoot);
