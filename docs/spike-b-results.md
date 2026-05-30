# Spike B Results — Incremental Compilation Proof of Concept

**Date:** 2026-05-29
**Status:** ✅ GO — Incremental compiler architecture validated (ADR-003 confirmed)

## Benchmarks (reference: Apple M1, Node.js 20)

| Scenario | Result | Threshold | Decision |
|---|---|---|---|
| Full compile, 200-element canvas | <50ms | <500ms | ✅ Go |
| Incremental compile, 1 dirty element | <5ms | <100ms | ✅ Go |
| Cache hits on unchanged second compile | >90% | N/A | ✅ Excellent |

## Architecture validated
- **FragmentCache**: keyed by element id + SHA-256 content hash (16-char prefix)
- **Dirty-element set**: passed by caller; only dirty elements recompile
- **REST/Async separation**: Commands routed to OpenAPI vs AsyncAPI by transport field
- **DomainEvents**: always emit AsyncAPI publish channels
- **300ms debounce** to be applied at call-site in production (ADR-003)

## Decision
Spike B Go. Proceed to M3 #14 (live streaming contract generation).
