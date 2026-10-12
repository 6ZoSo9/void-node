# VOID node fleet process restart rollout v1

Marker: `VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_V1`

## Purpose

Turn a full-fleet process-freshness result into one deterministic restart order,
then advance that order only after the exact next node has a successful guarded
restart receipt and a fresh full-fleet audit proves the new process.

The rollout coordinator is read-only with respect to every node. It never calls
the restart controller, invokes `systemctl`, retries an operation, or continues
to another machine. Its only optional write is a new content-addressed evidence
state file on the coordinator.

## Baseline contract

Initialize from one fresh, full-fleet
`VOID_NODE_FLEET_PROCESS_FRESHNESS_AUDIT_V1` result. The audit must:

- cover every configured node exactly once and in config order;
- carry each producer-emitted `transport` value and match it exactly to the
  corresponding fleet-config node;
- contain no `HOLD` node;
- reproduce its fleet decision and `audit_id_sha256`;
- prove the same exact source SHA on every node;
- prove the same exact source tree on every node;
- prove exact `main`, clean and stable source, active service, complete checked-in
  launcher identity, immutable process-source commit/tree binding, green health,
  and green readiness on every node;
- contain only `PROCESS_SOURCE_ALIGNED` or
  `STALE_SOURCE_AFTER_PROCESS_START`; and
- be no older than 300 seconds by file time and embedded observation time by
  default.

The config order becomes the rollout order. Nodes already aligned in the
baseline are not restart candidates. Stale nodes form one immutable ordered
list.

Initialization:

```bash
node tools/void-node-fleet-process-restart-rollout-v1.mjs \
  --config "$HOME/.config/void/node-fleet-drift-audit-v1.json" \
  --baseline-audit "$HOME/.config/void/node-fleet-process-freshness-audit-result-v1.json" \
  --current-audit "$HOME/.config/void/node-fleet-process-freshness-audit-result-v1.json" \
  --output "$HOME/.config/void/node-fleet-process-restart-rollout-state-000-v1.json"
```

Success returns `NEXT_RESTART_READY` and names exactly one `next_node`, or
`FLEET_PROCESS_FRESH` when the baseline already proves every process aligned.

## Continuity and out-of-band change detection

Each later inspection requires a fresh full-fleet audit at the original source
SHA. The coordinator requires:

- every initially aligned process to retain its exact baseline systemd
  invocation ID, process-start, source-transition, and process-source
  commit/tree identity;
- every completed node to remain aligned at the exact receipted systemd
  invocation ID, process-start epoch, and new process-source commit/tree;
- every pending node to retain its exact baseline stale systemd invocation ID,
  process-source commit/tree, process start, and source transition; and
- the fleet decision to agree with the number of completed restart candidates.

An unreceipted process restart, crash recovery, process-source identity change,
source transition, node-order change, missing node, stale observation, `HOLD`,
or source commit/tree drift stops the rollout. The operator must collect a new
baseline rather than silently adopting the changed state.

## Evidence-only advance

Run the one-node restart controller separately for the exact `next_node`. After
it returns a successful applied receipt, collect a new full-fleet freshness
audit. Then advance the evidence state with byte-exact confirmations:

```bash
node tools/void-node-fleet-process-restart-rollout-v1.mjs \
  --config "$HOME/.config/void/node-fleet-drift-audit-v1.json" \
  --state "$HOME/.config/void/node-fleet-process-restart-rollout-state-000-v1.json" \
  --current-audit "$HOME/.config/void/node-fleet-process-freshness-audit-result-v1.json" \
  --advance-source-convergence-receipt "$HOME/.config/void/node-fleet-source-convergence-nimo-result-v1.json" \
  --advance-restart-receipt "$HOME/.config/void/node-fleet-process-restart-nimo-result-v1.json" \
  --confirm-operation VOID_NODE_FLEET_PROCESS_RESTART_ROLLOUT_ADVANCE_V1 \
  --confirm-state-id '<exact prior state_id_sha256>' \
  --confirm-node nimo \
  --confirm-restart-plan-id '<exact restart plan_id_sha256>' \
  --output "$HOME/.config/void/node-fleet-process-restart-rollout-state-001-v1.json"
```

The coordinator reproduces:

1. the successful source-convergence receipt and its private config binding;
2. the selected node's exact stale evidence from the baseline audit;
3. the restart-only Git transition against current canonical `main`;
4. the complete deterministic restart plan;
5. the successful, non-retried restart receipt, exact authority object, and
   controller-observed post-restart systemd invocation ID and process
   epoch/commit/tree; and
6. an exact match between that receipted post-restart identity and the new
   aligned process in the current fleet audit.

Completed entries must be the exact prefix of the baseline stale-node order.
Skipping a node, appending a failed or ambiguous receipt, changing a plan or
authority flag, or padding/changing a confirmation is rejected.

Output paths are create-only and mode `0600`. An existing evidence file is
never overwritten. Each state has a reproducible `state_id_sha256` over the
baseline and ordered completion entries.

## Outcomes

- `NEXT_RESTART_READY` — continuity is exact and one next node is named.
- `FLEET_PROCESS_FRESH` — every baseline stale node has an exact successful
  receipt and the current full-fleet audit proves all processes aligned.
- `HOLD` — state, receipt, source, process, ordering, freshness, or fleet
  decision is not exact.

`automatic_retry=false` and `restart_command_invoked=false` are unconditional.
The coordinator does not treat `NEXT_RESTART_READY` as restart authority.

## Authority boundary

This tool may create a new local evidence JSON file only. It does not:

- fetch, merge, checkout, reset, or otherwise mutate Git;
- call the restart controller or start, stop, restart, reload, enable, or edit a
  service;
- install packages, build source, or deploy artifacts;
- continue automatically to the named next node;
- change Tailscale, Tor, DNS, firewall, router, interface, or port state;
- read or print credentials, private keys, tokens, wallets, or signers;
- sign or broadcast a transaction;
- mutate Buy VOID, Work Credits, validator, consensus, or treasury state; or
- move funds.

Every source convergence, real restart, fresh audit, evidence-state advance,
ready-for-review promotion, merge, and deployment remains a separate gate.
