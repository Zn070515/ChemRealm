import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const outputRoot = join(process.cwd(), "assets", "apparatus", "catalog", "gold-master");
const lods = ["master", "scene", "preview", "thumbnail"];

const entries = [
  {
    assetId: "burette-acid-25ml-class-as",
    familyId: "burette",
    capacityMl: 25,
    dimensionsMm: [30, 820, 30],
    title: "Acid burette, 25 mL, rotary-valve family",
    actuatorKind: "rotary-valve",
    template: "burette-acid",
    identityLayers: ["glass-back", "glass-front", "rim", "base", "hardware", "highlight", "graduation", "actuator"],
    provenanceRefs: ["duran-burette-25ml-class-as", "jy-t-0655-2025", "chemrealm-visual-proportion-anchor"],
  },
  {
    assetId: "burette-alkali-50ml-class-b",
    familyId: "burette",
    capacityMl: 50,
    dimensionsMm: [36, 900, 36],
    title: "Alkali burette, 50 mL, pinch-valve family",
    actuatorKind: "pinch-valve",
    template: "burette-alkali",
    identityLayers: ["glass-back", "glass-front", "rim", "base", "hardware", "highlight", "graduation", "actuator"],
    provenanceRefs: ["jy-t-0655-2025", "chemrealm-visual-proportion-anchor"],
  },
  {
    assetId: "beaker-100ml",
    familyId: "beaker",
    capacityMl: 100,
    dimensionsMm: [52, 72, 52],
    title: "Beaker, 100 mL",
    template: "beaker",
    identityLayers: ["glass-back", "glass-front", "rim", "base", "hardware", "highlight", "spout"],
    provenanceRefs: ["jy-t-0655-2025", "chemrealm-visual-proportion-anchor"],
  },
  {
    assetId: "beaker-250ml",
    familyId: "beaker",
    capacityMl: 250,
    dimensionsMm: [70, 95, 70],
    title: "Beaker, 250 mL",
    template: "beaker",
    identityLayers: ["glass-back", "glass-front", "rim", "base", "hardware", "highlight", "spout"],
    provenanceRefs: ["jy-t-0655-2025", "chemrealm-visual-proportion-anchor"],
  },
  {
    assetId: "beaker-1000ml",
    familyId: "beaker",
    capacityMl: 1000,
    dimensionsMm: [112, 165, 112],
    title: "Beaker, 1000 mL",
    template: "beaker",
    identityLayers: ["glass-back", "glass-front", "rim", "base", "hardware", "highlight", "spout"],
    provenanceRefs: ["jy-t-0655-2025", "chemrealm-visual-proportion-anchor"],
  },
  {
    assetId: "conical-flask-100ml",
    familyId: "conical-flask",
    capacityMl: 100,
    dimensionsMm: [62, 105, 62],
    title: "Erlenmeyer flask, 100 mL",
    template: "flask",
    identityLayers: ["glass-back", "glass-front", "rim", "base", "hardware", "highlight", "body", "neck"],
    provenanceRefs: ["jy-t-0655-2025", "chemrealm-visual-proportion-anchor"],
  },
  {
    assetId: "conical-flask-250ml",
    familyId: "conical-flask",
    capacityMl: 250,
    dimensionsMm: [85, 145, 85],
    title: "Erlenmeyer flask, 250 mL",
    template: "flask",
    identityLayers: ["glass-back", "glass-front", "rim", "base", "hardware", "highlight", "body", "neck"],
    provenanceRefs: ["duran-erlenmeyer-250ml", "jy-t-0655-2025", "chemrealm-visual-proportion-anchor"],
  },
  {
    assetId: "conical-flask-500ml",
    familyId: "conical-flask",
    capacityMl: 500,
    dimensionsMm: [102, 186, 102],
    title: "Erlenmeyer flask, 500 mL",
    template: "flask",
    identityLayers: ["glass-back", "glass-front", "rim", "base", "hardware", "highlight", "body", "neck"],
    provenanceRefs: ["jy-t-0655-2025", "chemrealm-visual-proportion-anchor"],
  },
];

const escapeXml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const commonDefs = (prefix) => `
  <defs>
    <linearGradient id="${prefix}-glass" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#8ab5bf" stop-opacity=".16"/>
      <stop offset=".12" stop-color="#ffffff" stop-opacity=".42"/>
      <stop offset=".32" stop-color="#d7eef1" stop-opacity=".12"/>
      <stop offset=".78" stop-color="#ffffff" stop-opacity=".30"/>
      <stop offset="1" stop-color="#5d8b95" stop-opacity=".20"/>
    </linearGradient>
    <linearGradient id="${prefix}-glass-edge" x1="0" x2="1">
      <stop offset="0" stop-color="#315c66"/>
      <stop offset=".5" stop-color="#9fc5c9"/>
      <stop offset="1" stop-color="#2d5059"/>
    </linearGradient>
    <linearGradient id="${prefix}-steel" x1="0" x2="1">
      <stop offset="0" stop-color="#26353b"/>
      <stop offset=".18" stop-color="#7c9298"/>
      <stop offset=".40" stop-color="#e2eaeb"/>
      <stop offset=".58" stop-color="#71848a"/>
      <stop offset="1" stop-color="#1e292e"/>
    </linearGradient>
    <linearGradient id="${prefix}-rubber" x1="0" x2="1">
      <stop offset="0" stop-color="#192328"/>
      <stop offset=".45" stop-color="#59686b"/>
      <stop offset="1" stop-color="#11191d"/>
    </linearGradient>
    <filter id="${prefix}-shadow" x="-30%" y="-40%" width="160%" height="190%">
      <feGaussianBlur stdDeviation="5"/>
    </filter>
    <style>
      .edge { stroke: url(#${prefix}-glass-edge); stroke-linejoin: round; }
      .glass-fill { fill: url(#${prefix}-glass); }
      .steel-fill { fill: url(#${prefix}-steel); }
      .rubber-fill { fill: url(#${prefix}-rubber); }
      .detail { stroke: #29444c; stroke-linecap: round; stroke-linejoin: round; }
      .highlight { stroke: #f8ffff; stroke-linecap: round; fill: none; }
    </style>
  </defs>`.trimStart();

const layer = (name, content, attributes = "") =>
  `<g data-layer="${name}"${attributes ? ` ${attributes}` : ""}>${content}</g>`;

const emptyRuntimeLayer = (name, description) =>
  layer(name, `<desc>${description}; supplied by RenderState at runtime.</desc>`, 'data-runtime="true" opacity="0"');

const shadow = (cx, cy, rx, ry, prefix, opacity = ".16") =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#203137" opacity="${opacity}" filter="url(#${prefix}-shadow)"/>`;

const tickLines = ({ x, y, length, height, count, majorEvery, strokeWidth, detail }) => {
  const lines = [];
  for (let index = 0; index <= count; index += 1) {
    const isMajor = index % majorEvery === 0;
    const isMedium = index % Math.max(1, Math.floor(majorEvery / 2)) === 0;
    if (detail === "thumbnail" && !isMajor) continue;
    if (detail === "preview" && !isMajor && !isMedium) continue;
    const tickLength = isMajor ? length : isMedium ? length * .68 : length * .42;
    const tickStroke = isMajor ? strokeWidth : isMedium ? strokeWidth * .78 : strokeWidth * .58;
    const yy = y + (height * index) / count;
    lines.push(`<path d="M${x} ${yy.toFixed(2)}h${tickLength.toFixed(2)}" class="detail" stroke-width="${tickStroke.toFixed(2)}"/>`);
  }
  return lines.join("");
};

const svgDocument = ({ asset, lod, viewBox, content }) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.join(" ")}" data-asset-id="${asset.assetId}" data-specification-id="${asset.assetId}" data-family-id="${asset.familyId}" data-capacity-ml="${asset.capacityMl}" data-dimensions-mm="${asset.dimensionsMm.join(" ")}"${asset.actuatorKind ? ` data-actuator-kind="${asset.actuatorKind}"` : ""} data-lod="${lod}" data-coordinate-unit="mm" data-visual-role="apparatus-geometry" data-view-mode="${lod === "master" ? "construction" : lod === "scene" ? "experiment-world" : "catalog-preview"}" data-measurement-qualified="false" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(asset.title)} — ${lod} construction</title>
  <desc id="desc">Original ChemRealm apparatus geometry. This ${lod} LOD preserves semantic structure and contains no runtime reading, liquid quantity or chemical colour.</desc>
  ${commonDefs(asset.assetId)}
  ${content}
</svg>
`.trimStart();

const buretteSvg = (asset, lod, acid) => {
  const compact = lod === "thumbnail";
  const height = acid ? 760 : 830;
  const bodyWidth = acid ? 44 : 52;
  const x = 152;
  const top = 54;
  const bodyBottom = top + height;
  const valveY = bodyBottom + 8;
  const tipBottom = valveY + (acid ? 114 : 126);
  const prefix = asset.assetId;
  const ticks = tickLines({
    x: x + bodyWidth + 8,
    y: top + 24,
    length: compact ? 20 : 42,
    height: height - 48,
    count: acid ? 50 : 50,
    majorEvery: 10,
    strokeWidth: compact ? 3.2 : 3.8,
    detail: lod,
  });
  const back = [
    `<rect x="${x}" y="${top}" width="${bodyWidth}" height="${height}" rx="${bodyWidth / 2}" class="glass-fill edge" stroke-width="${compact ? 2.8 : 4.2}"/>`,
    `<path d="M${x + 9} ${top + 20}v${height - 40}" stroke="#ffffff" stroke-width="${compact ? 4 : 7}" opacity=".56" class="highlight"/>`,
    `<path d="M${x + bodyWidth - 9} ${top + 12}v${height - 24}" stroke="#5e929c" stroke-width="${compact ? 2.2 : 3.4}" opacity=".42"/>`,
  ].join("");
  const rim = [
    `<ellipse cx="${x + bodyWidth / 2}" cy="${top}" rx="${bodyWidth / 2}" ry="${compact ? 5 : 8}" fill="#dff1f2" fill-opacity=".48" stroke="#315b64" stroke-width="${compact ? 2.5 : 3.6}"/>`,
    `<path d="M${x - 5} ${top - 2}h${bodyWidth + 10}" class="detail" stroke-width="${compact ? 2 : 3}" opacity=".78"/>`,
  ].join("");
  const base = [
    `<path d="M${x - 10} ${bodyBottom}h${bodyWidth + 20}v${compact ? 13 : 22}h-${bodyWidth + 20}z" class="steel-fill detail" stroke-width="${compact ? 2.5 : 3.6}"/>`,
    `<path d="M${x - 2} ${bodyBottom + 5}h${bodyWidth + 4}" stroke="#edf5f5" stroke-width="${compact ? 2 : 3}" opacity=".55"/>`,
  ].join("");
  const actuator = acid
    ? [
        `<rect x="${x - 18}" y="${valveY}" width="${bodyWidth + 36}" height="${compact ? 25 : 36}" rx="${compact ? 7 : 10}" class="steel-fill detail" stroke-width="${compact ? 2.5 : 3.8}"/>`,
        `<circle cx="${x + bodyWidth / 2}" cy="${valveY + (compact ? 12.5 : 18)}" r="${compact ? 8 : 12}" fill="#d5e0e2" class="detail" stroke-width="${compact ? 2 : 3}"/>`,
        `<path d="M${x + bodyWidth / 2} ${valveY + (compact ? 12.5 : 18)}l${compact ? 18 : 32} ${compact ? -8 : -14}" stroke="#23343a" stroke-width="${compact ? 5 : 8}" stroke-linecap="round"/>`,
        `<path d="M${x + bodyWidth / 2 + (compact ? 8 : 14)} ${valveY + (compact ? 9 : 13)}h${compact ? 12 : 20}" stroke="#eef5f6" stroke-width="${compact ? 2 : 3}" stroke-linecap="round" opacity=".66"/>`,
      ].join("")
    : [
        `<path d="M${x + bodyWidth / 2 - 13} ${valveY - 4}v${compact ? 35 : 48}" stroke="url(#${prefix}-rubber)" stroke-width="${compact ? 10 : 15}" stroke-linecap="round"/>`,
        `<circle cx="${x + bodyWidth / 2}" cy="${valveY + (compact ? 16 : 23)}" r="${compact ? 10 : 15}" fill="#a7b2b2" class="detail" stroke-width="${compact ? 2 : 3}"/>`,
        `<path d="M${x + bodyWidth / 2 + (compact ? 10 : 15)} ${valveY + (compact ? 16 : 23)}h${compact ? 21 : 36}" stroke="url(#${prefix}-rubber)" stroke-width="${compact ? 8 : 12}" stroke-linecap="round"/>`,
        `<path d="M${x + bodyWidth / 2 + (compact ? 19 : 32)} ${valveY + (compact ? 10 : 15)}v${compact ? 12 : 18}" stroke="#dce5e5" stroke-width="${compact ? 2 : 3}" stroke-linecap="round"/>`,
      ].join("");
  const tip = [
    `<path d="M${x + bodyWidth / 2} ${valveY + (compact ? 25 : 36)}v${acid ? 64 : 77}" stroke="url(#${prefix}-glass-edge)" stroke-width="${compact ? 7 : 10}" stroke-linecap="round"/>`,
    `<path d="M${x + bodyWidth / 2 + 2} ${valveY + (compact ? 31 : 43)}v${acid ? 50 : 62}" stroke="#f8ffff" stroke-width="${compact ? 2 : 3}" stroke-linecap="round" opacity=".62"/>`,
    `<path d="M${x + bodyWidth / 2 - 8} ${tipBottom - 18}h16l-5 18h-6z" class="glass-fill edge" stroke-width="${compact ? 2 : 3}"/>`,
  ].join("");
  const accessibility = `<rect x="${x - 14}" y="${top - 12}" width="${bodyWidth + 28}" height="${tipBottom - top + 20}" fill="none" stroke="#79d0d5" stroke-width="2" stroke-dasharray="8 8" opacity="0"/>`;
  const contents = [
    layer("shadow", shadow(x + bodyWidth / 2, tipBottom + 24, 88, compact ? 8 : 13, prefix, ".12")),
    layer("glass-back", back, `data-part="burette.body"`),
    emptyRuntimeLayer("liquid", "Liquid column"),
    emptyRuntimeLayer("meniscus", "Meniscus"),
    layer("rim", rim, `data-part="burette.rim"`),
    layer("graduation", ticks, `data-part="burette.scale"`),
    layer("base", base, `data-part="burette.base"`),
    layer("hardware", tip, `data-part="burette.tip"`),
    layer("actuator", actuator, `data-part="burette.actuator" data-actuator-kind="${asset.actuatorKind}"`),
    layer("glass-front", `<path d="M${x + 4} ${top + 16}v${height - 32}" stroke="#ffffff" stroke-width="${compact ? 2 : 3}" opacity=".24" class="highlight"/>`),
    layer("highlight", `<path d="M${x + bodyWidth - 5} ${top + 32}v${height - 64}" stroke="#ffffff" stroke-width="${compact ? 1.5 : 2.4}" opacity=".36" class="highlight"/>`),
    layer("detachable", `<circle cx="${x + bodyWidth / 2}" cy="${valveY + 10}" r="${compact ? 13 : 19}" fill="none" stroke="#84c7ca" stroke-width="2" stroke-dasharray="5 5" opacity="0"/>`, 'data-part="burette.actuator"'),
    layer("accessibility", accessibility),
  ];
  return svgDocument({ asset, lod, viewBox: [54, 18, 300, tipBottom + 65], content: contents.join("\n  ") });
};

const beakerSvg = (asset, lod) => {
  const compact = lod === "thumbnail";
  const [width, height] = asset.dimensionsMm;
  const prefix = asset.assetId;
  const artWidth = 360;
  const artHeight = Math.max(250, height + 105);
  const x = 92;
  const y = 42;
  const bodyTop = y + 18;
  const bodyBottom = bodyTop + height * 1.12;
  const bodyLeft = x;
  const bodyRight = x + width * 1.56;
  const innerLeft = bodyLeft + 8;
  const innerRight = bodyRight - 8;
  const tickCount = Math.max(4, Math.round(asset.capacityMl / 25));
  const ticks = tickLines({
    x: bodyRight - (compact ? 22 : 42),
    y: bodyTop + 34,
    length: compact ? 15 : 33,
    height: Math.max(45, height * .72),
    count: tickCount,
    majorEvery: Math.max(1, Math.round(tickCount / 4)),
    strokeWidth: compact ? 2.5 : 3.2,
    detail: lod,
  });
  const body = `<path d="M${bodyLeft} ${bodyTop}L${bodyLeft + 5} ${bodyBottom}Q${bodyLeft + 9} ${bodyBottom + 8} ${bodyLeft + 20} ${bodyBottom + 8}H${bodyRight - 20}Q${bodyRight - 9} ${bodyBottom + 8} ${bodyRight - 5} ${bodyBottom}L${bodyRight} ${bodyTop}Z" class="glass-fill edge" stroke-width="${compact ? 3 : 4.2}"/>`;
  const rim = [
    `<path d="M${bodyLeft - 2} ${bodyTop}H${bodyRight + 5}" class="detail" stroke-width="${compact ? 2.8 : 4}"/>`,
    `<ellipse cx="${(bodyLeft + bodyRight) / 2}" cy="${bodyTop}" rx="${(bodyRight - bodyLeft) / 2 + 3}" ry="${compact ? 7 : 11}" fill="#e1f1f2" fill-opacity=".38" stroke="#315b64" stroke-width="${compact ? 2.5 : 3.6}"/>`,
    `<ellipse cx="${(bodyLeft + bodyRight) / 2}" cy="${bodyTop + 1}" rx="${(bodyRight - bodyLeft) / 2 - 3}" ry="${compact ? 4 : 7}" fill="#ffffff" fill-opacity=".22" stroke="#9bbdc1" stroke-width="${compact ? 1.4 : 2}"/>`,
  ].join("");
  const spout = `<path d="M${bodyRight - 12} ${bodyTop + 3}L${bodyRight + 58} ${bodyTop + 24}L${bodyRight + 6} ${bodyTop + 49}L${bodyRight - 2} ${bodyTop + 20}Z" class="glass-fill edge" stroke-width="${compact ? 3 : 4}"/>`;
  const base = [
    `<path d="M${bodyLeft + 8} ${bodyBottom + 8}H${bodyRight - 8}" stroke="#2d525b" stroke-width="${compact ? 4 : 6}" stroke-linecap="round"/>`,
    `<path d="M${bodyLeft + 14} ${bodyBottom + 15}H${bodyRight - 14}" stroke="#f1fbfb" stroke-width="${compact ? 2 : 3}" stroke-linecap="round" opacity=".54"/>`,
  ].join("");
  const highlights = [
    `<path d="M${bodyLeft + 15} ${bodyTop + 31}v${Math.max(35, height * .78)}" stroke="#ffffff" stroke-width="${compact ? 4 : 7}" opacity=".56" class="highlight"/>`,
    `<path d="M${bodyRight - 14} ${bodyTop + 26}v${Math.max(42, height * .76)}" stroke="#6d9aa2" stroke-width="${compact ? 2 : 3}" opacity=".42" class="highlight"/>`,
  ].join("");
  const contents = [
    layer("shadow", shadow((bodyLeft + bodyRight) / 2, bodyBottom + 28, (bodyRight - bodyLeft) * .58, compact ? 9 : 14, prefix, ".12")),
    layer("glass-back", body, `data-part="vessel.body"`),
    emptyRuntimeLayer("liquid", "Liquid interior"),
    emptyRuntimeLayer("meniscus", "Meniscus"),
    layer("rim", rim, `data-part="vessel.rim"`),
    layer("spout", spout, `data-part="vessel.spout"`),
    layer("graduation", ticks, `data-part="vessel.scale"`),
    layer("base", base, `data-part="vessel.base"`),
    layer("hardware", `<path d="M${bodyLeft + 18} ${bodyBottom + 13}h${bodyRight - bodyLeft - 36}" stroke="#78969b" stroke-width="${compact ? 2 : 3}" opacity=".58"/>`),
    layer("glass-front", `<path d="M${innerLeft} ${bodyTop + 15}v${bodyBottom - bodyTop - 21}M${innerRight} ${bodyTop + 16}v${bodyBottom - bodyTop - 23}" stroke="#ffffff" stroke-width="${compact ? 1.7 : 2.8}" opacity=".34" class="highlight"/>`),
    layer("highlight", highlights),
    layer("accessibility", `<rect x="${bodyLeft - 15}" y="${bodyTop - 17}" width="${bodyRight - bodyLeft + 85}" height="${bodyBottom - bodyTop + 40}" fill="none" stroke="#79d0d5" stroke-width="2" stroke-dasharray="8 8" opacity="0"/>`),
  ];
  return svgDocument({ asset, lod, viewBox: [35, 12, artWidth, artHeight], content: contents.join("\n  ") });
};

const flaskSvg = (asset, lod) => {
  const compact = lod === "thumbnail";
  const [width, height] = asset.dimensionsMm;
  const prefix = asset.assetId;
  const artWidth = 390;
  const artHeight = Math.max(260, height + 110);
  const neckWidth = Math.max(32, width * .40);
  const neckTop = 36;
  const neckBottom = neckTop + height * .40;
  const bodyTop = neckBottom - 6;
  const bodyBottom = bodyTop + height * .66;
  const center = 185;
  const bodyHalf = width * .86;
  const left = center - bodyHalf;
  const right = center + bodyHalf;
  const shoulderLeft = center - neckWidth / 2;
  const shoulderRight = center + neckWidth / 2;
  const body = `<path d="M${shoulderLeft} ${bodyTop}L${left + 6} ${bodyBottom - 22}Q${left} ${bodyBottom - 15} ${left} ${bodyBottom - 1}Q${left} ${bodyBottom + 12} ${left + 16} ${bodyBottom + 13}H${right - 16}Q${right} ${bodyBottom + 12} ${right} ${bodyBottom - 1}Q${right} ${bodyBottom - 15} ${right - 6} ${bodyBottom - 22}L${shoulderRight} ${bodyTop}Z" class="glass-fill edge" stroke-width="${compact ? 3 : 4.3}"/>`;
  const neck = [
    `<path d="M${shoulderLeft} ${bodyTop}V${neckTop}Q${shoulderLeft} ${neckTop - 5} ${shoulderLeft + 5} ${neckTop - 5}H${shoulderRight - 5}Q${shoulderRight} ${neckTop - 5} ${shoulderRight} ${neckTop}V${bodyTop}" class="glass-fill edge" stroke-width="${compact ? 3 : 4.3}"/>`,
    `<path d="M${shoulderLeft + 7} ${neckTop + 7}v${neckBottom - neckTop - 14}" stroke="#ffffff" stroke-width="${compact ? 2.5 : 4.5}" opacity=".50" class="highlight"/>`,
  ].join("");
  const rim = [
    `<ellipse cx="${center}" cy="${neckTop - 5}" rx="${neckWidth / 2 + 5}" ry="${compact ? 6 : 9}" fill="#dff0f1" fill-opacity=".46" stroke="#315b64" stroke-width="${compact ? 2.5 : 3.5}"/>`,
    `<ellipse cx="${center}" cy="${neckTop - 5}" rx="${neckWidth / 2 - 1}" ry="${compact ? 3 : 5}" fill="#ffffff" fill-opacity=".20" stroke="#96b9be" stroke-width="${compact ? 1.3 : 2}"/>`,
  ].join("");
  const base = [
    `<path d="M${left + 5} ${bodyBottom + 10}H${right - 5}" stroke="#2d525b" stroke-width="${compact ? 6 : 9}" stroke-linecap="round"/>`,
    `<path d="M${left + 15} ${bodyBottom + 16}H${right - 15}" stroke="#f1fbfb" stroke-width="${compact ? 2 : 3}" stroke-linecap="round" opacity=".56"/>`,
  ].join("");
  const shoulder = `<path d="M${shoulderLeft + 4} ${bodyTop + 8}L${left + 22} ${bodyBottom - 27}M${shoulderRight - 4} ${bodyTop + 8}L${right - 22} ${bodyBottom - 27}" stroke="#ffffff" stroke-width="${compact ? 2 : 3}" opacity=".30" class="highlight"/>`;
  const contents = [
    layer("shadow", shadow(center, bodyBottom + 30, bodyHalf * .82, compact ? 10 : 16, prefix, ".13")),
    layer("glass-back", body, `data-part="vessel.body"`),
    emptyRuntimeLayer("liquid", "Liquid interior"),
    emptyRuntimeLayer("meniscus", "Meniscus"),
    layer("body", `<path d="M${left + 16} ${bodyBottom - 30}Q${center} ${bodyBottom + 2} ${right - 16} ${bodyBottom - 30}" fill="none" stroke="#9fc8ca" stroke-width="${compact ? 2 : 3}" opacity=".32"/>`, `data-part="vessel.body"`),
    layer("neck", neck, `data-part="vessel.neck"`),
    layer("rim", rim, `data-part="vessel.rim"`),
    layer("base", base, `data-part="vessel.base"`),
    layer("hardware", `<path d="M${left + 20} ${bodyBottom + 11}h${right - left - 40}" stroke="#78969b" stroke-width="${compact ? 2 : 3}" opacity=".62"/>`),
    layer("glass-front", `<path d="M${left + 21} ${bodyTop + 27}L${left + 9} ${bodyBottom - 10}M${right - 21} ${bodyTop + 27}L${right - 9} ${bodyBottom - 10}" stroke="#ffffff" stroke-width="${compact ? 1.7 : 2.8}" opacity=".32" class="highlight"/>`),
    layer("highlight", shoulder),
    layer("accessibility", `<rect x="${left - 15}" y="${neckTop - 20}" width="${right - left + 30}" height="${bodyBottom - neckTop + 48}" fill="none" stroke="#79d0d5" stroke-width="2" stroke-dasharray="8 8" opacity="0"/>`),
  ];
  return svgDocument({ asset, lod, viewBox: [28, 12, artWidth, artHeight], content: contents.join("\n  ") });
};

const renderAsset = (asset, lod) => {
  if (asset.template === "burette-acid") return buretteSvg(asset, lod, true);
  if (asset.template === "burette-alkali") return buretteSvg(asset, lod, false);
  if (asset.template === "beaker") return beakerSvg(asset, lod);
  return flaskSvg(asset, lod);
};

const physicalComparison = () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 980" data-review-mode="measurement-valid" data-coordinate-unit="mm" role="img" aria-labelledby="title desc">
  <title id="title">Gold Master physical-scale comparison sheet</title>
  <desc id="desc">Measurement-valid comparison sheet. Each row retains declared physical family dimensions; it is not a runtime scene.</desc>
  <rect width="1500" height="980" fill="#f4f7f7"/>
  <g fill="#17333a" font-family="Arial, sans-serif">
    <text x="55" y="55" font-size="28" font-weight="700">CHEMREALM GOLD MASTER / PHYSICAL SCALE REVIEW</text>
    <text x="55" y="84" font-size="15">measurement-valid sheet · declared millimetre dimensions · labels are evidence metadata, not baked runtime readouts</text>
    <text x="55" y="135" font-size="20" font-weight="700">Burettes</text>
    <text x="55" y="410" font-size="20" font-weight="700">Beakers</text>
    <text x="55" y="670" font-size="20" font-weight="700">Erlenmeyer flasks</text>
  </g>
  <g data-layer="comparison-geometry" fill="none" stroke="#315b64" stroke-width="3">
    <path d="M180 145v220M350 145v220"/><path d="M520 145v220M700 145v220"/>
    <path d="M180 390h960M180 650h960M180 910h960" stroke="#9ab4b8" stroke-width="1"/>
    <g data-asset-id="burette-acid-25ml-class-as"><rect x="166" y="145" width="22" height="210" rx="11" fill="#cce3e6" fill-opacity=".42"/><path d="M177 355v18M165 373h24"/><text x="205" y="185" fill="#17333a" stroke="none" font-size="14">burette-acid-25ml-class-as · 30 × 820 mm</text></g>
    <g data-asset-id="burette-alkali-50ml-class-b"><rect x="336" y="145" width="28" height="210" rx="14" fill="#cce3e6" fill-opacity=".42"/><path d="M350 355v18M334 373h32"/><text x="385" y="185" fill="#17333a" stroke="none" font-size="14">burette-alkali-50ml-class-b · 36 × 900 mm</text></g>
    <g data-asset-id="beaker-100ml"><path d="M190 440h80l-4 170h-72z" fill="#cce3e6" fill-opacity=".42"/><path d="M265 444l34 19-29 13"/><text x="325" y="478" fill="#17333a" stroke="none" font-size="14">beaker-100ml · 52 × 72 mm</text></g>
    <g data-asset-id="beaker-250ml"><path d="M500 430h108l-6 190H506z" fill="#cce3e6" fill-opacity=".42"/><path d="M602 434l38 20-31 16"/><text x="665" y="478" fill="#17333a" stroke="none" font-size="14">beaker-250ml · 70 × 95 mm</text></g>
    <g data-asset-id="beaker-1000ml"><path d="M825 420h174l-9 205H834z" fill="#cce3e6" fill-opacity=".42"/><path d="M990 425l45 24-37 18"/><text x="1080" y="478" fill="#17333a" stroke="none" font-size="14">beaker-1000ml · 112 × 165 mm</text></g>
    <g data-asset-id="conical-flask-100ml"><path d="M230 710h40v72l54 91h-148l54-91z" fill="#cce3e6" fill-opacity=".42"/><path d="M204 873h104"/><text x="330" y="770" fill="#17333a" stroke="none" font-size="14">conical-flask-100ml · 62 × 105 mm</text></g>
    <g data-asset-id="conical-flask-250ml"><path d="M570 700h52v92l73 82H497l73-82z" fill="#cce3e6" fill-opacity=".42"/><path d="M493 882h156"/><text x="735" y="770" fill="#17333a" stroke="none" font-size="14">conical-flask-250ml · 85 × 145 mm</text></g>
    <g data-asset-id="conical-flask-500ml"><path d="M920 680h62v112l90 90H830l90-90z" fill="#cce3e6" fill-opacity=".42"/><path d="M824 891h248"/><text x="1110" y="770" fill="#17333a" stroke="none" font-size="14">conical-flask-500ml · 102 × 186 mm</text></g>
  </g>
</svg>
`.trimStart();

const normalizedComparison = () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 880" data-review-mode="visual-only" data-coordinate-unit="mm" role="img" aria-labelledby="title desc">
  <title id="title">Gold Master normalized-shape comparison sheet</title>
  <desc id="desc">Visual-only comparison. The common artboard exposes changed geometry parameters; it must never supply a quantitative measurement.</desc>
  <rect width="1500" height="880" fill="#202f34"/>
  <g fill="#eef6f7" font-family="Arial, sans-serif">
    <text x="55" y="55" font-size="28" font-weight="700">CHEMREALM GOLD MASTER / NORMALIZED SHAPE REVIEW</text>
    <text x="55" y="84" font-size="15" fill="#b8d0d2">visual-only · common artboard · changed geometry parameters are annotated · not measurement evidence</text>
  </g>
  <g data-layer="normalized-geometry" fill="none" stroke="#bfe1e3" stroke-width="4">
    <g data-asset-id="burette-acid-25ml-class-as"><rect x="150" y="140" width="34" height="430" rx="17" fill="#a8d5d9" fill-opacity=".28"/><path d="M167 570v26M151 596h32"/><path d="M190 150h34M190 180h23M190 210h23M190 240h34M190 270h23M190 300h23"/><text x="112" y="635" fill="#eef6f7" stroke="none" font-size="14">burette-acid-25ml-class-as</text></g>
    <g data-asset-id="burette-alkali-50ml-class-b"><rect x="430" y="125" width="42" height="445" rx="21" fill="#a8d5d9" fill-opacity=".28"/><path d="M451 570v26M431 596h40"/><path d="M478 135h38M478 165h26M478 195h26M478 225h38M478 255h26M478 285h26"/><circle cx="451" cy="592" r="12" fill="#aebdbc"/><text x="373" y="635" fill="#eef6f7" stroke="none" font-size="14">burette-alkali-50ml-class-b</text></g>
    <g data-asset-id="beaker-100ml"><path d="M690 205h118l-8 340h-102z" fill="#a8d5d9" fill-opacity=".28"/><ellipse cx="749" cy="205" rx="62" ry="10" fill="#a8d5d9" fill-opacity=".28"/><path d="M802 212l60 30-50 20"/><path d="M702 545h94"/><text x="690" y="635" fill="#eef6f7" stroke="none" font-size="14">beaker-100ml · short/wide marker</text></g>
    <g data-asset-id="beaker-250ml"><path d="M930 180h135l-8 365H938z" fill="#a8d5d9" fill-opacity=".28"/><ellipse cx="997" cy="180" rx="70" ry="11" fill="#a8d5d9" fill-opacity=".28"/><path d="M1058 188l57 29-48 21"/><path d="M948 545h99"/><text x="914" y="635" fill="#eef6f7" stroke="none" font-size="14">beaker-250ml · increased height/width ratio</text></g>
    <g data-asset-id="conical-flask-100ml"><path d="M1240 250h44v112l70 154h-184l70-154z" fill="#a8d5d9" fill-opacity=".28"/><path d="M1163 516h154"/><text x="1175" y="635" fill="#eef6f7" stroke="none" font-size="14">conical-flask-100ml · compact shoulder</text></g>
  </g>
  <g fill="#b8d0d2" font-family="Arial, sans-serif" font-size="14">
    <text x="55" y="760">Legend: height/width, shoulder angle, neck length, graduation density and actuator construction are changed geometry parameters.</text>
    <text x="55" y="790">This sheet is visual-only; consult the physical-scale sheet for declared dimensions.</text>
  </g>
</svg>
`.trimStart();

const stateVariants = [
  {
    id: "empty",
    visibleLayers: ["glass", "rim", "graduation", "hardware", "shadow"],
    description: "Geometry-only empty apparatus; no runtime quantity is baked into the master.",
  },
  {
    id: "filled",
    visibleLayers: ["glass", "rim", "graduation", "hardware", "liquid", "meniscus", "shadow"],
    description: "State-derived liquid and meniscus overlays supplied by Observable/RenderState.",
  },
  {
    id: "connected",
    visibleLayers: ["glass", "rim", "graduation", "hardware", "liquid", "meniscus", "detachable", "connection-highlight", "shadow"],
    description: "Detachable-part connection state; currently declared for burette specifications.",
  },
];

const stateManifest = {
  schemaVersion: 1,
  source: "RenderState apparatus state contract",
  variants: stateVariants,
  assets: entries.map((entry) => ({
    assetId: entry.assetId,
    supportedVariants: entry.familyId === "burette"
      ? ["empty", "filled", "connected"]
      : ["empty", "filled"],
  })),
};

const deterministicFixture = {
  schemaVersion: 1,
  fixtureId: "m6-gold-master-static-review-v1",
  renderMode: "asset-package-review",
  source: "Gold Master manifest plus state manifest; no chemistry or runtime measurement values",
  assetIds: entries.map((entry) => entry.assetId),
  backgrounds: ["dark-neutral", "light-neutral"],
  lods,
  stateManifest: "states/manifest.json",
  reviewSheets: ["qa/comparison-sheet-physical-scale.svg", "qa/comparison-sheet-normalized-shape.svg"],
};

const manifest = {
  schemaVersion: 1,
  assetVersionSource: "contracts/version-manifest.json#representation.apparatusAsset",
  catalogVersionSource: "contracts/version-manifest.json#representation.apparatusCatalog",
  visualFamily: "chemrealm-lab-v1",
  coordinateUnit: "mm",
  viewMode: "construction",
  lods,
  backgrounds: ["dark-neutral", "light-neutral"],
  statePackage: {
    manifest: "states/manifest.json",
    variants: stateVariants.map((variant) => variant.id),
    source: "RenderState apparatus state contract",
  },
  deterministicFixture: "fixture/render-fixture.json",
  backgroundQaStatus: "candidate-package-only; owner capture review pending",
  comparisonSheets: ["qa/comparison-sheet-physical-scale.svg", "qa/comparison-sheet-normalized-shape.svg"],
  assets: entries.map((entry) => ({
    assetId: entry.assetId,
    specificationId: entry.assetId,
    familyId: entry.familyId,
    capacityMl: entry.capacityMl,
    dimensionsMm: entry.dimensionsMm,
    identityLayers: entry.identityLayers,
    ...(entry.actuatorKind ? { actuatorKind: entry.actuatorKind } : {}),
    provenanceRefs: entry.provenanceRefs,
    lodFiles: { master: "master.svg", scene: "scene.svg", preview: "preview.svg", thumbnail: "thumbnail.svg" },
  })),
};

const sourceRecord = `# M6 Gold Master source record

## Package identity

This is the first owner-review Gold Master package for ChemRealm's original
apparatus family. It contains acid/alkali burettes, three beaker capacities and
three Erlenmeyer flask capacities. Every file is generated from the checked-in
construction source \`tools/create_gold_master_assets.mjs\`; the generated SVGs
are static review assets, not runtime chemistry data.
Regenerate the package with: node tools/create_gold_master_assets.mjs

## Originality boundary

The geometry, construction layers, gradients, proportions and comparison sheets
are original ChemRealm work. NOBOOK and vendor references informed broad
recognizability and apparatus structure only. No NOBOOK/vendor asset, screenshot,
icon, traced silhouette, texture, brand mark or distinctive layout is included.

## Geometry provenance

| Asset family | Source class | Anchors | Approximation boundary |
|---|---|---|---|
| Acid burette 25 mL | manufacturer-anchor + standard-family | DURAN 25 mL Class AS record; JY/T 0655 family | SVG proportions are a visual master; calibration truth remains upstream |
| Alkali burette 50 mL | standard-family | JY/T 0655 teaching-equipment family | 50 mL dimensions and pinch hardware are approximate visual anchors |
| Beakers 100/250/1000 mL | standard-family + approximate-visual | JY/T 0655 family and ChemRealm family proportions | capacity variants are visibly distinct but not certified drawings |
| Erlenmeyer 100/250/500 mL | manufacturer-anchor + standard-family | DURAN 250 mL anchor; JY/T 0655 family | 100/500 mL proportions are approximate visual variants |

The declared \`dimensionsMm\` are catalog geometry anchors. Runtime liquid level,
meniscus, readings, optical observation and chemical colour never come from
these SVGs.

## Construction decisions

- Glass uses rear/front edges, rim thickness, restrained body tint and a narrow
  directional highlight; it does not use a black cartoon outline or neon fill.
- Burette graduations increase downward and are geometry marks only; runtime
  values are not baked into any LOD.
- The acid burette exposes a glass/PTFE rotary mechanism; the alkali burette
  exposes a rubber-tube/glass-bead pinch mechanism.
- Beaker spouts and flask necks remain present through thumbnail LOD because
  they are family identity features.
- LODs remove detail deterministically while retaining semantic identity,
  declared dimensions, family identity and actuator identity.

## State and fixture boundary

The states/manifest.json record declares reusable state-layer coverage. The
SVGs intentionally expose empty runtime liquid and meniscus layers;
Observable/RenderState supplies their values and effects. The
fixture/render-fixture.json record fixes the first review set, four LODs,
two neutral backgrounds and the review sheets without embedding chemistry,
quantities or readings.

## Review boundary

This package is implementation evidence only. Dark/light background captures,
physical/normalized comparison review, accessibility review and owner visual
acceptance remain open in \`docs/evidence/M6.md\`. It does not claim M6 S3.
`;

const qaReadme = `# Gold Master QA

## Required matrix

Every asset is reviewed in \`master\`, \`scene\`, \`preview\` and \`thumbnail\`
LOD at both \`dark-neutral\` and \`light-neutral\` backgrounds. The current
package records the assets and deterministic LOD source; owner captures are
still pending.

| Check | Rule | Current package evidence |
|---|---|---|
| Structure | rim/base/body/neck/spout/scale/actuator remain family-owned layers | SVG \`data-layer\` records + manifest |
| LOD identity | capacity, dimensions, family and actuator identity do not change | manifest + four LOD files per asset |
| Material | restrained glass/metal/rubber values, no cartoon contour or halo | shared construction tokens |
| Background | dark-neutral and light-neutral remain legible | manifest matrix; owner captures pending |
| Runtime separation | no pH, reagent, reading, liquid quantity or chemical colour baked in | SVG package test |
| Originality | no NOBOOK/vendor artwork or external references | source record + self-contained SVGs |
| State coverage | declared empty/filled/connected variants remain RenderState-owned | states/manifest.json + deterministic fixture |
| Reproducibility | bounded asset set, LODs, backgrounds and review sheets are fixed | fixture/render-fixture.json |

## Gold Master set

\`burette-acid-25ml-class-as\`, \`burette-alkali-50ml-class-b\`,
\`beaker-100ml\`, \`beaker-250ml\`, \`beaker-1000ml\`,
\`conical-flask-100ml\`, \`conical-flask-250ml\`,
\`conical-flask-500ml\`.

The physical-scale sheet is measurement-valid for declared dimensions. The
normalized-shape sheet is explicitly visual-only and must not supply readings.

## Reproduction

Run node tools/create_gold_master_assets.mjs, then run the Gold Master package
test from the repository root. The generator is deterministic and does not
fetch external assets.
`;

const license = `# Asset license

Original ChemRealm Gold Master vector construction, manifests, comparison
sheets and QA records are distributed under **PolyForm Noncommercial 1.0.0**,
subject to the repository license and third-party notices.

External sources are cited for research and structural anchors only. No
third-party artwork, photograph, texture, font or brand mark is redistributed.
`;

await mkdir(join(outputRoot, "qa"), { recursive: true });
await mkdir(join(outputRoot, "states"), { recursive: true });
await mkdir(join(outputRoot, "fixture"), { recursive: true });
for (const entry of entries) {
  const assetRoot = join(outputRoot, entry.assetId);
  await mkdir(assetRoot, { recursive: true });
  for (const lod of lods) {
    await writeFile(join(assetRoot, `${lod}.svg`), renderAsset(entry, lod), "utf8");
  }
}
await writeFile(join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await writeFile(join(outputRoot, "source-record.md"), sourceRecord, "utf8");
await writeFile(join(outputRoot, "license.md"), license, "utf8");
await writeFile(join(outputRoot, "qa", "README.md"), qaReadme, "utf8");
await writeFile(join(outputRoot, "states", "manifest.json"), `${JSON.stringify(stateManifest, null, 2)}\n`, "utf8");
await writeFile(join(outputRoot, "fixture", "render-fixture.json"), `${JSON.stringify(deterministicFixture, null, 2)}\n`, "utf8");
await writeFile(join(outputRoot, "qa", "comparison-sheet-physical-scale.svg"), physicalComparison(), "utf8");
await writeFile(join(outputRoot, "qa", "comparison-sheet-normalized-shape.svg"), normalizedComparison(), "utf8");

console.log(`Generated ${entries.length} Gold Master assets × ${lods.length} LODs under ${outputRoot}`);
