import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const repositoryRoot = process.cwd();
const outputRoot = join(repositoryRoot, "assets", "apparatus", "catalog", "gold-master");
const sourcePath = join(repositoryRoot, "packages", "render", "src", "assets", "gold-master-construction.json");
const lods = ["master", "scene", "preview", "thumbnail"];
const lodDetail = { master: "full", scene: "scene", preview: "catalog", thumbnail: "identity" };
const source = JSON.parse(await readFile(sourcePath, "utf8"));

if (source.coordinateUnit !== "mm") throw new Error("Gold Master construction source must use millimetres");
if (source.schemaVersion !== 1) throw new Error("Unsupported Gold Master construction source schema");

const round = (value) => Number(value.toFixed(3));
const esc = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const layer = (name, content, attributes = "") => `<g data-layer="${name}"${attributes ? ` ${attributes}` : ""}>${content}</g>`;
const line = (x1, y1, x2, y2, className = "scale-line", attributes = "") => `<path d="M${round(x1)} ${round(y1)}L${round(x2)} ${round(y2)}" class="${className}"${attributes ? ` ${attributes}` : ""}/>`;

const MATERIALS = {
  "clear-borosilicate-ptfe": { glassStops: [[0, "#eef2f0", ".34"], [.22, "#ffffff", ".12"], [.58, "#d9e1de", ".20"], [1, "#b8c7c2", ".24"]], edge: "#65736f" },
  "clear-borosilicate-rubber": { glassStops: [[0, "#f1f4f1", ".32"], [.25, "#ffffff", ".10"], [.62, "#dde4df", ".18"], [1, "#b7c2bc", ".22"]], edge: "#6b7772" },
  "clear-borosilicate-open-vessel": { glassStops: [[0, "#f5f6f3", ".30"], [.24, "#ffffff", ".11"], [.62, "#e0e5e0", ".17"], [1, "#bec9c2", ".20"]], edge: "#707b75" },
  "clear-borosilicate-curved-vessel": { glassStops: [[0, "#f3f5f2", ".31"], [.27, "#ffffff", ".12"], [.61, "#dbe3dd", ".18"], [1, "#b8c4bc", ".22"]], edge: "#68746e" },
};

function materialDefs(asset) {
  const profile = MATERIALS[asset.materialProfile];
  if (!profile) throw new Error(`Unknown material profile: ${asset.materialProfile}`);
  const glass = profile.glassStops.map(([offset, color, opacity]) => `<stop offset="${offset}" stop-color="${color}" stop-opacity="${opacity}"/>`).join("");
  const ptfe = asset.geometry.actuator === "rotary-valve"
    ? `<linearGradient id="${asset.specificationId}-ptfe" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9ca39c"/><stop offset=".35" stop-color="#f5f4ec"/><stop offset=".72" stop-color="#d7d8d0"/><stop offset="1" stop-color="#858d87"/></linearGradient>`
    : "";
  const rubber = asset.geometry.actuator === "pinch-valve"
    ? `<linearGradient id="${asset.specificationId}-rubber" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2d3532"/><stop offset=".5" stop-color="#69736d"/><stop offset="1" stop-color="#252b29"/></linearGradient>`
    : "";
  const actuatorStyles = `${ptfe ? `.ptfe-fill{fill:url(#${asset.specificationId}-ptfe);stroke:#767d77;stroke-linejoin:round}` : ""}${rubber ? `.rubber-fill{fill:url(#${asset.specificationId}-rubber);stroke:#333b37;stroke-linecap:round;stroke-linejoin:round}` : ""}`;
  return `<defs><linearGradient id="${asset.specificationId}-glass" x1="0" y1="0" x2="1" y2="0">${glass}</linearGradient>${ptfe}${rubber}<style>.glass-fill{fill:url(#${asset.specificationId}-glass)}.glass-edge{fill:none;stroke:${profile.edge};stroke-linecap:round;stroke-linejoin:round}.glass-highlight{fill:none;stroke:#fff;stroke-linecap:round;stroke-linejoin:round}.scale-line{fill:none;stroke:#303935;stroke-linecap:round}.scale-label{fill:#303935;font-family:Arial,sans-serif}${actuatorStyles}</style></defs>`;
}

function graduation(asset, lod, x, y, height, tubeRight = undefined) {
  const scale = asset.graduation;
  if (!scale) return "";
  const count = Math.round(scale.maximumMl / scale.minorEveryMl);
  const majorEvery = Math.round(scale.majorEveryMl / scale.minorEveryMl);
  const mediumEvery = Math.max(1, Math.round(majorEvery / 2));
  const marks = [];
  for (let index = 0; index <= count; index += 1) {
    const major = index % majorEvery === 0;
    const medium = index % mediumEvery === 0;
    const visible = lod === "master" || (lod === "scene" && (major || medium)) || (lod === "preview" && major);
    if (!visible) continue;
    const yy = y + height * index / count;
    const length = major ? 4.8 : medium ? 3.2 : 2.1;
    const start = tubeRight ?? x;
    marks.push(line(start, yy, start + length, yy, "scale-line", `data-graduation-index="${index}" data-graduation-ml="${round(index * scale.minorEveryMl)}" data-graduation-kind="${major ? "major" : medium ? "medium" : "minor"}" stroke-width="${major ? .55 : medium ? .42 : .34}"`));
    if (major && lod !== "thumbnail") marks.push(`<text x="${round(start + length + 1.8)}" y="${round(yy + 1.4)}" class="scale-label" font-size="${lod === "master" ? 2.8 : 2.4}" data-graduation-label="${round(index * scale.minorEveryMl)}">${round(index * scale.minorEveryMl)}</text>`);
  }
  return marks.join("");
}

function semanticLayers(asset) {
  return [
    layer("liquid", "<desc>Runtime liquid layer.</desc>", "data-runtime=\"true\" display=\"none\""),
    layer("meniscus", "<desc>Runtime meniscus layer.</desc>", "data-runtime=\"true\" display=\"none\""),
    layer("support-interface", "<desc>Semantic support port. Visible clamp is scene-owned.</desc>", "data-semantic-only=\"true\" display=\"none\""),
    layer("detachable", "<desc>Semantic detachable-part boundary; no QA overlay is baked into the asset.</desc>", "data-semantic-only=\"true\" display=\"none\""),
    layer("accessibility", `<title>${esc(asset.displayName)}</title>`, "data-semantic-only=\"true\" display=\"none\""),
  ].join("");
}

function buretteGeometry(asset, lod) {
  const g = asset.geometry;
  const has = (role) => asset.lodVisibility[lod].includes(role);
  const maybe = (role, value) => has(role) ? value : "";
  const cx = g.centerX;
  const radius = asset.landmarksMm.tubeOuterDiameter / 2;
  const bodyEnd = g.tubeEndY;
  const profile = MATERIALS[asset.materialProfile];
  const body = `<path d="M${round(cx - radius)} 1Q${round(cx)} 0 ${round(cx + radius)} 1V${round(bodyEnd - 5)}Q${round(cx + radius)} ${round(bodyEnd)} ${round(cx + radius - 3)} ${round(bodyEnd)}H${round(cx - radius + 3)}Q${round(cx - radius)} ${round(bodyEnd)} ${round(cx - radius)} ${round(bodyEnd - 5)}Z" class="glass-fill" data-profile-boundary="tube"/>`;
  const rim = `<ellipse cx="${round(cx)}" cy="2" rx="${round(radius + 1)}" ry="1.8" class="glass-fill" stroke="${profile.edge}" stroke-width=".45"/><ellipse cx="${round(cx)}" cy="2" rx="${round(radius - .8)}" ry=".8" fill="#fff" fill-opacity=".22"/>`;
  const back = `<path d="M${round(cx - radius + 1.5)} 8V${round(bodyEnd - 7)}" class="glass-edge" stroke-width=".42" opacity=".65"/><path d="M${round(cx + radius - 1.5)} 8V${round(bodyEnd - 7)}" class="glass-edge" stroke-width=".34" opacity=".45"/>`;
  const front = `<path d="M${round(cx - radius + 3.5)} 9V${round(bodyEnd - 10)}" class="glass-highlight" stroke-width=".85" opacity=".5"/><path d="M${round(cx + radius - 3)} 14V${round(bodyEnd - 18)}" class="glass-highlight" stroke-width=".4" opacity=".28"/>`;
  const intervals = Math.round(asset.graduation.maximumMl / asset.graduation.minorEveryMl);
  const marks = graduation(asset, lod, cx + radius, asset.landmarksMm.graduationStartY, asset.landmarksMm.graduationEndY - asset.landmarksMm.graduationStartY, cx + radius);
  let mechanism = "";
  if (g.actuator === "rotary-valve") {
    const y = g.stopcockTopY;
    mechanism = layer("stopcock", `<path d="M${round(cx - 8)} ${round(y)}H${round(cx + 8)}Q${round(cx + 10)} ${round(y)} ${round(cx + 10)} ${round(y + 3)}V${round(y + 17)}Q${round(cx + 10)} ${round(y + 20)} ${round(cx + 7)} ${round(y + 20)}H${round(cx - 7)}Q${round(cx - 10)} ${round(y + 20)} ${round(cx - 10)} ${round(y + 17)}V${round(y + 3)}Q${round(cx - 10)} ${round(y)} ${round(cx - 8)} ${round(y)}Z" class="ptfe-fill" data-flow-node="stopcock"/>`, "data-part=\"burette.ptfe-stopcock\"")
      + layer("stopcock-key", `<path d="M${round(cx)} ${round(y + 10)}L${round(cx + 8)} ${round(y + 6)}" class="glass-edge" stroke="#59625d" stroke-width="1.2"/><rect x="${round(cx + 7)}" y="${round(y + 4.5)}" width="5" height="3" rx="1" fill="#d7d8d1" stroke="#69726b" stroke-width=".35"/>`, "data-part=\"burette.rotary-key\"")
      + layer("tip", `<path d="M${round(cx - 3)} ${round(y + 20)}H${round(cx + 3)}V${round(g.tipEndY - 17)}L${round(cx + 1.5)} ${round(g.tipEndY - 4)}Q${round(cx)} ${round(g.tipEndY)} ${round(cx - 1.5)} ${round(g.tipEndY - 4)}L${round(cx - 3)} ${round(g.tipEndY - 17)}Z" class="glass-fill" data-flow-node="outlet-tip"/><path d="M${round(cx)} ${round(y + 20)}V${round(g.tipEndY - 4)}" class="glass-edge" stroke-width=".6"/>`, "data-part=\"burette.tip\"");
  } else {
    const y = g.connectorTopY;
    const beadY = y + 28;
    mechanism = layer("lower-connector", `<path d="M${round(cx - 4)} ${round(y - 2)}H${round(cx + 4)}V${round(y + 12)}H${round(cx - 4)}Z" class="glass-fill" data-flow-node="lower-connector"/>`, "data-part=\"burette.lower-connector\"")
      + layer("rubber-tube", `<path d="M${round(cx)} ${round(y + 10)}C${round(cx - 1)} ${round(y + 17)} ${round(cx - 2)} ${round(y + 22)} ${round(cx)} ${round(beadY - 7)}S${round(cx + 2)} ${round(beadY + 3)} ${round(cx)} ${round(beadY + 10)}V${round(g.tipEndY - 28)}" class="rubber-fill" fill="none" stroke-width="4.4" data-flow-node="rubber-tube"/>`, "data-part=\"burette.rubber-delivery\"")
      + layer("glass-bead", `<circle cx="${round(cx)}" cy="${round(beadY)}" r="3.8" fill="#d5dbd4" stroke="#68736d" stroke-width=".55" data-flow-node="glass-bead"/>`, "data-part=\"burette.glass-bead\"")
      + layer("pinch-region", `<path d="M${round(cx - 6)} ${round(beadY + 10)}H${round(cx + 6)}" stroke="#59625d" stroke-width="2.2" stroke-linecap="round" data-flow-node="pinch-region"/>`, "data-part=\"burette.pinch-region\"")
      + layer("tip", `<path d="M${round(cx - 3)} ${round(g.tipEndY - 28)}H${round(cx + 3)}V${round(g.tipEndY - 10)}L${round(cx + 1.5)} ${round(g.tipEndY - 2)}Q${round(cx)} ${round(g.tipEndY)} ${round(cx - 1.5)} ${round(g.tipEndY - 2)}L${round(cx - 3)} ${round(g.tipEndY - 10)}Z" class="glass-fill" data-flow-node="outlet-tip"/><path d="M${round(cx)} ${round(g.tipEndY - 25)}V${round(g.tipEndY - 2)}" class="glass-edge" stroke-width=".6"/>`, "data-part=\"burette.tip\"");
  }
  const mechanismForLod = mechanism.replace(/<g data-layer="([^"]+)"[^>]*>[\s\S]*?<\/g>/g, (markup, name) => has(name) ? markup : "");
  const backForLod = lod === "master" ? back : back.replace(/<path[^>]+\/>$/, "");
  const frontForLod = lod === "master" ? front : front.replace(/<path[^>]+\/>$/, "");
  return [
    layer("body", body, "data-part=\"burette.body\""), maybe("glass-back", layer("glass-back", backForLod, "data-part=\"burette.body\"")), maybe("glass-front", layer("glass-front", frontForLod, "data-part=\"burette.body\"")), layer("rim", rim, "data-part=\"burette.rim\""),
    (has("graduation-major") || has("graduation-minor") || has("graduation-medium")) ? layer("graduation", marks, `data-part=\"burette.scale-on-tube\" data-graduation-intervals=\"${intervals}\"`) : "", mechanismForLod,
    maybe("highlight", layer("highlight", lod === "master" ? `<path d="M${round(cx - radius + 3.5)} 10V${round(bodyEnd - 12)}" class="glass-highlight" stroke-width=".9" opacity=".46"/><path d="M${round(cx + radius - 3)} 14V${round(bodyEnd - 18)}" class="glass-highlight" stroke-width=".4" opacity=".24"/>` : `<path d="M${round(cx - radius + 3.5)} 10V${round(bodyEnd - 12)}" class="glass-highlight" stroke-width=".9" opacity=".46"/>`)), semanticLayers(asset),
  ].join("\n");
}

function beakerGeometry(asset, lod) {
  const g = asset.geometry;
  const has = (role) => asset.lodVisibility[lod].includes(role);
  const maybe = (role, value) => has(role) ? value : "";
  const w = g.bodyWidth;
  const h = g.height;
  const r = g.baseRadius;
  const body = `<path d="M0 4Q0 0 4 0H${round(w - 4)}Q${round(w)} 0 ${round(w)} 4V${round(h - r)}Q${round(w)} ${round(h)} ${round(w - r)} ${round(h)}H${round(r)}Q0 ${round(h)} 0 ${round(h - r)}Z" class="glass-fill" data-profile-boundary="body"/>`;
  const rim = `<ellipse cx="${round(w / 2)}" cy="2.2" rx="${round(w / 2)}" ry="2.2" fill="#fff" fill-opacity=".17" stroke="#747e78" stroke-width=".55"/><path d="M0 2.2H${round(g.spoutRootX)}" class="glass-edge" stroke-width=".7"/>`;
  const spout = `<path d="M${round(g.spoutRootX)} ${round(g.spoutRootY)}C${round(g.spoutRootX + 3)} ${round(g.spoutRootY - .5)} ${round(g.spoutTipX - 7)} ${round(g.spoutRootY - 1.5)} ${round(g.spoutTipX)} ${round(g.spoutRootY - .5)}C${round(g.spoutTipX - 1)} ${round(g.spoutRootY + 2.5)} ${round(g.spoutTipX - 3)} ${round(g.spoutRootY + 5.5)} ${round(g.spoutTipX - 6)} ${round(g.spoutRootY + 6)}C${round(g.spoutTipX - 10)} ${round(g.spoutRootY + 6.5)} ${round(g.spoutRootX + 4)} ${round(g.spoutRootY + 5.5)} ${round(g.spoutRootX)} ${round(g.spoutRootY + 5)}Z" class="glass-fill" data-spout-root="rim-continuity" data-spout-root-x="${round(g.spoutRootX)}" data-spout-tip-x="${round(g.spoutTipX)}"/>`;
  const back = lod === "master"
    ? `<path d="M1.3 7V${round(h - r - 1)}Q1.3 ${round(h - 1)} ${round(r + 2)} ${round(h - 1)}" class="glass-edge" stroke-width=".5" opacity=".62"/><path d="M${round(w - 1.3)} 7V${round(h - r - 1)}Q${round(w - 1.3)} ${round(h - 1)} ${round(w - r - 2)} ${round(h - 1)}" class="glass-edge" stroke-width=".42" opacity=".4"/>`
    : `<path d="M1.3 7V${round(h - r - 1)}Q1.3 ${round(h - 1)} ${round(r + 2)} ${round(h - 1)}" class="glass-edge" stroke-width=".5" opacity=".62"/>`;
  const front = lod === "master"
    ? `<path d="M${round(4 + w * .12)} 8V${round(h - 7)}" class="glass-highlight" stroke-width="1.05" opacity=".38"/><path d="M${round(w - 5)} 10V${round(h - 8)}" class="glass-highlight" stroke-width=".38" opacity=".25"/>`
    : `<path d="M${round(4 + w * .12)} 8V${round(h - 7)}" class="glass-highlight" stroke-width="1.05" opacity=".38"/>`;
  const marks = graduation(asset, lod, w * .78, asset.landmarksMm.graduationStartHeight, h - asset.landmarksMm.graduationStartHeight - 8, w * .78);
  return [layer("body", body, "data-part=\"vessel.body\""), maybe("glass-back", layer("glass-back", back, "data-part=\"vessel.body\"")), maybe("glass-front", layer("glass-front", front, "data-part=\"vessel.body\"")), layer("rim", rim, "data-part=\"vessel.rim\""), layer("spout", spout, "data-part=\"vessel.spout\""), (has("graduation-major") || has("graduation-minor") || has("graduation-medium")) ? layer("graduation", marks, "data-part=\"vessel.scale\"") : "", maybe("highlight", layer("highlight", lod === "master" ? `<path d="M${round(8 + w * .15)} 10V${round(h - 10)}" class="glass-highlight" stroke-width=".55" opacity=".32"/><path d="M${round(w - 8)} 12V${round(h - 12)}" class="glass-highlight" stroke-width=".32" opacity=".22"/>` : `<path d="M${round(8 + w * .15)} 10V${round(h - 10)}" class="glass-highlight" stroke-width=".55" opacity=".32"/>`)), semanticLayers(asset)].join("\n");
}

function flaskGeometry(asset, lod) {
  const g = asset.geometry;
  const has = (role) => asset.lodVisibility[lod].includes(role);
  const c = g.centerX;
  const landmarks = asset.landmarksMm;
  const nw = landmarks.neckOuterDiameter / 2;
  const mouthRadius = landmarks.mouthOuterDiameter / 2;
  const neckEnd = landmarks.neckLength;
  const shoulder = landmarks.shoulderTransitionHeight;
  const base = g.baseY;
  const bw = landmarks.maxBodyDiameter / 2;
  const bottom = landmarks.flatBaseWidth / 2;
  const body = `<path d="M${round(c - nw)} 0H${round(c + nw)}V${round(neckEnd)}C${round(c + nw)} ${round(neckEnd + 4)} ${round(c + bw - 8)} ${round(shoulder + 4)} ${round(c + bw - 1)} ${round(shoulder + 17)}C${round(c + bw)} ${round(shoulder + 26)} ${round(c + bw)} ${round(base - 13)} ${round(c + bottom)} ${round(base - 7)}Q${round(c + bottom - 1)} ${round(base)} ${round(c + bottom - 8)} ${round(base)}H${round(c - bottom + 8)}Q${round(c - bottom + 1)} ${round(base)} ${round(c - bottom)} ${round(base - 7)}C${round(c - bw)} ${round(base - 13)} ${round(c - bw)} ${round(shoulder + 26)} ${round(c - bw + 1)} ${round(shoulder + 17)}C${round(c - bw + 8)} ${round(shoulder + 4)} ${round(c - nw)} ${round(neckEnd + 4)} ${round(c - nw)} ${round(neckEnd)}Z" class="glass-fill" data-profile-boundary="erlenmeyer-body" data-landmark-neck-length-mm="${round(neckEnd)}" data-landmark-shoulder-transition-mm="${round(shoulder)}" data-landmark-body-diameter-mm="${round(bw * 2)}"/>`;
  const neck = `<path d="M${round(c - nw)} 2V${round(neckEnd)}M${round(c + nw)} 2V${round(neckEnd)}" class="glass-edge" stroke-width=".55"/>`;
  const rim = `<ellipse cx="${round(c)}" cy="2" rx="${round(mouthRadius)}" ry="1.7" fill="#fff" fill-opacity=".17" stroke="#6d7771" stroke-width=".5"/><ellipse cx="${round(c)}" cy="2" rx="${round(mouthRadius - landmarks.wallThickness)}" ry=".7" fill="#fff" fill-opacity=".24"/>`;
  const shoulderLine = `<path d="M${round(c - nw)} ${round(neckEnd)}C${round(c - nw)} ${round(neckEnd + 4)} ${round(c - bw + 8)} ${round(shoulder + 4)} ${round(c - bw + 1)} ${round(shoulder + 17)}M${round(c + nw)} ${round(neckEnd)}C${round(c + nw)} ${round(neckEnd + 4)} ${round(c + bw - 8)} ${round(shoulder + 4)} ${round(c + bw - 1)} ${round(shoulder + 17)}" class="glass-edge" stroke-width=".5" opacity=".7"/>`;
  const back = lod === "master"
    ? `<path d="M${round(c - bw + 7)} ${round(base - 11)}C${round(c - bw + 10)} ${round(shoulder + 32)} ${round(c - nw + 3)} ${round(shoulder + 5)} ${round(c - nw + 2)} 8" class="glass-edge" stroke-width=".42" opacity=".55"/><path d="M${round(c + bw - 7)} ${round(base - 11)}C${round(c + bw - 10)} ${round(shoulder + 32)} ${round(c + nw - 3)} ${round(shoulder + 5)} ${round(c + nw - 2)} 8" class="glass-edge" stroke-width=".36" opacity=".35"/>`
    : `<path d="M${round(c - bw + 7)} ${round(base - 11)}C${round(c - bw + 10)} ${round(shoulder + 32)} ${round(c - nw + 3)} ${round(shoulder + 5)} ${round(c - nw + 2)} 8" class="glass-edge" stroke-width=".42" opacity=".55"/>`;
  const front = `<path d="M${round(c - nw + 3)} 10C${round(c - nw + 8)} ${round(shoulder + 9)} ${round(c - bw + 15)} ${round(shoulder + 26)} ${round(c - bw + 11)} ${round(base - 13)}" class="glass-highlight" stroke-width=".8" opacity=".35"/>`;
  const maybe = (role, value) => has(role) ? value : "";
  return [layer("body", body, "data-part=\"vessel.body\""), maybe("shoulder", layer("shoulder", shoulderLine, "data-part=\"vessel.shoulder\"")), maybe("neck", layer("neck", neck, "data-part=\"vessel.neck\"")), layer("rim", rim, "data-part=\"vessel.rim\""), maybe("glass-back", layer("glass-back", back, "data-part=\"vessel.body\"")), maybe("glass-front", layer("glass-front", front, "data-part=\"vessel.body\"")), maybe("highlight", layer("highlight", lod === "master" ? `<path d="M${round(c - nw + 4)} 12C${round(c - nw + 10)} ${round(shoulder + 10)} ${round(c - bw + 18)} ${round(shoulder + 26)} ${round(c - bw + 14)} ${round(base - 15)}" class="glass-highlight" stroke-width=".55" opacity=".3"/>` : "")), semanticLayers(asset)].join("\n");
}

function svgDocument(asset, lod, content) {
  const [width, height] = asset.physicalEnvelopeMm;
  const titleId = `${asset.specificationId}-${lod}-title`;
  const descId = `${asset.specificationId}-${lod}-desc`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${round(width)} ${round(height)}" data-asset-id="${asset.specificationId}" data-specification-id="${asset.specificationId}" data-family-id="${asset.familyId}" data-capacity-ml="${asset.capacityMl}" data-body-dimensions-mm="${asset.bodyEnvelopeMm.join(" ")}" data-dimensions-mm="${asset.physicalEnvelopeMm.join(" ")}" data-material-profile="${asset.materialProfile}" data-lod="${lod}" data-lod-detail="${lodDetail[lod]}" data-lod-visible-roles="${esc(asset.lodVisibility[lod].join("|"))}" data-coordinate-unit="mm" data-visual-role="apparatus-geometry" data-view-mode="${lod === "master" ? "construction" : lod === "scene" ? "experiment-world" : "catalog-preview"}" data-measurement-qualified="false" data-anatomy="${esc(asset.anatomy.join("|"))}" data-physical-envelope-mm="${asset.physicalEnvelopeMm.join(" ")}" role="img" aria-labelledby="${titleId} ${descId}"><title id="${titleId}">${esc(asset.displayName)} — ${lod} Gold Master candidate</title><desc id="${descId}">Original ChemRealm ${esc(asset.familyId)} construction in true millimetre coordinates. Runtime liquid, meniscus, reading, optical and chemical layers are supplied separately.</desc>${materialDefs(asset)}${content}</svg>`;
}

function renderAsset(asset, lod) {
  const content = asset.familyId === "burette" ? buretteGeometry(asset, lod) : asset.familyId === "beaker" ? beakerGeometry(asset, lod) : flaskGeometry(asset, lod);
  return svgDocument(asset, lod, content);
}

function masterInner(asset) {
  const svg = renderAsset(asset, "master");
  return { viewBox: `0 0 ${asset.physicalEnvelopeMm[0]} ${asset.physicalEnvelopeMm[1]}`, inner: svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>")) };
}

function embeddedMaster(asset, x, y, scale, reviewMode) {
  const { viewBox, inner } = masterInner(asset);
  const [width, height] = asset.physicalEnvelopeMm;
  return `<svg x="${round(x)}" y="${round(y)}" width="${round(width * scale)}" height="${round(height * scale)}" viewBox="${viewBox}" preserveAspectRatio="none" data-source-asset-id="${asset.specificationId}" data-source-lod="master" data-mm-to-px="${scale}" data-review-mode="${reviewMode}">${inner}</svg>`;
}

function physicalComparison(assets) {
  const scale = 1;
  const rows = [{ title: "Burettes", assets: assets.filter((item) => item.familyId === "burette"), y: 100 }, { title: "Beakers", assets: assets.filter((item) => item.familyId === "beaker"), y: 960 }, { title: "Erlenmeyer flasks", assets: assets.filter((item) => item.familyId === "conical-flask"), y: 1170 }];
  const markup = [];
  for (const row of rows) {
    markup.push(`<text x="20" y="${row.y - 22}" fill="#23312c" font-family="Arial,sans-serif" font-size="18" font-weight="700">${row.title}</text>`);
    let x = 70;
    for (const asset of row.assets) {
      markup.push(`<g data-review-family="${asset.familyId}">${embeddedMaster(asset, x, row.y, scale, "measurement-valid")}<text x="${round(x)}" y="${round(row.y + asset.physicalEnvelopeMm[1] + 20)}" fill="#23312c" font-family="Arial,sans-serif" font-size="10">${esc(asset.specificationId)} · ${asset.physicalEnvelopeMm[0]} × ${asset.physicalEnvelopeMm[1]} mm</text></g>`);
      x += asset.physicalEnvelopeMm[0] + 85;
    }
  }
  const ruler = Array.from({ length: 101 }, (_, index) => `<path d="M${round(20 + index * scale)} 45V${index % 10 === 0 ? 34 : 39}" stroke="#23312c" stroke-width="${index % 10 === 0 ? 1 : .45}"/>${index % 10 === 0 ? `<text x="${round(20 + index * scale)}" y="28" text-anchor="middle" fill="#23312c" font-size="8">${index}</text>` : ""}`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 1840" data-review-mode="measurement-valid" data-review-source="generated-from-master" data-coordinate-unit="review-px" data-mm-to-px="${scale}" role="img" aria-labelledby="physical-title physical-desc"><title id="physical-title">Gold Master Candidate physical-scale comparison</title><desc id="physical-desc">Every embedded master uses one ${scale} px per millimetre scale. This is dimensional review evidence, not a certified engineering drawing.</desc><rect width="760" height="1840" fill="#f5f7f4"/><text x="20" y="18" fill="#23312c" font-family="Arial,sans-serif" font-size="13" font-weight="700">CHEMREALM GOLD MASTER CANDIDATE · COMMON SCALE ${scale} px/mm</text><g>${ruler}</g>${markup.join("")}<text x="20" y="1818" fill="#66736d" font-family="Arial,sans-serif" font-size="8">Single review scale: 1 px/mm. Embedded assets are generated from their true physical envelopes; no fitted geometry is used here.</text></svg>`;
}

function normalizedComparison(assets) {
  const cells = assets.map((asset, index) => { const x = 30 + (index % 4) * 120; const y = 100 + Math.floor(index / 4) * 350; const scale = Math.min(100 / asset.physicalEnvelopeMm[0], 240 / asset.physicalEnvelopeMm[1]); return `<g data-review-family="${asset.familyId}">${embeddedMaster(asset, x, y, scale, "visual-only")}<text x="${x}" y="${y + 265}" fill="#eef4f1" font-family="Arial,sans-serif" font-size="9">${esc(asset.specificationId)}</text><text x="${x}" y="${y + 280}" fill="#b9c9c0" font-family="Arial,sans-serif" font-size="7">${esc(asset.anatomy.slice(0, 3).join(" · "))}</text></g>`; }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 820" data-review-mode="visual-only" data-review-source="generated-from-master" data-coordinate-unit="review-px" role="img" aria-labelledby="normalized-title normalized-desc"><title id="normalized-title">Gold Master Candidate normalized-shape comparison</title><desc id="normalized-desc">Visual-only comparison generated from actual master geometry. Cells use fitted geometry with changed geometry parameters only for shape comparison; they must not supply quantitative readings.</desc><rect width="500" height="820" fill="#26332e"/><text x="20" y="25" fill="#eef4f1" font-family="Arial,sans-serif" font-size="13" font-weight="700">CHEMREALM GOLD MASTER CANDIDATE · NORMALIZED SHAPE</text><text x="20" y="43" fill="#b9c9c0" font-family="Arial,sans-serif" font-size="8">visual-only · fitted cells · inspect family proportions and anatomy</text>${cells}<text x="20" y="805" fill="#b9c9c0" font-family="Arial,sans-serif" font-size="8">Not measurement evidence. Use the physical-scale sheet for common millimetre scale.</text></svg>`;
}

const stateVariants = [{ id: "empty", visibleLayers: ["apparatus-body", "rim-or-mouth", "contact-surface"], description: "Clean geometry with no runtime quantity baked into the asset." }, { id: "filled", visibleLayers: ["apparatus-body", "rim-or-mouth", "graduation-when-present", "contact-surface", "liquid", "meniscus"], description: "State-derived liquid and meniscus overlays supplied by Observable/RenderState." }, { id: "connected", visibleLayers: ["apparatus-body", "connection-port", "detachable", "connection-highlight"], description: "Semantic detachable connection state; scene composition owns visible clamps." }];
const stateManifest = { schemaVersion: 2, source: "RenderState apparatus state contract", variants: stateVariants, assets: source.specifications.map((asset) => ({ assetId: asset.specificationId, supportedVariants: asset.familyId === "burette" ? ["empty", "filled", "connected"] : ["empty", "filled"] })) };
const manifest = { schemaVersion: 3, status: "gold-master-candidate", sourceOfTruth: "packages/render/src/assets/gold-master-construction.json", assetVersionSource: "contracts/version-manifest.json#representation.apparatusAsset", catalogVersionSource: "contracts/version-manifest.json#representation.apparatusCatalog", visualFamily: source.visualFamily, coordinateUnit: "mm", viewMode: "construction", lods, backgrounds: ["dark-neutral", "light-neutral"], statePackage: { manifest: "states/manifest.json", variants: stateVariants.map((item) => item.id), source: "RenderState apparatus state contract" }, deterministicFixture: "fixture/render-fixture.json", backgroundQaStatus: "candidate-package-only; owner capture review pending", comparisonSheets: ["qa/comparison-sheet-physical-scale.svg", "qa/comparison-sheet-normalized-shape.svg"], assets: source.specifications.map((asset) => ({ assetId: asset.specificationId, specificationId: asset.specificationId, familyId: asset.familyId, capacityMl: asset.capacityMl, bodyDimensionsMm: asset.bodyEnvelopeMm, dimensionsMm: asset.physicalEnvelopeMm, materialProfile: asset.materialProfile, anatomy: asset.anatomy, landmarksMm: asset.landmarksMm, identityLayers: asset.identityLayers, graduation: asset.graduation, lodVisibility: asset.lodVisibility, provenanceRefs: asset.provenance.map((item) => item.sourceId), lodFiles: { master: "master.svg", scene: "scene.svg", preview: "preview.svg", thumbnail: "thumbnail.svg" } })) };
const deterministicFixture = { schemaVersion: 2, fixtureId: "m6-gold-master-static-review-v3", renderMode: "asset-package-review", source: manifest.sourceOfTruth, assetIds: source.specifications.map((asset) => asset.specificationId), backgrounds: manifest.backgrounds, lods, stateManifest: "states/manifest.json", reviewSheets: manifest.comparisonSheets };
const sourceRecord = `# Gold Master Candidate source record

This package is a bounded **Gold Master Candidate**, not an owner-approved Gold Master. The sole construction source is \`packages/render/src/assets/gold-master-construction.json\`. The generator reads that file and emits the typed catalog projection, manifests, SVG LODs and review sheets.

## Geometry contract

All SVG master coordinates are true millimetres. \`bodyEnvelopeMm\` records the vessel body; \`physicalEnvelopeMm\` records the complete visible envelope, including a beaker spout. The generated viewBox is exactly the physical envelope. Landmarks are consumed by geometry constructors and checked against generated paths; they are not decorative metadata.

## Family anatomy

- Acid burette: continuous glass tube, open rim, Schellbach-style reading stripe, PTFE rotary stopcock, rotary key, glass outlet and tip.
- Alkali burette: continuous glass tube, lower glass connector, one rubber delivery path, one glass bead, pinch region and glass tip.
- Beaker: straight-wall open body, rim-continuous local pouring lip/spout, calibrated marks and an integrated rounded contact region.
- Erlenmeyer flask: cylindrical neck, curved cubic shoulder, continuous conical body and an integrated rounded contact region.

Support ports, detachable semantics, liquid, meniscus, optical state, shadows and QA overlays are not clean-master pixels. A stand/clamp and scene shadow belong to composition.

## Source classes

The source records retain official manufacturer anchors where available: DURAN 25 mL Class AS burette (820 mm, 0.05 mL interval), Corning PYREX VISTA 250 mL Griffin beaker (approximately 70 mm OD × 95 mm height, 25 mL marks), and DURAN 250 mL Erlenmeyer (85 mm × 145 mm). Other capacity variants are explicitly approximate visual family profiles and must not be presented as certified metrology.

## LOD and review

The LOD manifest is semantic: master retains full construction and graduations, scene retains functional detail, preview retains recognition features, thumbnail retains identity features. All four LODs are shadow-free standalone geometry; scene shadows are added only when a scene relation supplies a bench/support.

The physical comparison sheet uses one shared millimetre-to-pixel factor and a ruler. The normalized sheet is visual-only. Dark/light full-size and thumbnail captures remain owner-review evidence and are not implied by package tests.
`;
const qaReadme = `# Gold Master Candidate QA

This is an implementation candidate. It is not a visual acceptance record.

Regenerate with \`node tools/create_gold_master_assets.mjs\`. The generator is deterministic, local-only and reads the single construction source.

Required review: dark-neutral and light-neutral backgrounds; full-size and thumbnail LODs; clean master without shadows, QA overlays or detached support hardware; continuous family anatomy; common physical-scale sheet; owner visual review against \`docs/visual/apparatus-standard.md\`.

Structural tests prove source/catalog/SVG identity, measured millimetre bounds, attached landmarks, calibrated graduation derivation, semantic LOD visibility and common comparison scale. They cannot approve taste, realism or visual quality by themselves.
`;
const license = "# Asset license\n\nOriginal ChemRealm Gold Master Candidate vector construction, manifests, comparison sheets and QA records are distributed under PolyForm Noncommercial 1.0.0, subject to the repository license and third-party notices. External sources are cited for research and structural anchors only; no third-party artwork, photograph, texture, font or brand mark is redistributed.\n";

await mkdir(join(outputRoot, "states"), { recursive: true });
await mkdir(join(outputRoot, "fixture"), { recursive: true });
await mkdir(join(outputRoot, "qa"), { recursive: true });
for (const asset of source.specifications) {
  const assetRoot = join(outputRoot, asset.specificationId);
  await mkdir(assetRoot, { recursive: true });
  for (const lod of lods) await writeFile(join(assetRoot, `${lod}.svg`), renderAsset(asset, lod) + "\n", "utf8");
}
await writeFile(join(outputRoot, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
await writeFile(join(outputRoot, "source-record.md"), sourceRecord, "utf8");
await writeFile(join(outputRoot, "license.md"), license, "utf8");
await writeFile(join(outputRoot, "qa", "README.md"), qaReadme, "utf8");
await writeFile(join(outputRoot, "states", "manifest.json"), JSON.stringify(stateManifest, null, 2) + "\n", "utf8");
await writeFile(join(outputRoot, "fixture", "render-fixture.json"), JSON.stringify(deterministicFixture, null, 2) + "\n", "utf8");
await writeFile(join(outputRoot, "qa", "comparison-sheet-physical-scale.svg"), physicalComparison(source.specifications) + "\n", "utf8");
await writeFile(join(outputRoot, "qa", "comparison-sheet-normalized-shape.svg"), normalizedComparison(source.specifications) + "\n", "utf8");
console.log(`Generated ${source.specifications.length} Gold Master Candidate assets × ${lods.length} LODs from ${sourcePath}`);
