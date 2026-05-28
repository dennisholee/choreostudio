## Product Requirement Document (PRD)## 1. Executive Summary## 1.1 Document Overview
This document specifies the product requirements for "ChoreoStudio", an advanced visual modeling environment tailored for Enterprise Architects, API Developers, and Domain Experts.
## 1.2 Problem Statement
Current digital whiteboard tools lack semantic awareness of software concepts. They treat Event Storming as generic sticky notes. Engineers must manually translate visual diagrams into OpenAPI templates, async payloads, and workflow scripts, leading to architectural drift, human error, and elongated delivery timelines.
## 1.3 Target Audience

* Enterprise Architects: Designing governance boundaries and macro-service interactions.
* Backend & API Engineers: Writing integration logic, handling error states, and managing data mappings.
* Product Managers / Domain Experts: Modeling business processes without technical syntax overhead.

------------------------------
## 2. Product Vision & Core Value Proposition
ChoreoStudio bridges the gap between collaborative domain modeling and production-ready service implementation. It delivers a multi-layered design workspace where a business flow automatically compiles into executable REST orchestrations, asynchronous events, and structural code scaffolding.
------------------------------
## 3. High-Level System Architecture Layers
The platform decomposes systemic design into three distinct, interconnected conceptual abstraction layers:

+------------------------------------------------------------------------+

| 1. BUSINESS DOMAIN LAYER (Event Storming Canvas)                      |
|    - Sticky Notes, Timeline, Ubiquitous Language, Aggregates           |
+------------------------------------------------------------------------+

                               |  Auto-Mapped
                               v
+------------------------------------------------------------------------+
| 2. TECHNICAL ORCHESTRATION LAYER (Saga & State Workspace)              |
|    - Gateway Routes, Policy Chains, Compensating Transactions, Errors  |
+------------------------------------------------------------------------+

                               |  Auto-Generated
                               v
+------------------------------------------------------------------------+
| 3. INTEGRATION & CONTRACT LAYER (Protocol Specifications)             |
|    - OpenAPI (REST), AsyncAPI (Kafka/RabbitMQ), Schemas (JSON/Avro)    |
+------------------------------------------------------------------------+

------------------------------
## 4. Detailed Functional Requirements## 4.1 Layer 1: The Business Domain Workspace (Semantic Event Storming Canvas)

* Infinite Semantic Canvas: Multi-user canvas that recognizes the semantic relationships of Event Storming elements rather than treating them as generic shapes.
* Enforced Palette Conventions: Strictly enforced, context-aware color and behavior configurations:
* Orange (Domain Event): Must represent a state change in the past tense.
   * Blue (Command): Initiates an action; must target an Aggregate or Orchestrator.
   * Lilac/Pink (Policy/Saga): Directs event-driven logic flows ("Whenever X happens, execute Y").
   * Yellow (Aggregate): Encapsulates domain logic boundaries.
   * Green (Read Model/Data Store): Holds query data needed for Command execution.
* Timeline Assertions: Chronological ordering flow from left to right, featuring automated dependency tracking and validation checks.

## 4.2 Layer 2: The Technical Orchestration Workspace (Saga & Control Engine)

* BPMN / State Diagram Split View: Bi-directional toggling between the Event Storming canvas and a structured, executable state machine view.
* Orchestration Logic Construction: Visual definition tools for conditional branching, data mapping, parallel routing, and timeout metrics.
* Error Handling & Compensating Flows: Explicit design pathways for system faults, including retry counts, circuit breaker thresholds, and reversal operations for partial failures.

## 4.3 Layer 3: Integration, Contracts, and Protocol Generation

* Contract Assembly Line: Automated generation of standardized industry configurations:
* REST Targets: Compiles Blue Commands into complete OpenAPI (Swagger) specifications.
   * Event Targets: Compiles Orange Events into AsyncAPI specifications for message brokers.
* Target Engine Export Blueprints: Code-free exporting capabilities for orchestration targets, including AWS Step Functions JSON, Camunda BPMN XML, and Temporal-compliant Go/TypeScript scaffolding.

------------------------------
## 5. System Qualities & Technical Constraints## 5.1 Real-Time Collaborative Architecture

* Simultaneous multi-user canvas updates with sub-100ms latency synchronization.
* Presence indicators including named user cursors and localized viewport markers.
* **Conflict Resolution**: Operational Transformation / CRDT model. Concurrent edits to the same element are automatically merged without user intervention, consistent with the Google Docs collaboration model.
* **Compilation Trigger**: Contract and orchestration artifacts are generated live on every **committed** canvas change (a placement commit, not a mid-drag intermediate state). The system must handle partially-valid canvas states gracefully without breaking previously exported artifacts.

## 5.2 Cross-Canvas Dependencies

* Domain Events and Commands can be shared and referenced across canvases, enabling cross-service (cross-bounded-context) dependency modeling.
* A dependency graph must be maintained between workspaces to track inter-canvas references and propagate impact of changes.

## 5.3 Contract Synchronization & Drift Management

* **Two-way sync**: After export, external modifications to generated OpenAPI/AsyncAPI specs (e.g., in a developer's IDE or CI pipeline) are detected and merged back into the canvas model.
* The system must detect drift between the canvas state and the exported artifact, and surface conflicts for resolution.

## 5.4 Canvas Validation Model

* **Strict enforcement applies to structural validity only**: Invalid element placements (e.g., a Command not connected to an Aggregate or Orchestrator, an element of the wrong type in a position) are hard-blocked in real time at the point of placement commit (mouse release / keyboard confirm) — not during drag gestures.
* **Semantic violations** (e.g., circular event chains) are flagged as warnings, not hard-blocked. See §21.
* **Two validation tiers**:
  * *Structural* (hard-block): wrong element type, unconnected mandatory targets, malformed connections.
  * *Semantic* (warn-only): cycles, missing compensating transactions, anti-patterns surfaced by the AI reviewer.
* If a CRDT merge produces a structurally invalid canvas state, the canvas enters a **CONFLICT state**: compilation is suspended, invalid elements are highlighted, and affected collaborators are notified to resolve manually before work continues.

## 5.5 Import & Reverse Ingestion

* Teams may import existing **OpenAPI, AsyncAPI, and BPMN** artifacts to bootstrap a canvas from their current system state.
* The import pipeline must reverse-engineer canvas elements (Commands, Events, Aggregates, Policies) from the imported specifications with reasonable fidelity.

## 5.6 Versioning & History

* **Git-backed persistence**: Canvas state is stored as a structured file (e.g., JSON/YAML) within the team's source code repository.
* This provides full version history, branching, diffing, and tagging via standard Git tooling.
* Breaking changes (e.g., renaming a Domain Event, splitting an Aggregate) are visible as diffs in Git history, giving downstream teams standard PR-based review workflows.

## 5.7 Enterprise Security Requirements

* Single Sign-On integration supporting SAML 2.0 and OIDC protocols.
* Role-Based Access Control (RBAC) at the **workspace level**, supporting four tiers:
  * **Reader**: View canvas and generated artifacts only.
  * **Contributor**: Add and edit canvas elements within a workspace.
  * **Architect**: Full edit rights including workspace configuration and element locking.
  * **Admin**: Manage users, workspace permissions, and integrations.

## 5.8 Deployment & Offline Support

* **Primary deployment**: SaaS.
* **Offline mode**: The application supports browser-local state persistence. Users may continue editing while disconnected; changes are synced back to the server on reconnect.
* Conflict resolution on sync-after-reconnect follows the same CRDT model as real-time collaboration (§5.1).

------------------------------
## 7. Workspace Organisation & Tenancy

* **Hierarchy**: Organisation → Team → Workspace. Each workspace contains a set of canvases (one per bounded context or domain area), each with its own Layer 1/2/3 views.
* RBAC roles (§5.7) are scoped at the workspace level within this hierarchy.

------------------------------
## 8. Git Integration

Canvas state (§5.6) can be committed to a team's repository via any of the following mechanisms:

* **Direct push**: OAuth-authenticated integration with GitHub, GitLab, or Bitbucket. ChoreoStudio commits the canvas file directly.
* **Manual download**: Export the canvas file and commit it manually.
* **CI/CD webhook**: Trigger an external pipeline that pulls and commits the canvas file on change.

All three modes must produce an identical, reproducible file format.

------------------------------
## 9. Canvas File Format

* The Git-backed canvas file format (JSON or YAML) is a **public, documented schema**.
* It is an intentional integration point — teams may build custom tooling, exporters, or validators against it.
* The schema must be versioned alongside the product to avoid breaking changes for downstream tooling.

------------------------------
## 10. Data Residency & Privacy

* **Embargoed model**: ChoreoStudio does not store canvas data in its own cloud infrastructure.
* The Git repository is the **sole persistence layer** for canvas state, including Draft canvases.
* **Draft canvases are persisted to a Git branch** (e.g., `drafts/canvas-slug`). Approval (§29) promotes the draft branch to the release branch via a merge — it is a branch promotion, not a separate publish event. This preserves the embargoed model throughout the entire lifecycle.
* Ephemeral server-side memory is used only for active real-time collaboration session state (CRDT operations in flight); no canvas content is retained after a session ends.

------------------------------
## 11. Change Notifications

* When a shared cross-canvas element (Event or Command) is modified or removed, **affected workspace members receive in-app notifications and an email digest**.
* Notification must identify: what changed, which canvas originated the change, and which dependent canvases are impacted.

------------------------------
## 12. AI Assistance

* ChoreoStudio includes an **AI canvas reviewer** that analyses the canvas for common Event Storming anti-patterns, such as:
  * Commands with no corresponding Domain Event
  * Aggregates with no inbound Commands
  * Policies with no triggering Event
  * Circular event chains
* AI suggestions are advisory only — they do not auto-modify the canvas.
* No AI-generative features (text-to-canvas, auto-complete) in v1.

------------------------------
## 13. Canvas Scale & Performance

* No hard element limit per canvas.
* A **soft cap with in-canvas performance warnings** is surfaced when element count approaches a threshold that may degrade rendering or CRDT sync performance.
* The rendering engine must support viewport-based optimisation (only render visible elements) to maintain usability at scale.

------------------------------
## 14. Onboarding

* v1 ships with a **blank canvas only**. No starter templates or AI-generated first drafts.
* Import from existing OpenAPI/AsyncAPI/BPMN (§5.5) is the primary path for teams with existing systems.

------------------------------
## 15. Deployment Integration

* ChoreoStudio's scope ends at **contract export**. It does not push generated specs to API gateways, generate infrastructure-as-code, or trigger deployments.
* Teams integrate exported artifacts into their own CI/CD pipelines.

------------------------------
## 16. Licence & Open-Source Strategy

* **Licence**: Apache 2.0 — permissive, maximising community adoption.
* **Scope**: The **entire product** — canvas engine, contract generation, collaboration, RBAC, SSO, AI reviewer, and all features listed in §34 — is freely accessible under Apache 2.0 at launch. There is no paid enterprise tier in v1.
* **Monetisation**: Deferred. The v1 strategy is community adoption first; commercial model (hosted SaaS, support, consulting, or dual-licence) to be determined from adoption signals post-launch.
* **Repository**: Public GitHub repository from day one. Open issues, community PRs welcome.
* **Risk note (R10 revised)**: With no paid tier, the open-core boundary leakage risk (§37/R10) is moot for v1. However, the Apache 2.0 licence permits commercial forks without contribution obligations — this should be reassessed if a paid tier is introduced in V2.

------------------------------
## 17. Saga Pattern Model

* ChoreoStudio uses a **hybrid saga model**:
  * **Orchestration** within a bounded context: a central saga coordinator directs all steps inside a workspace.
  * **Choreography** across bounded contexts: cross-canvas flows are event-driven, with no central coordinator.
* Layer 2 must support both representations and clearly distinguish between them in the state machine view.

------------------------------
## 18. Payload Schema Authoring

* When a Command or Domain Event is placed on the canvas, users define its **payload schema inline** using a nested JSON Schema editor.
* Supported constraints: `required`, `type`, `format`, `enum`, `minimum`, `maximum`, `pattern`.
* The schema is the source of truth for the `requestBody` (OpenAPI) or `message payload` (AsyncAPI) in generated contracts.

------------------------------
## 19. Command Transport Protocol

* Each Command element has a configurable **transport protocol**:
  * **REST** → generates an OpenAPI path + operation
  * **Async** (Kafka, RabbitMQ, etc.) → generates an AsyncAPI channel + message
* The protocol is set per element, not per canvas. Mixed-protocol canvases are fully supported.
* This extends §4.3: the mapping is Command (REST) → OpenAPI **or** Command (Async) → AsyncAPI depending on the element's protocol setting.

------------------------------
## 20. Service Boundary Modelling & Contract Grouping

* A **service boundary** is a named grouping layer drawn manually on the canvas. It is a separate concept from an Aggregate.
* One canvas can contain multiple Aggregates and multiple service boundaries.
* At export, **one OpenAPI spec is generated per service boundary group**. Commands outside any named boundary are ungrouped and exported separately.

------------------------------
## 21. Cycle Detection & Circular Dependencies

* Circular event chains (e.g., Policy A triggers Event B, which triggers Policy A) are **permitted but flagged** with a canvas-level warning.
* The AI reviewer (§12) surfaces these as anti-patterns.
* Users may suppress the warning by annotating the cycle with an explicit "circuit breaker" note.
* Hard-blocking cycles is explicitly out of scope — some architectures use intentional cycles with guards.

------------------------------
## 22. Annotations

* Any canvas element may carry **sticky comment annotations**: free-text notes authored by any user with Contributor access or above.
* Annotations are threaded (replies supported) and show author + timestamp.
* Annotations are stored in the canvas file (§9) and appear in Git diffs.

------------------------------
## 23. Undo, Redo & Time-Travel

* **Full in-app undo/redo** within a session.
* **Time-travel restore**: ChoreoStudio presents an in-app view of the canvas's Git commit history. Any prior commit can be checked out and restored as a new commit on top of history. No separate server-side history store is used — Git log is the sole source of canvas history, consistent with the embargoed data model (§10).

------------------------------
## 24. Deletion Semantics

* Elements must be **marked deprecated** before deletion is permitted.
* A deprecated element remains on the canvas and in generated contracts (marked with `deprecated: true` in OpenAPI/AsyncAPI) until explicitly deleted.
* Deletion of an element referenced by another canvas triggers a cross-canvas impact warning before proceeding.
* Only Architect and Admin roles may delete a deprecated element; Contributors may only deprecate.

------------------------------
## 25. Discoverability & Impact Analysis

The platform provides three organisation-wide navigation tools:

* **Canvas search**: find any element (Event, Command, Aggregate, Policy) by name or type across all workspaces in the organisation.
* **Impact analysis**: given an element, show every other element and canvas that depends on it before making a destructive change.
* **Dependency graph visualisation**: an interactive org-wide map of cross-canvas links (§5.2), showing which workspaces are upstream/downstream of each other.

------------------------------
## 27. Service Boundary Assignment UX

* Users assign elements to a service boundary via a **flat list selector**: select one or more elements on the canvas, then pick a named service boundary group from a dropdown/panel.
* Service boundary groups are named and managed in a sidebar; elements can belong to exactly one boundary group.
* Elements not assigned to any boundary group are exported as a standalone ungrouped spec (§20).

------------------------------
## 28. Organisation-Wide Schema Registry

* A **centralised schema library** stores reusable types (e.g., `OrderId`, `Address`, `Money`) at the organisation scope.
* Any element on any canvas in the org can reference a registered type.
* Schema library entries follow **semantic versioning**:
  * Non-breaking changes (new optional fields) → auto-upgrade all referencing elements.
  * Breaking changes (removed fields, type changes, new required fields) → blocked until referencing elements are manually migrated.
* The schema library is stored as part of the Git-backed canvas file system (§9) under an org-level shared schema path.

------------------------------
## 29. Canvas Review & Approval Workflow

* Each canvas has a formal lifecycle state: **Draft → In Review → Approved**.
* **Comments** (§22) are available in all states for asynchronous discussion.
* **Approval gates Git publishing**: only Approved canvases can push generated contracts to Git. Local contract preview is always available regardless of state.
* Architects and Admins may approve; Contributors and Readers may comment only.
* Returning a canvas from Approved to In Review resets the state and notifies workspace members.

------------------------------
## 30. Canvas Branching

* Canvases support **Git-style branching**: users may create an experimental branch from any canvas state to explore design alternatives (e.g., "split Aggregate" scenario) without disturbing the stable branch.
* Branches can be merged back or discarded. Merges use a **structured 3-way diff** on the canvas JSON schema (current branch vs. target branch vs. common ancestor commit) — not the real-time CRDT protocol. CRDT handles concurrent live edits within a branch; branch merges are a separate code path with a dedicated merge review UI for conflicts.
* Each branch is an independent canvas file in Git; branch management mirrors Git branch semantics.

------------------------------
## 31. Collaborative Edit Awareness

* Real-time presence shows **named cursor positions** only.
* There are no per-element lock indicators or active-edit signals in v1.
* Concurrent edits to the same element are silently resolved via CRDT (§5.1); users are not interrupted.
* This is an intentional simplicity choice — per-element locking is deferred to a future version.

------------------------------
## 32. Client Surfaces

ChoreoStudio is available on three surfaces:

* **Web browser** (primary): full-featured SaaS canvas.
* **Desktop app** (Electron): offline-capable, syncs on reconnect (§5.8); suited for Architects needing large-display, low-latency editing.
* **VS Code extension**: read and edit canvas elements from within the IDE; suited for API developers working alongside generated contracts.

All three surfaces share the same canvas file format (§9) and CRDT sync layer.

------------------------------
## 33. v1 Out of Scope

The following are explicitly deferred from v1:

* External event hooks / webhooks to Slack, Jira, GitHub Actions
* Per-element RBAC or element-level locking
* AI-generative features (text-to-canvas, auto-complete)
* Onboarding templates
* Deployment / API gateway push integrations

------------------------------
## 34. MVP Scope (v1)

The following 21 features constitute the v1 release. All are required to deliver the core value proposition (time-to-code reduction via semantic canvas → generated contracts).

### Canvas & Modelling
* Semantic canvas with 5 enforced element types (§4.1)
* Hard-block validation on invalid connections (§5.4)
* Per-element transport protocol: REST → OpenAPI, Async → AsyncAPI (§19)
* Nested JSON Schema payload authoring per element (§18)
* Service boundary grouping; one OpenAPI spec generated per group (§20)
* Soft canvas size cap with performance warnings (§13)
* Annotations / threaded comments on any element (§22)
* Deprecation-first deletion with role gating (§24)
* In-app undo / redo (§23)

### Contract Generation & Integration
* Live streaming OpenAPI + AsyncAPI contract generation (§5.1)
* Git-backed canvas file with public documented schema (§9)
* Import existing OpenAPI / AsyncAPI / BPMN to bootstrap canvas (§5.5)
* Approval gates Git publishing; local preview always available (§29)

### Collaboration & Access
* CRDT real-time collaboration with cursor presence (§5.1)
* Offline mode with CRDT sync-on-reconnect (§5.8)
* Org → Team → Workspace hierarchy (§7)
* Workspace-level RBAC — Reader / Contributor / Architect / Admin (§5.7)
* SSO via SAML 2.0 and OIDC (§5.7)
* Draft → In Review → Approved canvas lifecycle (§29)

### Intelligence & Delivery
* AI anti-pattern reviewer — advisory only, no generative features (§12)
* In-product analytics tracking time-from-first-element to first-contract-export (§6)
* Web browser client — primary delivery surface (§32)

------------------------------
## 35. V2 Roadmap

These features are deferred from v1 due to implementation complexity or dependency on v1 adoption data. Each is blocked on a stated prerequisite.

| Feature | Prerequisite |
|---------|-------------|
| Cross-canvas event/command references + org dependency graph (§5.2) | Stable canvas file schema and multi-workspace adoption |
| Two-way spec sync — detect and merge external edits (§5.3) | File-watching infrastructure + diff/merge engine |
| Org-wide schema registry with semantic versioning (§28) | Stable element schema model from v1 |
| Canvas branching — experimental / stable branches (§30) | Git integration (§8) fully shipped and stable |
| In-app time-travel restore (§23) | Git integration and canvas history indexing |
| In-app change notifications + email digest (§11) | Cross-canvas dependency graph (above) |
| Desktop Electron app (§32) | Web client feature-complete; offline mode validated |

------------------------------
## 36. Future Roadmap

These features require prerequisite platform maturity or separate strategic decisions before scoping.

| Feature | Dependency |
|---------|-----------|
| VS Code extension (§32) | Stable public canvas schema API; V2 schema registry |
| Org-wide canvas search + impact analysis visualisation (§25) | Cross-canvas dependency graph (V2) |
| External event hooks — Slack, Jira, GitHub Actions (§33) | V2 adoption data to prioritise integration targets |

------------------------------
## 26. Success Metrics & KPIs

* **Time-to-Code Reduction**: Achieve a 40% reduction in time elapsed between domain discovery workshops and initial API schema creation.
  * *Measurement*: In-product analytics tracking time elapsed from first canvas element placement to first successful contract export (OpenAPI or AsyncAPI). Baseline established from pilot customer cohort in beta.
* **Architecture Sync Fidelity**: 100% of approved canvases produce spec-compliant OpenAPI 3.1 and AsyncAPI 2.6 outputs with zero structural validation errors at the point of Git release branch promotion.
  * *Measurement*: Automated spec validation (OpenAPI validator + AsyncAPI parser) runs as a Git pre-receive hook on every release branch push; any validation failure blocks promotion. Baseline: 0 invalid specs merged to release in beta cohort.
* **User Engagement**: Over 70% of engineering project teams interact with the orchestration view daily during design sprint cycles.

------------------------------
## 37. Technical Risk Register

Risks scored: Likelihood × Impact (High=3, Medium=2, Low=1). Score 9 = critical; 6 = high; 4 = medium.

### 🔴 Critical Risks (Score 9)

**R01 — CRDT + Validation: Silent contract corruption** *(Tech Lead)*
CRDT merge can produce structurally invalid canvas states before the post-merge validation fires, causing silent corruption in generated OpenAPI/AsyncAPI output.
*Mitigation*: Validation is a synchronous post-merge gate before any compilation step fires. Build a formal CRDT invariant test suite asserting structural validity after every merge. Define and test all "conflict state" scenarios exhaustively before shipping collaborative editing.

**R02 — Git-Backed Draft Branch Sprawl** *(Platform Architect)*
Draft canvas branches accumulate across hundreds of workspaces, making the team's Git repo unmanageable. Enterprise IT rejects the integration model.
*Mitigation*: Define a branch lifecycle policy with auto-deletion on approval merge or configurable TTL. Use a namespaced convention (`choreostudio/drafts/`) so teams can apply Git repo rules independently. Simulate 50-workspace scale before GA.

**R03 — Live Compilation Performance at Scale** *(Backend Lead)*
Streaming contract generation on every committed change becomes a latency bottleneck. A 200-element canvas with 5 concurrent editors triggers expensive full spec regeneration on every edit.
*Mitigation*: Implement incremental compilation — track dirty elements and recompile only affected contract sections. Add a 300ms debounce after last commit. Benchmark against a 200-element / 5-editor scenario before v1 launch.

**R04 — Two-Way Spec Sync Feasibility (V2)** *(Tech Lead)*
Detecting and merging external OpenAPI/AsyncAPI edits back into the canvas has no clean algorithmic solution. Edge cases will be numerous and user-visible.
*Mitigation*: Begin with a spike (2–3 engineer-weeks) to validate feasibility before V2 scoping. Ship drift *detection* (warning only) before attempting merge. Never auto-merge — always surface a user-facing diff review UI.

---

### 🟠 High Risks (Score 6)

**R05 — Schema Registry Breaking Change Cascade** *(Product Lead)*
A breaking change to a widely-used org type blocks compilation across 30+ canvases owned by different teams — a de facto org-wide incident.
*Mitigation*: Introduce schema version pinning as a fast-follow to registry launch. Provide a migration dashboard showing all affected canvases and owners before the change is committed.

**R06 — Branch 3-Way Diff Noise** *(Frontend Lead)*
Standard JSON 3-way diff treats positional fields (x/y coordinates) as semantic conflicts, generating noise that frustrates users doing routine layout changes.
*Mitigation*: Build a semantic diff layer: auto-resolve cosmetic fields (position, size) in favour of the target branch. Only surface semantic fields (type, name, connections, schema, transport) as user-facing merge conflicts.

**R07 — SAML Enterprise Onboarding Variance** *(Security Lead)*
SAML 2.0 integrations with enterprise IdPs (Okta, Azure AD, Ping) have high per-customer configuration variance. A broken assertion mapping blocks an entire enterprise from logging in.
*Mitigation*: Use a battle-tested SAML library. Build a configuration test harness. Test against Okta, Azure AD, and Google Workspace before GA. Maintain a dedicated enterprise onboarding runbook.

**R08 — Import Fidelity: Lossy Reverse Ingestion** *(Product Lead)*
Reverse-engineering Event Storming elements from OpenAPI/AsyncAPI/BPMN is inherently lossy. A POST `/orders` endpoint does not unambiguously map to a Command vs. a Policy. Low fidelity on first use erodes trust.
*Mitigation*: Import produces a best-effort canvas with explicit "unresolved" markers where mapping is ambiguous. Users classify unresolved elements manually before the canvas is considered valid. Set expectations in onboarding copy: import is a starting point, not a finished model.

**R10 — Contributor Licence Agreement Gap** *(CTO / Legal)*
Without a CLA or DCO process in place, accepting community contributions may introduce incompatible licence terms into the Apache 2.0 codebase, creating legal uncertainty for downstream users.
*Mitigation*: Establish a Developer Certificate of Origin (DCO) or Contributor Licence Agreement (CLA) process before the first external pull request is merged. Add DCO sign-off enforcement to CI. Legal review of contribution policy before public repo launch.

---

### 🟡 Medium Risks (Score 4)

**R09 — Offline CRDT Reconnect Divergence** *(Tech Lead)*
A user editing offline for several hours while 200+ changes occur on the same canvas produces a CRDT merge that neither party recognises.
*Mitigation*: Warn users when local state diverges beyond a threshold (e.g., 50 ops behind). Show a before/after diff preview before committing the reconnect merge. Treat long-offline sessions as branch merges (3-way diff) rather than CRDT replays.
---

------------------------------
## 38. Delivery Milestones

Total MVP runway: **24 weeks** across 4 milestones. Each milestone is independently shippable to a closed beta cohort.

> **Pre-milestone spikes (before Week 1):**
> Run two parallel 1-week spikes to de-risk critical path before the team commits to M1:
> - **Spike A**: CRDT library selection + invariant test harness (de-risks R01)
> - **Spike B**: Incremental compilation proof-of-concept on a 200-element canvas (de-risks R03)
> Both spikes must produce a Go/No-Go recommendation before M1 begins.

---

### Milestone 1 — Canvas Foundation *(Weeks 1–6)*
**Theme**: A single user can build a semantically valid Event Storming canvas and save it.

| Feature | Critical Path |
|---------|:---:|
| Semantic canvas — 5 enforced element types, palette, connections | ✅ |
| Structural validation (hard-block on commit; warn-only for semantic) | ✅ |
| Org → Team → Workspace hierarchy (data model + basic UI) | ✅ |
| In-app undo / redo | — |
| Soft canvas size cap with performance warnings | — |

**Exit criteria**: A single user places all 5 element types, invalid connections are rejected at commit, undo/redo works across 20+ operations, workspace hierarchy is navigable, canvas state persists to a `choreostudio/drafts/` Git branch.

**Risks de-risked**: R01 (CRDT invariant framework laid), R02 (branch naming convention established).

---

### Milestone 2 — Collaboration & Persistence *(Weeks 7–12)*
**Theme**: Multiple users edit together; existing systems can be imported; canvas is durably Git-backed.

| Feature | Critical Path |
|---------|:---:|
| CRDT real-time collaboration + cursor presence | ✅ |
| Git-backed canvas file with public documented schema | ✅ |
| Offline mode with CRDT sync-on-reconnect | — |
| Import existing OpenAPI / AsyncAPI / BPMN | — |
| Annotations / threaded comments on elements | — |

**Exit criteria**: Two concurrent users edit the same canvas without data loss; CRDT post-merge validation passes invariant test suite; offline edit of 50+ ops syncs cleanly on reconnect; an existing OpenAPI 3.0 spec imports and produces a canvas with classified (or "unresolved") elements; annotations persist in the canvas Git file.

**Risks de-risked**: R01 (CRDT + validation integration complete), R08 (import fidelity expectation set), R09 (offline reconnect divergence threshold defined).

---

### Milestone 3 — Contract Generation *(Weeks 13–18)*
**Theme**: The canvas compiles into real, usable OpenAPI and AsyncAPI contracts. This is the core value proposition.

| Feature | Critical Path |
|---------|:---:|
| Nested JSON Schema payload authoring per element | ✅ |
| Per-element transport protocol (REST or Async) | ✅ |
| Service boundary grouping → one OpenAPI spec per boundary | ✅ |
| Live streaming OpenAPI + AsyncAPI generation (incremental) | ✅ |
| In-product analytics — KPI telemetry instrumented | — |

**Exit criteria**: A canvas with 2 service boundaries, 5 Commands (mixed REST + Async), and 3 Domain Events produces valid, spec-compliant OpenAPI 3.1 and AsyncAPI 2.6 output; incremental compilation benchmarks <500ms on a 200-element canvas with 3 concurrent editors; KPI telemetry fires on `first_element_placed` and `first_contract_exported` events.

**Risks de-risked**: R03 (compilation performance validated at scale).

---

### Milestone 4 — Governance & Launch Readiness *(Weeks 19–24)*
**Theme**: Enterprise-grade access control, approval workflows, and AI assistance. Closed beta → GA gate.

| Feature | Critical Path |
|---------|:---:|
| Workspace-level RBAC — all 4 roles enforced server-side | ✅ |
| SSO via SAML 2.0 and OIDC | ✅ |
| Draft → In Review → Approved lifecycle; approval gates Git publish | — |
| Deprecation-first deletion with role gating | — |
| AI anti-pattern reviewer (advisory) | — |

**Exit criteria**: SSO validated against Okta and Azure AD; all RBAC roles enforce correctly server-side (not client-side); a canvas in Draft state cannot push to the release Git branch; an Approved canvas promotes the draft branch via merge; AI reviewer flags ≥3 distinct anti-pattern types with actionable descriptions.

**Risks de-risked**: R07 (SAML variance tested), R10 (OSS boundary enforced server-side from day one).

---

### Critical Path Summary

```
[Spike A: CRDT] ──┐
                   ├──► M1: Canvas ──► M2: Collaboration ──► M3: Contracts ──► M4: Governance ──► GA
[Spike B: Compile]─┘
```

M3 is the highest-value milestone — it is the first point at which the product delivers its stated value proposition. M1 and M2 are prerequisites. M4 is the enterprise readiness gate.
