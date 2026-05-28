# ChoreoStudio — Pre-Milestone Spike Briefs

## Spike A: CRDT Library Selection & Invariant Test Harness

**Duration**: 1 week  
**Team**: 1 frontend engineer, 1 platform/backend engineer, 1 QA/SDET (part-time)  
**Output required**: Go/No-Go recommendation + reproducible invariant test harness and comparison report

### Objective
Identify the CRDT library that can safely represent ChoreoStudio’s collaborative canvas in the browser while preserving structural correctness after merges. Build a repeatable test harness that proves whether candidate libraries can tolerate offline divergence and still converge into valid or explicitly conflicted canvas states.

### Background & Risk Being De-risked
This spike de-risks **R01 — CRDT merge producing structurally invalid canvas states causing silent contract corruption**. If concurrent edits merge into an invalid canvas without detection—for example, a Command detached from its Aggregate or a connection pointing to a deleted node—the compiler could emit incorrect OpenAPI/AsyncAPI contracts that appear valid to users. The selected CRDT must therefore support both convergence and a mandatory post-merge structural validation pass that promotes invalid merged states into an explicit **CONFLICT** state.

### Scope
Build and evaluate a thin prototype collaboration model for the canvas using the following candidates:
- **Yjs** using `Y.Doc` with `Y.Map`/`Y.Array`
- **Automerge 2.x**
- **Diamond Types** (browser-feasibility assessment required; if browser/WASM path is weak, document that as part of evaluation)

Implement a common domain fixture and test harness that covers:
- Canvas element creation for: Command, Event, Aggregate, Policy, ReadModel
- Element deletion
- Element move (`x`, `y`)
- Property edits: `name`, `type`, payload `schema`, `transport protocol`
- Connection creation/deletion with enforced directionality
- Merge of diverged replicas with up to ~50 operations before sync
- Structural validation after **every merge**
- Conflict materialization when post-merge validation fails

Define a canonical canvas data model and invariant validator that checks at minimum:
- Commands must connect to Aggregates
- No orphaned connections
- Connection endpoints must exist
- Connection direction is valid for the source/target types
- Deleted elements cannot still be referenced
- Required element properties are present after merge

Create benchmark scenarios for each library:
- Single-editor baseline
- Two-editor conflict scenarios
- Three-editor offline divergence and merge replay
- Worst-case divergence: ~50 ops before synchronization
- Browser-side merge/apply latency target aligned to **sub-100ms sync latency**

Record implementation complexity for each library, including:
- Ease of modeling nested canvas objects
- Browser compatibility / WASM packaging constraints
- Conflict observability and debugging ergonomics
- Expected integration burden with ChoreoStudio’s future state/store layer

### Out of Scope
- Production collaboration UI
- Presence, cursor sharing, awareness features, or auth/session handling
- Persistent backend sync service
- Final contract compiler integration
- Undo/redo product design beyond what the candidate library natively exposes
- Full security review or long-term storage format design

### Evaluation Criteria
| Criterion | Pass threshold |
|-----------|---------------|
| Browser compatibility | Runs in browser stack without blocking dependency on unsupported runtime; JS-native or practical WASM packaging |
| Operation coverage | All required canvas mutations represented in prototype model |
| Convergence | Diverged replicas converge deterministically across defined test scenarios |
| Post-merge validation | Structural validator runs after every merge and invalid state becomes explicit `CONFLICT` |
| Offline tolerance | Handles replay/merge of ~50 divergent operations without data loss |
| Merge latency | Median merge + validation <100ms for benchmark scenarios on 200-element-equivalent fixture scale |
| Developer ergonomics | Engineer can implement prototype and tests within spike window; debugging is practical |
| Recommendation quality | Comparison matrix clearly supports one Go/No-Go recommendation |

### Recommended Approach
1. **Define a canonical canvas domain model** independent of any CRDT library.
   - Represent elements and connections with stable IDs.
   - Separate geometric fields (`x`, `y`) from semantic fields (`name`, `schema`, `protocol`).
   - Define a normalized serialization format used by all candidate adapters.
   - For the Yjs candidate specifically, prototype the **bidirectional projection** between Yjs internal types (`Y.Map`/`Y.Array`) and this public canvas JSON format; validate that a round-trip (Yjs → snapshot → Yjs) is lossless for all required field types. This projection layer is a mandatory deliverable, not an implementation detail, because it is the interface between the live collaboration engine and every downstream system (validation, compilation, Git persistence).

2. **Implement a shared invariant validator** first.
   - Write a pure function `validateCanvas(canvas): Valid | Conflict[]`.
   - Return machine-readable violations (e.g., `missing-endpoint`, `command-without-aggregate`, `invalid-direction`).
   - Treat validator output as authoritative post-merge truth.

3. **Create a CRDT adapter contract** for the candidates.
   - Suggested interface: `init()`, `applyLocalOp(op)`, `merge(remoteState)`, `snapshot()`, `encode()`, `decode()`.
   - Keep operation fixtures identical across Yjs, Automerge, and Diamond Types.

4. **Model each candidate minimally but honestly**.
   - **Yjs**: prototype with `Y.Map` for elements/connections and nested maps for mutable fields.
   - **Automerge 2.x**: prototype with map/list document structure and patch/change tracking where useful.
   - **Diamond Types**: validate whether it can represent needed structured mutations ergonomically in browser/WASM; if not, explicitly record blocker.

5. **Build the invariant test harness**.
   - Create deterministic scenario fixtures: parallel delete/edit, parallel move/delete, connection endpoint deletion, cross-editor schema edits, conflicting re-typing.
   - After each merge, run validator and store result as `VALID` or `CONFLICT`.
   - Verify that no invalid merged state is silently treated as valid.

6. **Benchmark merge performance**.
   - Run in browser-like environment (headless browser or Node + browser-equivalent runtime if justified).
   - Measure: local op apply time, merge time, validation time, serialized payload size.
   - Repeat enough times to capture median/p95.

7. **Score candidates with weighted decision matrix**.
   - Suggested weighting: correctness/invariants 40%, latency 25%, browser fit 20%, implementation ergonomics 15%.
   - If two libraries pass technically, recommend the one with lower integration and debugging risk.

8. **Produce recommendation**.
   - Default expectation: recommend a single library plus rationale, rejected alternatives, and integration caveats.
   - Include explicit next step if recommendation is “Go with Yjs/Automerge” or “No-Go, build stricter app-level conflict layer first.”

### Deliverables
- [ ] Yjs bidirectional projection layer (Yjs types ↔ public canvas JSON) with round-trip losslessness verification
- [ ] Comparison prototype for Yjs, Automerge 2.x, and Diamond Types using the same canvas scenarios
- [ ] Shared post-merge invariant validator with machine-readable conflict output
- [ ] Automated test harness covering required mutation and merge cases
- [ ] Benchmark report with median/p95 merge and validation timings
- [ ] Decision matrix with weighted scoring and implementation notes
- [ ] Final Go/No-Go recommendation naming the chosen library (or explicit escalation path)

### Go / No-Go Decision Tree
If one candidate passes all required mutation scenarios, keeps merge + validation under 100ms, and always converts invalid post-merge structure into explicit `CONFLICT` → **Go** (proceed with that CRDT library and carry the validator into MVP architecture).

If multiple candidates pass, but one is materially simpler to integrate/debug in browser runtime → **Go** (proceed with the simpler candidate and document runner-up trade-offs).

If one candidate passes all correctness requirements but median merge + validation is 100–200ms → **Conditional Go** (proceed with that library, but log a performance optimisation task to be scheduled before M2 collaboration features ship; do not treat latency as blocking until re-measured on a production-representative fixture).

If no candidate can guarantee post-merge invalid-state detection or browser-feasible performance → **No-Go** (pause CRDT-based multi-user collaboration; Tech Lead and PM must convene within 48 hours to decide whether to (a) narrow M1 scope to single-editor canvas and re-attempt multi-user collaboration in M2, or (b) escalate to an app-level conflict-gated merge strategy as a replacement architecture. Either decision requires a PRD amendment before M1 begins).

---

## Spike B: Incremental Compilation Proof-of-Concept

**Duration**: 1 week  
**Team**: 1 compiler/backend engineer, 1 frontend engineer, 1 performance engineer or QA/SDET (part-time)  
**Output required**: Go/No-Go recommendation + incremental compiler proof-of-concept with benchmark evidence

### Objective
Prove that ChoreoStudio can regenerate OpenAPI 3.1 and AsyncAPI 2.6 outputs on every **committed** canvas change without turning live contract generation into a user-visible bottleneck. Build a proof-of-concept incremental compiler that recompiles only dirty, impacted sections and benchmark it under realistic collaborative edit load.

### Background & Risk Being De-risked
This spike de-risks **R03 — Live contract generation becoming a latency bottleneck at scale**. A naïve full rebuild on every committed change will likely exceed acceptable latency on a 200-element canvas, causing delayed feedback, stale specs, or queue buildup under concurrent editing. The system must instead track fine-grained dirty state, debounce after commits, and update only the affected OpenAPI service-boundary spec or AsyncAPI channel/message block.

### Scope
Build a proof-of-concept incremental compilation pipeline that:
- Accepts committed canvas changes only (not mid-drag/intermediate pointer movement)
- Applies a **300ms debounce** after the last committed change before compiling
- Tracks dirty elements and dependency relationships between canvas elements and generated contract sections
- Recompiles only affected outputs

Required proof points:
- **OpenAPI**: one spec per service boundary group; changing one Command should recompile only that service boundary’s spec
- **AsyncAPI**: changing one Event should update only the impacted channel/message block
- Dirty tracking must cover at least: element rename, schema change, transport/protocol change, connection change, service-boundary reassignment, add/delete element
- Compiler must support benchmark fixture of **200 elements**
- Simulate **3 concurrent editors**, each making **1 committed edit/second**
- Measure both end-to-end compile latency and per-affected-output incremental latency

Implement a minimal compiler graph or dependency index that can answer:
- Which generated OpenAPI spec(s) depend on this Command/Aggregate/Policy change?
- Which AsyncAPI channel/message blocks depend on this Event change?
- What must be invalidated when service boundary membership changes?

Produce a benchmark harness that compares:
- Full regeneration baseline
- Incremental regeneration after isolated single-element edits
- Incremental regeneration after topology changes (e.g., moved connection, boundary reassignment)
- Steady-state throughput under concurrent edit stream with 300ms debounce

### Out of Scope
- Production-ready compiler rewrite
- UI visualization of dirty state
- Background job/distributed compile architecture
- Persistence/caching across app restarts
- Exact final OpenAPI/AsyncAPI schema completeness for every edge case
- Network transport for publishing specs externally

### Evaluation Criteria
| Criterion | Pass threshold |
|-----------|---------------|
| Trigger model | Compiler runs only on committed changes and respects 300ms debounce |
| Full compile benchmark | 200-element full regeneration characterized and used as baseline |
| Incremental OpenAPI scope | Single-Command change recompiles only affected service boundary spec |
| Incremental AsyncAPI scope | Single-Event change updates only affected channel/message block |
| Dirty tracking accuracy | No missed invalidations in tested change scenarios |
| Incremental latency | Typical affected-scope incremental compile <100ms |
| End-to-end responsiveness | Total post-debounce update path remains <500ms for benchmark scenarios |
| Multi-editor resilience | Sustains simulated 3-editor, 1 edit/sec workload without backlog growth |
| Recommendation quality | Benchmark data supports clear Go/No-Go conclusion |

### Recommended Approach
1. **Define compilation units and dependency graph**.
   - Model source entities: Commands, Events, Aggregates, Policies, ReadModels, Connections, ServiceBoundary groups.
   - Model output units: `OpenAPISpec(serviceBoundaryId)` and `AsyncAPIChannel(eventId or channelId)`.
   - Create dependency edges from source elements to generated sections.

2. **Build a compile manifest / dirty index**.
   - Maintain per-element revision/hash.
   - On each committed change, mark the changed element dirty and propagate invalidation to dependent compilation units.
   - Record the reason for invalidation (`schema-change`, `boundary-change`, `connection-change`, etc.) to aid debugging.

3. **Implement a minimal full compiler baseline first**.
   - Generate deterministic OpenAPI 3.1 and AsyncAPI 2.6 outputs from the benchmark fixture.
   - This baseline is required for correctness comparison and timing.

4. **Layer incremental compilation on top**.
   - For OpenAPI, compile only the affected service boundary spec when an internal Command/Aggregate/Policy change occurs.
   - For AsyncAPI, re-render only the affected channel/message block when an Event-related change occurs.
   - For cross-boundary or topology edits, invalidate the smallest safe superset rather than rebuilding everything by default.

5. **Add commit/debounce orchestration**.
   - Accept compile requests only from committed canvas actions.
   - Batch bursts of changes with a fixed 300ms debounce window.
   - Coalesce repeated edits to the same element before compile execution.

6. **Create benchmark fixtures and workload simulator**.
   - Construct a representative 200-element canvas with multiple service boundaries and event flows.
   - Simulate 3 editors at 1 committed edit/sec each, including overlapping edits to different sections.
   - Include both low-impact property edits and higher-impact structural edits.

7. **Measure the right metrics**.
   - Full compile time
   - Incremental compile time by change type
   - Debounce wait + compile completion total
   - Queue depth/backlog under concurrent workload
   - CPU cost and memory growth over sustained run

8. **Validate correctness after each incremental compile**.
   - Compare incremental outputs against equivalent fresh full-regeneration outputs for the impacted sections.
   - Treat any mismatch as a correctness failure even if latency is good.

9. **Produce recommendation**.
   - If incremental compilation consistently hits latency goals and scopes invalidation correctly, recommend carrying the architecture into MVP.
   - Otherwise recommend fallback options such as service-boundary-level recompilation only, reduced compile frequency, or narrowing live preview guarantees.

### Deliverables
- [ ] Proof-of-concept incremental compiler with dirty tracking and dependency index
- [ ] Full-regeneration baseline implementation for correctness and benchmarking
- [ ] Debounced commit-trigger orchestration demonstrating 300ms post-commit firing
- [ ] Benchmark fixture for 200-element canvas and workload simulator for 3 concurrent editors
- [ ] Benchmark report with full vs incremental timings, p50/p95, and backlog observations
- [ ] Correctness report comparing incremental output against fresh full rebuild for impacted sections
- [ ] Final Go/No-Go recommendation with suggested MVP compilation strategy

### Go / No-Go Decision Tree
If incremental compilation updates only the affected OpenAPI/AsyncAPI sections, keeps typical incremental work under 100ms, and keeps total post-debounce responsiveness under 500ms on the benchmark workload → **Go** (proceed with incremental compiler architecture for MVP).

If latency passes only when recompiling at service-boundary granularity for OpenAPI and channel granularity for AsyncAPI → **Go** (proceed with that coarser-grained incremental strategy and explicitly document scope limits; this result is compatible with PRD §5.3 — "one spec per service boundary" — because the service-boundary grouping contract is preserved; only sub-boundary element-level granularity is not achieved in MVP).

If dirty tracking is unreliable, outputs diverge from full rebuilds, or workload causes persistent compile backlog → **No-Go** (Tech Lead and PM must convene within 48 hours to decide whether to (a) narrow live generation to single-editor sessions only, or (b) replace always-live generation with an explicit user-triggered "Compile" button for MVP; either option is a reduction of the core value proposition and requires a PRD §5.1 amendment and milestone re-scope before M3 begins).
