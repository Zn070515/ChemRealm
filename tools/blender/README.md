# Blender M6 vertical-slice jobs

This directory contains the first Blender-backed M6 experiment only:
`beaker-250ml-griffin`.

The job is deliberately MCP-free. MCP, if introduced later, must call these
same named jobs rather than become a second source of asset truth. The
authoritative inputs remain the ChemRealm construction record, measurement
sheet, package contract, and any genesis-owned `VolumeProfileSnapshot`.

## Rebuild

From the repository root, with Blender 5.2.2 available:

```powershell
node tools/blender/generate_toolchain.mjs
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python tools/blender/jobs/beaker-250ml-griffin/build.py -- --job tools/blender/jobs/beaker-250ml-griffin/job.json
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background assets/apparatus/masters/beaker-250ml/source/blender/beaker-250ml.blend --python tools/blender/jobs/beaker-250ml-griffin/render.py -- --job tools/blender/jobs/beaker-250ml-griffin/job.json --device OPTIX
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background assets/apparatus/masters/beaker-250ml/source/blender/beaker-250ml.blend --python tools/blender/jobs/beaker-250ml-griffin/validate.py -- --job tools/blender/jobs/beaker-250ml-griffin/job.json
```

The RTX/OptiX backend is the preferred review backend on the pinned local
toolchain and is recorded in render metadata. CPU remains an explicit fallback
for machines without a compatible GPU; it is not the visual-master default.
The backend identity is evidence metadata, not a claim that pixels are
cross-device bit-identical.

`validate.py` produces a structured candidate-only report. A deferred or
candidate result is not M6 S3 evidence. Visual owner review remains required.

The current beaker record has no frozen volume-profile snapshot. The job
records that boundary and does not invent one. The existing approximate
contained-volume marks are visual marks, not analytical metrology.
