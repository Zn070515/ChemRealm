import { Application, Container, Graphics, Text } from "pixi.js";

import { TITRATION_BENCH_ASSET } from "../assets/titration-bench.js";
import { type RenderNode, type RenderState } from "../state/scene.js";
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

function tintData(node: RenderNode | undefined): TintData | undefined {
  const value = node?.data.tint;
  if (typeof value !== "object" || value === null) return undefined;
  const tint = value as TintData;
  return tint.srgb === undefined || tint.srgb.length !== 3 ? undefined : tint;
}

function srgbToHex(srgb: readonly number[]): number {
  const channel = (value: number) => Math.max(0, Math.min(255, Math.round(value * 255)));
  return (channel(srgb[0] ?? 0) << 16) |
    (channel(srgb[1] ?? 0) << 8) |
    channel(srgb[2] ?? 0);
}

function liquidColour(state: RenderState): number {
  const tint = tintData(state.nodes.find((node) => node.id.startsWith("indicator-")));
  if (tint?.srgb === undefined) return T.liquidNeutral;
  const strength = typeof tint.strength === "number"
    ? Math.max(0, Math.min(1, tint.strength))
    : 1;
  const colour = srgbToHex(tint.srgb);
  // Blend weak optical observations with the neutral liquid token. This is a
  // presentation operation; the admitted optical observation remains the
  // only source of the tint.
  const blend = (from: number, to: number) => Math.round(
    ((from >> 16 & 0xff) * strength + (to >> 16 & 0xff) * (1 - strength)) * 0x10000 +
    ((from >> 8 & 0xff) * strength + (to >> 8 & 0xff) * (1 - strength)) * 0x100 +
    ((from & 0xff) * strength + (to & 0xff) * (1 - strength)),
  );
  return blend(colour, T.liquidNeutral);
}

function path(graphics: Graphics, commands: readonly (readonly [number, number])[]): Graphics {
  const first = commands[0];
  if (first === undefined) return graphics;
  graphics.moveTo(first[0], first[1]);
  for (const [x, y] of commands.slice(1)) graphics.lineTo(x, y);
  return graphics.closePath();
}

function addText(root: Container, text: Text, x: number, y: number): Text {
  text.position.set(x, y);
  root.addChild(text);
  return text;
}

function drawBackdrop(root: Container): void {
  root.addChild(new Graphics()
    .rect(0, 0, LOGICAL.width, LOGICAL.height)
    .fill({ color: T.background }));
  root.addChild(new Graphics()
    .roundRect(36, 32, LOGICAL.width - 72, LOGICAL.height - 100, 26)
    .fill({ color: T.surface })
    .stroke({ color: 0xd3dde3, width: 2 }));
  root.addChild(new Graphics()
    .rect(36, 596, LOGICAL.width - 72, 100)
    .fill({ color: T.bench })
    .stroke({ color: T.benchEdge, width: 2 }));
  root.addChild(new Graphics()
    .rect(36, 596, LOGICAL.width - 72, 7)
    .fill({ color: T.benchEdge }));
}

function drawStand(root: Container): void {
  root.addChild(new Graphics()
    .roundRect(110, 528, 190, 22, 11)
    .fill({ color: T.metal })
    .stroke({ color: T.metalHighlight, width: 2 }));
  root.addChild(new Graphics()
    .roundRect(194, 102, 22, 436, 10)
    .fill({ color: T.metal })
    .stroke({ color: T.metalHighlight, width: 2 }));
  root.addChild(new Graphics()
    .roundRect(194, 150, 198, 24, 12)
    .fill({ color: T.metal })
    .stroke({ color: T.metalHighlight, width: 2 }));
  root.addChild(new Graphics()
    .ellipse(205, 162, 42, 13)
    .fill({ color: T.metalHighlight })
    .stroke({ color: T.metal, width: 2 }));
}

function drawBurette(root: Container, state: RenderState): void {
  const x = 390;
  const top = 80;
  const height = 420;
  root.addChild(new Graphics()
    .roundRect(x, top, 54, height, 18)
    .fill({ color: T.glass, alpha: 0.72 })
    .stroke({ color: T.glassEdge, width: 3, alpha: 0.95 }));
  root.addChild(new Graphics()
    .roundRect(x + 10, top + 12, 8, height - 35, 4)
    .fill({ color: T.white, alpha: 0.58 }));
  const graduation = nodeById(state, "burette-apparatus")?.data.graduation;
  const maximum = typeof graduation === "object" && graduation !== null &&
    typeof (graduation as { maximumVolumeL?: unknown }).maximumVolumeL === "number"
    ? (graduation as { maximumVolumeL: number }).maximumVolumeL
    : TITRATION_BENCH_ASSET.graduation.maximumVolumeL;
  const majorEvery = typeof graduation === "object" && graduation !== null &&
    typeof (graduation as { majorEveryL?: unknown }).majorEveryL === "number"
    ? (graduation as { majorEveryL: number }).majorEveryL
    : TITRATION_BENCH_ASSET.graduation.majorEveryL;
  const minorEvery = typeof graduation === "object" && graduation !== null &&
    typeof (graduation as { minorEveryL?: unknown }).minorEveryL === "number"
    ? (graduation as { minorEveryL: number }).minorEveryL
    : TITRATION_BENCH_ASSET.graduation.minorEveryL;
  const ticks = new Graphics();
  const count = Math.round(maximum / minorEvery);
  for (let index = 0; index <= count; index += 1) {
    const y = top + (height * index) / count;
    const major = index % Math.round(majorEvery / minorEvery) === 0;
    ticks.moveTo(x + 54, y).lineTo(x + 54 + (major ? 18 : 10), y);
  }
  ticks.stroke({ color: T.tick, width: majorEvery > 0 ? 2 : 1, alpha: 0.9 });
  root.addChild(ticks);
  root.addChild(new Graphics()
    .roundRect(x - 10, top + height - 4, 74, 18, 7)
    .fill({ color: T.metal })
    .stroke({ color: T.metalHighlight, width: 2 }));
  root.addChild(new Graphics()
    .roundRect(x + 16, top + height + 12, 22, 70, 7)
    .fill({ color: T.glass, alpha: 0.72 })
    .stroke({ color: T.glassEdge, width: 3 }));
  addText(root, new Text({
    text: "burette",
    style: { fontFamily: "Arial", fontSize: 15, fill: T.text, letterSpacing: 1 },
  }), x - 2, top - 30);
  const reading = stringData(nodeById(state, "burette-reading"), "text");
  if (reading !== undefined) {
    addText(root, new Text({
      text: reading,
      style: { fontFamily: "Arial", fontSize: 16, fill: T.text },
    }), x + 82, top + 10);
  }
}

function drawFlask(root: Container, state: RenderState): void {
  const x = 590;
  const neckTop = 176;
  const neckBottom = 330;
  const bodyBottom = 548;
  const bodyLeft = 510;
  const bodyRight = 790;
  const outline = [
    [x - 28, neckTop], [x + 28, neckTop], [x + 28, neckBottom],
    [bodyRight, 420], [bodyRight, bodyBottom], [bodyLeft, bodyBottom],
    [bodyLeft, 420], [x - 28, neckBottom],
  ] as const;
  const fillHeight = numberData(nodeById(state, "flask-apparatus"), "fillHeightMm") ?? 0;
  const fillTop = Math.max(410, bodyBottom - Math.min(140, fillHeight * 1.4));
  const liquid = new Graphics();
  path(liquid, [
    [bodyLeft + 4, fillTop], [bodyRight - 4, fillTop],
    [bodyRight - 4, bodyBottom - 6], [bodyLeft + 4, bodyBottom - 6],
  ]).fill({ color: liquidColour(state), alpha: 0.84 });
  liquid.ellipse((bodyLeft + bodyRight) / 2, fillTop, (bodyRight - bodyLeft - 8) / 2, 9)
    .fill({ color: liquidColour(state), alpha: 0.94 });
  const glass = new Graphics();
  path(glass, outline).fill({ color: T.glass, alpha: 0.28 }).stroke({ color: T.glassEdge, width: 4 });
  root.addChild(liquid);
  root.addChild(glass);
  root.addChild(new Graphics()
    .roundRect(bodyLeft - 15, bodyBottom - 5, bodyRight - bodyLeft + 30, 18, 9)
    .fill({ color: T.glassEdge, alpha: 0.8 }));
  root.addChild(new Graphics()
    .roundRect(bodyLeft + 20, 430, 10, 92, 5)
    .fill({ color: T.white, alpha: 0.7 }));
  addText(root, new Text({
    text: "conical flask",
    style: { fontFamily: "Arial", fontSize: 15, fill: T.text, letterSpacing: 1 },
  }), bodyLeft + 18, bodyBottom + 30);
}

function drawBeaker(root: Container): void {
  const glass = new Graphics();
  path(glass, [[900, 400], [1040, 400], [1025, 548], [915, 548]])
    .fill({ color: T.glass, alpha: 0.28 })
    .stroke({ color: T.glassEdge, width: 4 });
  root.addChild(glass);
  root.addChild(new Graphics()
    .ellipse(970, 400, 70, 12)
    .fill({ color: T.glass, alpha: 0.35 })
    .stroke({ color: T.glassEdge, width: 3 }));
  addText(root, new Text({
    text: "beaker",
    style: { fontFamily: "Arial", fontSize: 15, fill: T.text, letterSpacing: 1 },
  }), 934, 570);
}

function drawIndicatorStatus(root: Container, state: RenderState): void {
  const indicator = state.nodes.find((node) => node.id.startsWith("indicator-"));
  const status = stringData(indicator, "opticalStatus");
  const label = status === "OPTICAL_MODEL_OK" ? "optical observation" : "optical model unavailable";
  addText(root, new Text({
    text: label,
    style: { fontFamily: "Arial", fontSize: 14, fill: T.text },
  }), 820, 74);
}

function drawState(root: Container, state: RenderState): void {
  if (state.nodes.some((node) => node.id === "titration-bench")) {
    drawBackdrop(root);
    drawStand(root);
    drawBurette(root, state);
    drawFlask(root, state);
    drawBeaker(root);
    drawIndicatorStatus(root, state);
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
  options.host.replaceChildren(app.canvas);
  app.canvas.setAttribute("aria-hidden", "true");
  app.canvas.dataset.renderer = "pixi";
  app.canvas.dataset.renderStateVersion = String(options.renderState.version);

  const update = (renderState: RenderState): void => {
    root.removeChildren().forEach((child) => child.destroy({ children: true }));
    drawState(root, renderState);
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
