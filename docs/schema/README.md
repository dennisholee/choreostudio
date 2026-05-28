# Canvas schema reference

This directory publishes the public ChoreoStudio canvas persistence contract:

- Schema: [`canvas.schema.json`](./canvas.schema.json)
- License: Apache 2.0 — see [`../../LICENSE`](../../LICENSE)
- Related decision: [`../../ADRs.md`](../../ADRs.md) (ADR-004)

The schema defines the single JSON/YAML document committed per canvas on branch `choreostudio/drafts/<slug>`. It is the serialization contract shared by the canvas editor, CRDT layer, Git persistence path, merge engine, and contract compiler.

## Schema version history

| Version | Status | Notes |
|---|---|---|
| `0.1.0` | Initial | First public draft-07 schema for canvas metadata, elements, connections, service boundaries, and annotations. |

## `x-merge-class` annotations

Per ADR-004, every persisted field is tagged with `x-merge-class`:

- `semantic`: fields that change the meaning, validation, lifecycle, or downstream compilation outcome of the canvas.
- `cosmetic`: fields that affect layout or presentation only and should not create high-noise user-facing merge conflicts.

Examples:

- Semantic: `type`, `name`, `transport`, `connections`, `payloadSchema`, `serviceBoundaryId`, `lifecycleState`
- Cosmetic: `position`, `size`, `style.color`, `style.collapsed`, `style.zIndex`, `waypoints`, `boundingBox`

Merge tooling uses these annotations to auto-resolve cosmetic-only diffs while surfacing semantic conflicts for review.

## Element type reference

| Type | Colour | Primary meaning | Allowed connections | Transport rules | Layer mapping |
|---|---|---|---|---|---|
| `domainEvent` | Orange (`#f59e0b`) | Past-tense business fact | Typically emitted by `aggregate`; consumed by `policy` and `readModel` | Not used | Layer 1 → informs Layer 2 and Layer 3 async outputs |
| `command` | Blue (`#3b82f6`) | Intent/instruction | **Must** connect to `aggregate` or `policy`; cannot remain structurally orphaned | Required: `REST` or `Async` | Layer 1 → compiles to Layer 3 OpenAPI or AsyncAPI |
| `policy` | Lilac (`#c084fc`) | Saga/orchestrator/policy rule | Typically consumes `domainEvent` and emits `command` | Not used | Layer 2 orchestration |
| `aggregate` | Yellow (`#facc15`) | Consistency boundary / transactional owner | Typically receives `command` and emits `domainEvent` | Not used | Layer 1 domain boundary feeding Layer 2/3 |
| `readModel` | Green (`#22c55e`) | Query result / projection / data store | Typically consumes `domainEvent`; usually no outbound command edge | Not used | Layer 1 projection → Layer 3 query-facing output |

> JSON Schema enforces document shape and element enumerations. Cross-element graph rules such as "command must connect to aggregate or policy" and "no orphaned connections" are enforced by structural validation on commit.

## Lifecycle states

```text
draft -> inReview -> approved
  |         |           |
  +---------+-----------+
            |
            v
         conflict

Any state -> conflict when a merge produces a structurally invalid canvas.
Compilation is suspended while in conflict.
```

## Validation tiers

| Tier | Outcome | Examples |
|---|---|---|
| Structural | Hard-block persistence / promotion | Invalid element type, command without aggregate/policy connection, malformed connection, orphaned reference |
| Semantic | Warn only | Event naming issues, cycles, missing compensating transaction, other modelling smells |

Structural validation prevents invalid canvas state from being persisted as the accepted post-commit snapshot. Semantic validation preserves the change, marks warnings, and keeps compilation enabled unless the canvas has entered `conflict` due to a failed merge.

## Minimal valid canvas example

```json
{
  "schemaVersion": "0.1.0",
  "id": "canvas-001",
  "slug": "order-flow",
  "name": "Order Flow",
  "workspaceId": "ws-001",
  "teamId": "team-001",
  "orgId": "org-001",
  "lifecycleState": "draft",
  "elements": [
    {
      "id": "cmd-001",
      "type": "command",
      "name": "CreateOrder",
      "transport": "REST",
      "serviceBoundaryId": "svc-orders",
      "position": { "x": 120, "y": 80 }
    },
    {
      "id": "agg-001",
      "type": "aggregate",
      "name": "Order",
      "serviceBoundaryId": "svc-orders",
      "position": { "x": 340, "y": 80 }
    }
  ],
  "connections": [
    {
      "id": "conn-001",
      "sourceId": "cmd-001",
      "targetId": "agg-001",
      "direction": "sourceToTarget",
      "label": "executes"
    }
  ],
  "serviceBoundaries": [
    {
      "id": "svc-orders",
      "name": "Orders"
    }
  ],
  "annotations": []
}
```

## Versioning policy

This schema follows semantic versioning:

- **Patch**: documentation fixes, clarifications, and non-behavioral corrections.
- **Minor**: backward-compatible additions such as new optional fields or non-breaking constraints.
- **Major**: breaking changes such as field renames, removals, incompatible enum changes, or altered required-field semantics.

Consumers should pin `schemaVersion` and treat a major-version change as requiring explicit migration support.
