# VOID node fleet runtime-pin status v1

Marker: `VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1`

## Purpose

Distinguish an intentionally approved **running process identity** from accidental
runtime drift while repository source `main` continues to advance, without
confusing a copied/stale source-drift receipt with current canonical-main truth.

VOID deliberately separates source merge from deployment. The fleet drift audit
answers whether each checked-out repository was current or safely behind the
canonical `main` observed by that audit. A source-only fast-forward can move the
checked-out `HEAD` without changing the already-running Node process, so source
`HEAD` is not runtime identity. The drift receipt also has no embedded observation
epoch, so filesystem mtime alone is not sufficient to prove that its canonical
SHA is still current.

The operator evaluator therefore composes three read-only evidence steps:

1. `VOID_NODE_FLEET_DRIFT_AUDIT_V1` for checked-out source context;
2. `VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1` for immutable running-process
   identity, including process-source commit/tree and systemd invocation; and
3. a bounded read-only canonical-main bracket using the drift receipt's named Git
   remote and exact `refs/heads/main`.

The live canonical bracket uses `git remote get-url` and `git ls-remote` only. It
does not fetch objects, update refs, alter the worktree, or connect to any fleet
node.

## Canonical operator entrypoint

Use the evaluator:

```bash
node ops/run_void_node_fleet_runtime_pin_status_v1.mjs \
  --drift-audit "$HOME/.config/void/node-fleet-drift-audit-result-v1.json" \
  --process-freshness-audit "$HOME/.config/void/node-fleet-process-freshness-audit-result-v1.json" \
  --approved-runtime-sha "<exact-approved-runtime-commit>" \
  --max-evidence-age-seconds 300 \
  --output "$HOME/.config/void/node-fleet-runtime-pin-status-v1.json"
```

The evaluator defaults `--coordinator-repo` to the checkout containing this
script. A different exact worktree root may be supplied explicitly with
`--coordinator-repo PATH`.

`tools/void-node-fleet-runtime-pin-status-v1.mjs` remains the pure schema,
classification, and evidence-file library. Its direct CLI can classify supplied
receipts, but **must not be used to claim current canonical-main status** because
it does not independently query the canonical remote. Operator claims about
`CURRENT_WITH_MAIN` or the current `canonical_main_sha` require the evaluator
above.

## Status contract

Each non-HOLD node is classified from three separate identities:

- `approved_runtime_sha` — the exact runtime commit explicitly approved for this
  evaluation;
- `canonical_main_sha` — canonical source `main` from the drift audit, accepted
  only after the evaluator proves it equals live canonical `main`; and
- `process_source_commit` — the immutable running-process commit proven by the
  process-freshness audit.

The drift audit's `node.head` remains source context only.

Per-node status is one of:

- `HEALTHY_INTENTIONAL_PIN` — the process identity equals the approved runtime
  commit while canonical `main` is newer;
- `CURRENT_WITH_MAIN` — the approved runtime commit equals live-bracketed
  canonical `main` and the running process identity equals it;
- `UNEXPECTED_RUNTIME_DRIFT` — the healthy running process identity does not
  equal the approved runtime commit; or
- `HOLD` — upstream evidence is HOLD, source/process evidence cannot be coherently
  paired, or canonical-main freshness cannot be proven.

Fleet priority is fail closed: any HOLD dominates; otherwise any unexpected
runtime drift dominates; otherwise all nodes must agree on the same approved
status.

A process-freshness receipt may say `RESTART_REQUIRED` because checked-out source
advanced after process start while this packet simultaneously says
`HEALTHY_INTENTIONAL_PIN` because that older running process is the exact
operator-approved pin. Neither result authorizes a restart.

## Evidence coherence

The classifier validates both producer schemas and reproduces both normalized
audit IDs. It additionally requires:

- exact node-set identity;
- the same transport for each named node;
- each non-null drift-audit `node.head` to equal the process audit's
  `source_head`;
- a non-HOLD process node to carry a bound process-source commit/tree, stable
  32-hex systemd `InvocationID`, exact `src/index.ts` entrypoint, clean/stable
  source, active process, and green health/readiness; and
- the process audit to explicitly state that `/version.git_commit` is **not**
  process identity.

Node-set, transport, or source-snapshot mismatch produces packet `HOLD` instead
of comparing unrelated observations.

The status ID binds both normalized audit IDs and SHA-256 digests of both
complete evidence files, plus the approved runtime, canonical main, coherence
result, and per-node process identities.

## Canonical-main freshness bracket

The drift receipt has no embedded collection epoch. File mtime/ctime therefore
remain useful file-handling bounds but are not accepted as proof that its
`canonical.sha` is still live.

Before classification, the evaluator:

1. proves `--coordinator-repo` is the exact selected Git worktree root;
2. resolves the drift receipt's exact canonical remote URL read-only;
3. runs bounded `git ls-remote --exit-code <remote> refs/heads/main`;
4. requires that exact SHA to equal `drift.canonical.sha`;
5. builds the packet in memory; and
6. repeats the same live canonical query before emitting stdout or creating the
   optional evidence file.

If canonical `main` differs from the drift receipt before evaluation, changes
during evaluation, or the canonical remote identity changes between samples, the
evaluator emits HOLD and **does not publish a status packet**.

This means copying, touching, or recreating old drift JSON cannot manufacture a
fresh `CURRENT_WITH_MAIN` result after canonical `main` has advanced.

The evaluator also rejects ambient Git repository/configuration-selection
overrides such as `GIT_DIR`, `GIT_WORK_TREE`, `GIT_CONFIG_*` injection, object
alternate paths, or namespaces before Git inspection. Ordinary reviewed Git
configuration remains visible so effective remote behavior is not silently
masked.

## Evidence-file freshness

Both receipt inputs must be regular non-symlink files between 2 bytes and 4 MiB.
Each is opened once, descriptor-checked, bounded, and rejected if
size/mtime/ctime moves during the read.

Both files use the configured modification-time freshness limit. The
process-freshness receipt additionally carries per-node `observed_at_epoch`;
every available process observation must be within the same maximum age and not
future-dated. This prevents copying/touching an old process receipt from
manufacturing fresh runtime identity evidence.

For drift/canonical evidence, the live canonical bracket above is the authority
for current-main freshness.

The default maximum evidence age is 300 seconds.

## CLI behavior

`--drift-audit`, `--process-freshness-audit`, and
`--approved-runtime-sha` are required. Options are strict and single-use.
Integer arguments must be unpadded.

The optional output is create-only and mode `0600`; an existing path is never
overwritten. The evaluator does not create that output until its post-evaluation
canonical sample is exact.

Healthy intentional-pin and exact-current results exit 0. Packet `HOLD` and
`UNEXPECTED_RUNTIME_DRIFT` exit 2. Invalid, stale, contradictory, or
canonical-freshness-unproven inputs exit 1 before packet publication.

## Adversarial acceptance boundary

The deterministic proofs require all of these cases:

- source `HEAD=B`, running process `A`, approved runtime `A` =>
  `HEALTHY_INTENTIONAL_PIN`;
- source `HEAD=A`, incompatible/newer process identity `B`, approved runtime `A`
  => never healthy;
- running process `B`, source/canonical `B`, approved runtime `A` =>
  `UNEXPECTED_RUNTIME_DRIFT`;
- process identity movement during collection => `HOLD`;
- mismatched node sets, transports, or source snapshots between receipts =>
  `HOLD`;
- stale embedded process observations are rejected even if file mtime is fresh;
- a valid drift receipt for canonical `A` that is copied/touched after live
  canonical `main` advances to `B` is rejected before output creation;
- genuinely fresh source/process evidence for an approved older runtime `A`
  remains classifiable when live canonical main is `B`;
- Git repository/configuration-selection overrides are rejected before canonical
  inspection; and
- mutation-contaminated or normalized-ID-tampered evidence is rejected.

Falsification: the lane is incomplete if it derives runtime identity from source
`HEAD`, combines incoherent source/process evidence into a healthy result, or can
publish `CURRENT_WITH_MAIN` from stale drift content whose filesystem timestamps
were merely refreshed.

## Output

A successfully emitted packet includes:

- approved runtime SHA and live-bracketed canonical main SHA;
- normalized and full-file digests for both evidence producers;
- evidence mtimes and evaluation time;
- fleet status, source-drift decision, and process-freshness decision;
- per-node checked-out source head/tree separately from
  `process_source_commit`, `process_source_tree`, and systemd invocation ID;
- explicit coherence problems when evidence cannot be paired;
- a content-derived `status_id_sha256`; and
- explicit negative authority fields.

`next_gate` is descriptive only. A healthy pin says to preserve it until a
separately authorized rollout; unexpected process drift says investigate before
any runtime action.

## Authority boundary

The canonical evaluator may read two local evidence files, inspect the selected
local Git worktree, make bounded read-only queries to the already-configured
canonical Git remote, and optionally create one local status JSON file. It does
not:

- invoke either fleet audit or connect to any fleet node;
- run `git fetch`, pull, checkout, reset, merge, or change a ref/worktree;
- install or build source;
- deploy a release;
- start, stop, reload, signal, or restart a service;
- change Tailscale, Tor, DNS, firewall, router, interface, or port state;
- read credentials, tokens, private keys, mnemonics, wallets, or signers;
- mutate Buy VOID, Work Credits, validators, consensus, treasury, or liquidity;
- construct, sign, or broadcast a transaction; or
- move funds.

Source merge remains separate from deployment. A healthy pin does not authorize
indefinite retention, and a newer `main` does not authorize convergence. Runtime
decisions remain explicit operator gates.
