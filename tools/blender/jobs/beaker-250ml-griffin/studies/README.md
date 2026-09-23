# 250 mL Griffin controlled visual studies

This directory contains the additive M6 Form/Glass/Lighting study job. It is
not a Gold Master package and it does not replace the existing vertical-slice
source or QA directory.

## Contract

- `study.json` is the only study manifest.
- `form` has candidates `F01`–`F04` and varies only form treatment.
- `glass` has candidates `G01`–`G04` and varies only glass treatment.
- `lighting` has candidates `L01`–`L03` and varies only lighting/reflection-card treatment.
- All candidates derive from the existing source `.blend`.
- Physical dimensions and chemistry remain owned by existing ChemRealm records.
- Outputs are written below `assets/apparatus/masters/beaker-250ml/qa/blender-studies/`.

## Host validation

```powershell
python tools/blender/jobs/beaker-250ml-griffin/studies/validate_study.py `
  --manifest tools/blender/jobs/beaker-250ml-griffin/studies/study.json
pnpm verify:m6-visual-studies
```

The host validator records source hashes and rejects path escape, duplicate
candidate IDs, unknown rounds, undeclared variables, missing source inputs, and
non-study status.

## Headless execution

The Blender commands are intentionally separate by round:

```powershell
blender -b --python tools/blender/jobs/beaker-250ml-griffin/studies/build_study.py -- `
  --manifest tools/blender/jobs/beaker-250ml-griffin/studies/study.json `
  --round form

blender -b --python tools/blender/jobs/beaker-250ml-griffin/studies/build_study.py -- `
  --manifest tools/blender/jobs/beaker-250ml-griffin/studies/study.json `
  --round glass --base-form F03

blender -b --python tools/blender/jobs/beaker-250ml-griffin/studies/build_study.py -- `
  --manifest tools/blender/jobs/beaker-250ml-griffin/studies/study.json `
  --round lighting --base-form F03 --base-glass G02
```

For the recorded backend comparison, render the selected F03 candidate into
the isolated `_cpu` directory and compare it with the canonical OptiX output:

```powershell
blender -b --python tools/blender/jobs/beaker-250ml-griffin/studies/render_study.py -- `
  --manifest tools/blender/jobs/beaker-250ml-griffin/studies/study.json `
  --round form --candidate F03 --device CPU --output-suffix=_cpu

blender -b --python tools/blender/jobs/beaker-250ml-griffin/compare.py -- `
  --left assets/apparatus/masters/beaker-250ml/qa/blender-studies/beaker-250ml-griffin-visual-studies-v1/form/F03/renders `
  --right assets/apparatus/masters/beaker-250ml/qa/blender-studies/beaker-250ml-griffin-visual-studies-v1/form/F03_cpu/renders `
  --output assets/apparatus/masters/beaker-250ml/qa/blender-studies/beaker-250ml-griffin-visual-studies-v1/backend-comparison/F03-optix-vs-cpu.json
```

The study status remains `study-only` until owner review. No output from this
directory may be described as a Gold Master, M6 S3, or M7-ready asset.

The rendered matrix and the owner-gated interpretation are recorded at:

```text
assets/apparatus/masters/beaker-250ml/qa/blender-studies/beaker-250ml-griffin-visual-studies-v1/review.md
```

That review is intentionally allowed to conclude that the current geometry is
still prototype-level. A passing structural/render job is not a visual-quality
acceptance.
