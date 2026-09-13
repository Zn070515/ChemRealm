# ADR-0015: Central Version Manifest and Generated Release Metadata

**Status:** **Accepted** — owner direction, 2026-09-14

## Context

ChemRealm has several version namespaces: persisted schemas, scientific wire
contracts, model implementations, representation contracts, oracle artifacts,
and the build toolchains. Keeping their current values in separate TypeScript,
Rust, Python, package, and tool files makes a version change easy to apply
partially. A green test run can then hide a mixed-version build.

Historical migration fixtures and evidence snapshots still need to contain the
version they describe. They are records of past contracts, not live sources for
the current implementation.

## Decision

`contracts/version-manifest.json` is the only manually maintained source for
current ChemRealm release, contract, model, representation, oracle, toolchain,
and specification-revision versions.

The checked-in TypeScript module at
`packages/schema/src/generated/versions.ts` is generated from that manifest.
Rust `build.rs` reads the same manifest at compile time and emits its constants
into `OUT_DIR`; Rust source does not hand-maintain current version values.
Package metadata, the Python project version, and the Rust toolchain pin are
derived files updated by `pnpm generate:versions` and checked by
`pnpm verify:versions`.

PHREEQC source URLs and archive paths use `{version}` templates. The installer
expands them from the central manifest, so a tool manifest cannot silently pin
a different release. Current evidence artifacts are checked against the
manifest; changing a historical artifact requires an explicit regenerated
evidence baseline, not an incidental edit.

Production code must consume the generated manifest or a schema-owned alias.
Historical version literals are permitted only in explicitly historical
migration/reference records and their tests. Dependency versions and license
version identifiers are upstream metadata, not ChemRealm release identities,
and remain governed by their own lock/manifest rules.

## Consequences

- A version change has one authoring edit and one explicit generation step.
- CI fails when generated sources, package metadata, toolchain pins, PHREEQC
  templates, or current evidence artifacts drift.
- Contract-checking tools read the current specification-revision namespace from
  the same manifest instead of embedding the active revision in code.
- TypeScript and native backends cannot accidentally compile against different
  current wire/schema versions without a manifest change.
- Historical fixtures remain truthful instead of being rewritten to current
  values.
- The generated TypeScript file and package metadata still contain serialized
  copies because consumers need self-contained build inputs; they are derived
  artifacts, never independent authorities.

## Verification

```text
pnpm generate:versions
pnpm verify:versions
pnpm typecheck
pnpm test
pnpm native:test
```

`verify:versions` is a CI hard gate. It checks the generated source byte-for-
byte, derived metadata, current evidence records, PHREEQC version templates,
and active version literals in production source.

## Reversibility

The manifest and generator are easy to remove mechanically, but doing so would
reintroduce distributed version authorities. A future release/versioning
system may supersede this ADR only if it preserves one current authoring source,
explicit generated outputs, historical-record semantics, and a CI drift gate.
