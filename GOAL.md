# GOAL.md

> Status: Project Constitution  
> Priority: Highest-level product intent  
> Rule: Lower-level specs, plans, ADRs, implementations, and agent instructions MUST NOT contradict this file without an explicit owner-approved amendment.
> Revision 2026-09-13: Material/catalog abundance, parameterized world objects, runtime state inspection, process-first chemistry, simultaneous competing processes, phase/topology/history dependence, numerical presence semantics, live process visibility, and content-production scalability are elevated to first-class product requirements after renewed NOBOOK-class and scientific-runtime study. This revision does **not** make NOBOOK an authority on scientific truth; it clarifies what a mature interactive chemical world must feel capable of doing and what scientific shortcuts it is not allowed to take.

# 1. Mission

Build a free, public, high-trust interactive chemistry platform centered on Chinese high-school chemistry learning, especially the Zhejiang Gaokao ecosystem, while grounding the simulated chemical world in scientifically defensible undergraduate-to-research-level models wherever practical.

The product exists to make chemistry:

1. **Correct** — the underlying world must obey defensible chemistry, not exam-keyword scripts.
2. **Visible** — invisible chemical state, mechanism, structure, error propagation, and counterfactual change should become inspectable and interactive.
3. **Thinkable** — students should gradually become better at constructing, testing, revising, and transferring chemical models instead of memorizing more templates.

The platform is not intended to replace real experiments, teachers, textbooks, or higher education. It should make things visible, testable, replayable, and comparable that are difficult to observe or isolate in real classrooms.

# 2. Product Identity

This project is **not** merely:

- a chemistry animation collection;
- a problem bank;
- an AI answer generator;
- a collection of hard-coded reaction effects;
- a university chemistry encyclopedia;
- a school management platform;
- an online tutoring business.

Where this project stands relative to NOBOOK-class products — what a mature
virtual lab has genuinely earned, and what must not be copied — is studied in
[`docs/research/from-nobook.md`](docs/research/from-nobook.md). That note is
non-normative research: it informs decisions, it does not amend this file.

It is a unified **Chemical World** with multiple projections.

The same chemical world may be entered as:

- a free sandbox;
- a guided learning task;
- a challenge/exam scene;
- a teacher presentation;
- a comparison/counterfactual experiment;
- an inspection view exposing micro/macro/symbolic layers.

These are views and policies over one world model, not independent products.

A mature ChemRealm MUST also feel like a materially abundant laboratory rather than a narrow demonstration. Scientific depth alone is insufficient if the visible world contains only a handful of materials, apparatus, states, and interactions. The product should eventually expose a dense but discoverable catalog of stateful chemical materials and apparatus whose parameters, contents, consequences, and current scientific state remain inspectable.

The target is therefore not merely "a scientifically correct virtual experiment". The target is a **high-density, stateful, inspectable Chemical World** in which breadth, parameterization, interaction, state legibility, process visibility, and scientific validity reinforce one another.

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

There is one Scientific Reality layer. Sandbox, guided learning, challenge/exam scenes, teacher presentation, comparison views, and expert inspection MUST derive from the same scientific world state and the same state-transition semantics.

Teaching views may:

- hide variables;
- aggregate species;
- suppress unnecessary equations;
- emphasize a dominant process;
- show only the currently useful approximation;
- explain why a textbook heuristic is useful;
- expose a deeper model on demand.

Teaching views MUST NOT:

- turn off scientifically supported side reactions merely to match a textbook simplification;
- force competing processes into a false serial order;
- alter equilibrium, kinetic, phase, transport, thermal, electrochemical, or material state for pedagogical convenience;
- replace a real process network with a memorized school equation as the source of state change.

A pedagogical statement such as “A reacts first” may be presented only as an interpretation of the real world state, for example because one flux dominates at the relevant scale. The underlying world MUST continue to evolve according to the supported scientific model.

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

## 5.9 Material abundance is a product requirement

A mature Chemical World MUST provide enough material and apparatus breadth that users perceive an open laboratory, not a curated demo with a few hard-coded choices.

This requirement is about **world affordance density**, not a vanity item count. Mature breadth should include:

- a large, searchable apparatus catalog with meaningful specifications and sizes;
- a large, searchable material/reagent catalog spanning the relevant high-school chemistry space and justified extensions;
- common stock presets where they are pedagogically useful;
- parameterized material instances rather than one immutable object per label;
- enough validated cross-combination coverage that free exploration produces meaningful consequences.

No fixed competitor count is constitutional. Counts vary by product version, school package, catalog semantics, and whether presets are counted separately. ChemRealm MUST distinguish chemical identities, material families, stock presets, catalog entries, and apparatus specifications rather than inflating breadth by duplicate labels.

Early milestones MAY remain narrow. Early narrowness MUST NOT be mistaken for the mature product target.

## 5.10 Catalog entries are not world state

A material or apparatus shown in a catalog is a template for creating a world instance. Once instantiated, the object has its own identity, parameters, contents, topology, history, and state.

The architecture MUST keep distinct, where applicable:

`chemical identity -> material family -> stock preset -> catalog entry -> material instance -> container contents -> scientific state -> observable state`

A user-facing preset such as "dilute hydrochloric acid" or "concentrated hydrochloric acid" may be useful for rapid selection, but it MUST NOT become a second scientific truth source. Presets initialize parameters; the resulting world state governs behavior.

## 5.11 Parameterization must have causal meaning

Editable concentration, amount, volume, temperature, pressure, purity, composition, apparatus size, flow rate, or other parameters MUST NOT be decorative labels. When a parameter is scientifically meaningful and supported, changing it must propagate through the world model and may change:

- conserved inventories;
- phase behavior;
- equilibrium or kinetics;
- pressure or thermal state;
- valid-model selection;
- observable color, opacity, fuming, precipitation, bubbles, flame, flow, or other effects;
- the set or intensity of processes that can occur.

Where the system cannot model a parameterized regime faithfully, it MUST expose a model limitation, refusal, or explicitly labeled approximation rather than silently reusing an unrelated visual preset.

## 5.12 State and process must be inspectable

A user should be able to inspect what a world object **currently is**, not merely what was originally dragged into it.

For containers and other relevant entities, the inspection system SHOULD progressively expose, when meaningful:

- current contents and phases;
- mass, amount of substance, concentration, and volume;
- temperature and pressure;
- conserved components and important derived species;
- active or recently changed processes;
- key observables and quantitative traces;
- model identity, assumptions, validity, and provenance on deeper inspection.

The exact default depth depends on learner level and mode. A novice view may be compact; an expert inspection view may expose activities, ionic strength, balances, residuals, solver identity, or other advanced state. Hidden depth is acceptable. Falsified state is not.

A displayed chemical equation or "reaction currently occurring" is a **representation of scientific process**, not the source of scientific truth. Equilibria, coupled reactions, phase changes, transport, and kinetics may not map one-to-one onto a single school-level equation.

## 5.13 Consequence before judgement

Where safe inside the simulation and scientifically supportable, incorrect, unusual, or playful operations should first produce their causal world consequences rather than being blocked solely because they violate a textbook procedure.

Teaching or assessment layers may then interpret the consequence, explain the risk, score the operation, or request reflection.

Examples include overfilling, incorrect mixing order, excessive heating, inappropriate apparatus assembly, or hazardous combinations. The World Runtime and Scientific Reality determine what occurs; ACE or an assessment policy determines how the action is pedagogically judged.

## 5.14 Free combination creates a validation obligation

Every claim of free combination expands the product's scientific and interaction test surface. The product MUST NOT imply that arbitrary combinations are supported merely because catalog items can be dragged together.

Material and apparatus coverage SHOULD be machine-readable and distinguish at least:

- supported and independently verified;
- supported but not yet fully verified;
- intentionally approximate;
- unsupported / `MODEL_OUT_OF_DOMAIN`;
- interaction not applicable.

Pairwise and higher-order combination coverage cannot be exhaustively tested by naive Cartesian enumeration, but important chemistry domains, common school combinations, known edge cases, and cross-domain transitions MUST have explicit acceptance evidence.

## 5.15 World feedback quality is not deferred polish

A chemical world feels alive through more than static visual assets. Where scientifically and interactionally meaningful, release-quality world feedback SHOULD include coherent liquid motion, transfer and flow, gas/bubble behavior, smoke/fog, precipitate/turbidity progression, flame, breakage/leakage or other apparatus-state consequences, and synchronized sound/haptic-equivalent cues where the target platform supports them.

These effects MUST remain consequences of world/observable state rather than independent scripts that contradict it. A mature catalog with dead, generic, or non-causal instances does not satisfy the Chemical World goal.

## 5.16 The world evolves from processes, not from a prioritized equation list

Scientific Reality MUST be process-first. A chemical equation stored in content is not sufficient authority to mutate the world.

The world SHOULD evolve from scientifically supported processes such as:

- equilibrium/speciation;
- explicit kinetic reactions;
- dissolution and crystallization/precipitation;
- gas-liquid and liquid-liquid phase transfer;
- evaporation/condensation and boiling where modeled;
- mixing, diffusion, transport, and flow interfaces;
- heat generation, heat transfer, and temperature-dependent state changes;
- electrochemical current and electrode processes;
- adsorption, ion exchange, surface reaction, catalysis, passivation, and related interfaces where supported;
- environmental exchange with air, humidity, carbon dioxide, oxygen, or other modeled reservoirs;
- apparatus-enabled topology such as sealing, venting, tubing, salt bridges, electrodes, and physical contact.

The Scientific Reality Core MUST NOT be architected around `find matching textbook equation -> execute to completion`.

## 5.17 Process accessibility depends on phase, topology, history, and conditions

A reaction or process is not accessible merely because all chemical names appearing in an equation are somewhere in the same container. Accessibility may depend on:

- phase and speciation;
- solvent and medium;
- physical contact and interfaces;
- apparatus connectivity;
- open/sealed/vented topology;
- electrical and ionic conduction paths;
- temperature and pressure;
- mixing regime and local transport assumptions;
- surface state, particle morphology, catalyst state, or passivation;
- prior world history and order of addition;
- model availability and validity.

For example, two ionic solids placed together at ordinary conditions MUST NOT automatically be treated as if their aqueous ions already coexist. Adding water may activate dissolution, aqueous speciation, precipitation, gas evolution, or other processes. The exact model used must remain explicit.

Topology is scientific state. History may be scientific state. “Same final list of named materials” does not imply the same Chemical World.

## 5.18 Competing processes are simultaneous by default

When multiple scientifically supported processes share reactants or otherwise compete, Scientific Reality MUST NOT generally choose one process, run it to completion, and then enable the next solely from a qualitative strength ranking.

Where kinetics matter, the preferred semantics are simultaneous process/reaction fluxes whose combined stoichiometric effects determine species production and consumption. A dominant process may be much faster than a minor process without the minor process being exactly zero.

The system MAY use justified reduced models when a process contribution is negligible at the declared accuracy and scale, but that reduction MUST be part of an explicit model/approximation with validation evidence.

Products and intermediates created by one process MUST be eligible to activate, inhibit, or feed other supported processes in the same evolving world.

## 5.19 Equilibrium is not reaction history

An equilibrium calculation describes a constrained state, not necessarily the unique time-resolved path by which that state was reached.

The product MUST NOT invent a unique reaction order, reaction extent history, or timing merely because an equilibrium solver produced a final composition.

Where time/path claims are made, they require an explicit kinetic, transport, or other dynamical model. Where such a model is unavailable, the UI should describe equilibrium shift, stable phases, net state change, or other defensible quantities without fabricating a trajectory.

## 5.20 Physical quantities must be causally coupled

Mass, amount of substance, volume, concentration/activity, temperature, pressure, phase amount, headspace composition, and other scientific quantities MUST NOT be independent decorative readouts.

When the active model supports the coupling, state changes should propagate causally. Examples include:

- reaction heat changing temperature and therefore rates/equilibria/volatility;
- gas production or consumption changing pressure in a sealed vessel;
- gas dissolution changing both aqueous composition and headspace state;
- precipitation changing dissolved composition, opacity/turbidity, and later reaction accessibility;
- evaporation changing volume and concentration;
- environmental absorption changing composition over time.

If a coupling is intentionally omitted, the omitted coupling and validity boundary must be documented.

## 5.21 Numerical existence and semantic-zero policy

Floating-point chemistry MUST NOT allow vanishingly small numerical residues to make materials appear to exist forever. At the same time, a UI-cleanup threshold MUST NOT silently destroy mass balance, equilibrium behavior, reversibility, or solver stability.

ChemRealm MUST define explicit, versioned threshold semantics and MUST NOT rely on one universal magic epsilon for all purposes. At minimum, the architecture should distinguish:

1. **solver tolerance** — numerical convergence/integration precision internal to a model;
2. **semantic-zero / retention threshold** — when a world-level inventory, explicit kinetic amount, phase amount, or other authoritative quantity may be canonicalized to zero or removed from retained state;
3. **process-activation threshold** — when a modeled flux/process is too small to be treated as active for scheduling or reporting, if such pruning is used;
4. **inspection/display threshold** — when a trace quantity is omitted from the ordinary entity inspector to avoid “ghost substances”;
5. **observable threshold** — when a scientific change becomes visually/audibly perceptible in an observable model.

These thresholds MAY differ by quantity type, solver, phase, domain, vessel scale, and model confidence. Exact values MUST be justified by numerical analysis and validation; they are not to be chosen by convenience or copied blindly from another solver.

Required behavior includes:

- deterministic canonicalization for replay and hashing;
- conservation checks before and after pruning/canonicalization;
- no negative inventory created by roundoff;
- hysteresis or equivalent anti-flicker policy where values can oscillate around a display/activation threshold;
- the ability for a species/process to reappear when the scientific model regenerates it;
- distinction between derived equilibrium species and conserved/component inventories;
- threshold-sensitivity tests showing that scientifically meaningful outputs are stable under reasonable threshold variation.

A trace equilibrium species may be internally present even when omitted from the default inspector. Conversely, a consumed reagent whose authoritative amount is below the validated semantic-zero threshold may be canonicalized to zero so the world does not contain immortal numerical ghosts.

## 5.22 Reaction/process visibility is a projection of truth

The UI concepts “main reaction”, “side reaction”, “currently happening”, “reaction completed”, or “reaction starts next” are representation-layer interpretations of scientific process state. They MUST NOT be primary scientific state.

Where useful, the Representation Engine may classify process visibility using quantities such as flux, cumulative extent, equilibrium shift, phase transfer, rate of change, or scientific importance. Minor processes may be collapsed in the default view, but collapsing them MUST NOT mean disabling them in Scientific Reality.

Teaching mode may add explanations such as “why the textbook neglects this side process”. Sandbox and other modes continue to run the same underlying world.

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
- empirical observable data where first-principles treatment is not justified;
- material composition and physical-property models where they affect scientific behavior;
- explicit process eligibility and model-domain coverage for parameterized materials;
- scientifically meaningful continuation of products into subsequent reactions or processes;
- process-accessibility evaluation from phase, topology, medium, history, and conditions;
- simultaneous competing reaction/process fluxes where kinetics matter;
- hybrid equilibrium-kinetic-transport coupling where appropriate;
- energy/pressure/headspace coupling where supported;
- explicit numerical tolerance and semantic-zero policies at scientific boundaries.

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
- diagnostics;
- instantiated material/apparatus identity distinct from catalog templates;
- container inventories and phase-bearing contents;
- transfers, connections, containment, flow and apparatus topology;
- object-local and world/environment state needed for inspection;
- stable boundaries for runtime inspection and process history;
- deterministic scientific-time advancement between external user events;
- canonicalization rules for numerical zero, trace state, and replay-stable serialization;
- world/process diagnostics that distinguish external events from internal scientific integration.

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
- dense but discoverable material/apparatus catalog UX;
- catalog search, taxonomy, presets, favorites/recent-use or equivalent discovery aids where useful;
- instance property editing for scientifically meaningful parameters;
- entity inspectors and scene/environment inspectors;
- live process/reaction representations derived from scientific state;
- explicit trace/hidden state semantics so default inspectors do not accumulate numerical ghosts;
- optional process-network views that expose dominant, minor, dormant, inaccessible, or out-of-domain processes without changing the underlying chemistry;
- synchronized non-visual feedback such as sound where it materially improves experimental legibility;
- visual representation of apparatus-state consequences such as spill, leak, breakage, or deformation where modeled;
- progressive disclosure between novice, classroom, sandbox, and expert views;
- accessibility and interaction.

Scientific truth MUST remain upstream of rendering.

The Representation Engine MAY use different layouts for teacher desktop authoring, student sandbox use, mobile, presentation, assessment, organic chemistry, electrochemistry, molecular/crystal inspection, or other projections. "One World" does not require one universal sidebar or one universal canvas.

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

# 11. Content and Catalog Model

Content SHOULD be data-driven and scalable to a mature, high-density chemical world.

## 11.1 Scenario/world definitions

A scenario/world definition should describe:

- initial world state;
- available apparatus/materials or catalog scopes;
- interaction constraints;
- scientific model requirements;
- representation defaults;
- optional learning goals;
- optional evidence rules;
- optional presentation metadata.

The project SHOULD avoid building one custom React page per experiment.

The desired direction is a reusable world/scenario format from which multiple views can be generated. Curated scenarios and the free sandbox SHOULD share the same underlying catalog and world semantics wherever possible. Curated scenarios are not a second chemistry engine.

The **resource/scenario library** and the **material/apparatus catalog** are distinct product catalogs. The former helps users discover experiments, lessons, challenges, and presentations; the latter helps users discover objects that can be instantiated into a world. Their metadata may cross-link, but they MUST NOT be collapsed into one content namespace.

## 11.2 Chemical identity, material family, preset, and instance are different concepts

The content system MUST avoid collapsing fundamentally different layers into one "drug" record. Where applicable, it should distinguish:

1. **ChemicalIdentity** — component/species/compound identity and chemistry-level metadata.
2. **MaterialFamily** — a parameterized real material such as hydrochloric-acid aqueous solution, sodium hydroxide solution, copper sulfate solution, iron powder, or chlorine gas.
3. **StockPreset** — convenient common starting states such as a standard concentration, "dilute", "concentrated", reagent-grade, or curriculum-specific preparation.
4. **CatalogEntry** — how a material or apparatus is discoverable in a particular product view.
5. **MaterialInstance** — one concrete world object or quantity created from a catalog entry/preset with actual parameters and history.
6. **ContainerContents / ScientificState** — the current world truth after mixing, transfer, reaction, phase change, heating, evaporation, or other processes.

These layers MAY share data but MUST NOT become contradictory sources of truth.

## 11.3 Mature catalog requirements

A mature catalog SHOULD support hundreds-scale combined material/apparatus entries without becoming difficult to navigate. Exact counts are not a constitutional KPI. Discoverability is.

Catalog discovery SHOULD support applicable combinations of:

- name and fuzzy search;
- formula and aliases;
- initials / pinyin where appropriate for Chinese users;
- solid / liquid / gas / material-state grouping;
- apparatus type and size/specification;
- element, ion group, functional group, or other chemistry-aware indexing where useful;
- curriculum/common-use grouping;
- recent/favorite/common selections where they reduce search cost;
- capability/validation metadata without overwhelming novice users.

The catalog SHOULD remain usable in teacher authoring, free sandbox, presentation, and student modes, but the same information architecture need not be rendered identically on every device or mode.

## 11.4 Parameterized materials and apparatus

Materials SHOULD be parameterized when real chemistry or experimental practice requires it. Examples may include concentration, composition, amount, purity, temperature, pressure, or stock preparation. Apparatus may require capacity, geometry, calibration, connection ports, initial contents, or operation ranges.

Common presets are encouraged when they reduce friction. Presets MUST initialize a parameterized state rather than bypass scientific semantics.

A parameter edit MUST either:

- propagate into the Scientific Reality/World Runtime and therefore affect downstream state and observables; or
- be clearly identified as presentation-only metadata.

The system MUST NOT present a scientific-looking parameter control that has no causal effect while implying that it does.

## 11.5 Stateful contents and continuing chemistry

Reaction products, dissolved components, precipitates, gases, residues, and other generated material states SHOULD remain part of the world when the active model supports them. They SHOULD be eligible to participate in later scientifically supported processes without being replaced by a cosmetic "finished experiment" state.

The world should answer "what is in this container now?" rather than only "what did the author originally put here?"

## 11.6 Runtime inspection and process representation

The content system must provide enough semantics for the Representation Engine to derive:

- a compact entity inspector;
- deeper scientific inspection;
- scene/environment information;
- time-varying quantitative traces;
- human-readable active-process/reaction representations.

A school-level chemical equation is an interpretation layer. It MUST NOT be the authoritative storage format for equilibrium state, species distribution, or coupled process truth.

## 11.7 Process definitions and reaction-network content

Content describing chemistry SHOULD distinguish, where applicable:

- equilibrium constraints and thermodynamic data;
- explicit kinetic channels and rate laws;
- phase-transfer and dissolution/precipitation models;
- gas/headspace models;
- surface/catalyst/electrode models;
- transport/mixing assumptions;
- energy/pressure coupling;
- accessibility preconditions;
- model validity and confidence;
- human-readable pedagogical equations or labels as projections, not authoritative state transitions.

A material library and a reaction-equation library are insufficient substitutes for this process model.

## 11.8 Trace-state and presence semantics

Content/runtime contracts SHOULD be able to describe whether a quantity is:

- conserved/authoritative;
- derived from equilibrium/speciation;
- explicit kinetic state;
- visible in the default inspector;
- below semantic-zero threshold;
- below observable threshold;
- omitted because the active model does not resolve it.

The default inspector SHOULD not expose indefinite lists of physically irrelevant numerical residues. Expert/scientific views MAY expose trace quantities when meaningful.

## 11.9 Chemical content production is engineering

At mature scale, material/catalog growth is a long-running production discipline, not a one-time data-entry task. The project SHOULD develop internal tooling and validation pipelines for:

- identity and alias management;
- material-family authoring;
- parameter domains and stock presets;
- physical-property and observable data;
- provenance and confidence;
- scientific adapter/model coverage;
- search/taxonomy metadata;
- curriculum metadata;
- visual/effect assets;
- reference fixtures;
- combination regression suites;
- schema migration and catalog-version review.

The project SHOULD eventually prefer a dedicated authoring/validation workflow over manually maintaining hundreds of ad-hoc JSON records. This production pipeline is supporting infrastructure, not a fifth runtime core.

## 11.10 Breadth must not be faked

The project MUST NOT claim maturity by:

- counting concentration presets as independent scientific capabilities;
- adding catalog items whose interactions are unsupported but silently appear functional;
- cloning near-identical apparatus solely to inflate counts;
- attaching one-off animations that bypass the observable/scientific pipeline;
- treating one successful curated scenario as proof that arbitrary sandbox combinations are correct.

Useful metrics should separately track, where practical:

- chemical identities;
- material families;
- stock presets;
- catalog entries;
- apparatus families/specifications;
- model-covered domains;
- independently verified combination families;
- observable regimes with validation evidence.

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
3. material/catalog semantic correctness;
4. content breadth appropriate to the claimed maturity level;
5. state legibility and process visibility;
6. visual quality;
7. interaction quality;
8. learning quality;
9. privacy/compliance;
10. performance;
11. accessibility;
12. maintainability and content-production scalability;
13. documentation and reproducibility.

A mature release MUST NOT use a narrow catalog as a permanent excuse for architectural purity, and MUST NOT use a broad catalog as an excuse for shallow or false chemistry.

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
- model-domain validation;
- threshold-sensitivity and semantic-zero validation;
- conservation across canonicalization/pruning;
- competing-process flux/reference checks where claimed;
- phase/topology accessibility checks;
- equilibrium-vs-kinetic interpretation checks;
- deterministic replay across scientific-time integration.

Where practical, important calculations SHOULD be cross-checked against an independent solver, analytical result, reference dataset, or literature case.

# 15. Visual Validation

Core assets and experiment views MUST have objective review artifacts.

Depending on the feature, this may include:

- baseline screenshots;
- pixel-diff or visual-regression checks;
- multiple liquid levels;
- multiple concentrations/compositions when they should visibly differ;
- multiple temperatures, pressures, phases, or reaction-progress states when relevant;
- precipitate, bubble, fuming, flame, turbidity, dissolution, crystallization, flow, or other observable regimes;
- multiple apparatus sizes/specifications and connection states;
- inspector/readout legibility under realistic state density;
- multiple viewport sizes;
- light/dark/background contrast tests if relevant;
- interaction recordings;
- side-by-side benchmark comparison against the defined visual bar.

Observable changes driven by concentration or state MUST be validated as a function/regime of scientific state where appropriate, not only as two hand-picked screenshots of named presets.

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
- catalog/material semantics and parameter domains where applicable;
- entity/scene inspection mapping and process representation where applicable;
- content breadth claim and coverage boundaries where applicable;
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
- runtime inspection evidence where applicable;
- material/catalog discovery and parameter-causality evidence where applicable;
- cross-combination / continuation evidence where free interaction is claimed;
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

The first slice SHOULD eventually prove a **complete world-interaction loop**, not only solver correctness:

- a small but real material/apparatus catalog;
- catalog search/selection sufficient to exercise the content model;
- spawning concrete world instances from catalog entries;
- editing at least one scientifically meaningful material parameter such as concentration and seeing causal downstream effects;
- apparatus world state and containment/topology;
- event-driven liquid transfer with amount/volume control;
- current container inspection showing meaningful contents and quantitative state;
- acid/base scientific calculation;
- weak-acid behavior;
- pH and indicator observables;
- a live process/reaction representation that is derived from scientific state rather than defining it;
- a minimal demonstrated semantic-zero/display-threshold policy that removes consumed ghost quantities from ordinary inspection without breaking mass balance or replay;
- real-time pH-volume graph;
- final-quality baseline glassware and liquid behavior;
- local replay/undo;
- world branching/comparison;
- macro/micro/symbolic/quantitative inspection;
- at least one guided ACE interaction;
- local persistence;
- exportable diagnostic state.

The initial catalog MAY be deliberately small. Its schemas, inspection surfaces, parameter semantics, and content pipeline MUST NOT assume that the mature product will remain small.

Initial scientific stress cases after/basic alongside titration:

1. acid/base titration;
2. Al(III)-OH- hydrolysis/precipitation/amphoterism;
3. Fe(III)-SCN equilibrium/color system.

These are architecture torture tests, not the full content roadmap. They are also early tests of a future material-content system: each case should force the project to add reusable chemistry, material, observable, inspection, and validation capabilities rather than one-off experiment code.

Longer-term process-runtime stress tests SHOULD deliberately include cases such as:

- two ionic solids that do not gain an aqueous ionic reaction path until an appropriate liquid phase is introduced;
- order-of-addition cases in which history changes the accessible network;
- competing redox channels in which a dominant reductant does not make minor channels mathematically nonexistent;
- consecutive/feedback chemistry in which a side product becomes a reactant for another process;
- open versus sealed gas systems with headspace and pressure consequences;
- salt-bridge/electrical-topology dependence in electrochemistry;
- precipitation followed by dissolution, complexation, or colloid/adsorption behavior;
- thermal feedback in which reaction heat changes subsequent chemistry;
- surface/passivation/catalyst-state dependence;
- threshold cases where a reagent is consumed to numerical trace and must disappear cleanly from ordinary inspection while conservation and replay remain correct.

These cases are not mandated as immediate milestones. They define the kind of world completeness the architecture must eventually support.

# 18. Explicit Non-Goals for Early Development

Do NOT prioritize early:

- account system;
- cloud sync;
- rankings;
- achievements;
- community;
- public uploads;
- AI chat tutor;
- prematurely filling hundreds of apparatus/material assets before the catalog, scientific, observable, inspection, and validation pipelines can support them;
- massive question banks;
- mobile native apps;
- microservices for their own sake;
- Kubernetes;
- premature distributed infrastructure;
- monetization;
- school administration features.

This early non-goal is about sequencing, not the mature target. A high-density material/apparatus catalog and broad validated sandbox are explicit long-term product requirements.

# 19. Engineering Philosophy

Prefer:

- explicit models over hidden magic;
- reproducibility over impressive demos;
- adapters over vendor lock-in;
- data-driven content over one-off code;
- narrow validated slices over broad shallow coverage;
- local-first behavior over unnecessary backend state;
- documented approximation over fake precision;
- clear failure over silent scientific nonsense;
- stateful reusable content packages over experiment-specific visual scripts;
- causal parameterization over cosmetic controls;
- progressive disclosure over hiding scientific state permanently;
- breadth earned through validated coverage over inflated catalog counts;
- production tooling over hand-maintained content sprawl once scale demands it;
- process graphs over prioritized reaction if/else chains;
- simultaneous fluxes over unjustified “react completely, then next” ordering;
- explicit topology/phase/history over composition-only reaction lookup;
- separate numerical, semantic, display, and observable thresholds over one magic epsilon;
- profile-guided optimization over premature native/GPU rewrites.

# 20. Implementation and Validation Leverage

This constitution does not mandate a permanent programming-language stack. Exact local tool versions belong in the workstation/tool inventory, not in product law. However, the current development environment is already capable of supporting the scientific and verification strategy and SHOULD be used deliberately rather than forcing one language to solve every problem.

Preferred capability mapping:

- **TypeScript / modern browser tooling** — schemas, world contracts, web runtime integration, UI, catalog/inspector surfaces, deterministic serialization tests;
- **Python in isolated environments** — scientific oracle generation, data/provenance pipelines, parameter fitting, cross-solver comparison, reference notebooks/scripts converted into reproducible CLI artifacts rather than ad-hoc global state;
- **Rust or C/C++ with CMake/Ninja and multiple compilers** — only for profiled performance-critical kernels, native scientific adapters, or WebAssembly boundaries that materially benefit from them;
- **CUDA / GPU profiling tools** — optional acceleration only after measurement shows a suitable workload; GPU availability is not permission to GPU-ify chemistry prematurely;
- **Docker/WSL or pinned native environments** — reproducible execution of external scientific engines/databases and identity-verified reference runs;
- **SQLite / browser-local storage** — local-first content, fixtures, catalog tooling, and user state where appropriate; server databases are not required merely because they are installed;
- **Chrome/headless browser + browser automation** — end-to-end interaction tests, inspector correctness, catalog discovery, visual regression, and scenario replay;
- **FFmpeg** — reproducible interaction recordings and visual acceptance artifacts;
- **CodeQL, compiler diagnostics, clang tooling, action/workflow linting, static analysis** — code/security/CI quality gates for native and web layers;
- **Git/GitHub tooling** — evidence-linked changes, reproducible baselines, release artifacts, and reviewable stage-gate history.

The architecture SHOULD allow independent scientific engines to be validated outside the browser and then integrated through explicit adapters. Browser performance optimization MUST follow profiling. A future Rust/C++/WASM or GPU kernel is an implementation option, not scientific authority.

# 21. Mature Product Shape

A mature ChemRealm should be recognizable as a Chemical World within minutes of first use. It should combine:

- a dense, searchable, chemistry-aware material/apparatus catalog;
- parameterized materials and apparatus with useful presets;
- direct manipulation, assembly, transfer, heating, mixing, gas handling, and other domain-appropriate interactions;
- persistent world contents whose products can participate in later supported chemistry;
- inspectable container/entity state;
- inspectable world/environment state;
- live, human-readable process/reaction representations derived from a process network rather than a reaction-priority script;
- disappearance semantics that prevent numerical trace “ghost substances” from cluttering ordinary inspection while preserving scientific conservation and reproducibility;
- scientifically derived observables with mature visual quality;
- teacher authoring, student sandbox, guided learning, challenge, presentation, and expert inspection projections;
- local replay, branching, comparison, persistence, and export;
- a long-running content-production and verification pipeline capable of sustaining hundreds-scale catalog breadth without turning the codebase into one-off exceptions.

The mature product SHOULD evoke the freedom and immediacy earned by established virtual-lab systems while exceeding black-box behavior through explicit model validity, provenance, scientific inspection, deterministic world semantics, and reproducible validation.

The benchmark is not "more items than competitor X". The benchmark is that users can discover many meaningful things, instantiate them, alter relevant parameters, combine them, observe consequences, inspect the resulting state, understand what process representation is being shown, and know when the scientific model is or is not trustworthy.

# 22. Amendment Rule

Any change that affects the following requires explicit owner review and an update to this file before implementation:

- monetization;
- account/identity model;
- server-side learner tracking;
- scientific truth policy;
- allowing pedagogical mode to alter underlying chemistry rather than only its projection/explanation;
- replacing simultaneous/process-first chemistry with a prioritized textbook-equation execution model;
- collapsing phase/topology/history dependence into composition-only lookup;
- numerical semantic-zero/presence policy in ways that can change scientific conservation or replay semantics;
- privacy policy;
- product scope away from chemistry;
- compliance-sensitive services;
- replacement of the four-core architecture;
- lowering the visual-quality target;
- lowering the mature material/apparatus abundance target to a permanently narrow demo catalog;
- removing state inspectability or live process visibility as mature-product requirements;
- collapsing catalog presets/instances/contents into contradictory scientific truth sources;
- knowingly using pedagogical fiction as scientific truth.

This document is the project constitution.  
Specs and plans explain **how** to move.  
This file defines **where the project is allowed to go**.
