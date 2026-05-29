# ADR-001: Use Yjs for intra-branch collaboration with synchronous post-merge structural validation

**Date**: 2026-05-29
**Status**: Proposed
**Deciders**: Tech Lead, Frontend Lead, Backend Lead

## Context
ChoreoStudio needs sub-100ms multi-user collaboration, but the PRD also states that any structurally invalid post-merge canvas must enter a CONFLICT state and must not compile. The highest-risk failure mode is silent corruption: a CRDT merge succeeds operationally, yet produces a canvas snapshot that violates domain invariants and generates broken OpenAPI/AsyncAPI artifacts. A decision is required on both the live collaboration engine and the validation gate that sits between merge and compilation.

## Decision Drivers
- Sub-100ms real-time sync for concurrent editors
- Git repository is the sole durable persistence layer; server memory is ephemeral only
- CRDT is only for live edits within a single branch
- Compilation must run on committed canvas changes, not mid-drag
- Post-merge structural validation must block compilation synchronously
- Offline reconnect must reuse the same model until divergence exceeds 50 operations

## Considered Options
1. Yjs + synchronous snapshot validator — use Yjs shared types for live editing, then validate a canonical canvas snapshot after each transaction commit before compilation.
2. Automerge + application-level validators — use Automerge documents and run structural validators after each merged change.
3. Operational Transformation + ad hoc conflict rules — use OT for live collaboration and rely on custom semantic conflict handlers.

## Decision
Choose **Yjs + synchronous post-merge validation + explicit CONFLICT state**. Yjs is selected because its binary update model, `Y.Map`/`Y.Array` shared types, awareness protocol, and mature browser ecosystem are better aligned with the PRD's sub-100ms collaboration target than Automerge's larger document-level merge model. Every committed transaction will materialize a canonical canvas snapshot from the Yjs document, run invariant checks over a normalized graph (`elementsById`, `edgesById`, `serviceBoundariesById`), and only enqueue incremental compilation if validation passes; otherwise the branch stays editable but enters the PRD-defined CONFLICT state and compilation is suspended. Offline reconnect continues through Yjs while divergence is small; once the client is more than 50 ops behind, reconnect is escalated to the branch-merge path rather than replaying an opaque CRDT history.

## Consequences
**Positive:**
- Uses a battle-tested CRDT with strong ecosystem support for browser collaboration.
- Keeps live collaboration fast while separating structural correctness from transport-level merge success.
- Makes the validation gate deterministic because it runs on a canonical snapshot, not incremental ops.
- Aligns with the PRD rule that invalid CRDT merges suspend compilation before contracts regenerate.

**Negative / trade-offs:**
- Requires a canonical projection layer from Yjs types to the public canvas JSON schema.
- Validation runs on every committed transaction, so large transactions need strict performance budgets.
- Yjs solves convergence, not domain integrity; the product must maintain a substantial invariant test suite.
- Two sync paths now exist: CRDT within a branch and 3-way merge across branches/offline divergence.

**Risks if not followed:**
- A merge could generate syntactically valid JSON but semantically broken contracts.
- Teams could lose trust in generated OpenAPI/AsyncAPI artifacts because invalid states leak past collaboration.
- Offline reconnect behavior may become inconsistent with branch merge semantics, increasing unreproducible defects.

---

# ADR-002: Manage draft canvases as namespaced Git branches with TTL and automatic cleanup

**Date**: 2026-05-29
**Status**: Proposed
**Deciders**: Platform Architect, Tech Lead, DevOps Lead

## Context
The PRD requires the Git repository to be the only persistence layer and states that drafts live on `choreostudio/drafts/<slug>` branches until approval promotes them by merge. This creates a repository hygiene risk at enterprise scale: hundreds of workspaces can generate stale, abandoned, or duplicate draft refs that make Git administration unacceptable. A branch lifecycle policy is needed that preserves the embargoed data model without introducing a server-side draft database.

## Decision Drivers
- Git is the sole durable store for draft and approved canvas state
- Draft approval must be implemented as branch promotion by merge
- Enterprise repositories must remain manageable at 50-workspace+ scale
- No server-side retention of canvas data after the session ends
- Teams need repo rules that can target ChoreoStudio-managed refs independently

## Considered Options
1. Namespaced draft branches with TTL and janitor cleanup — keep drafts under `refs/heads/choreostudio/drafts/...`, auto-delete on merge/discard, expire stale refs after a configurable TTL.
2. Permanent draft branches per canvas — keep one long-lived draft branch for each canvas and never delete it.
3. Store draft metadata in a server database and reconstruct refs on demand — minimize Git refs but introduce non-Git persistence.

## Decision
Choose **namespaced draft branches with automatic cleanup**. Draft canvases will live under `refs/heads/choreostudio/drafts/<workspace-slug>/<canvas-slug>` with at most one active draft branch per canvas; approval merges that branch into the release branch and deletes the source ref immediately, while explicit discard also deletes the ref. Stale drafts are cleaned by a scheduled Git janitor using repository-native data only: branch age from commit timestamps, merged status from Git ancestry, and configurable TTL policy; no canvas payload or lifecycle state is stored outside Git. This directly follows the PRD mitigation for R02, preserves the embargoed model, and gives enterprise admins a clean namespace (`choreostudio/drafts/`) for protections, retention rules, and monitoring.

## Consequences
**Positive:**
- Preserves the “Git only” persistence rule with no parallel metadata store.
- Keeps repository hygiene manageable through namespace isolation and deterministic cleanup.
- Simplifies policy application because branch protections and reporting can target one prefix.
- Makes approval behavior auditable: promotion is a real Git merge followed by branch deletion.

**Negative / trade-offs:**
- Requires a janitor process or scheduled workflow with repo write permissions.
- TTL cleanup can surprise users if stale draft ownership and warning flows are not explicit.
- One-active-draft-per-canvas limits parallel experimental work unless users intentionally create Git branches outside the draft lifecycle.
- Branch naming and slug stability become part of the product contract.

**Risks if not followed:**
- Repositories can accumulate thousands of stale refs, causing enterprise rejection of the Git-backed model.
- Teams may invent ad hoc branch naming patterns that break automation and auditability.
- Introducing a non-Git draft store later would violate the embargoed data model and complicate recovery.

---

# ADR-003: Build an incremental compilation engine around a semantic dependency graph and fragment cache

**Date**: 2026-05-29
**Status**: Proposed
**Deciders**: Backend Lead, Tech Lead, Frontend Lead

## Context
The PRD requires OpenAPI 3.1 and AsyncAPI 2.6 artifacts to regenerate on every committed canvas change, but a full rebuild on each edit will not meet latency goals on a 200-element canvas with five editors. The system also must avoid compilation during mid-drag transient states and must not break previously exported artifacts when the canvas is only partially valid. A compilation architecture decision is needed to bound recomputation cost while keeping artifacts deterministic.

## Decision Drivers
- Regenerate contracts on every committed change, not on intermediate drag events
- Support 200-element canvases with 5 concurrent editors
- Generate both OpenAPI 3.1 and AsyncAPI 2.6 from one semantic canvas
- Suspend compilation entirely when structural validation fails
- Git-backed contract outputs must remain deterministic and reproducible

## Considered Options
1. Full regeneration on every commit — rebuild all specs from the full canvas snapshot after each change.
2. Incremental semantic compiler — maintain a normalized graph, dirty-set propagation, and cached contract fragments keyed by semantic IDs and content hashes.
3. Event-sourced patch compiler — store RFC6902 patch streams and replay patches directly into generated contracts.

## Decision
Choose an **incremental semantic compiler**. After the validation gate passes, the compiler will project the canonical canvas into a normalized intermediate representation and maintain a reverse dependency graph linking elements, payload schemas, connections, service boundaries, and generated contract sections; changes mark a dirty set that is closed over dependents, then only affected fragments are regenerated. OpenAPI paths/components and AsyncAPI channels/messages are cached as AST fragments keyed by stable semantic IDs plus a content hash, and the final document is materialized from cached fragments after a 300ms debounce following the last committed change. On CONFLICT state entry, the fragment cache for all affected elements is immediately invalidated so that stale fragments cannot be used by the next successful validation pass; compilation resumes from a clean incremental state once the CONFLICT is resolved. This matches the PRD mitigation for R03, avoids mid-drag churn, and keeps compilation deterministic because full documents are still assembled from canonical fragment caches rather than mutating text directly.

## Consequences
**Positive:**
- Recompiles only impacted contract sections, reducing latency at larger canvas sizes.
- Stable semantic IDs make generated fragments reusable across commits and collaborators.
- Separate fragment caches map well to service-boundary grouping and mixed REST/Async command transport.
- Deterministic assembly still produces complete OpenAPI/AsyncAPI outputs suitable for Git commits and CI validation.

**Negative / trade-offs:**
- More complex than full regeneration: requires dependency indexing, cache invalidation, and dirty-set closure logic.
- Cycles and cross-boundary references need careful dependency modeling to avoid stale fragments.
- Benchmarking and tracing are mandatory; incremental systems can hide correctness bugs behind performance optimizations.
- Memory usage rises because semantic indexes and cached AST fragments stay resident during active sessions.

**Risks if not followed:**
- Full recompilation may exceed the latency budget and make collaborative editing feel broken.
- Users may see contract previews lag far behind committed changes, undermining the core value proposition.
- Attempting text-level patching without semantic dependencies risks invalid specs and non-reproducible output.

---

# ADR-004: Use schema-annotated semantic/cosmetic field separation for 3-way canvas merges

**Date**: 2026-05-29
**Status**: Proposed
**Deciders**: Frontend Lead, Tech Lead, Platform Architect

## Context
Branch merges in ChoreoStudio are explicitly not CRDT merges; they use a structured 3-way diff on the public canvas JSON/YAML schema. The risk is that ordinary layout edits—such as moving a sticky note or resizing a boundary—produce noisy conflicts that obscure real domain changes like renamed events, altered payload schemas, or rewired connections. A merge strategy is needed that distinguishes cosmetic presentation data from semantic model data while keeping one documented public file format.

## Decision Drivers
- Branch merges must use 3-way diff on the canvas JSON, not CRDT
- Canvas file format is public, documented, and versioned
- Cosmetic edits should not create user-facing merge conflicts
- Semantic changes must remain explicit and reviewable
- Offline divergence over 50 ops is treated as a branch merge, so this path must also serve reconnect recovery

## Considered Options
1. Plain JSON diff3 on the full document — treat every field equally during 3-way merge.
2. Schema-annotated semantic merge — tag fields as `semantic` or `cosmetic`, auto-resolve cosmetic paths, and run 3-way merge only on the semantic projection.
3. Split persistence into two files — one semantic model file and one layout file merged independently.

## Decision
Choose **schema-annotated semantic/cosmetic field separation inside one public canvas document**. The canvas schema will mark merge classes per field (for example: semantic = `type`, `name`, `transport`, `connections`, `payloadSchema`; cosmetic = `position`, `size`, `color`, `collapsed`), and the merge engine will derive base→source and base→target RFC6902 patch sets, classify paths by schema metadata, then run a `diff3` merge only on the semantic projection while auto-resolving cosmetic patches in favour of the target branch. The merge review UI will therefore surface only semantic conflicts, which directly implements the R06 mitigation and preserves a single documented JSON/YAML contract for downstream tooling.

## Consequences
**Positive:**
- Dramatically reduces merge noise from routine layout-only edits.
- Keeps domain-significant conflicts visible and reviewable.
- Preserves one public canvas schema rather than introducing multi-file persistence complexity.
- Reuses the same merge semantics for explicit branch merges and long-offline reconnect recovery.

**Negative / trade-offs:**
- The schema now carries merge semantics, so field classification becomes a compatibility concern.
- Some fields may be hard to classify cleanly and require migration rules over time.
- Auto-resolving cosmetic fields to target can discard intentional layout work from the source branch.
- The merge engine must canonicalize arrays/object ordering carefully to avoid false semantic conflicts.

**Risks if not followed:**
- Users will be flooded with low-value conflicts and may bypass merge review unsafely.
- Offline recovery and branch promotion will feel unreliable because layout churn masks real contract-impacting changes.
- Teams integrating against the public canvas schema may implement incompatible diff behavior, increasing ecosystem drift.

---

## ADR-005: TypeScript Monorepo with React 18, Fastify, and PostgreSQL

**Date**: 2026-05-29
**Status**: Accepted
**Deciders**: Tech Lead, Frontend Lead, Backend Lead, Platform Architect

## Context
ChoreoStudio is a SaaS web application that needs a rich interactive canvas, real-time multi-user editing, CRDT collaboration via Yjs (ADR-001), a WebSocket server for Yjs awareness and sync, REST plus WebSocket APIs for canvas operations, Git integration for canvas persistence, RBAC and SSO in M4, and shared canvas JSON schema types between frontend and backend. A stack decision is required that keeps the collaboration model native to the Yjs ecosystem while minimizing type drift across the product surface.

## Decision Drivers
- Support a rich node-edge canvas with drag-drop, zoom/pan, and custom element types
- Keep Yjs collaboration and y-websocket integration on a first-class supported stack
- Share canvas schema TypeScript types and validation logic between frontend and backend
- Avoid cross-language context switching across the product team
- Support both REST and WebSocket APIs for canvas operations and collaboration sync
- Keep local and CI builds fast in a multi-package codebase
- Store canvas files in Git rather than the primary application database, per ADR-002
- Support enterprise features including RBAC, team hierarchy, and SSO sessions

## Considered Options
1. TypeScript monorepo with React 18, Fastify, PostgreSQL, and a shared package — keep the full stack in one language with shared types and monorepo task orchestration.
2. Split-language architecture with React frontend and JVM or Go backend — optimize backend specialization at the cost of shared-type friction and extra team context switching.
3. Full-stack framework with a single deployable app and database-centric canvas persistence — simplify initial setup but diverge from the Git-backed persistence model and Yjs WebSocket requirements.

## Decision
Choose a **TypeScript monorepo built with Turborepo, React 18 + Vite on the frontend, Node.js + Fastify on the backend, a shared `packages/shared` package, and PostgreSQL for application data**. Turborepo is selected as the monorepo tool because it caches builds and runs tasks in parallel across packages, which is well suited to a TypeScript multi-package workspace. React 18 + Vite is selected for the frontend because Yjs has first-class React integration (`y-react`), `react-flow` is the leading canvas library for node-edge diagrams, and the broader React ecosystem is the best fit for a highly interactive SaaS UI. Node.js + Fastify is selected for the backend because it keeps the server in the same language as the frontend, reduces context switching, provides native TypeScript support, and supports WebSockets through `@fastify/websocket`, which is required for Yjs `y-websocket` style sync and awareness flows. The shared package will hold canvas schema TypeScript types generated from JSON Schema, AJV validators, and shared domain constants so both runtime tiers use the same contract surface. PostgreSQL is selected for user accounts, workspace and team hierarchy, RBAC roles, and SSO sessions, while canvas files themselves remain stored in Git per ADR-002 rather than in the database. Testing will use Vitest for frontend and shared packages, `supertest` for backend API coverage, and Playwright for end-to-end coverage; linting and formatting will use ESLint and Prettier with shared configuration at the monorepo root.

The package layout is:

```text
packages/
  frontend/    React 18 + Vite + react-flow + Yjs client
  backend/     Fastify + y-websocket + PostgreSQL (pg)
  shared/      Canvas schema TS types + AJV validator + constants
```

## Consequences
**Positive:**
- Uses a single TypeScript stack across the entire product, allowing canvas schema types to be shared cleanly via `packages/shared`.
- Aligns directly with the JavaScript/TypeScript-native Yjs ecosystem and its collaboration tooling.
- Uses `react-flow` to reduce custom canvas rendering complexity for node-edge diagrams and custom node types.
- Improves monorepo productivity through Turborepo parallelism and incremental build caching.

**Negative / trade-offs:**
- Node.js is single-threaded, so CPU-intensive contract generation from ADR-003 must run in a worker thread or separate compilation service.
- PostgreSQL adds a local development and deployment dependency that must be provisioned consistently.
- Monorepo tooling introduces workspace and task-graph complexity that the team must maintain over time.
- React and Fastify still require deliberate boundaries so the shared package does not accumulate framework-specific coupling.

**Risks if not followed:**
- Choosing a split-language stack would increase type drift risk between canvas schema definitions, validators, and API contracts.
- Avoiding the Yjs-native JavaScript ecosystem would increase integration cost and reduce leverage from existing collaboration libraries.
- Building the canvas without a purpose-built node-edge library would increase rendering and interaction complexity for core product workflows.
- Persisting canvas files in PostgreSQL instead of Git would conflict with ADR-002 and weaken the repository-centric audit model.

---
