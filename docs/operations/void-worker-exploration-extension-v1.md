# VOID Worker Exploration Extension V1

Marker: `VOID_WORKER_EXPLORATION_EXTENSION_V1`

## Purpose

Coordination V3 prevents workers from colliding, duplicating canonical implementations, or collapsing source progress into runtime truth. This extension answers a separate scheduling question: what should a worker do when its primary lane is blocked, parked, waiting for authority, or genuinely has no useful canonical task?

The answer is **bounded exploration**, not idle time and not uncontrolled branch generation.

The operating doctrine is explicit:

1. **Protect the Core** — do not endanger consensus, chain identity, treasury, wallets, signers, validators, durable state, or shared authority.
2. **Protect the Truth** — distinguish repository, merge, deployment, runtime, and external-acceptance truth; falsify assumptions before promoting them.
3. **Protect the Sovereign** — preserve ZoSo's constitutional authority and reduce practical dependency on outside gatekeepers, opaque providers, and irreversible vendor control.

## New experimental workers

### Hopper — operator automation

Tracking issue: #1239.

Hopper searches for recurring operator friction, fragile manual sequences, non-idempotent runbooks, machine-specific assumptions, and missing reversible automation. Preferred output includes tiny paste-safe launchers, deterministic dry runs, checked-in controllers, explicit post-state evidence, and portable self-hosted procedures.

Hopper begins read-only. No package installation, deployment, service mutation, credential access, or economic authority is granted.

### Lamarr — sovereign security

Tracking issue: #1240.

Lamarr performs defensive adversarial review across security, privacy, identity, trust, recovery, dependency concentration, and provider sovereignty. Findings must identify exact assumptions, affected contracts or paths, present mitigations, and concrete risk rather than vague security language.

Lamarr may not perform live penetration, denial of service, secret access, exploit deployment, or destructive testing.

### Darwin — capability evolution

Tracking issue: #1241.

Darwin explores features and combinations that could measurably improve adoption, autonomous-agent utility, network activity, revenue readiness, resilience, or operator independence. Every idea must define an acceptance test and a falsification condition before implementation.

Darwin may recommend only one candidate from each ranked exploration report. Broad ideation is allowed at the research layer; unranked source branches are not.

## Non-idle fallback for existing workers

The reconciled V3 snapshot still has three active workers without an active base lane:

- Larry — the SDK lane requires current-main review;
- Curly — no concrete presale event currently requires mutation; and
- Moe — the public relay-introduction collector source is merged but operationally parked, while the older relay-retirement stack remains frozen.

This extension gives each a bounded `ACTIVE_RESEARCH` fallback:

- Larry explores repository usability, SDK ergonomics, developer tooling, and small correctness gaps.
- Curly explores participant onboarding, receipt clarity, presale-exit readiness, and economic honesty without manufacturing payment or inventory work.
- Moe explores disjoint networking observability, bootstrap resilience, transport portability, and failure recovery without entering unpublished collector activation work or blocked descendants.

The collector's merge does not grant release-root publication, observer-set publication, relay-introduction publication, deployment, runtime activation, or external acceptance. Moe's fallback remains disjoint from those operational gates.

Ren is not an idle worker in this snapshot. The completed three-box rollout has transitioned to an `ACTIVE_RESEARCH` fleet-stability lane that tracks the proven deployed runtime pin and source drift without implying another restart or convergence operation.

The extension validator requires fallback assignments to cover exactly the active base workers that lack an active V3 lane. If the base state changes, stale fallback assignments fail closed and must be reviewed.

## Noise budget

Research noise is acceptable; uncontrolled repository noise is not.

Each exploring worker is limited to:

- one open exploration issue;
- one open exploration draft PR;
- at most five candidates per report; and
- exactly one recommended candidate for a later source lane.

Branch creation requires a ranked candidate. Source mutation requires a fresh V1 Red/Amber/Green coordination check. Exploration never grants automatic merge, deployment, service, credential, wallet, signer, payment, Work Credit, validator, transaction, treasury, liquidity, or funds authority.

Stale exploration is reviewed after seven days. A lane that produces no evidence, no falsifiable acceptance test, no measurable capability gain, or repeated duplication may be closed, deleted, or superseded without preserving it as canonical work.

## Candidate scoring

Each candidate is scored from zero through five on:

- mission impact;
- core protection;
- truth protection;
- sovereign control;
- time to first proof;
- reversibility; and
- maintenance burden.

The maximum score is 35. A candidate must score at least 24 before it may be recommended for a later source lane. Passing the score does not bypass collision checks, authority gates, proof requirements, review, or merge authorization.

## Forbidden outcomes

Exploration must reject:

- a duplicate canonical implementation;
- decorative documentation without capability gain;
- unranked idea spam;
- a sensitive operation without separate authority;
- provider lock-in without a replaceable boundary;
- automatic merge or deployment;
- branch creation before candidate ranking; and
- unbounded issue or pull-request growth.

## Files

- `ops/coordination/worker-exploration-extension-v1.json` records doctrine, policy, workers, issues, lanes, and fallback assignments.
- `tools/void-worker-exploration-extension-v1.mjs` validates the extension against the checked-in V3 roster and state.
- `scripts/prove_void_worker_exploration_extension_v1.mjs` proves the checked-in composition and adversarial rejection behavior.
- `.github/workflows/void-worker-exploration-extension-v1.yml` runs syntax, proof, and status validation on Node.js 22, 24, and 26.

## Commands

```bash
node scripts/prove_void_worker_exploration_extension_v1.mjs

node tools/void-worker-exploration-extension-v1.mjs validate \
  --output /tmp/void-worker-exploration-extension-v1.json
```

## Point-in-time boundary

This extension composes with the checked-in V3 snapshot. It is not a distributed scheduler and does not create autonomous background processes. Every worker must refresh current main, open pull requests, issues, reviews, checks, changed paths, consumed contracts, and live V1 collision evidence before mutation.

A live Red boundary always overrides exploration. A stale extension must be updated or held; it cannot be interpreted as authority.

`PROTECT THE CORE`. `PROTECT THE TRUTH`. `PROTECT THE SOVEREIGN`.
