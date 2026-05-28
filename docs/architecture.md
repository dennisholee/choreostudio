# ChoreoStudio Architecture

## 1. Overview

ChoreoStudio is a visual Event Storming environment that turns a semantically validated canvas into executable technical design artifacts. Contributors model business intent in Layer 1, ChoreoStudio derives orchestration semantics in Layer 2, and the compiler emits integration contracts in Layer 3 as OpenAPI 3.1 and AsyncAPI 2.6 without hand-maintained translation layers.

## 2. Three-layer architecture

```text
+--------------------------------------------------------------------------------+
| Layer 1 — Business Domain                                                      |
| Event Storming canvas: Domain Events, Commands, Policies, Aggregates,          |
| and Read Models captured as business concepts                                  |
+--------------------------------------------------------------------------------+
                                      |
                                      | auto-map semantic intent
                                      v
+--------------------------------------------------------------------------------+
| Layer 2 — Technical Orchestration                                              |
| Saga/state-machine view: orchestration inside a bounded context,               |
| choreography across bounded contexts, compensation and state transitions       |
+--------------------------------------------------------------------------------+
                                      |
                                      | auto-generate executable contracts
                                      v
+--------------------------------------------------------------------------------+
| Layer 3 — Integration & Contracts                                              |
| OpenAPI 3.1 specs for REST Commands, AsyncAPI 2.6 specs for async Commands     |
| and Domain Events, grouped by service boundary                                 |
+--------------------------------------------------------------------------------+
```

### Layer 1 — Business Domain
- The canvas is the source of truth for domain intent.
- Exactly five element types are allowed: `domainEvent`, `command`, `policy`, `aggregate`, and `readModel`.
- Layer 1 records business language, payload schemas, transport choices, service-boundary membership, and graph connections.

### Layer 2 — Technical Orchestration
- Layer 2 is derived from the validated Layer 1 graph.
- Policies become orchestration or choreography rules, Commands become executable steps, Aggregates anchor resource ownership, and Read Models surface query/projection dependencies.
- Saga behavior is hybrid by design: orchestration within a bounded context, choreography across contexts.

### Layer 3 — Integration & Contracts
- Layer 3 is generated only from committed, structurally valid snapshots.
- REST Commands compile to OpenAPI 3.1 operations.
- Async Commands and Domain Events compile to AsyncAPI 2.6 channels/messages.
- One OpenAPI document is generated per service-boundary group.

### Auto-derivation rules
1. Contributors edit Layer 1 only.
2. A committed change produces a canonical canvas snapshot.
3. Structural validation decides whether derivation may continue.
4. The semantic graph is projected into Layer 2 orchestration structures.
5. Incremental compilation emits Layer 3 artifacts from the Layer 2/semantic graph.

## 3. Canvas data model

The canvas is stored as a public JSON or YAML document in Git. Its role is to represent domain semantics rather than presentation alone: stable element identifiers, element `type`, labels, payload schemas, transport metadata, service-boundary assignment, lifecycle state, and directed connections are part of the durable model. Cosmetic fields such as position and size exist in the same document, but ADR-004 treats them differently during 3-way merge.

Treat `docs/schema/` as the canonical home for the public canvas schema and related validation examples. Architecture documentation should stay aligned with that schema surface: the schema defines the document shape, while this guide explains why those fields exist and how the runtime uses them.

## 4. Collaboration model

### Live editing within a branch
- ChoreoStudio uses **Yjs** (`Y.Doc` with `Y.Map`/`Y.Array`) for concurrent editing inside a single branch.
- CRDT operations merge live edits and offline replay while divergence remains small.
- After each committed transaction, the runtime materializes a canonical canvas snapshot and runs structural validation before allowing compilation.

### Branch merge and long-offline reconnect
- CRDT is **not** used for branch promotion or long-offline recovery.
- Branch merges use a **3-way diff** over the public canvas JSON/YAML document.
- The same path is used when a client reconnects with more than 50 unmerged operations.
- ADR-004 separates semantic fields from cosmetic fields so merge review focuses on contract-relevant changes.

### `CONFLICT` lifecycle
1. A CRDT merge or 3-way merge produces a canonical snapshot.
2. Structural validation runs synchronously.
3. If validation passes, the canvas returns to its normal lifecycle state and compilation proceeds.
4. If validation fails, the canvas enters `conflict`.
5. In `conflict`, compilation is suspended, invalid elements are highlighted, and collaborators resolve the broken structure manually.
6. Once the structural violations are fixed and re-committed, validation reruns and compilation resumes.

## 5. Contract generation pipeline

### Trigger model
- Generation fires on **committed** canvas changes only.
- Mid-drag and in-progress edits do not trigger validation or compilation.
- A fixed **300 ms debounce** coalesces bursts of committed changes into a single compile run.

### Incremental compilation
- The compiler projects the canonical canvas into a semantic dependency graph.
- Dirty-element tracking marks changed elements and closes over all dependents.
- Generated fragments are cached by **semantic ID + content hash**.
- Structural validation failure invalidates affected fragments and blocks publication until a valid snapshot exists again.

### Output by element type

| Element type | Layer 2 role | Layer 3 output |
|---|---|---|
| Domain Event | Trigger / fact in flow | AsyncAPI channel + message |
| Command (`REST`) | Executable step | OpenAPI 3.1 path + operation |
| Command (`Async`) | Executable async step | AsyncAPI operation/message |
| Policy / Saga | Rule, orchestrator, or choreographer | Contributes orchestration wiring and generated dependencies |
| Aggregate | Resource / consistency boundary | Service resource boundary and path grouping anchor |
| Read Model | Projection / query view | Query endpoint or projection schema |

## 6. Git persistence model

### Sole durable store
- Git is the only durable persistence layer.
- ChoreoStudio keeps no server-side canvas storage after a session ends.
- Server memory is ephemeral and exists only to support active collaboration.

### Draft and approval flow
- Draft work lives on `choreostudio/drafts/<slug>` branches.
- Approval is branch promotion by merge into the release branch.
- There is no separate publish database and no out-of-band approval store.

### Branch hygiene
- ADR-002 reserves the `choreostudio/drafts/` namespace for managed draft refs.
- Draft branches are deleted on approval or discard.
- Stale draft branches are eligible for TTL-based cleanup by repository janitor automation.

## 7. Validation pipeline

### Structural validation (hard-block)
Structural rules run at placement commit, connection commit, post-merge snapshot validation, and before compilation. Failures stop persistence of the invalid commit or suspend compilation after a merge. Examples include:
- wrong element `type`
- Command missing a required execution target
- orphaned or malformed connections
- missing contract-bearing endpoint metadata such as transport/endpoint requirements

### Semantic validation (warn-only)
Semantic rules run on the committed graph after structural validation succeeds. Warnings do not block persistence or local preview compilation. Examples include:
- event/policy cycles
- missing compensating transactions
- anti-pattern naming or topology concerns

### Post-merge failure behavior
If a CRDT merge succeeds operationally but fails structural validation, ChoreoStudio does **not** trust the merged state. The branch remains editable, the lifecycle moves to `conflict`, affected fragments are invalidated, contract generation is suspended, and contributors must resolve the structural errors before the next successful compile.

## 8. Key ADR decisions

| ADR | Decision | One-line rationale |
|---|---|---|
| ADR-001 | Use Yjs for intra-branch collaboration with synchronous post-merge structural validation | Fast browser CRDT sync is acceptable only when every committed merge is checked against domain invariants. |
| ADR-002 | Manage drafts as `choreostudio/drafts/` Git branches with TTL cleanup | Git stays the sole store while branch namespace and cleanup keep repositories manageable. |
| ADR-003 | Use a semantic dependency graph plus fragment cache for compilation | Incremental recompilation is required to keep contract generation responsive on committed edits. |
| ADR-004 | Separate semantic and cosmetic fields during 3-way merge | Merge review should expose contract-relevant conflicts, not layout noise. |
