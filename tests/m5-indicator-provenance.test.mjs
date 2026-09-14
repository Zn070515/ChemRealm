import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { INDICATOR_PALETTES } from "../packages/render/src/observable/tokens.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (relativePath) => readFileSync(`${root}/${relativePath}`, "utf8");

describe("M5 empirical indicator palette provenance", () => {
  it("resolves every render palette reference to a labelled reviewed artifact", () => {
    const tokens = read("packages/render/src/observable/tokens.ts");
    const manifest = JSON.parse(
      read("docs/visual/reference/indicator-palettes.json"),
    );
    const swatches = read("docs/visual/reference/indicator-reference-swatches.svg");
    const review = read("docs/visual/reference/indicator-palette-review.md");

    expect(manifest.catalogId).toBe("indicator-palette");
    expect(manifest.swatchArtifact).toBe(
      "docs/visual/reference/indicator-reference-swatches.svg",
    );
    expect(manifest.entries).toHaveLength(2);

    for (const entry of manifest.entries) {
      expect(entry.referenceId).toBe(
        `indicator-palette/${entry.indicatorId}`,
      );
      expect(tokens).toContain(`reference: "${entry.referenceId}"`);
      const palette = INDICATOR_PALETTES[entry.indicatorId];
      expect(palette).toBeDefined();
      expect(palette.indicatorId).toBe(entry.indicatorId);
      expect(toHex(palette.acidForm.srgb)).toBe(entry.acidForm.hex);
      expect(toHex(palette.baseForm.srgb)).toBe(entry.baseForm.hex);
      expect(entry.review.status).toBe("m5-contract-reviewed");
      expect(entry.review.record).toBe(
        "docs/visual/reference/indicator-palette-review.md",
      );
      expect(review).toContain(entry.referenceId);
      expect(entry.sources.length).toBeGreaterThan(0);
      expect(entry.sources.every((source) => source.url.startsWith("https://"))).toBe(
        true,
      );

      for (const form of [entry.acidForm, entry.baseForm]) {
        expect(swatches).toMatch(
          new RegExp(`id=["']${form.swatchId}["']`),
        );
        expect(swatchesContainLabel(swatches, form.swatchId, form.label)).toBe(
          true,
        );
      }
    }
  });
});

function swatchesContainLabel(svg, swatchId, label) {
  const escapedId = swatchId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `<g[^>]*id=["']${escapedId}["'][\\s\\S]*?<text[^>]*>${escapedLabel}</text>`,
    "i",
  ).test(svg);
}

function toHex(srgb) {
  return `#${srgb
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}
