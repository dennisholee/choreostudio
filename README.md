# ChoreoStudio

> Visual Event Storming tool that auto-generates OpenAPI 3.1 and AsyncAPI 2.6 contracts from a semantically validated canvas.

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![DCO](https://img.shields.io/badge/DCO-required-brightgreen.svg)](CONTRIBUTING.md)

## What it does

ChoreoStudio lets teams run domain-modelling workshops directly in the browser. You place Event Storming elements on a canvas — Domain Events, Commands, Aggregates, Policies, Read Models — and the tool automatically generates production-ready API contracts in real time.

**Core value**: from domain discovery workshop to OpenAPI/AsyncAPI spec in the same session, with zero manual translation.

## Three-layer architecture

```
Layer 1: Business Domain      → Event Storming canvas (what happens in the domain)
Layer 2: Technical Orchestration → Saga / state machine (how it's coordinated)
Layer 3: Integration & Contracts → OpenAPI 3.1 + AsyncAPI 2.6 output
```

Each layer is derived automatically from the one above. Engineers never edit Layer 3 by hand.

## Key concepts

| Canvas element | Colour | Maps to |
|---|---|---|
| Domain Event | 🟠 Orange | AsyncAPI channel (past tense fact) |
| Command | 🔵 Blue | OpenAPI path (REST) or AsyncAPI operation (Async) |
| Aggregate | 🟡 Yellow | Service resource boundary |
| Policy / Saga | 🟣 Lilac | Orchestration or choreography rule |
| Read Model | 🟢 Green | Query endpoint or projection |

## Status

Pre-development. All product, architecture, and delivery artefacts are complete:

| Artefact | File |
|---|---|
| Product Requirements | [`PRD.md`](PRD.md) |
| Architecture Decision Records | [`ADRs.md`](ADRs.md) |
| Acceptance Criteria | [`ACCEPTANCE_CRITERIA.md`](ACCEPTANCE_CRITERIA.md) |
| Pre-milestone Spike Briefs | [`SPIKE_BRIEFS.md`](SPIKE_BRIEFS.md) |

Next step: run [Spike A](SPIKE_BRIEFS.md#spike-a-crdt-library-selection--invariant-test-harness) and [Spike B](SPIKE_BRIEFS.md#spike-b-incremental-compilation-proof-of-concept) in parallel before Milestone 1 begins.

## Milestones

| Milestone | Weeks | Theme |
|---|---|---|
| Spike A + B | Pre-M1 | CRDT selection · Incremental compilation PoC |
| M1 — Canvas Foundation | 1–6 | Single-user semantic canvas, structural validation, Git persistence |
| M2 — Collaboration & Persistence | 7–12 | Real-time multi-user editing, import, offline mode |
| M3 — Contract Generation | 13–18 | Live OpenAPI + AsyncAPI generation, payload authoring |
| M4 — Governance & Launch | 19–24 | RBAC, SSO, approval lifecycle, AI anti-pattern reviewer |

## Contributing

All contributions require a [Developer Certificate of Origin](https://developercertificate.org/) sign-off. Add `-s` to your commits:

```bash
git commit -s -m "feat: describe your change"
```

This appends `Signed-off-by: Your Name <email@example.com>` to the commit message. Pull requests without DCO sign-off on every commit will not be merged.

See [CONTRIBUTING.md](CONTRIBUTING.md) for full contribution guidelines.

## Licence

Apache 2.0 — see [LICENSE](LICENSE).
