# VOID node fleet runtime stability verification v1

Marker: `VOID_NODE_FLEET_RUNTIME_STABILITY_VERIFICATION_V1`

## Purpose

Prove that a completed guarded restart rollout remained healthy and unchanged
for a real observation interval.

The rollout coordinator can prove that its final audit is consistent with every
ordered restart receipt. That is an immediate completion result. This verifier
adds a separate later observation and rejects any intervening process restart,
source transition, source movement, node-order change, unhealthy node, or
unready node.

The verifier is evidence-only. It does not collect an audit, wait, restart a
service, run a rollout step, or mutate a node.

## Required evidence

Provide:

1. the exact final `VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_V1` output with
   outcome `FLEET_PROCESS_FRESH`;
2. the exact full-fleet process-freshness audit used by that output; and
3. a second full-fleet process-freshness audit collected later.

Both audits must be fresh by file modification time and by every embedded
`observed_at_epoch`. The default maximum age is 300 seconds.

Every config, rollout, and audit input must be a regular non-symlink file
between 2 bytes and 4 MiB. The verifier opens each path once with symlink
following disabled and nonblocking I/O, validates the opened descriptor with
`fstat`, and reads only that descriptor into a buffer capped at 4 MiB plus one
detection byte. A size, modification-time, or change-time movement during the
read returns `HOLD`. Oversized, replaced, growing, symlink, FIFO, and other
non-regular evidence therefore cannot bypass the bound or block the verifier.

The final rollout is strictly reproduced:

- its schema and authority object must be exact;
- its state must contain the complete stale-node prefix;
- its state ID and baseline bindings must reproduce;
- its `current_audit_id_sha256` must match the supplied final audit; and
- the final audit must reproduce `PROCESS_FRESH` with exact rollout process
  identities.

The normalized process-freshness audit ID intentionally describes the source
and classification decision rather than collection time. Therefore this
verifier also hashes each complete audit receipt. The final and verification
receipt digests must differ, and the stability receipt binds both complete
snapshots as well as their normalized audit IDs.

## Stability contract

For every configured node, both audits must prove:

- exact config order and one shared source commit/tree;
- `main`, clean and stable source;
- active service and a stable checked-in Node entrypoint;
- an immutable process-source commit/tree binding equal to that shared source;
- exact `PROCESS_SOURCE_ALIGNED`;
- green health and readiness; and
- a fresh observation.

The second observation must retain the exact systemd `InvocationID`,
process-start epoch, source-transition epoch, source commit, and source tree from the final audit,
while both exact audits continue to bind every aligned process to that shared
source commit/tree. Its observation epoch must be at least the configured
interval later for every node. The minimum is 30 seconds and the default is 30
seconds.

Because systemd assigns a fresh lowercase 32-hex invocation ID to each service
invocation, this detects a crash/restart even when both processes share the same
whole-second start epoch. Any crash recovery, manual restart, source checkout, process replacement,
health/readiness failure, stale evidence, future timestamp, or schema/digest
change returns `HOLD`. A failure is not adopted as a new baseline.

## Run

First preserve the final rollout output and the exact audit that produced it.
After at least 30 seconds, collect a new full-fleet process-freshness audit by
the separately reviewed audit workflow. Then run:

```bash
node tools/void-node-fleet-runtime-stability-verification-v1.mjs \
  --config "$HOME/.config/void/node-fleet-drift-audit-v1.json" \
  --final-rollout "$HOME/.config/void/node-fleet-process-restart-rollout-final-v1.json" \
  --final-audit "$HOME/.config/void/node-fleet-process-freshness-final-v1.json" \
  --verification-audit "$HOME/.config/void/node-fleet-process-freshness-verification-v1.json" \
  --min-stability-seconds 30 \
  --max-evidence-age-seconds 300 \
  --output "$HOME/.config/void/node-fleet-runtime-stability-verification-result-v1.json"
```

All options are strict and single-use. Integer values must be unpadded.
The final and verification audits must be distinct files.

## Result

Success returns `FLEET_RUNTIME_STABLE` with:

- a reproducible `stability_id_sha256`;
- the exact final rollout receipt and rollout state digests;
- normalized IDs and full-receipt digests for both audits;
- the exact source SHA, source tree, and node order;
- the required stability interval; and
- per-node systemd invocation IDs plus process, source-transition, and
  observation epochs.

The optional output file is create-only and mode `0600`. Existing evidence is
never overwritten. The receipt is sanitized and does not copy private config
paths, hosts, credentials, or service commands.

## Authority boundary

This tool may create one local evidence JSON file only. It does not:

- invoke the fleet audit, rollout coordinator, or restart controller;
- wait or schedule a later collection;
- fetch, merge, checkout, reset, or otherwise mutate Git;
- install packages, build source, or deploy artifacts;
- start, stop, restart, reload, enable, or edit a service;
- alter network, Tailscale, Tor, DNS, firewall, router, interface, or port state;
- read or print credentials, private keys, tokens, wallets, or signers;
- sign or broadcast a transaction;
- mutate Buy VOID, Work Credits, validator, consensus, or treasury state; or
- move funds.

Real evidence collection, every source convergence and restart, rollout-state
advance, ready-for-review promotion, merge, and deployment remain separate
explicit gates.
