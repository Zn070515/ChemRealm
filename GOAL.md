# GOAL.md

> Status: Project Constitution  
> Priority: Highest-level product intent  
> Rule: Lower-level specs, plans, ADRs, implementations, and agent instructions MUST NOT contradict this file without an explicit owner-approved amendment.

# 1. Mission

Build a free, public, high-trust interactive chemistry platform centered on Chinese high-school chemistry learning, especially the Zhejiang Gaokao ecosystem, while grounding the simulated chemical world in scientifically defensible undergraduate-to-research-level models wherever practical.

The product exists to make chemistry:

1. **Correct** — the underlying world must obey defensible chemistry, not exam-keyword scripts.
2. **Visible** — invisible chemical state, mechanism, structure, error propagation, and counterfactual change should become inspectable and interactive.
3. **Thinkable** — students should gradually become better at constructing, testing, revising, and transferring chemical models instead of memorizing more templates.

The platform is not intended to replace real experiments, teachers, textbooks, or higher education. It should make things visible, testable, replayable, and comparable that are difficult to observe or isolate in real classrooms.

# 2. Product Identity

This project is **not** merely:

- a NOBOOK clone;
- a chemistry animation collection;
- a problem bank;
- an AI answer generator;
- a collection of hard-coded reaction effects;
- a university chemistry encyclopedia;
- a school management platform;
- an online tutoring business.

It is a unified **Chemical World** with multiple projections.

The same chemical world may be entered as:

- a free sandbox;
- a guided learning task;
- a challenge/exam scene;
- a teacher presentation;
- a comparison/counterfactual experiment;
- an inspection view exposing micro/macro/symbolic layers.

These are views and policies over one world model, not independent products.

# 3. Primary Users

The primary users are:

1. Chinese high-school chemistry students, with Zhejiang students as the first design pressure test.
2. High-school chemistry teachers who need reliable classroom demonstration and comparison tools.
3. Advanced high-school students who want deeper scientific explanations.
4. Learners who struggle with chemistry and need structured support to construct useful mental models.

The platform MUST NOT be designed only for top students.

A student who is strong at chemistry should be able to disable support and move quickly.  
A student who is lost should be able to receive carefully staged support without being buried under advanced theory.

# 4. Scope Boundary

## 4.1 Front-end teaching scope

The default teaching scope is Chinese high-school chemistry and the real problem-solving ecology surrounding Zhejiang Gaokao and high-level mock examinations.

This includes unfamiliar contexts that may borrow concepts from:

- general chemistry;
- physical chemistry;
- analytical chemistry;
- inorganic/coordination chemistry;
- organic chemistry;
- materials chemistry;
- electrochemistry;
- chemical engineering.

A concept may appear in the product even when it is not formally required by the high-school syllabus if it materially helps students understand a real style of Gaokao/mock-exam reasoning.

## 4.2 Scientific scope

The scientific backend is not bounded by the high-school syllabus.

When the correct simulation requires higher-level models, the system SHOULD use them or explicitly report that the current model is insufficient.

The front end may simplify representation.  
The scientific core MUST NOT knowingly simplify truth merely because the learner is in high school.

# 5. Non-Negotiable Product Principles

## 5.1 One scientific truth layer

There MUST NOT be separate contradictory “high-school chemistry truth” and “real chemistry truth” engines.

There is one Scientific Reality layer.

Teaching views may:

- hide variables;
- aggregate species;
- suppress unnecessary equations;
- show only the currently useful approximation;
- explain a high-school heuristic;
- expose a deeper model on demand.

Teaching views MUST NOT falsify the underlying scientific state.

## 5.2 Model validity over fake precision

Every serious scientific model MUST have:

- a stated domain of validity;
- data/model provenance where practical;
- units;
- version information;
- a known failure or fallback policy.

If a model is outside its reliable domain, the preferred behavior is:

`MODEL_OUT_OF_DOMAIN`

or an explicitly labeled approximation.

The project MUST NOT silently return precise-looking numbers from an invalid model.

## 5.3 Scientific state is not visual state

The renderer MUST NOT contain the scientific truth.

Scientific state flows through an observable/representation layer before rendering.

Example:

`scientific state -> observable model -> visual state -> renderer`

Hard-coded shortcuts such as:

`if FeCl3 then yellow`

are prohibited unless they are implemented as a documented empirical observable model with provenance and a clear applicability range.

## 5.4 Event-sourced world

Important interactions MUST be representable as events.

The World Runtime SHOULD support:

- deterministic replay where feasible;
- undo/redo;
- time travel;
- branch/fork;
- compare;
- reproducible bug reports;
- local persistence;
- export/import.

A counterfactual branch should be a first-class world operation, not a special-case feature.

## 5.5 Local-first privacy

The default product direction is:

- no account system;
- no mandatory registration;
- no public profile;
- no forum;
- no comments;
- no public user uploads;
- no behavioral advertising;
- no commercial tracking.

Sandbox event streams SHOULD remain local by default.

The existence of a technically collectible event MUST NOT be treated as permission to upload or retain it.

Guided learning may derive high-information learning evidence from user interaction, but the default architecture SHOULD keep learner state local unless the owner explicitly changes this policy.

## 5.6 No monetization

This project is created as a public-interest, passion-driven chemistry project.

The product MUST NOT introduce:

- paid memberships;
- paid courses;
- paywalls;
- advertising monetization;
- premium scientific correctness;
- commercial tutoring funnels.

Any proposal that changes this principle requires an explicit owner-level amendment to this file.

## 5.7 Visual quality is a product requirement

Visual quality is not deferred polish.

The finished product should reach at least the perceived quality bar of mature high-school virtual-lab products such as NOBOOK in its core experiment views.

Prototype visuals are acceptable only inside clearly isolated engineering prototypes.

Assets entering a release path MUST follow a coherent art pipeline and visual standard.

## 5.8 Simulation is not automatically learning

A beautiful animation is not considered an educational success.

Learning interactions SHOULD encourage some combination of:

- prediction;
- explanation;
- comparison;
- model testing;
- reflection;
- transfer;
- fading of support;
- independent reasoning.

The project MUST avoid confusing “watched the animation” with “understood the chemistry.”

# 6. The Four Core Systems

## 6.1 Scientific Reality Core

Question answered:

> What should the chemical world do?

Responsibilities include:

- species and phase state;
- equilibrium;
- kinetics;
- thermodynamics;
- electrochemistry;
- transport-related interfaces;
- physical properties;
- organic graph chemistry;
- molecular/crystal structure interfaces;
- empirical observable data where first-principles treatment is not justified.

The Scientific Reality Core may use mature external scientific libraries and databases through adapters.

The project SHOULD prefer validated scientific software over reimplementing mature numerical chemistry from scratch.

## 6.2 World Runtime

Question answered:

> How does an interactive chemical world exist, change, replay, branch, and persist?

Responsibilities include:

- World schema;
- event schema;
- reducer/state transition logic;
- time;
- apparatus relationships;
- world snapshots;
- deterministic replay policies;
- branching;
- serialization;
- local storage;
- diagnostics.

The World Runtime MUST NOT embed high-level teaching policy.

## 6.3 Representation Engine

Question answered:

> How should the current world be made visible and operable?

Responsibilities include:

- 2D/2.5D experiment rendering;
- liquids;
- glass;
- precipitates;
- gas/bubbles;
- flames;
- observable colors;
- charts;
- molecular/crystal viewers;
- macro/micro/symbolic views;
- presentation and inspection views;
- accessibility and interaction.

Scientific truth MUST remain upstream of rendering.

## 6.4 Adaptive Chemistry Cognition Engine (ACE)

Question answered:

> Given the learner's current evidence, what interaction is most useful next?

ACE is a control loop, not a bag of independent teaching features.

Conceptually:

`observe -> infer -> choose intervention -> observe again`

ACE may use:

- hints;
- contrasting cases;
- counterexamples;
- worked examples;
- requests for explanation;
- prediction-before-simulation;
- representation switching;
- transfer problems;
- scaffold fading.

ACE SHOULD optimize for adaptive chemical expertise, not raw short-term answer accuracy.

# 7. Learning Goal

The long-term learning target is not “memorize more chemistry facts.”

The platform should help learners become more capable of:

1. identifying what a problem is actually asking;
2. separating relevant constraints from decorative context;
3. constructing a workable chemical model;
4. selecting and combining prior knowledge;
5. recognizing when a heuristic is valid or invalid;
6. moving between macroscopic, microscopic, symbolic, graphical, and quantitative representations;
7. checking assumptions and answer plausibility;
8. revising a model when evidence contradicts it;
9. transferring a model into an unfamiliar context;
10. continuing to reason when no memorized template exists.

Zhejiang high-level mock exams such as Z20 are useful stress tests because they frequently wrap familiar reasoning structures in unfamiliar or higher-level chemistry contexts.

They are not the sole definition of product correctness.

# 8. Learning Evidence Policy

The project SHOULD prefer high-information interactions over indiscriminate event collection.

Examples of high-information evidence:

- learner prediction before an experiment;
- choice of relevant conditions;
- confidence level;
- explanation of a causal relationship;
- model selected for an unfamiliar problem;
- response to a contrasting case;
- behavior after a counterexample;
- successful transfer after scaffold removal.

Examples of low-information signals that SHOULD NOT dominate learner inference:

- random sandbox movement;
- playful mixing;
- repeated dragging;
- aesthetic exploration;
- accidental clicks.

ACE MUST treat learner state as uncertain.

The system MUST NOT confidently label a learner with a permanent trait based on sparse behavior.

# 9. Data and Privacy Direction

Current product policy:

- no accounts;
- no cloud-required progress;
- no social graph;
- no student identity requirement;
- no required phone/email;
- no public UGC.

Preferred local storage:

- IndexedDB or equivalent browser-local storage;
- export/import for learning state;
- exportable diagnostic bundles;
- explicit user action for sharing diagnostic data.

Any future server-side learner analytics requires a separate privacy design review and explicit owner approval.

# 10. Compliance Direction

The intended deployment is a free, non-commercial personal scientific/educational tool website accessible in mainland China and suitable for ICP filing.

The product SHOULD remain factually describable as:

> A personally developed chemistry simulation and scientific-visualization tool providing free interactive chemistry demonstrations and learning support.

The project SHOULD avoid accidentally evolving into services that materially change its regulatory profile, including:

- paid training;
- enrollment;
- live tutoring;
- commercial courses;
- user forums;
- public user publishing;
- marketplace functions.

Compliance assumptions MUST be re-checked before production filing and major public releases.

# 11. Content Model

Content SHOULD be data-driven.

A scenario/world definition should describe:

- initial world state;
- available apparatus/materials;
- interaction constraints;
- scientific model requirements;
- representation defaults;
- optional learning goals;
- optional evidence rules;
- optional presentation metadata.

The project SHOULD avoid building one custom React page per experiment.

The desired direction is a reusable world/scenario format from which multiple views can be generated.

# 12. Scientific Provenance

Scientific data SHOULD carry, where meaningful:

- value;
- unit;
- source;
- reference;
- temperature/pressure range;
- uncertainty;
- model;
- version;
- last validation;
- confidence category.

Suggested confidence categories:

- measured;
- evaluated;
- calculated;
- empirical;
- pedagogical approximation.

A pedagogical approximation MUST NOT be mislabeled as a measured scientific fact.

# 13. Quality Bar

A feature is not considered complete merely because:

- it renders;
- it passes a happy-path unit test;
- a demo video looks good;
- an agent says it is done;
- a single example gives the expected result.

Release-quality work SHOULD satisfy all applicable dimensions:

1. scientific correctness;
2. deterministic/runtime correctness;
3. visual quality;
4. interaction quality;
5. learning quality;
6. privacy/compliance;
7. performance;
8. accessibility;
9. maintainability;
10. documentation and reproducibility.

# 14. Scientific Validation

Scientific validation is a first-class engineering activity.

Reference cases SHOULD record:

- input state;
- expected result;
- reference source;
- solver;
- database;
- model;
- tolerance;
- version.

Automated validation SHOULD include applicable checks such as:

- elemental balance;
- charge balance;
- mass balance;
- phase consistency;
- solver convergence;
- equilibrium residual;
- reference comparison;
- model-domain validation.

Where practical, important calculations SHOULD be cross-checked against an independent solver, analytical result, reference dataset, or literature case.

# 15. Visual Validation

Core assets and experiment views MUST have objective review artifacts.

Depending on the feature, this may include:

- baseline screenshots;
- pixel-diff or visual-regression checks;
- multiple liquid levels;
- multiple viewport sizes;
- light/dark/background contrast tests if relevant;
- interaction recordings;
- side-by-side benchmark comparison against the defined visual bar.

“Good enough for a prototype” MUST NOT silently become the production art standard.

# 16. Stage-Gate Development

Every substantial stage should move through explicit gates:

## Gate A — Problem defined

Required:

- user/problem statement;
- scope;
- non-goals;
- affected core systems;
- known risks;
- acceptance evidence plan.

## Gate B — Spec accepted

Required:

- interfaces;
- state/events;
- scientific models;
- data/provenance;
- UX/visual behavior;
- privacy implications;
- test plan;
- rollback/migration plan where relevant.

## Gate C — Implementation complete

Required:

- code;
- tests;
- content/data changes;
- documentation;
- no known hidden stubs masquerading as completion.

## Gate D — Verification complete

Required:

- all acceptance criteria demonstrated;
- scientific reference evidence;
- runtime/replay evidence where applicable;
- visual evidence where applicable;
- regression suite passing;
- unresolved limitations explicitly documented.

## Gate E — Release-ready

Required:

- clean build;
- reproducible setup;
- release notes;
- known issues;
- compatibility/performance check;
- owner-level review for scope-sensitive changes.

Skipping gates requires explicit owner approval.

# 17. Initial Vertical Slice

The first serious vertical slice is acid-base titration.

It exists to validate the architecture, not merely to deliver a chemistry demo.

The first slice SHOULD eventually prove:

- apparatus world state;
- event-driven liquid transfer;
- local replay/undo;
- acid/base scientific calculation;
- weak-acid behavior;
- pH and indicator observables;
- real-time pH-volume graph;
- final-quality baseline glassware;
- world branching/comparison;
- macro/micro/symbolic inspection;
- at least one guided ACE interaction;
- local persistence;
- exportable diagnostic state.

Initial scientific stress cases after/basic alongside titration:

1. acid/base titration;
2. Al(III)-OH- hydrolysis/precipitation/amphoterism;
3. Fe(III)-SCN equilibrium/color system.

These are architecture torture tests, not the full content roadmap.

# 18. Explicit Non-Goals for Early Development

Do NOT prioritize early:

- account system;
- cloud sync;
- rankings;
- achievements;
- community;
- public uploads;
- AI chat tutor;
- hundreds of apparatus assets;
- massive question banks;
- mobile native apps;
- microservices for their own sake;
- Kubernetes;
- premature distributed infrastructure;
- monetization;
- school administration features.

# 19. Engineering Philosophy

Prefer:

- explicit models over hidden magic;
- reproducibility over impressive demos;
- adapters over vendor lock-in;
- data-driven content over one-off code;
- narrow validated slices over broad shallow coverage;
- local-first behavior over unnecessary backend state;
- documented approximation over fake precision;
- clear failure over silent scientific nonsense.

# 20. Amendment Rule

Any change that affects the following requires explicit owner review and an update to this file before implementation:

- monetization;
- account/identity model;
- server-side learner tracking;
- scientific truth policy;
- privacy policy;
- product scope away from chemistry;
- compliance-sensitive services;
- replacement of the four-core architecture;
- lowering the visual-quality target;
- knowingly using pedagogical fiction as scientific truth.

This document is the project constitution.  
Specs and plans explain **how** to move.  
This file defines **where the project is allowed to go**.
