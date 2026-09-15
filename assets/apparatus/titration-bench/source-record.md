# Source record — ChemRealm titration bench

## Status

Original vector/2.5D master for M6 implementation. This is not traced from a
NOBOOK screenshot or another product. NOBOOK is used only as a quality and
surface-separation benchmark, as documented in
`docs/research/m6-nobook-web-evidence.md`.

## Production method

The silhouette, proportions, material layers, and light direction were
specified from the ChemRealm apparatus standard and reconstructed as an
editable SVG/vector master. No generative model, third-party texture, font,
photograph, or external runtime asset is used.

The master deliberately excludes graduations, units, liquid level, meniscus,
chemical colour, numeric readouts, and interaction outcomes. Those are
runtime-derived or renderer-generated layers.

## Runtime contract

- coordinate unit: millimetres;
- view: orthographic side elevation;
- volumetric profile identities: supplied by the frozen world frame;
- semantic parts/ports/capabilities: `manifest.json`;
- active asset version: `contracts/version-manifest.json` through generated
  `VERSION_MANIFEST.representation.apparatusAsset`.

## Review boundary

This record documents authorship and source boundary. It is not owner visual
acceptance; M6 S3 still requires named-viewport captures and visual review.
