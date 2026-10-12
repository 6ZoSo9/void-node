# VOID Mainnet-0 Status Proof Runbook

status: active
operator_label: zoso
updated_at: 2026-04-30

## Purpose

This runbook explains which Mainnet-0 status proof to run in each environment.

The status proofs are conservative. They prove current health and blocker state. They do not approve public Mainnet-0 launch by themselves.

## Current launch posture

Mainnet-0 remains: not_go_for_public_mainnet0

This remains true even when node readiness, update safety, validator lifecycle, Buy VOID create/watch, and cross-box smoke checks are green.

## Precision full proof

Use this on Precision when Prometheus and node_exporter are available:

    make mainnet0-status-proof

This checks status files, node readiness, update safety metric, validator lifecycle metric/freshness, Buy VOID config, and confirms the latest Buy VOID watch has not been claimed or fulfilled.

## Local smoke proof

Use this on any node that may not have Prometheus:

    make mainnet0-status-smoke

This checks status files, node readiness, Buy VOID watcher config, validator plan-only state, and does not require Prometheus.

## Cross-box smoke proof

Run this from Precision/coordinator with an explicitly reviewed, nonlocal current-fleet SSH target:

    VOID_MAINNET0_CROSSBOX_PEER=<ssh-alias-or-user@host> make mainnet0-crossbox-status-smoke

There is intentionally no default peer. The retired Alienware identity is rejected, as are loopback/local-host targets. The proof checks local Precision smoke, then SSHes to the selected peer and runs the same no-Prometheus smoke there.

If the peer is missing or unreachable, the cross-box proof fails. The local and remote repositories must both be clean, resolve to distinct hostnames, and report the exact same Git HEAD. A local smoke must never substitute for required cross-box evidence.

## Known environment difference

Precision currently has the full monitoring stack.

The selected cross-box peer is only required to pass `make mainnet0-status-smoke`; it does not need Prometheus/node_exporter for this cross-box command.

## Buy VOID rule

Do not run MODE=claim until all of the following are true:

1. The operator intentionally sent Base native USDC from a self-custody wallet.
2. The operator has the real Base transaction hash.
3. The receiver, token, amount, and transaction success can be verified.
4. The proof OUT_JSON from the create/watch lane is available.

No blind direct deposits.
No exchange or custodial sends.
No fake TX_HASH.
No VOID fulfillment before payment verification.

## Validator admission rule

The validator is currently: plan_only_candidate_declared

Do not call it active or live admitted until:

- live config explicitly represents active admission,
- runtime endpoints agree,
- cross-box checks agree,
- no private keys are committed,
- final launch/update/validator lifecycle gates remain green.

## Operator rule

Ready signals are not launch approval.

A final public Mainnet-0 go/no-go must be run intentionally after remaining blockers are cleared.
