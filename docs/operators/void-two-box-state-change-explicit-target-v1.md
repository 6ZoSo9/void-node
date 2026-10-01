# VOID two-box state-changing explicit target v1

Marker: `VOID_TWO_BOX_STATE_CHANGE_EXPLICIT_TARGET_V1`

Status: source-only fail-closed operator hardening. This lane does not execute a
two-box proof, restart a service, submit a job, send WC/VOID, execute a trade,
publish DataNet state, access a wallet/signer, or move funds.

## Problem

Several legacy two-box proofs were created when Alienware was the project remote
box. They still embedded its retired Tailnet coordinate as the default target.
Some of those proofs are state-changing:

- WC send;
- WC -> VOID execution;
- VOID token transfer through the remote devnet RPC;
- DataNet/Mainnet-0 state-change publication; and
- parent gates that can restart the local node before invoking those proofs.

A command that can mutate state must not silently choose a historical machine.

## Contract

The following scripts now require explicit remote coordinates before any output
directory creation, restart, curl, ssh, POST, or transaction submission:

- `ops/two-box-void-send-execution-proof.sh`
- `ops/two-box-wc-send-execution-proof.sh`
- `ops/two-box-wc-trade-execution-proof.sh`
- `ops/two-box-mainnet0-state-change-proof.sh`
- `ops/two-box-mainnet0-state-change-proof.v2.sh`
- `ops/two-box-post-ui-trade-gate.sh`
- `ops/mainnet0-launch-readiness.sh`

Depending on the script, the operator must explicitly supply the relevant
combination of:

`ALIEN`, `REMOTE_NODE_BASE`, `REMOTE_BASE`, `REMOTE_HELPER_BASE`,
`REMOTE_RELAYER_BASE`, and `REMOTE_HTTP`.

The old Alienware IP/Funnel/hostname family is rejected even when explicitly
supplied. The remote JSON-RPC URL used inside an already explicit SSH session may
remain loopback because that address is evaluated on the selected remote host.

## Parent-runner boundary

`two-box-post-ui-trade-gate.sh` validates and exports its explicit target set
before its local restart or child proofs.

`mainnet0-launch-readiness.sh` validates and exports `ALIEN` plus
`REMOTE_HTTP` before running the state-change proof.

The state-change v2 follower-status query is derived from the explicit
`REMOTE_HTTP`; it no longer embeds the retired Alienware peer URL.

## Proof

`scripts/prove_void_two_box_state_change_explicit_target_v1.mjs` performs
source assertions and invokes every guarded script twice in fail-closed mode:

1. with required target variables absent; and
2. with a retired Alienware target.

Both cases must terminate with exit code `2` and the
`VOID_TWO_BOX_STATE_CHANGE_EXPLICIT_TARGET_V1` HOLD marker before any
state-changing command can run.

No positive/live execution is performed by CI.
