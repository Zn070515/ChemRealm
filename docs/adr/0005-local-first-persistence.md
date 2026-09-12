# ADR-0005: Local-first persistence and export

- **Status:** **Accepted** — owner, 2026-09-11 (baseline `8310c685`)
- **Deferred decisions:** see the ADR's own `## Open questions` / `## Open decisions`;
  acceptance covers the decision, not the deferred sub-questions.
- **Date:** 2026-09-11
- **Deciders:** Project owner
- **Related:** `GOAL.md` §5.5, §9, §10; `CLAUDE.md` §12; `AGENTS.md` §13; `SPEC-0001`
- **Blocks:** `PLAN-0001` M8

## Context

`GOAL.md` §5.5 and §9 set the policy: no accounts, no mandatory registration, no
cloud-required progress, no public user uploads, learner state local by default,
and export/import for learning state. `GOAL.md` §10 sets the deployment target:
a free, non-commercial, ICP-filed site accessible in mainland China.

The owner chose a hybrid scientific architecture on 2026-09-11: TypeScript
solves in the browser, Python is test-time only. That choice has a persistence
consequence worth stating plainly — **there is no server component in v0, so
there is no server write path, and therefore no place for learner data to leak
to by accident.** This ADR is about keeping that property as the codebase grows,
not about achieving it.

The risk is drift. A future feature adds a "sync progress" call, or a crash
reporter, or an analytics ping. `AGENTS.md` §13 is explicit that telemetry is
not free and that changing these assumptions requires spec-level owner approval.

## Decision

**IndexedDB is the only persistence layer. It is the only place learner or world
data is written. There is no server write path in v0. Sharing happens only
through explicit user-initiated export.**

### Storage layout (indicative; `SPEC-0001` owns the schema)

| Object store | Contents | Keyed by |
|---|---|---|
| `worlds` | World metadata, lineage, branch tree, current schema version | `worldId` |
| `events` | Append-only domain event log | `[worldId, sequence]` |
| `snapshots` | Periodic and fork-point state caches (`ADR-0002`) | `[worldId, sequence]` |
| `learnerEvidence` | ACE evidence events, local only | `evidenceId` |
| `aceState` | ACE model state, uncertainty included | `learnerId` (local only) |
| `contentCache` | Parsed scenario/content definitions | `contentId@version` |

Nothing in this table is transmitted.

### Data classification

Every feature must fill this in, and `SPEC-0001` carries the filled version:

| Class | Definition |
|---|---|
| **Browser-local** | Written to IndexedDB, never leaves the device without an explicit user action. |
| **Server-request** | Sent to a server. Must be enumerated individually, with a justification each. |
| **Explicitly exportable** | Local data the user can choose to download as a file. |
| **Never collected** | Data the system must not generate or retain at all. |

For v0, **Server-request is empty except for static asset fetches.** That is a
testable claim, verified by network inspection (`SPEC-0001` AC-P2), not an
intention.

### Export format

Export produces a single self-describing, versioned bundle:

```json
{
  "format": "chemrealm.export",
  "formatVersion": 1,
  "schemaVersion": 2,
  "lineage": [ {
    "worldId": "world-1",
    "lineage": {
      "parentWorldId": null,
      "forkSequence": null,
      "forkStateHash": null
    }
  } ],
  "events": [ ],
  "includesLearnerEvidence": false,
  "createdAt": "…"
}
```

**Correction (2026-09-11, conformance finding R2).** This sketch previously
also carried `"solverConfig"` at the top level and a `"world"` object, and the
implementation added `scenarioSnapshot` and `contentHash` beside them. All four
duplicated what `WorldCreated.payload` already carries, with nothing checking
the copies agreed — the second-source-of-truth defect this project removed from
`Vessel.contents`, reappearing at a portability boundary. A field `no producer
ever wrote` (`world`) is worse still: no consumer could rely on it. The bundle
now carries the log and nothing the log already says.

Requirements:

- **Self-describing.** Schema version and solver configuration travel with the
  data, so a bundle is interpretable without the code that produced it. They
  travel *inside* the log — `events[0]` is `WorldCreated`, and
  `events[0].payload` carries `scenarioSnapshot`, `contentHash`, and
  `solverConfig`. Removing the top-level copies does not weaken this
  requirement; it removes a way for it to become false.
- **Complete or explicitly partial.** A bundle that omits learner evidence says
  so in a field, rather than being silently narrower than the user expects.
- **No tracking identifiers.** No personal, device, or cross-session tracking
  identifier; world ids, lineage ids, and fork hashes are required content, not
  learner identity.
- **Export is the only sharing path.** There is no upload endpoint to design,
  secure, or file a privacy notice for.

### Branch export is flattened

**Added 2026-09-11 (round 4, finding P1-3).** `ADR-0002` stores a branch as
`(shared immutable prefix) + (its own suffix)`. That is correct and efficient
*inside* IndexedDB. It does **not** transfer.

If a child branch is exported with only its suffix:

```
Root   events 0..20
   └── Child   events 21..35      ← exported alone
```

then the bundle cannot be replayed anywhere else — the prefix that produced the
child's starting state is missing. "Attach the event log to reproduce a bug"
would silently fail for every branch.

**Rule: export flattens.** Exporting a branch emits the **complete event log from
genesis to the branch tip** (`0..35` in the example), plus lineage metadata
recording the fork points. Internal storage may share the prefix; export is a
**portability boundary** and does not inherit an internal storage optimisation.

```
{
  "format": "chemrealm.export",
  "formatVersion": 1,
  "schemaVersion": 2,
  "lineage": [
    { "worldId": "root", "lineage": {
      "parentWorldId": null, "forkSequence": null, "forkStateHash": null
    } },
    { "worldId": "child", "lineage": {
      "parentWorldId": "root", "forkSequence": 20, "forkStateHash": "…"
    } }
  ],
  "events": [ /* 0..35, complete */ ],
  "includesLearnerEvidence": false
}
```

AC-R17 requires a round-trip test that exports a child, discards the parent
entirely, and replays to the same `replayHash`.

The alternative — exporting the whole branch graph — is more general and is
**deferred**: v0's sandbox worlds are small and the flattening cost is a few
hundred events. It is recorded here as the identified upgrade path rather than
left implicit.

### Never collected

Not generated, not stored, not derivable from stored data:

- names, emails, phone numbers, school, class, student id;
- precise geolocation, IP-derived identity, device fingerprints;
- cross-session advertising or behavioural identifiers;
- a server-side learner profile of any kind.

### Schema versioning and migration

- Every persisted record carries `schemaVersion`.
- Migrations are explicit, versioned, and tested forward. `SPEC-0001` requires a
  migration test for every version bump.
- The current persisted world/event migration `1 → 2` adds the explicit
  `ScenarioSnapshot.indicators` block as an empty list when no prior value was
  persisted. It never fabricates an indicator constant; an old request-local
  value that was not in genesis cannot be recovered. Because the snapshot bytes
  change, the World Runtime migration boundary rebuilds the derived genesis
  `contentHash` before loading the migrated event.
- The authored `Scenario` shape is a separate contract and is currently version
  3; authoring-only changes do not alter the persisted world migration path.
- **Migration failure must be loud.** A world that cannot be migrated is
  reported to the user and left untouched — never partially upgraded, never
  silently reset to a default. Silent reset destroys the user's work and is a
  P0-class defect.
- Downgrade (older app opening newer data) must be detected and refused with a
  clear message, not attempted.

### Storage quota

IndexedDB has no guaranteed quota. The runtime must:

- estimate usage and warn before a write likely to fail;
- degrade gracefully — a full store must not corrupt an existing world;
- offer export as the escape hatch, since export is the only durable backup.

## Alternatives considered

**Server-side persistence with a database.** Rejected for v0. It contradicts
`GOAL.md` §5.5 and §9, adds hosting cost and an ICP-visible data surface for a
non-commercial project, and creates learner data that must then be protected,
retained, and deleted on request. The owner's hybrid architecture removes the
server anyway.

**`localStorage` + periodic JSON blob.** Rejected. Synchronous, ~5 MB, blocks the
main thread, and a single blob has no partial-write safety. A corrupt write loses
everything.

**Origin Private File System (OPFS).** Not rejected — deferred. Better for large
binary assets (future molecular viewers, textures). IndexedDB is a fine
structured-record store and is universally available. Revisit when binary
payloads actually arrive.

**Encrypt local data at rest with a user passphrase.** Rejected for v0 as
security theatre in the current threat model: the threat is a shared classroom
computer, and there is no account system to derive a key from without adding
identity — which `GOAL.md` §9 forbids. Revisit if the product ever adds
genuinely sensitive learner data. Recorded because "we didn't think about
encryption" and "we considered it and it does not fit the threat model" are
different statements.

**Opt-in cloud sync.** Rejected — it is explicitly a non-goal for early
development (`GOAL.md` §18), and any such feature changes the privacy posture and
requires an owner-level amendment to `GOAL.md` §20.

## Consequences

### Positive
- The privacy claim in `GOAL.md` §5.5 is enforced by architecture, not by policy
  discipline. There is no server to misconfigure.
- No account system means no authentication surface, no credential storage, no
  breach exposure, and no minor-consent problem.
- The deployment surface for mainland China is static files: no database, no
  server-side personal information processing, no backend cost.

### Negative
- Clearing browser data destroys everything unless exported. Mitigated by an
  export prompt at meaningful milestones, not by a nagging reminder.
- No cross-device continuity. Accepted as a consequence of the no-account policy.
- Quota is not guaranteed and must be handled rather than assumed.
- IndexedDB's API is verbose; a thin typed wrapper is needed and must be tested.

### Neutral
- Export becomes the product's de facto data-portability story, which is a good
  position for an educational tool with no commercial interest in lock-in.

## Reversibility

**Asymmetric, and that is the point.** Adding a server later is easy. Walking
back a decision to *collect* data is not — the data exists, the obligation
exists, and the privacy claim is broken. So the default is local, permanently,
and any change requires an owner amendment per `GOAL.md` §20.

## Open questions

1. Should the export bundle be plain JSON (readable, diffable, larger) or a zip
   containing JSON plus future binary assets? **Leaning: plain JSON at v0**, with
   `formatVersion` allowing a future zip without breaking readers.
2. Should learner evidence live in the same IndexedDB database as worlds, or a
   separate one? Separate databases make "delete my learner data, keep my worlds"
   a clean operation. **Leaning: separate**, decided at M8.
