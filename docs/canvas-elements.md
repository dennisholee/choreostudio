# Canvas Elements Reference

## 1. Element type reference table

| Type | Colour | Code value | Description | Layer 1 / 2 / 3 mapping |
|---|---|---|---|---|
| Domain Event | 🟠 Orange | `domainEvent` | Past-tense business fact that something already happened | Layer 1 fact → Layer 2 trigger/input → Layer 3 AsyncAPI channel + message |
| Command | 🔵 Blue | `command` | Intent to perform work against a business capability | Layer 1 action → Layer 2 executable step → Layer 3 OpenAPI path (REST) or AsyncAPI operation (Async) |
| Policy / Saga | 🟣 Lilac | `policy` | Rule that reacts to events and coordinates next actions | Layer 1 rule marker → Layer 2 orchestration/choreography logic → Layer 3 orchestration dependencies and contract links |
| Aggregate | 🟡 Yellow | `aggregate` | Consistency and service ownership boundary for domain behavior | Layer 1 business boundary → Layer 2 resource anchor → Layer 3 service/resource grouping boundary |
| Read Model | 🟢 Green | `readModel` | Query-side projection or reporting view | Layer 1 query need → Layer 2 projection/query dependency → Layer 3 query endpoint or projection schema |

## 2. Connection rules

Connections are directed and must preserve business flow. A valid canvas does not allow free-form edges.

| Source | Target | Status | Notes |
|---|---|---|---|
| Domain Event | Policy / Saga | Allowed | Standard event-to-policy trigger; if absent, the event can still exist independently. |
| Domain Event | Read Model | Allowed | Models event-driven projection updates. |
| Command | Aggregate | Required primary path | Every Command must resolve to an Aggregate-owned capability for structural validity. |
| Command | Policy / Saga | Allowed secondary path | Used when a Policy coordinates or gates execution before/after Aggregate handling. |
| Policy / Saga | Command | Allowed | Represents rule-driven follow-up actions and compensating steps. |
| Aggregate | Domain Event | Allowed | Captures state changes emitted after command handling. |
| Read Model | Command | Allowed | Shows query/projection data being used to support a command. |

### Direction rules
- Flow should move from intent to handling to emitted fact: `Command -> Aggregate -> Domain Event` is the canonical path.
- `Domain Event -> Policy -> Command` models saga/choreography continuation.
- Reverse-direction edges that contradict these paths are structurally invalid.
- Every edge must reference existing source and target element IDs; dangling edges hard-block commit.

## 3. Validation rules per element

| Element | Structural hard-blocks | Semantic warnings |
|---|---|---|
| Domain Event | Invalid `type`, orphaned connection, malformed payload schema, missing required async-export metadata | Name is not past tense, event cycle participation, no meaningful consumer/policy path |
| Command | Invalid `type`, no connection to Aggregate/Policy, transport unset, malformed payload schema, missing endpoint data needed for export | No resulting event, missing compensating transaction, action label is ambiguous |
| Policy / Saga | Invalid `type`, orphaned connection, invalid direction on trigger/action edges | No triggering event, no resulting command, compensation path missing for failure handling |
| Aggregate | Invalid `type`, orphaned connection, broken ownership path for connected Commands | Aggregate emits no resulting event, overloaded boundary, suspicious cross-boundary coupling |
| Read Model | Invalid `type`, orphaned connection, malformed projection/query schema | Projection appears stale, read side has no upstream update path, query model duplicates another view |

Structural failures block commit or suspend compilation after merge. Semantic warnings annotate the committed canvas but keep editing and local preview available.

## 4. Transport protocol

Only **Command** elements carry transport selection.

| Transport | Authoring meaning | Contract-generation result |
|---|---|---|
| `REST` | Synchronous command handled through an HTTP-style request/response boundary | Emits an OpenAPI 3.1 path + operation inside the owning service-boundary spec |
| `Async` | Fire-and-forget or brokered command delivered over messaging infrastructure | Emits an AsyncAPI 2.6 operation/channel/message and is removed from OpenAPI output |

Rules:
- Transport is set per Command, not per canvas.
- Mixed REST and Async commands in one canvas are valid.
- A Command with no transport is structurally incomplete for contract generation.

## 5. Payload schema authoring

Command, Domain Event, and Read Model elements can carry inline nested JSON Schema.

- Schemas are stored inline in the canvas document.
- Nested `object` and `array` structures are allowed.
- Typical supported keywords include `type`, `properties`, `items`, `required`, `format`, `enum`, `minimum`, `maximum`, and `pattern`.
- Contract generation lifts the same schema into OpenAPI `requestBody` / component schemas or AsyncAPI message payloads.

### Deprecation behavior
- Elements and schema fields follow a deprecation-first lifecycle.
- Marking an element or field as deprecated preserves it in generated artifacts with `deprecated: true`.
- Deletion should happen only after deprecation and impact review.

## 6. Service boundary grouping

Service boundaries are manual named groups on the canvas; they are **not** the same thing as Aggregates.

- Each contract-bearing element belongs to exactly one boundary group or remains explicitly ungrouped.
- One OpenAPI spec is generated per boundary group.
- REST Commands compile into the OpenAPI document for their boundary.
- Async Commands and Domain Events compile into AsyncAPI outputs scoped to the affected channels/operations.
- Reassigning an element to another boundary invalidates the old boundary output and recompiles the new one in the same cycle.

## 7. Lifecycle states

| State | Meaning | Editing | Compilation |
|---|---|---|---|
| `draft` | Active working state on a draft branch | Fully editable by authorized contributors | Runs on committed, structurally valid changes for local preview |
| `inReview` | Candidate state awaiting approval decision | Editing should be limited and review-focused; substantial changes should create a new review commit or return to draft workflow | Local preview can still compile if structurally valid, but release promotion is gated |
| `approved` | Review accepted and branch promoted/merged | Stable released state; new work should start a fresh draft branch | Eligible for release-branch publication/export |
| `conflict` | Structurally invalid merged state requiring manual repair | Editing is restricted to conflict resolution until structure is valid again | Suspended until structural validation passes |
