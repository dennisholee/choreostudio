# Spike Workflow

## 1. What is a spike?

A spike is a time-boxed engineering investigation used to reduce uncertainty before the roadmap commits to an implementation path. A spike is **not** feature delivery: its output is evidence, a recommendation, and a clear **Go / Conditional Go / No-Go** decision.

## 2. When to run a spike

Run a spike when the risk register identifies an unresolved architectural or delivery risk that can block a milestone. The spike must finish before the milestone it blocks so the team is not forced to start implementation with unknown technical feasibility.

## 3. Spike process

1. Read the relevant entry in [`SPIKE_BRIEFS.md`](../SPIKE_BRIEFS.md).
2. Create a branch named `spike/<name>`.
3. Build the smallest honest prototype needed to answer the brief.
4. Measure the prototype against the brief's evaluation criteria.
5. Write a recommendation with evidence, trade-offs, and the proposed Go/No-Go outcome.
6. Open a pull request that links the spike issue and states the Go / Conditional Go / No-Go recommendation clearly in the description.
7. Close the spike issue after the PR captures the decision and follow-up actions.

### Suggested command sequence

```bash
git checkout -b spike/<name>
# build prototype, benchmarks, notes, and any ADR updates
git commit -s -m "spike: record <name> findings"
gh pr create --fill --body "Closes #<issue-number>\n\nRecommendation: <Go|Conditional Go|No-Go>"
```

## 4. Go / No-Go outcomes

| Outcome | Meaning | Required next action |
|---|---|---|
| Go | The spike met its success criteria well enough to proceed | Convert the recommendation into implementation backlog and update ADRs if the architecture is now decided |
| Conditional Go | The approach is viable, but explicit follow-up constraints remain | Record the guardrails in the PR and milestone plan; create follow-up issues before implementation starts |
| No-Go | The proposed approach is not safe or feasible within the milestone constraints | Tech Lead and PM must escalate within **48 hours**, decide on scope/architecture changes, and amend the PRD before the blocked milestone proceeds |

## 5. Current spikes

### Spike A — CRDT Library Selection & Invariant Test Harness
- **Repository issue:** [#2](https://github.com/dennisholee/choreostudio/issues/2)
- **Primary blocker:** Multi-user collaboration cannot proceed until the team proves that concurrent edits converge without silently creating structurally invalid canvases.
- **Evaluation summary:** browser compatibility, mutation coverage, deterministic convergence, synchronous post-merge validation, explicit `CONFLICT` handling, offline tolerance to ~50 operations, sub-100ms merge + validation latency, and developer ergonomics.
- **Go signal:** choose a single CRDT library that preserves correctness and meets browser/runtime constraints.

### Spike B — Incremental Compilation Proof-of-Concept
- **Repository issue:** [#1](https://github.com/dennisholee/choreostudio/issues/1)
- **Primary blocker:** Live contract generation cannot move forward until the team proves committed-change compilation stays responsive on realistic canvas sizes.
- **Evaluation summary:** commit-only trigger with 300ms debounce, 200-element benchmark fixture, dirty-tracking accuracy, one-spec-per-boundary OpenAPI recompilation scope, AsyncAPI channel/message recompilation scope, <100ms typical incremental work, <500ms total post-debounce responsiveness, and no backlog under 3 concurrent editors.
- **Go signal:** incremental outputs stay correct against full rebuilds while meeting responsiveness targets.

## 6. ADR process

Create or update an ADR whenever a spike changes the architecture baseline, selects between competing approaches, or adds a permanent constraint the team must preserve.

Recommended workflow:
1. Open [`ADRs.md`](../ADRs.md) and copy the structure of the latest ADR entry.
2. Add the next ADR number, date, status, decision drivers, considered options, decision, and consequences.
3. Reference the spike issue and PR in the ADR context or consequences section.
4. Merge the ADR in the same PR as the spike outcome whenever possible so the evidence and decision land together.

## 7. DCO reminder

All spike-branch commits must be signed off.

```bash
git commit -s -m "spike: describe the investigation result"
```

Pull requests without DCO sign-off on every commit should be treated as incomplete.
