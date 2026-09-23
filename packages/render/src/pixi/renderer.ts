import { Application, Assets, Container, Graphics, Sprite, Text, type Texture } from "pixi.js";

import { TITRATION_BENCH_ASSET } from "../assets/titration-bench.js";
import { assertInstrumentMarking } from "../assets/instrument-marking.js";
import { type RenderNode, type RenderState } from "../state/scene.js";
import { type BeakerSceneActor } from "../state/beaker-scene.js";
import { buildBeakerGraduationMarks, buildBeakerLiquidGeometry } from "./beaker-geometry.js";
import { TITRATION_LOGICAL_SIZE, TITRATION_RENDER_TOKENS as T } from "./tokens.js";

export interface PixiExperimentMount {
  readonly app: Application;
  readonly update: (renderState: RenderState) => void;
  readonly destroy: () => void;
}

export interface PixiExperimentMountOptions {
  readonly host: HTMLElement;
  readonly renderState: RenderState;
}

interface TintData {
  readonly srgb?: readonly number[];
  readonly strength?: number;
}

const LOGICAL = TITRATION_LOGICAL_SIZE;
const BEAKER_BODY_ASSET_URL = new URL(
  "../../../../assets/apparatus/masters/beaker-250ml/source/visual-body/body.png",
  import.meta.url,
).href;

function nodeById(state: RenderState, id: string): RenderNode | undefined {
  return state.nodes.find((node) => node.id === id);
}

function numberData(node: RenderNode | undefined, key: string): number | undefined {
  const value = node?.data[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringData(node: RenderNode | undefined, key: string): string | undefined {
  const value = node?.data[key];
  return typeof value === "string" ? value : undefined;
}

function objectData(node: RenderNode | undefined, key: string): Record<string, unknown> | undefined {
  const value = node?.data[key];
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : undefined;
}

function tintData(node: RenderNode | undefined): TintData | undefined {
  const value = node?.data.tint;
  if (typeof value !== "object" || value === null) return undefined;
  const tint = value as TintData;
  return tint.srgb === undefined || tint.srgb.length !== 3 ? undefined : tint;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function srgbToHex(srgb: readonly number[]): number {
  const channel = (value: number) => Math.max(0, Math.min(255, Math.round(value * 255)));
  return (channel(srgb[0] ?? 0) << 16) |
    (channel(srgb[1] ?? 0) << 8) |
    channel(srgb[2] ?? 0);
}

function blendHex(foreground: number, background: number, strength: number): number {
  const mix = (shift: number) => Math.round(
    ((foreground >> shift) & 0xff) * strength +
    ((background >> shift) & 0xff) * (1 - strength),
  );
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

function liquidColour(state: RenderState): number {
  const tint = tintData(state.nodes.find((node) => node.id.startsWith("indicator-")));
  if (tint?.srgb === undefined) return T.liquidNeutral;
  const strength = typeof tint.strength === "number"
    ? clamp(tint.strength, 0, 1)
    : 1;
  return blendHex(srgbToHex(tint.srgb), T.liquidNeutral, strength);
}

function beakerLiquidColour(actor: BeakerSceneActor): number {
  if (actor.liquid.appearance.status !== "observed") return T.liquidNeutral;
  return blendHex(
    srgbToHex(actor.liquid.appearance.tintSrgb),
    T.liquidNeutral,
    clamp(actor.liquid.appearance.tintStrength, 0, 1),
  );
}

function path(graphics: Graphics, commands: readonly (readonly [number, number])[]): Graphics {
  const first = commands[0];
  if (first === undefined) return graphics;
  graphics.moveTo(first[0], first[1]);
  for (const [x, y] of commands.slice(1)) graphics.lineTo(x, y);
  return graphics.closePath();
}

function addText(root: Container, value: string, x: number, y: number, options: {
  readonly size?: number;
  readonly color?: number;
  readonly weight?: "400" | "600" | "700";
  readonly letterSpacing?: number;
  readonly alpha?: number;
  readonly anchor?: number;
} = {}): Text {
  const text = new Text({
    text: value,
    style: {
      fontFamily: "Arial",
      fontSize: options.size ?? 14,
      fontWeight: options.weight ?? "400",
      fill: options.color ?? T.text,
      letterSpacing: options.letterSpacing ?? 0,
      padding: 2,
    },
  });
  text.alpha = options.alpha ?? 1;
  text.anchor.set(options.anchor ?? 0, 0);
  text.position.set(x, y);
  root.addChild(text);
  return text;
}

function drawBackdrop(root: Container): void {
  root.addChild(new Graphics()
    .rect(0, 0, LOGICAL.width, LOGICAL.height)
    .fill({ color: T.background }));
  root.addChild(new Graphics()
    .roundRect(28, 24, LOGICAL.width - 56, 566, 24)
    .fill({ color: T.surface })
    .stroke({ color: 0xc9d8dc, width: 2 }));
  const wall = new Graphics()
    .roundRect(48, 48, 1104, 60, 12)
    .fill({ color: T.surfaceInset })
    .stroke({ color: 0xd6e2e5, width: 1 });
  root.addChild(wall);
  addText(root, "TITRATION BENCH", 72, 66, { size: 18, weight: "700", letterSpacing: 2, color: T.text });
  addText(root, "ORTHOGRAPHIC / REUSABLE APPARATUS FAMILY", 1108, 68, {
    size: 12,
    letterSpacing: 1.2,
    color: T.textMuted,
    anchor: 1,
  });
  const bench = new Graphics()
    .rect(0, 606, LOGICAL.width, 154)
    .fill({ color: T.bench });
  bench.rect(0, 606, LOGICAL.width, 8).fill({ color: T.benchEdge });
  bench.rect(0, 614, LOGICAL.width, 3).fill({ color: T.benchHighlight, alpha: 0.7 });
  for (let y = 644; y < LOGICAL.height; y += 28) {
    bench.moveTo(0, y).lineTo(LOGICAL.width, y + 3);
  }
  bench.stroke({ color: T.benchEdge, width: 1, alpha: 0.17 });
  root.addChild(bench);
  root.addChild(new Graphics()
    .ellipse(526, 608, 320, 25)
    .fill({ color: T.metalDark, alpha: 0.12 }));
}

function drawStand(root: Container): void {
  const stand = new Graphics();
  // Base: bevelled cast-metal foot, rubber feet and a highlight plane.
  path(stand, [[70, 555], [278, 555], [307, 579], [43, 579]])
    .fill({ color: T.metalDark })
    .stroke({ color: T.metal, width: 3 });
  path(stand, [[78, 559], [270, 559], [291, 574], [62, 574]])
    .fill({ color: T.metalMid, alpha: 0.76 });
  stand.moveTo(83, 562).lineTo(271, 562).stroke({ color: T.metalHighlight, width: 3, alpha: 0.7 });
  stand.roundRect(94, 575, 32, 12, 6).fill({ color: T.metalDark });
  stand.roundRect(236, 575, 32, 12, 6).fill({ color: T.metalDark });
  // Rod with a bright front edge and collar marks.
  stand.roundRect(166, 103, 34, 458, 14)
    .fill({ color: T.metal })
    .stroke({ color: T.metalDark, width: 3 });
  stand.roundRect(174, 113, 8, 432, 4).fill({ color: T.metalHighlight, alpha: 0.65 });
  stand.rect(192, 114, 4, 430).fill({ color: T.metalDark, alpha: 0.68 });
  stand.roundRect(159, 270, 48, 11, 5).fill({ color: T.metalDark });
  stand.roundRect(155, 274, 56, 4, 2).fill({ color: T.metalHighlight, alpha: 0.6 });
  // Horizontal clamp arm and boss.
  stand.roundRect(181, 202, 244, 30, 14)
    .fill({ color: T.metal })
    .stroke({ color: T.metalDark, width: 3 });
  stand.roundRect(195, 207, 215, 7, 3).fill({ color: T.metalHighlight, alpha: 0.62 });
  stand.moveTo(408, 204).lineTo(444, 217).lineTo(408, 230).closePath()
    .fill({ color: T.metalMid })
    .stroke({ color: T.metalDark, width: 2 });
  stand.ellipse(451, 217, 28, 20)
    .fill({ color: T.metalHighlight })
    .stroke({ color: T.metalDark, width: 3 });
  stand.circle(451, 217, 8).fill({ color: T.metalDark });
  stand.moveTo(451, 217).lineTo(490, 217).stroke({ color: T.metalDark, width: 11, cap: "round" });
  stand.moveTo(453, 214).lineTo(486, 214).stroke({ color: T.white, width: 2, alpha: 0.65 });
  // Jaw plate, screw and a visible clamp pad.
  stand.roundRect(145, 185, 72, 60, 13)
    .fill({ color: T.metalMid })
    .stroke({ color: T.metalDark, width: 3 });
  for (const y of [198, 212, 226]) stand.moveTo(153, y).lineTo(209, y).stroke({ color: T.metalDark, width: 2, alpha: 0.45 });
  stand.circle(181, 214, 11).fill({ color: T.metalDark }).stroke({ color: T.metalHighlight, width: 2 });
  stand.circle(181, 214, 4).fill({ color: T.metalHighlight });
  root.addChild(stand);
}

function drawBurette(root: Container, state: RenderState): void {
  const node = nodeById(state, "burette-apparatus");
  const x = 390;
  const top = 76;
  const bodyHeight = 275;
  const bodyWidth = 56;
  const bottom = top + bodyHeight;
  const graduation = objectData(node, "graduation");
  const maximum = numberData(node, "maximumVolumeL") ??
    (typeof graduation?.maximumVolumeL === "number" ? graduation.maximumVolumeL : TITRATION_BENCH_ASSET.graduation.maximumVolumeL);
  const contained = numberData(node, "containedVolumeL");
  const liquidFraction = contained === undefined ? 0.62 : clamp(contained / maximum, 0, 1);
  const liquidTop = bottom - bodyHeight * liquidFraction;
  const liquid = liquidColour(state);
  // Rear glass and the state-derived liquid column.
  root.addChild(new Graphics()
    .roundRect(x, top, bodyWidth, bodyHeight, 18)
    .fill({ color: T.glassShadow, alpha: 0.16 }));
  root.addChild(new Graphics()
    .rect(x + 5, liquidTop, bodyWidth - 10, bottom - liquidTop)
    .fill({ color: liquid, alpha: 0.74 }));
  root.addChild(new Graphics()
    .ellipse(x + bodyWidth / 2, liquidTop + 2, bodyWidth / 2 - 7, 6)
    .fill({ color: liquid, alpha: 0.8 })
    .stroke({ color: T.white, width: 1.5, alpha: 0.6 }));
  const glass = new Graphics()
    .roundRect(x, top, bodyWidth, bodyHeight, 18)
    .fill({ color: T.glass, alpha: 0.36 })
    .stroke({ color: T.glassEdge, width: 3, alpha: 0.95 });
  // Schellbach-style central reading stripe and two-sided highlights.
  glass.roundRect(x + 24, top + 3, 8, bodyHeight - 8, 4).fill({ color: T.white, alpha: 0.19 });
  glass.roundRect(x + 27, top + 8, 3, bodyHeight - 18, 2).fill({ color: T.glassHighlight, alpha: 0.62 });
  glass.roundRect(x + 8, top + 15, 7, bodyHeight - 34, 3).fill({ color: T.white, alpha: 0.62 });
  glass.roundRect(x + 45, top + 12, 4, bodyHeight - 28, 2).fill({ color: T.glassShadow, alpha: 0.25 });
  root.addChild(glass);
  // Open rim and fill neck.
  root.addChild(new Graphics()
    .ellipse(x + bodyWidth / 2, top, bodyWidth / 2, 8)
    .fill({ color: T.surfaceInset, alpha: 0.58 })
    .stroke({ color: T.glassEdge, width: 3 }));
  const scale = new Graphics();
  const minorEvery = typeof graduation?.minorEveryL === "number" ? graduation.minorEveryL : TITRATION_BENCH_ASSET.graduation.minorEveryL;
  const majorEvery = typeof graduation?.majorEveryL === "number" ? graduation.majorEveryL : TITRATION_BENCH_ASSET.graduation.majorEveryL;
  const count = Math.max(1, Math.round(maximum / minorEvery));
  const majorStep = Math.max(1, Math.round(majorEvery / minorEvery));
  for (let index = 0; index <= count; index += 1) {
    const y = top + bodyHeight * index / count;
    const isMajor = index % majorStep === 0;
    const tickLength = isMajor ? 20 : index % 5 === 0 ? 14 : 9;
    scale.moveTo(x + bodyWidth, y).lineTo(x + bodyWidth + tickLength, y);
  }
  scale.stroke({ color: T.tick, width: 1.5, alpha: 0.95 });
  root.addChild(scale);
  for (let index = 0; index <= count; index += majorStep) {
    const y = top + bodyHeight * index / count;
    addText(root, `${Math.round(maximum * 1000 * index / count)} mL`, x + bodyWidth + 27, y - 7, {
      size: 11,
      color: T.textMuted,
      anchor: 0,
    });
  }
  // PTFE stopcock, glass tip, and a deliberately static outlet port marker.
  const hardware = new Graphics()
    .roundRect(x - 9, bottom - 4, bodyWidth + 18, 28, 8)
    .fill({ color: T.metal })
    .stroke({ color: T.metalDark, width: 3 });
  hardware.roundRect(x + 2, bottom + 2, bodyWidth - 4, 7, 3).fill({ color: T.metalHighlight, alpha: 0.62 });
  hardware.circle(x + bodyWidth / 2, bottom + 10, 10).fill({ color: T.metalHighlight }).stroke({ color: T.metalDark, width: 3 });
  hardware.moveTo(x + bodyWidth / 2, bottom + 10).lineTo(x + bodyWidth + 29, bottom - 7).stroke({ color: T.metalDark, width: 8, cap: "round" });
  hardware.moveTo(x + bodyWidth + 22, bottom - 10).lineTo(x + bodyWidth + 39, bottom - 16).stroke({ color: T.metalHighlight, width: 4, cap: "round" });
  hardware.moveTo(x + bodyWidth / 2 - 6, bottom + 24).lineTo(x + bodyWidth / 2 - 6, bottom + 66).stroke({ color: T.glassEdge, width: 11, cap: "round" });
  hardware.moveTo(x + bodyWidth / 2 - 2, bottom + 29).lineTo(x + bodyWidth / 2 - 2, bottom + 58).stroke({ color: T.white, width: 3, alpha: 0.65 });
  hardware.moveTo(x + bodyWidth / 2 - 12, bottom + 66).lineTo(x + bodyWidth / 2, bottom + 66).lineTo(x + bodyWidth / 2 - 5, bottom + 84).closePath().fill({ color: T.glass, alpha: 0.6 }).stroke({ color: T.glassEdge, width: 2 });
  root.addChild(hardware);
  addText(root, "BURETTE · 100 mL", x - 34, 35, { size: 14, weight: "700", letterSpacing: 1.1 });
  addText(root, "0 → 100 mL scale", x + 69, 57, { size: 10, color: T.textMuted });
  const reading = stringData(nodeById(state, "burette-reading"), "text");
  if (reading !== undefined) {
    root.addChild(new Graphics().roundRect(514, 72, 126, 32, 8).fill({ color: T.surfaceInset }).stroke({ color: 0xc4d4d8, width: 1 }));
    addText(root, reading, 528, 81, { size: 16, weight: "700", color: T.text });
  }
}

function drawFlask(root: Container, state: RenderState): void {
  const node = nodeById(state, "flask-apparatus");
  const center = 420;
  const neckTop = 405;
  const neckBottom = 465;
  const bodyBottom = 580;
  const bodyLeft = 260;
  const bodyRight = 580;
  const fillHeight = Math.max(0, numberData(node, "fillHeightMm") ?? 20);
  const maximumHeight = Math.max(fillHeight, numberData(node, "maximumHeightMm") ?? 100);
  const liquidTop = bodyBottom - 12 - clamp(fillHeight / maximumHeight, 0, 1) * 92;
  const widthAtTop = 56 + (liquidTop - neckBottom) * 1.32;
  const leftAtTop = center - widthAtTop / 2;
  const rightAtTop = center + widthAtTop / 2;
  const liquid = liquidColour(state);
  const liquidLayer = new Graphics();
  path(liquidLayer, [
    [leftAtTop, liquidTop], [rightAtTop, liquidTop],
    [bodyRight - 10, bodyBottom - 10], [bodyLeft + 10, bodyBottom - 10],
  ]).fill({ color: liquid, alpha: 0.78 });
  liquidLayer.ellipse(center, liquidTop + 1, Math.max(24, widthAtTop / 2 - 4), 7)
    .fill({ color: liquid, alpha: 0.84 })
    .stroke({ color: T.white, width: 1.5, alpha: 0.58 });
  root.addChild(liquidLayer);
  const outline = new Graphics();
  path(outline, [
    [394, neckTop], [446, neckTop], [446, neckBottom],
    [bodyRight, 472], [bodyRight, bodyBottom], [bodyLeft, bodyBottom],
    [bodyLeft, 472], [394, neckBottom],
  ]).fill({ color: T.glass, alpha: 0.28 }).stroke({ color: T.glassEdge, width: 4 });
  outline.roundRect(390, neckTop - 4, 60, 10, 5).fill({ color: T.surfaceInset, alpha: 0.5 }).stroke({ color: T.glassEdge, width: 3 });
  outline.ellipse(center, neckTop - 4, 30, 8).fill({ color: T.glass, alpha: 0.36 }).stroke({ color: T.glassEdge, width: 3 });
  // Same highlight direction as the burette, plus a broad shoulder glint.
  outline.roundRect(294, 475, 12, 78, 6).fill({ color: T.white, alpha: 0.65 });
  outline.roundRect(316, 452, 6, 101, 3).fill({ color: T.white, alpha: 0.30 });
  outline.moveTo(276, 550).lineTo(564, 550).stroke({ color: T.white, width: 6, alpha: 0.42 });
  root.addChild(outline);
  // A restrained maker mark and a local scale are visual object details, not a reading.
  const mark = new Graphics();
  mark.moveTo(505, 501).lineTo(541, 501).stroke({ color: T.glassEdge, width: 2, alpha: 0.7 });
  mark.moveTo(505, 511).lineTo(532, 511).stroke({ color: T.glassEdge, width: 2, alpha: 0.56 });
  mark.moveTo(505, 521).lineTo(541, 521).stroke({ color: T.glassEdge, width: 2, alpha: 0.7 });
  root.addChild(mark);
  root.addChild(new Graphics()
    .roundRect(bodyLeft - 15, bodyBottom - 6, bodyRight - bodyLeft + 30, 20, 8)
    .fill({ color: T.glassEdge, alpha: 0.78 })
    .stroke({ color: T.glassHighlight, width: 2, alpha: 0.55 }));
  addText(root, "ERLENMEYER FLASK", 321, 586, { size: 12, weight: "700", letterSpacing: 1.1 });
  addText(root, "250 mL", 431, 506, { size: 12, color: T.textMuted });
}

function drawBeaker(root: Container, state: RenderState, bodyTexture: Texture): void {
  const node = nodeById(state, "beaker-apparatus");
  const actor = node?.data.sceneActor as BeakerSceneActor | undefined;
  if (actor === undefined) return;
  const left = 786;
  const right = 974;
  const top = 316;
  const bottom = 570;
  const width = right - left;
  const height = bottom - top;
  const fillFraction = clamp(
    actor.liquid.heightMm / Math.max(actor.liquid.profileMaxHeightMm, Number.EPSILON),
    0,
    1,
  );
  const liquidGeometry = buildBeakerLiquidGeometry(fillFraction);
  const toScene = ([x, y]: readonly [number, number]): readonly [number, number] => [
    left + x * width,
    top + y * height,
  ];

  // NOBOOK-aligned scene composition: the authored vessel body establishes the
  // visual material, the state-derived liquid is clipped to a visual cavity,
  // and deterministic markings are projected from the apparatus contract. The
  // geometry helper is visual-only; volume and appearance still come from the
  // ObservableModel. A production back/front glass decomposition remains a
  // separate admission task.
  const body = new Sprite(bodyTexture);
  body.position.set(760, 290);
  body.width = 250;
  body.height = 300;
  root.addChild(body);

  const liquidColour = beakerLiquidColour(actor);
  const liquidDepthColour = blendHex(liquidColour, T.glassShadow, 0.24);
  const liquidHighlight = blendHex(liquidColour, T.white, 0.42);
  const bodyPoints = liquidGeometry.body.map(toScene);
  const liquid = new Graphics();
  // The body is deliberately layered over the authored body rather than
  // weakening the body sprite. This keeps the approved rim/base/glass detail
  // intact while the liquid contributes only its optical material response.
  path(liquid, bodyPoints)
    .fill({
      color: liquidColour,
      alpha: actor.liquid.appearance.status === "observed" ? 0.34 : 0.16,
    });
  // A second, low-contrast depth pass prevents the state layer from reading as
  // a uniformly filled polygon. It is still a visual response, not a chemical
  // colour model or an independently authored palette.
  path(liquid, bodyPoints)
    .fill({ color: liquidDepthColour, alpha: actor.liquid.appearance.status === "observed" ? 0.10 : 0.06 });
  const leftWall = bodyPoints[0];
  const rightWall = bodyPoints[1];
  const leftBase = bodyPoints.at(-1);
  const rightBase = bodyPoints[2];
  if (leftWall !== undefined && leftBase !== undefined) {
    liquid.moveTo(leftWall[0], leftWall[1]).lineTo(leftBase[0], leftBase[1])
      .stroke({ color: liquidDepthColour, width: 5, alpha: 0.28 });
  }
  if (rightWall !== undefined && rightBase !== undefined) {
    liquid.moveTo(rightWall[0], rightWall[1]).lineTo(rightBase[0], rightBase[1])
      .stroke({ color: liquidDepthColour, width: 5, alpha: 0.28 });
  }
  if (leftBase !== undefined && rightBase !== undefined) {
    liquid.moveTo(leftBase[0] + 4, leftBase[1] - 5).lineTo(rightBase[0] - 4, rightBase[1] - 5)
      .stroke({ color: liquidDepthColour, width: 7, alpha: 0.22 });
  }
  const surfaceCenterX = left + ((liquidGeometry.surface.left + liquidGeometry.surface.right) / 2) * width;
  const surfaceWidth = (liquidGeometry.surface.right - liquidGeometry.surface.left) * width / 2;
  const surfaceY = top + liquidGeometry.surface.y * height;
  liquid.ellipse(surfaceCenterX, surfaceY, surfaceWidth, liquidGeometry.surface.depth * height)
    .fill({
      color: liquidHighlight,
      alpha: actor.liquid.appearance.status === "observed" ? 0.30 : 0.16,
    })
    .stroke({
      color: liquidDepthColour,
      width: 2.2,
      alpha: 0.58,
    });
  liquid.ellipse(surfaceCenterX, surfaceY + liquidGeometry.surface.depth * height * 0.25, surfaceWidth * 0.94, liquidGeometry.surface.depth * height * 0.38)
    .stroke({ color: T.white, width: 1.2, alpha: actor.liquid.appearance.status === "observed" ? 0.34 : 0.16 });
  root.addChild(liquid);

  const scale = new Graphics();
  const rawMarking = node?.data.graduation;
  if (rawMarking !== undefined) {
    assertInstrumentMarking(rawMarking);
    const marks = buildBeakerGraduationMarks(rawMarking, {
      start: top + height * 0.25,
      end: top + height * 0.78,
    });
    for (const mark of marks) {
      const tickLength = mark.isMajor ? 30 : 20;
      scale.moveTo(left + 12, mark.y).lineTo(left + 12 + tickLength, mark.y)
        .stroke({ color: T.tick, width: mark.isMajor ? 1.6 : 1.1, alpha: 0.84 });
      if (mark.showLabel) {
        addText(root, `${mark.valueMl} mL`, left + 47, mark.y - 5, {
          size: 8,
          color: T.textMuted,
          anchor: 0,
        });
      }
    }
  }
  root.addChild(scale);
  addText(root, "BEAKER", left + 40, 594, { size: 12, weight: "700", letterSpacing: 1.3 });
  addText(root, "250 mL", left + 105, 594, { size: 10, color: T.textMuted });
}

function drawInspectionCard(root: Container, state: RenderState): void {
  const indicator = state.nodes.find((node) => node.id.startsWith("indicator-"));
  const status = stringData(indicator, "opticalStatus");
  const isAvailable = status === "OPTICAL_MODEL_OK";
  const card = new Graphics()
    .roundRect(700, 126, 430, 92, 14)
    .fill({ color: T.surfaceInset, alpha: 0.86 })
    .stroke({ color: 0xc6d7db, width: 1.5 });
  card.roundRect(718, 144, 8, 56, 4).fill({ color: isAvailable ? 0x3b9b78 : 0xd28c46 });
  root.addChild(card);
  addText(root, "OPTICAL OBSERVATION", 744, 143, { size: 12, weight: "700", letterSpacing: 1.1 });
  addText(root, isAvailable ? "profile admitted" : "model boundary / neutral liquid", 744, 169, {
    size: 14,
    color: isAvailable ? 0x2d705b : 0x895f2b,
  });
  addText(root, isAvailable ? "colour is state-derived" : "reason remains visible in inspection", 744, 193, {
    size: 11,
    color: T.textMuted,
  });
}

function drawState(root: Container, state: RenderState, beakerBodyTexture: Texture): void {
  if (state.nodes.some((node) => node.id === "titration-bench")) {
    drawBackdrop(root);
    drawStand(root);
    drawBurette(root, state);
    drawFlask(root, state);
    drawBeaker(root, state, beakerBodyTexture);
    drawInspectionCard(root, state);
  }
}

function fitLogicalScene(root: Container, host: HTMLElement): void {
  const width = Math.max(1, host.clientWidth);
  const height = Math.max(1, host.clientHeight);
  const scale = Math.min(width / LOGICAL.width, height / LOGICAL.height);
  root.scale.set(scale);
  root.position.set(
    (width - LOGICAL.width * scale) / 2,
    (height - LOGICAL.height * scale) / 2,
  );
}

/** Mount a deterministic, static Pixi adapter below the renderer-neutral scene boundary. */
export async function mountPixiExperiment(
  options: PixiExperimentMountOptions,
): Promise<PixiExperimentMount> {
  if (!options.host.isConnected && options.host.ownerDocument === null) {
    throw new Error("Pixi host must belong to a document");
  }
  const app = new Application();
  await app.init({
    resizeTo: options.host,
    backgroundColor: T.background,
    antialias: true,
    autoStart: false,
    autoDensity: true,
    resolution: Math.min(2, Math.max(1, globalThis.devicePixelRatio ?? 1)),
    preference: "webgl",
  });
  const root = new Container();
  app.stage.addChild(root);
  const beakerBodyTexture = await Assets.load<Texture>(BEAKER_BODY_ASSET_URL);
  options.host.replaceChildren(app.canvas);
  app.canvas.setAttribute("aria-hidden", "true");
  app.canvas.dataset.renderer = "pixi";
  app.canvas.dataset.renderStateVersion = String(options.renderState.version);

  const update = (renderState: RenderState): void => {
    root.removeChildren().forEach((child) => child.destroy({ children: true }));
    drawState(root, renderState, beakerBodyTexture);
    app.canvas.dataset.renderStateVersion = String(renderState.version);
    fitLogicalScene(root, options.host);
    app.render();
  };
  const onResize = (): void => {
    fitLogicalScene(root, options.host);
    app.render();
  };
  const observer = typeof ResizeObserver === "undefined"
    ? undefined
    : new ResizeObserver(onResize);
  observer?.observe(options.host);
  window.addEventListener("resize", onResize, { passive: true });
  update(options.renderState);

  let destroyed = false;
  return {
    app,
    update,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      observer?.disconnect();
      window.removeEventListener("resize", onResize);
      app.destroy(true, { children: true });
    },
  };
}
