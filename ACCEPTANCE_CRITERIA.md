# ChoreoStudio — Acceptance Criteria

## Milestone 1 — Canvas Foundation

### Feature: Semantic canvas with 5 enforced element types
- AC1: Given a Contributor opens a new canvas, when the element palette loads, then it exposes exactly 5 placeable types and no others: **Domain Event** (orange), **Command** (blue), **Policy/Saga** (lilac/pink), **Aggregate** (yellow), and **Read Model/Data Store** (green).
- AC2: Given a user drags an element from the palette onto the canvas, when the placement is committed, then the persisted node record stores a `type` value of exactly one of `domainEvent`, `command`, `policy`, `aggregate`, or `readModel` and preserves the configured palette color in the rendered node style.
- AC3: Given a user creates a **Domain Event**, when the label is committed, then the editor rejects labels that are not past-tense event names (for example, accepts `OrderPlaced`, rejects `PlaceOrder`) and shows a semantic warning, not a hard block, if the naming rule is violated.
- AC4: Given a user creates a **Command**, when they attempt to commit it without a connection to either an **Aggregate** or a **Policy/Saga/Orchestrator** node, then the placement commit is blocked and the UI displays `Structural validation failed: Command must connect to Aggregate or Orchestrator`.
- AC5: Given a canvas is saved, when the canvas file is written, then every node entry in the JSON/YAML document contains a stable `id`, `type`, `label`, `position`, and `style.color`, and each `type` maps to the enforced palette color defined by the PRD.

### Feature: Structural validation (hard-block on commit; warn-only for semantic)
- AC1: Given a user completes a drag or connection edit, when they click outside the node or finish the connector action, then structural validation runs on commit only and does not interrupt free dragging or mid-drag repositioning.
- AC2: Given a commit introduces a structural error such as an invalid node type, an unconnected **Command**, or a malformed connection with a missing source or target, when validation executes, then the change is not persisted to the canvas file and the UI keeps the editor in the pre-commit state.
- AC3: Given a committed change creates a semantic issue such as a cycle or a missing compensating transaction, when validation executes, then the change is persisted, the affected elements are marked with warning state, and compilation remains enabled.
- AC4: Given both structural and semantic issues are present in the same commit, when validation completes, then structural errors take precedence and block persistence, while semantic warnings are listed in a non-blocking warnings panel.
- AC5: Given validation output is returned from the server, when a structural failure occurs, then the API responds with HTTP `422 Unprocessable Entity` and a machine-readable error payload containing `tier: "structural"`, `code`, `elementIds[]`, and `message`.

### Feature: Org → Team → Workspace hierarchy
- AC1: Given an Admin creates a new workspace, when the request succeeds, then the workspace must belong to exactly one Team and one Org and cannot exist as a top-level object without both parent identifiers.
- AC2: Given a user is assigned to multiple Teams in the same Org, when they switch workspace context, then the workspace list shows only workspaces in Teams where the user has membership and hides workspaces from other Teams.
- AC3: Given a canvas is created inside a workspace, when its metadata is persisted, then the canvas record includes `orgId`, `teamId`, and `workspaceId`, and those values are used in all read/write authorization checks.
- AC4: Given a Team is moved to a different Org, when the operation is attempted, then the server rejects it with HTTP `409 Conflict` if the Team still owns workspaces or canvases, preventing orphaned hierarchy references.
- AC5: Given a workspace is deleted, when the delete is committed, then all child canvas references are either removed or soft-deleted in the same transaction and no canvas remains accessible by direct URL afterward.

### Feature: In-app undo / redo
- AC1: Given a user performs node create, delete, move, rename, or connector add/remove actions, when they invoke Undo, then the last committed canvas mutation is reversed in LIFO order without affecting uncommitted drag state.
- AC2: Given a user undoes one or more actions, when they invoke Redo, then the exact reversed mutations are replayed with the same node ids and connection ids restored.
- AC3: Given a structural validation failure occurs on a new action, when the user invokes Undo, then the failed action is not part of the undo stack because it was never committed.
- AC4: Given a user performs 100 sequential committed actions, when they undo all 100, then the canvas returns byte-for-byte to the same serialized JSON/YAML content as before the first action.
- AC5: Given a page refresh occurs after successful save, when the editor reloads the canvas, then the persisted canvas state is restored and the local undo/redo stack is cleared rather than replayed across sessions.

### Feature: Soft canvas size cap with performance warnings
- AC1: Given a canvas exceeds the configured soft-cap threshold of 500 placed elements or 1,000 edges, when the next commit occurs, then the UI shows a non-blocking performance warning banner and still persists the change.
- AC2: Given a canvas is above the soft cap, when the user adds additional nodes, then no feature is disabled solely due to size and the warning remains informational rather than a hard validation error.
- AC3: Given a canvas crosses the threshold for the first time, when the warning is shown, then the warning payload includes current counts for nodes and edges so QA can verify threshold calculation.
- AC4: Given a canvas contains 500 elements and the user pans or zooms, when interaction is measured on a reference workstation, then average frame time remains at or below 50 ms for pan and zoom operations over a 10-second sample.
- AC5: Given the canvas size returns below the threshold after deletions, when the next commit completes, then the performance warning banner is removed automatically.

## Milestone 2 — Collaboration & Persistence

### Feature: CRDT real-time collaboration + cursor presence
- AC1: Given two Contributors open the same canvas simultaneously, when User A commits a node add or move, then User B sees the update applied within 1 second without a manual refresh and without losing local selection state.
- AC2: Given two users edit different nodes concurrently, when both commits arrive, then the CRDT merge produces a deterministic shared state with both changes present and no duplicated node ids.
- AC3: Given two users edit the same node label concurrently, when the CRDT merge resolves, then both clients converge to the same final label value and the resulting operation history is identical on reconnect.
- AC4: Given multiple users are active on the same canvas, when cursor presence is broadcast, then each remote cursor displays the collaborator name and current pointer position and expires from the UI within 10 seconds of disconnect.
- AC5: Given a CRDT post-merge state violates structural rules, when validation runs after merge, then the canvas enters `CONFLICT` state, compilation is suspended, invalid elements are highlighted, and all connected users receive a conflict notification within 2 seconds.

### Feature: Git-backed canvas file with public documented schema
- AC1: Given a canvas named `order-flow` in draft state, when a committed change is saved, then the canvas is persisted to branch `choreostudio/drafts/order-flow` in exactly one JSON or YAML file representing the full current canvas.
- AC2: Given the canvas file is committed, when a user inspects the repository, then the file conforms to a documented public schema and validates with no undocumented required fields.
- AC3: Given two consecutive committed canvas changes, when the second commit is written, then the Git diff contains only changed properties for dirty elements and any changed annotations stored in the same file.
- AC4: Given the repository is public, when the root license file is inspected, then it contains Apache License 2.0 text and the canvas schema documentation references that license.
- AC5: Given a canvas is approved for promotion, when the promotion job runs, then the draft branch head is promoted to the configured release branch without rewriting unrelated canvas branches.

### Feature: Offline mode with CRDT sync-on-reconnect
- AC1: Given a Contributor loses network connectivity, when they continue editing, then committed canvas operations are stored in browser-local state and the editor shows offline status without blocking local undo/redo.
- AC2: Given the user reconnects while fewer than or equal to 50 local operations are pending behind the server head, when sync begins, then queued operations replay through CRDT merge and the canvas converges without a manual merge flow.
- AC3: Given the user reconnects while more than 50 local operations behind the server head, when sync begins, then the system performs a 3-way diff branch merge instead of CRDT replay and surfaces merge results before resuming normal editing.
- AC4: Given offline edits merge into an invalid structural state, when post-merge validation runs, then the canvas enters `CONFLICT` state and compilation remains suspended until the structural issues are resolved.
- AC5: Given the browser is refreshed while offline, when the canvas reloads, then unsynced local operations are restored from browser-local storage and no committed offline change is lost.

### Feature: Import existing OpenAPI / AsyncAPI / BPMN
- AC1: Given a valid OpenAPI 3.1 file in `.yaml` or `.json` format is imported, when parsing completes, then HTTP operations are mapped into **Command** elements with REST transport metadata and grouped into service boundaries where possible.
- AC2: Given a valid AsyncAPI 2.6 file in `.yaml` or `.json` format is imported, when parsing completes, then publish/subscribe operations are mapped into **Command** and **Domain Event** relationships with async transport metadata preserved.
- AC3: Given a BPMN 2.0 XML file is imported, when parsing completes, then tasks, events, and gateways are converted into best-effort Event Storming equivalents and any ambiguous mapping is marked with an `unresolved` indicator on the resulting canvas element.
- AC4: Given an imported artifact contains constructs that cannot be mapped unambiguously, when the import finishes, then the UI lists each unresolved element with source location and leaves the canvas editable rather than failing the entire import.
- AC5: Given an unsupported file type or invalid document is uploaded, when the import endpoint validates the request, then the server responds with HTTP `400 Bad Request` and a parser-specific error message including the failing line or section when available.

### Feature: Annotations / threaded comments on elements
- AC1: Given a user selects any canvas element type, when they add a comment, then the annotation is attached to that element id and displayed as a threaded comment panel for that element.
- AC2: Given multiple replies are added to the same thread, when the canvas is saved, then the full thread including author, timestamp, message body, and parent-child reply references is persisted inside the canvas JSON/YAML file.
- AC3: Given a canvas file containing comment changes is committed to Git, when the diff is viewed, then added, edited, or resolved comment threads appear as normal line-level changes in the serialized canvas file.
- AC4: Given an element is deleted, when it has open comment threads, then the delete action either cascades comments into a tombstoned state tied to the deleted element id or blocks deletion with a message requiring explicit resolution first; the behavior must be consistent and documented.
- AC5: Given a user lacks permission to edit the underlying canvas, when they attempt to add or resolve a comment through the API, then the server rejects the request with HTTP `403 Forbidden`.

## Milestone 3 — Contract Generation

### Feature: Nested JSON Schema payload authoring per element
- AC1: Given a user opens a **Command**, **Domain Event**, or **Read Model/Data Store** detail panel, when they author payload structure, then the editor supports nested JSON Schema objects and arrays with explicit `type`, `properties`, `required`, and `items` fields.
- AC2: Given a user enters invalid JSON Schema such as an array without `items` or a `required` field referencing a missing property, when they commit the payload, then validation blocks the save and identifies the exact schema path that failed.
- AC3: Given a valid payload schema is saved, when the canvas file is serialized, then the schema is stored inline in JSON/YAML and preserved byte-for-byte across reloads.
- AC4: Given an element payload includes `deprecated: true` on a field, when contract generation runs, then the generated OpenAPI 3.1 or AsyncAPI 2.6 schema contains the same field-level deprecation flag.
- AC5: Given a nested payload is modified only in one sub-property, when incremental compilation runs, then only the owning dirty element and affected service boundary are recompiled.

### Feature: Per-element transport protocol (REST or Async)
- AC1: Given a **Command** element is created, when the user configures transport, then the editor allows exactly two protocol values: `REST` or `Async`.
- AC2: Given a **Command** is marked `REST`, when generation runs, then the command is emitted into an OpenAPI 3.1 document and is not duplicated in AsyncAPI output.
- AC3: Given a **Command** is marked `Async`, when generation runs, then the command is emitted into an AsyncAPI 2.6 document and is not duplicated in OpenAPI output.
- AC4: Given a user changes a command transport from `REST` to `Async`, when the next committed canvas change triggers generation, then the command is removed from the prior OpenAPI artifact and added to the AsyncAPI artifact in the same compilation cycle.
- AC5: Given transport is unset on a command at commit time, when validation runs, then the system blocks contract generation for that dirty element and returns `422 Unprocessable Entity` with `message: "Command transport must be REST or Async"`.

### Feature: Service boundary grouping → one OpenAPI spec per boundary
- AC1: Given elements are assigned to a named service boundary group, when generation runs, then exactly one OpenAPI 3.1 document is produced per boundary containing only REST commands from that boundary.
- AC2: Given a service boundary contains only Async commands, when generation completes, then no empty OpenAPI file is emitted for that boundary and only the AsyncAPI artifact is produced.
- AC3: Given a command is moved from boundary `billing` to boundary `orders`, when the next commit triggers compilation, then the operation is removed from `billing` output and appears only in `orders` output.
- AC4: Given two boundaries define commands with the same operation label, when specs are generated, then artifact file names remain unique by boundary slug and no path or operation entry leaks across boundaries.
- AC5: Given a boundary assignment is missing on a contract-bearing element, when generation runs, then the compiler surfaces a non-success build result identifying the ungrouped element id and does not silently place it in a default boundary.

### Feature: Live streaming OpenAPI + AsyncAPI generation (incremental)
- AC1: Given any committed canvas mutation occurs, when the change persists successfully, then contract generation starts automatically; no generation is triggered during drag, hover, or uncommitted text entry.
- AC2: Given only one dirty element changes, when incremental compilation executes, then the compiler recalculates only the affected dirty element set and impacted boundary artifacts rather than rebuilding unrelated boundaries.
- AC3: Given a successful generation run, when artifacts are emitted, then REST outputs conform to OpenAPI `3.1.0` and async outputs conform to AsyncAPI `2.6.0`.
- AC4: Given compilation is in progress, when the user views local preview, then generated specs stream into the preview pane within 3 seconds of commit for a canvas with up to 200 elements.
- AC5: Given the canvas is in `CONFLICT` state after CRDT post-merge validation, when a generation trigger occurs, then compilation is skipped and the preview clearly states `Compilation suspended due to conflict`.
- AC6: Given a user commits 5 canvas changes within a 200ms window, when compilation is observed, then exactly one compilation run fires and it does not start earlier than 300ms after the last committed change; no intermediate compilation runs occur during the debounce window.

### Feature: In-product analytics (KPI telemetry)
- AC1: Given a user commits a canvas change, when telemetry is emitted, then the event includes workspace id, canvas id, element counts by type, compile duration ms, validation outcome, and artifact counts, with no payload schema contents included.
- AC2: Given a generation run succeeds or fails, when telemetry is recorded, then separate event types are emitted for `compile_started`, `compile_succeeded`, and `compile_failed` with a shared correlation id.
- AC3: Given a user imports a document, when the import completes, then telemetry captures source format (`openapi`, `asyncapi`, or `bpmn`), unresolved marker count, and total imported element count.
- AC4: Given a workspace Admin disables analytics collection for local preview metrics, when the setting is saved, then new preview telemetry stops while required operational audit events continue.
- AC5: Given KPI dashboards aggregate telemetry, when queried for a 24-hour period, then they can report at minimum: average compile latency, conflict rate, import success rate, and count of approved canvases published to release branch.

## Milestone 4 — Governance & Launch Readiness

### Feature: Workspace-level RBAC (all 4 roles, server-side only)
- AC1: Given roles `Reader`, `Contributor`, `Architect`, and `Admin` are assigned at workspace scope, when any canvas API request is evaluated, then authorization is enforced on the server using workspace membership and not by client-hidden UI alone.
- AC2: Given a `Reader` opens a canvas, when they attempt create, move, comment-resolve, import, approve, deprecate, or delete operations, then the server returns HTTP `403 Forbidden` for each mutating endpoint.
- AC3: Given a `Contributor` edits a canvas, when they create or modify elements and comments, then the server allows the change but denies approval, role management, and hard deletion operations with HTTP `403 Forbidden`.
- AC4: Given an `Architect` accesses a workspace, when they review a canvas, then they can transition lifecycle state, approve canvases, and delete only deprecated elements, but cannot manage SSO or org-wide settings reserved for `Admin`.
- AC5: Given an `Admin` removes a user's workspace role, when that user's existing session makes a new API call, then the new permissions take effect on that call without requiring the user to sign out and back in; long-lived JWT role caching is not acceptable — authorization must be resolved against current server-side role state on each request.

### Feature: SSO via SAML 2.0 and OIDC
- AC1: Given an Admin configures a SAML 2.0 identity provider with valid metadata, when a user signs in via SAML, then ChoreoStudio creates or maps the user account and establishes a session tied to the asserted identity.
- AC2: Given an Admin configures an OIDC provider with issuer, client id, and redirect URI, when the authorization code flow completes, then the user is authenticated and returned to the originally requested workspace route.
- AC3: Given SAML or OIDC assertion data omits the required unique user identifier, when login is attempted, then authentication fails with HTTP `401 Unauthorized` and no partial account is provisioned.
- AC4: Given a user signs in through either SAML 2.0 or OIDC, when RBAC claims are resolved, then workspace access is determined by server-side role mapping rather than trusting role data from the browser.
- AC5: Given SSO is unavailable and local login is disabled for the workspace, when a user attempts access, then the UI presents a non-sensitive sign-in failure message and logs the provider error for Admin diagnostics.

### Feature: Draft → In Review → Approved lifecycle; approval gates Git publish
- AC1: Given a new canvas is created, when it is first saved, then its lifecycle state is `Draft` and contract generation is available only in local preview.
- AC2: Given a Contributor submits a canvas for review, when the transition succeeds, then the state changes from `Draft` to `In Review` and the action is recorded in audit history with actor and timestamp.
- AC3: Given an Architect or Admin approves a canvas, when the transition to `Approved` completes, then the current draft branch head is promoted and generated contracts are pushed to the Git release branch.
- AC4: Given a canvas remains in `Draft` or `In Review`, when compilation succeeds, then generated specs are visible in local preview only and are not written to the release branch.
- AC5: Given a canvas in `Approved` is edited again, when the next change is committed, then the canvas re-enters `Draft` state on the existing draft branch and no new release-branch publish occurs until re-approval; new branch creation on re-edit is a V2 feature and must not be implemented in MVP.

### Feature: Deprecation-first deletion with role gating
- AC1: Given a `Contributor` selects an active element, when they choose remove, then the UI offers only `Mark deprecated` and the server rejects direct deletion with HTTP `403 Forbidden`.
- AC2: Given an element is marked deprecated, when the next contract generation runs, then the generated OpenAPI 3.1 or AsyncAPI 2.6 output contains `deprecated: true` for that element or operation.
- AC3: Given an element is deprecated, when an `Architect` or `Admin` deletes it, then the delete succeeds and audit history records both the prior deprecation timestamp and the deletion actor.
- AC4: Given an element is not deprecated, when an `Architect` or `Admin` attempts deletion, then the server blocks the request with HTTP `409 Conflict` and `message: "Element must be deprecated before deletion"`.
- AC5: Given a deprecated element has inbound or outbound relationships, when it is deleted, then all inbound and outbound connections are removed in the same transaction and no dangling edge remains in the persisted canvas file.

### Feature: AI anti-pattern reviewer (advisory)
- AC1: Given a canvas contains a **Command** with no resulting **Domain Event**, when the AI reviewer runs, then it creates an advisory finding referencing that command id and does not block save, review, approval, or contract generation.
- AC2: Given an **Aggregate** has no inbound **Command**, a **Policy/Saga** has no triggering **Domain Event**, or a circular chain exists, when analysis completes, then each condition is surfaced as a separate advisory finding with affected element ids.
- AC3: Given the reviewer is advisory only, when a canvas contains AI findings but no structural errors, then lifecycle transitions and local preview remain available.
- AC4: Given a user resolves an anti-pattern by editing the canvas, when the next committed change triggers review, then obsolete findings are removed automatically and new findings reflect the latest canvas state.
- AC5: Given the reviewer service is unavailable or times out after 5 seconds, when a commit occurs, then the editor logs the failure, shows `AI review unavailable`, and continues normal validation and compilation workflows.
