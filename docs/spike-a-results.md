# Spike A Results — Yjs CRDT Proof of Concept

**Date:** 2026-05-29
**Status:** ✅ GO — Yjs selected (ADR-001 confirmed)

## Benchmarks (reference: Apple M1, Node.js 20)

| Scenario | Result | Threshold | Decision |
|---|---|---|---|
| Single-element merge latency | <5ms | <100ms | ✅ Go |
| 100 concurrent adds + sync | <50ms | <200ms | ✅ Go |
| Post-merge structural invariant check | pass | no invalid state | ✅ Go |

## Invariant test harness
See `packages/spike-a/src/__tests__/crdt-invariants.test.ts` — 10 tests covering:
- Bidirectional sync convergence
- Concurrent move/rename convergence
- No duplicate node ids on collision
- Element cascade-delete of connections
- Post-merge structural validation → CONFLICT state detection
- Performance benchmarks

## Decision
Yjs Go. Proceed to M2 #8 (CRDT real-time collab) and #9 (offline).
