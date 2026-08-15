# VOID node fleet runtime-pin status v1

Marker: `VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1`

## Purpose

Distinguish an intentionally approved deployed runtime pin from accidental
runtime drift while repository `main` continues to advance.

VOID deliberately separates source merge from deployment. The existing fleet
drift audit compares each healthy node with canonical `main` and correctly
returns `CONVERGENCE_RECOMMENDED` whenever a node is safely behind. That answer
is useful for source-convergence planning, but it does not express whether the
older deployed head is the exact runtime the operator intentionally chose to
preserve.

This packet adds that missing truth layer. It consumes one recent, exact
`VOID_NODE_FLEET_DRIFT_AUDIT_V1` receipt plus one explicitly supplied approved
runtime SHA. It does not collect another live snapshot and it never treats
source movement as deployment intent.

## Status contract

Each non-HOLD node is classified against two independent identities:

- `approved_runtime_sha` — the exact runtime commit explicitly supplied for this
  evaluation; and
- `canonical_main_sha` — the canonical `main` recorded by the source drift
  audit.

Per-node status is one of:

- `HEALTHY_INTENTIONAL_PIN` — the node is healthy and clean, its exact head is
  the approved runtime SHA, and canonical `main` is newer;
- `CURRENT_WITH_MAIN` — the approved runtime SHA equals canonical `main` and the
  node is exactly on that commit;
- `UNEXPECTED_RUNTIME_DRIFT` — the node is otherwise healthy but its runtime
  head does not equal the approved runtime SHA, including a node that advanced
  to current `main` without that commit being the approved pin; or
- `HOLD` — the upstream fleet audit already fails closed for that node.

Fleet priority is fail closed:

1. any `HOLD` produces fleet `HOLD`;
2. otherwise any `UNEXPECTED_RUNTIME_DRIFT` produces fleet
   `UNEXPECTED_RUNTIME_DRIFT`;
3. an exact all-node approved pin produces `HEALTHY_INTENTIONAL_PIN` when the
   approved pin is older than canonical `main`; and
4. an exact all-node approved pin produces `CURRENT_WITH_MAIN` when the approved
   pin and canonical `main` are the same commit.

A mixed fleet never becomes healthy merely because every node is individually
reachable.

## Why this does not replace the drift audit

The source drift audit answers: **how does each deployed repository head relate
to current source `main`, and is source convergence safe to consider?**

This packet answers: **does the current healthy runtime still equal the exact
runtime identity the operator approved?**

The two answers may intentionally differ. In particular, a healthy approved pin
can consume a drift audit whose source decision is
`CONVERGENCE_RECOMMENDED` and correctly return `HEALTHY_INTENTIONAL_PIN`.
Neither result authorizes a rollout.

## Input validation and evidence freshness

The tool accepts the exact current v1 drift-audit schema only. It rejects:

- unknown or missing top-level fields;
- an unknown marker or version;
- non-`main` canonical branch evidence;
- malformed commit or audit IDs;
- authority fields that claim any mutation;
- contradictory non-HOLD runtime safety fields;
- a drift decision, normalized audit ID, or convergence-candidate list that
  does not reproduce from the supplied nodes; and
- duplicate node names or unknown classifications/relations.

The audit file itself must be a regular non-symlink file between 2 bytes and
4 MiB. It is opened once with symlink following disabled where supported, read
through the opened descriptor, and rejected if its size, modification time, or
change time moves during the read.

Because fleet drift audit v1 does not embed a collection timestamp, this packet
uses the evidence file modification time as a bounded operator-freshness gate.
The default maximum age is 300 seconds. A future-dated or stale file fails
closed. This mtime gate is freshness metadata, not a cryptographic timestamp or
signature.

The packet binds both the drift audit's normalized `audit_id_sha256` and the
SHA-256 digest of the complete evidence file.

## Run

Collect a fresh fleet drift audit through its existing reviewed workflow, then
run:

```bash
node tools/void-node-fleet-runtime-pin-status-v1.mjs \
  --audit "$HOME/.config/void/node-fleet-drift-audit-result-v1.json" \
  --approved-runtime-sha "<exact-approved-runtime-commit>" \
  --max-evidence-age-seconds 300 \
  --output "$HOME/.config/void/node-fleet-runtime-pin-status-v1.json"
```

`--audit` and `--approved-runtime-sha` are required. Options are strict and
single-use. Integer arguments must be unpadded.

The optional output is create-only and mode `0600`; an existing path is never
overwritten.

Healthy intentional-pin and exact-current results exit 0. `HOLD` and
`UNEXPECTED_RUNTIME_DRIFT` exit 2. Invalid input or evidence exits 1.

## Output

The read-only packet includes:

- the explicit approved runtime SHA;
- the drift audit's canonical main SHA;
- normalized and full-file source audit digests;
- source evidence mtime and evaluation time;
- fleet status and exact per-node status/reason;
- the upstream source-drift decision for context;
- a content-derived `status_id_sha256`; and
- explicit negative authority fields.

`next_gate` is descriptive only. `HEALTHY_INTENTIONAL_PIN` says to preserve the
pin until a separately authorized rollout. Drift says to investigate before any
rollout or restart. Neither message executes or authorizes that work.

## Authority boundary

This tool may read one local evidence file and optionally create one local
status JSON file. It does not:

- invoke or replace the fleet drift audit;
- connect to Precision, Nimo, Alienware, or any other node;
- run `git fetch`, `pull`, checkout, reset, merge, or change a ref;
- install or build source;
- deploy a release;
- start, stop, reload, or restart a service;
- change Tailscale, Tor, DNS, firewall, router, interface, or port state;
- read credentials, tokens, private keys, mnemonics, wallets, or signers;
- mutate Buy VOID, Work Credits, validator, consensus, treasury, or liquidity
  state;
- construct, sign, or broadcast a transaction; or
- move funds.

Source merge remains separate from deployment. A healthy pin does not authorize
indefinite retention, and a newer `main` does not authorize convergence. Both
runtime decisions remain explicit operator gates.
