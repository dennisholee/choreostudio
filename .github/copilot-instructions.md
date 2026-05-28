# Copilot Instructions — ChoreoStudio (EventStormStudio)

## Project Overview

ChoreoStudio is a visual modeling environment for Enterprise Architects, API Developers, and Domain Experts. It bridges collaborative Event Storming workshops with production-ready service artifacts (OpenAPI, AsyncAPI, BPMN, orchestration scaffolding).

The core value proposition: a business flow modeled on the canvas **automatically compiles** into REST/async contracts and code scaffolding — eliminating manual translation and architectural drift.

---

## Three-Layer Architecture

The system is explicitly structured in three interconnected abstraction layers (from PRD):

| Layer | Name | Purpose |
|-------|------|---------|
| 1 | **Business Domain Layer** | Semantic Event Storming canvas — sticky notes, timeline, ubiquitous language, aggregates |
| 2 | **Technical Orchestration Layer** | Saga & state machine workspace — gateway routes, policy chains, compensating transactions |
| 3 | **Integration & Contract Layer** | Auto-generated protocol specs — OpenAPI (REST), AsyncAPI (Kafka/RabbitMQ), JSON/Avro schemas |

Data flows **downward**: Layer 1 auto-maps to Layer 2, which auto-generates Layer 3. Never design these layers in isolation.

---

## Domain Language & Event Storming Conventions

Strictly enforced element types with specific semantics:

| Color | Element | Rule |
|-------|---------|------|
| 🟠 Orange | **Domain Event** | Past-tense state change (e.g., "OrderPlaced", "PaymentFailed") |
| 🔵 Blue | **Command** | Initiates an action; must target an Aggregate or Orchestrator |
| 🪻 Lilac/Pink | **Policy/Saga** | Event-driven logic: "Whenever X happens, execute Y" |
| 🟡 Yellow | **Aggregate** | Encapsulates domain logic boundary |
| 🟢 Green | **Read Model/Data Store** | Query data needed for Command execution |

When generating domain model code, naming, or schema fields — use these distinctions precisely. A Command is not an Event; a Policy is not a Command.

---

## Contract Generation Rules

- **Blue Commands → OpenAPI (REST)** specs
- **Orange Events → AsyncAPI** specs (Kafka/RabbitMQ message brokers)
- Export targets: AWS Step Functions JSON, Camunda BPMN XML, Temporal Go/TypeScript scaffolding

When implementing the contract layer, maintain **zero structural divergence** between canvas model and generated output.

---

## Real-Time Collaboration & Conflict Resolution

- Canvas sync latency target: **sub-100ms**
- Multi-user presence: named cursors, viewport markers
- Conflict model: **CRDT / Operational Transformation** — concurrent edits to the same element are auto-merged (Google Docs model). No lock-based or last-write-wins fallback.
- Offline support: **browser-local state** with sync-on-reconnect. Reconnect conflicts resolve via the same CRDT model. Any code touching state sync must handle both the live and reconnect paths.

---

## Validation: Two Tiers (Resolved Conflict)

Hard-block and warn-only are **not the same rule** — they govern different violation categories:

| Tier | Type | Examples | Behaviour |
|------|------|---------|-----------|
| Structural | Hard-block | Unconnected Command, wrong element type in position | Rejected at placement **commit** (not during drag) |
| Semantic | Warn-only | Circular event chains, missing compensating transactions | Flagged; canvas remains valid and compilable |

If a **CRDT merge** produces a structurally invalid state, the canvas enters **CONFLICT state**: compilation suspended, invalid elements highlighted, collaborators notified.

---

## Compilation Trigger (Resolved Conflict)

Compilation fires on each **committed** canvas change (placement commit / confirmed edit) — **not on every drag frame**. Mid-gesture intermediate states do not trigger validation or compilation.

---

## Embargoed Model + Draft Lifecycle (Resolved Conflict)

Git is the sole persistence layer **at all lifecycle stages**:
- **Draft** canvas → stored on a `drafts/canvas-slug` Git branch
- **Approved** canvas → draft branch promoted (merged) to release branch
- There is no separate server-side storage at any stage; approval = branch promotion

---

## Branch Merge vs. CRDT (Resolved Conflict)

Two distinct protocols — never conflate them:
- **CRDT**: real-time concurrent edits *within* a branch (live collaboration)
- **3-way diff**: branch merges against a common ancestor commit, with a dedicated merge review UI

---

## Cross-Canvas Dependencies

- Domain Events and Commands can be **referenced across canvases** (cross-service / cross-bounded-context linking).
- A **workspace dependency graph** must be maintained to track inter-canvas references and propagate impact of changes (e.g., renaming an Event on Canvas A should surface impact on Canvas B).

---

## Contract Sync & Drift Detection

- **Two-way sync**: external modifications to exported OpenAPI/AsyncAPI specs (e.g., in a developer's IDE or CI pipeline) must be detected and merged back into the canvas.
- The canvas is the **source of truth** for structure, but external edits are reconciled — not discarded.
- Surface conflicts to the user when auto-merge is not possible.

---

## Import / Reverse Ingestion

- Teams can bootstrap a canvas from **existing OpenAPI, AsyncAPI, and BPMN** artifacts.
- The import pipeline must reverse-engineer canvas elements (Commands → Blue, Events → Orange, Aggregates → Yellow, Policies → Lilac) with reasonable fidelity.

---

## Versioning

- Canvas state is stored as a **structured file (JSON/YAML) in the team's Git repository**.
- All history, branching, and diffing use standard Git tooling — do not build a proprietary version store.
- Breaking changes (renamed Events, split Aggregates) surface as Git diffs, enabling PR-based review by downstream teams.

---

## Security Model

- Auth: SSO via **SAML 2.0** and **OIDC**
- Authorization: **workspace-level RBAC** with four tiers:
  - **Reader** — view only
  - **Contributor** — add/edit elements within a workspace
  - **Architect** — full edit + workspace config + element locking
  - **Admin** — user management, permissions, integrations
- RBAC is workspace-scoped, not element-scoped. No per-element permission rules in v1.

---

## Workspace Hierarchy

- Structure: **Organisation → Team → Workspace**
- Each workspace contains canvases (one per bounded context); each canvas has its own Layer 1/2/3 views
- RBAC roles are scoped at workspace level

---

## Git Integration

Canvas files can reach the repo via three paths (all must produce identical output):
1. **Direct push** — OAuth integration with GitHub/GitLab/Bitbucket
2. **Manual download** — user commits themselves
3. **CI/CD webhook** — external pipeline pulls on change

---

## Canvas File Format

- The JSON/YAML canvas file is a **public, documented schema** — an intentional integration point
- Teams may build custom tooling and exporters against it
- The schema must be versioned; treat breaking schema changes like breaking API changes

---

## Data Residency

- **Embargoed model**: ChoreoStudio stores **no canvas data** server-side after a session ends
- Git repo is the sole persistence layer
- Ephemeral server memory only during live collaboration sessions
- This is an auditable, first-class constraint — not an aspiration

---

## AI Features (v1 scope)

- **AI canvas reviewer only**: flags Event Storming anti-patterns (Commands with no Event, orphaned Aggregates, circular chains, etc.)
- Suggestions are advisory — AI never modifies the canvas
- No generative features (text-to-canvas, auto-complete) in v1

---

## Licence & Repository

- **Apache 2.0** — entire product is open-source, all features freely accessible, no paid tier in v1
- **Public GitHub repo** from day one — open issues, community PRs welcome
- No feature flags needed for OSS/paid split in v1; monetisation model deferred post-launch

---

## Org-Wide Schema Registry

- **Organisation-scoped shared schema library** — reusable types (e.g., `OrderId`, `Address`, `Money`) defined once, referenced across any canvas
- Semantic versioning enforced:
  - Non-breaking changes → auto-upgrade all referencing elements
  - Breaking changes → blocked until all referencing elements are manually migrated
- Stored as a Git-backed file under an org-level shared schema path (same format as canvas files)

---

## Canvas Review & Approval Lifecycle

- States: **Draft → In Review → Approved**
- **Approval gates Git publishing** — only Approved canvases push contracts to Git; local preview always available
- Architects/Admins approve; Contributors/Readers comment only
- Returning to In Review notifies all workspace members

---

## Canvas Branching

- Canvases support **Git-style branches** for exploratory design without disturbing stable state
- Branches are independent canvas files in Git; merge uses the CRDT conflict model
- Any user with Contributor access or above can create a branch

---

## Service Boundary Assignment

- Elements are assigned to a service boundary via a **flat list selector** (select elements → pick group from panel)
- Each element belongs to exactly one boundary group
- Ungrouped elements export as a standalone spec

---

## Client Surfaces

Three surfaces sharing the same file format and CRDT sync layer:
- **Web** (primary, full-featured)
- **Desktop / Electron** (offline-capable, large-display)
- **VS Code extension** (canvas read/edit from within IDE, for API developers)

---

## MVP vs. Roadmap Boundary

**In v1 (MVP):** Canvas + validation + live contract generation + Git-backed files + CRDT collaboration + offline mode + import + RBAC + SSO + approval workflow + AI reviewer + web client + in-product analytics.

**V2 (post-MVP):** Cross-canvas dependencies, two-way spec sync, org-wide schema registry, canvas branching, time-travel restore, change notifications, Electron desktop app.

**Future:** VS Code extension, org-wide search + impact analysis, open-core OSS publication, external webhooks.

When implementing any feature, check §34–§36 of the PRD before expanding scope — several high-complexity features are explicitly deferred.

---

## Saga Pattern

- **Hybrid model**: orchestration *within* a bounded context (central coordinator); choreography *across* bounded contexts (event-driven, no coordinator)
- Layer 2 must visually distinguish between the two patterns

---

## Command Transport

- Each Command element has a per-element **transport protocol**: REST → OpenAPI, or Async (Kafka/RabbitMQ) → AsyncAPI
- Mixed-protocol canvases are valid; the Layer 1 → Layer 3 mapping is protocol-aware

---

## Payload Schemas

- Every Command and Domain Event carries an **inline nested JSON Schema** (required, type, format, enum, min/max, pattern)
- This schema drives the generated `requestBody` (OpenAPI) and `message payload` (AsyncAPI)

---

## Service Boundaries & Contract Grouping

- Service boundaries are **manual named grouping layers** on the canvas — separate from Aggregates
- One OpenAPI spec is exported **per service boundary group**; Commands outside any group are exported ungrouped

---

## Deletion Lifecycle

- **Deprecation-first**: elements must be marked `deprecated` before deletion
- Deprecated elements propagate `deprecated: true` into generated contracts
- Only Architect/Admin roles can delete; Contributors can only deprecate
- Deleting a cross-canvas element triggers an impact warning

---

## Discoverability

- Org-wide **canvas search** (find elements by name/type across all workspaces)
- **Impact analysis** (show all dependents before a destructive change)
- **Dependency graph visualisation** (interactive cross-canvas link map)
- Time-travel restore: any past canvas state can be restored in-app; restore creates a new Git commit

---

## Delivery Milestones (24-week MVP)

| Milestone | Weeks | Theme | Critical gate |
|-----------|-------|-------|--------------|
| Pre-spikes | –1 to 0 | CRDT library selection + incremental compilation POC | Go/No-Go before M1 |
| **M1** Canvas Foundation | 1–6 | 5-element canvas, validation, workspace hierarchy, Git branch | Canvas saves to `choreostudio/drafts/` branch |
| **M2** Collaboration & Persistence | 7–12 | CRDT multi-user, offline sync, Git schema, import | CRDT invariant suite passes |
| **M3** Contract Generation | 13–18 | JSON Schema authoring, live OpenAPI/AsyncAPI, service boundaries | Compilation <500ms on 200-element canvas |
| **M4** Governance & Launch | 19–24 | RBAC, SSO, approval workflow, AI reviewer, analytics | SSO tested on Okta + Azure AD; RBAC server-side only |

M3 is the first milestone that delivers the core value proposition. Everything before it is infrastructure.
