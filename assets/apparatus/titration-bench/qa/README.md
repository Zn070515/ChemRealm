# Titration bench QA

The package is reviewed in the deterministic web fixture, not as an isolated
image only. The M6 QA sequence is:

1. verify the manifest and profile identities;
2. mount the Pixi renderer from `RenderState`;
3. inspect the liquid level, meniscus and scale in the DOM companion;
4. capture `desktop-primary`, `desktop-compact`, `tablet`, and `narrow`;
5. record originality, geometry, consistency, accessibility and network checks
   in `docs/visual/review-m6.md`.

No screenshot in this package is an owner-approved M6 baseline until that
review record is completed.
