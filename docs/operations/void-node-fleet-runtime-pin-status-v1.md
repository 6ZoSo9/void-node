# VOID node fleet runtime-pin status v1

Marker: `VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1`

## Purpose

Distinguish an intentionally approved **running process identity** from accidental
runtime drift while repository source `main` continues to advance.

VOID deliberately separates source merge from deployment. The fleet drift audit
answers whether each checked-out repository is current or safely behind
canonical `main`. A source-only fast-forward can move that checked-out `HEAD`
without changing the already-running Node process, so source `HEAD` is not
runtime identity.

This packet therefore consumes two recent read-only receipts:

1. `VOID_NODE_FLEET_DRIFT_AUDIT_V1` for canonical-main and checked-out source
   context; and
2. `VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1` for immutable process identity,
   including the process-source commit/tree and stable systemd invocation.

The packet never collects live state itself and never treats source movement as
deployment or restart intent.

## Status contract

Each non-HOLD node is classified from three separate identities:

- `approved_runtime_sha` — the exact runtime commit explicitly approved for this
  evaluation;
- `canonical_main_sha` — canonical source `main` from the drift audit; and
- `process_source_commit` — the immutable running-process commit proven by the
  process-freshness audit.

The drift audit's `node.head` remains source context only.

Per-node status is one of:

- `HEALTHY_INTENTIONAL_PIN` — the process identity equals the approved runtime
  commit while canonical `main` is newer;
- `CURRENT_WITH_MAIN` — the approved runtime commit equals canonical `main` and
  the running process identity equals it;
- `UNEXPECTED_RUNTIME_DRIFT` — the healthy running process identity does not
  equal the approved runtime commit; or
- `HOLD` — either upstream audit is HOLD or the two evidence snapshots cannot be
  coherently bound.

Fleet priority is fail closed: any HOLD dominates; otherwise any unexpected
runtime drift dominates; otherwise all nodes must agree on the same approved
status.

A process-freshness receipt may say `RESTART_REQUIRED` because checked-out source
advanced after process start while this packet simultaneously says
`HEALTHY_INTENTIONAL_PIN` because that older running process is the exact
operator-approved pin. Neither result authorizes a restart.

## Evidence coherence

The tool validates both producer schemas and reproduces both normalized audit
IDs. It additionally requires:

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

## Evidence freshness

Both inputs must be regular non-symlink files between 2 bytes and 4 MiB. Each is
opened once, descriptor-checked, bounded, and rejected if size/mtime/ctime moves
during the read.

Both files use the configured modification-time freshness limit. The
process-freshness receipt additionally carries per-node `observed_at_epoch`;
every available process observation must be within the same maximum age and not
future-dated. This prevents copying/touching an old process receipt from
manufacturing fresh runtime identity evidence.

The default maximum evidence age is 300 seconds.

## Run

Collect both reviewed read-only audits, then run:

```bash
node tools/void-node-fleet-runtime-pin-status-v1.mjs \
  --drift-audit "$HOME/.config/void/node-fleet-drift-audit-result-v1.json" \
  --process-freshness-audit "$HOME/.config/void/node-fleet-process-freshness-audit-result-v1.json" \
  --approved-runtime-sha "<exact-approved-runtime-commit>" \
  --max-evidence-age-seconds 300 \
  --output "$HOME/.config/void/node-fleet-runtime-pin-status-v1.json"
```

`--drift-audit`, `--process-freshness-audit`, and
`--approved-runtime-sha` are required. Options are strict and single-use.
Integer arguments must be unpadded.

The optional output is create-only and mode `0600`; an existing path is never
overwritten.

Healthy intentional-pin and exact-current results exit 0. `HOLD` and
`UNEXPECTED_RUNTIME_DRIFT` exit 2. Invalid/stale/tampered evidence exits 1.

## Adversarial acceptance boundary

The deterministic proof requires all of these cases:

- source `HEAD=B`, running process `A`, approved runtime `A` =>
  `HEALTHY_INTENTIONAL_PIN`;
- source `HEAD=A`, incompatible/newer process identity `B`, approved runtime `A`
  => never healthy (upstream process HOLD or packet drift/HOLD);
- running process `B`, source/canonical `B`, approved runtime `A` =>
  `UNEXPECTED_RUNTIME_DRIFT`;
- process identity movement during collection => `HOLD`;
- mismatched node sets, transports, or source snapshots between the two receipts
  => `HOLD`;
- exact process `A` with approved `A` and newer source main may remain an
  intentional pin;
- stale embedded process observations are rejected even if file mtime is fresh;
  and
- mutation-contaminated or normalized-ID-tampered evidence is rejected.

Falsification: if the packet ever derives runtime status from checked-out source
`HEAD` instead of the bound process-source commit, or can combine incoherent
source/process receipts into a healthy status, the lane is not complete.

## Output

The packet includes:

- approved runtime SHA and canonical main SHA;
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

This tool may read two local evidence files and optionally create one local
status JSON file. It does not:

- invoke either fleet audit or connect to any node;
- run Git fetch/pull/checkout/reset/merge or change a ref;
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
