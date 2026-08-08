# VOID Precision host control v1

Marker:

`VOID_PRECISION_HOST_CONTROL_V1`

Decision:

`SOURCE_ONLY_REUSE_EXISTING_BETA_PROOF_RUNNER_FOR_CLOSED_HOST_CONTROL`

## Purpose

Reduce repetitive operator copy/paste for a very small class of Precision-local
checks by reusing VOID's already-proven self-hosted beta-proof runner.

This lane does **not** register another GitHub runner.

The existing repository already has a manual-only runner lane with labels:

- `self-hosted`
- `void-node`
- `beta-proof`

The new control workflow targets those exact existing labels but is much narrower
than the beta proof workflow:

- `workflow_dispatch` only;
- `refs/heads/main` only;
- `permissions: {}`;
- no repository checkout;
- no repository script execution by the workflow;
- one root-owned installed helper with a pinned SHA-256; and
- exactly two closed-schema operations.

Operator policy for this lane is to use no GitHub-hosted compute.

## Existing runner relationship

The existing `self-hosted-beta-proof` workflow remains unchanged.

This lane does not:

- register or remove a runner;
- change runner labels;
- change the runner service;
- read the runner `.credentials` file;
- obtain a registration token; or
- update the Actions runner binary.

The one-time installer only locates the already-running `Runner.Listener`,
checks its `.runner` metadata identifies repository
`https://github.com/6ZoSo9/void-node`, discovers that exact OS user, and gives
that user sudo access to the closed helper only.

The installer deliberately never opens `.credentials`.

## V1 operation allowlist

Exactly two operations exist.

### `inspect_custodian_binding`

Exact confirmation:

`voidPrecisionInspectCustodianBindingV1`

Read-only. It verifies:

- exact Precision hostname;
- canonical repo on clean `main`;
- exact expected `main` SHA;
- exact `0600` custodian binding SHA;
- absent custody store/socket;
- running `void-node-live.service`; and
- disabled preparation/execute/submission gates.

### `daemon_reload_custodian_binding`

Exact confirmation:

`voidPrecisionDaemonReloadCustodianBindingV1`

The only mutation is:

`systemctl --user daemon-reload`

The helper then requires:

- identical `void-node-live.service` MainPID before/after;
- identical load/active/sub state;
- `NeedDaemonReload=no`;
- binding drop-in recognized;
- custody store/socket still absent; and
- money-capable gate metadata unchanged and disabled.

There is no start, stop, restart, credential, signing, RPC, transaction, wallet,
validator, Work Credit, inventory, fulfillment, or fund-moving operation.

## Workflow boundary

`.github/workflows/void-precision-host-control-v1.yml` is manual-only and targets:

`[self-hosted, void-node, beta-proof]`

It does not run on GitHub-hosted labels.

It does not run `actions/checkout`.

It requires current `main`, exact Precision hostname, a root-owned `0755`
installed helper, and these exact reviewed hashes:

- installed helper SHA-256:
  `e94246d3316c647f5f6c76c25d291aadc25899e814169e4193cf2fe74d3d5308`
- custodian binding SHA-256:
  `b8b7d98c76a59dc6f78e7c421475206795074b91a15dd317f8fb582269493b8a`

The workflow passes only four arguments to the installed helper:

1. operation;
2. exact confirmation;
3. GitHub `main` SHA;
4. expected binding SHA.

Caller values are never evaluated as shell, paths, service names, environment
assignments, RPC methods, or transaction data.

## One-time existing-runner bootstrap

After this source is reviewed and merged, run:

`ops/precision/install_void_precision_host_control_existing_beta_runner_v1.sh`

as root on Precision.

The installer is fail-closed and first discovers exactly one running Actions
`Runner.Listener` whose `.runner` metadata is repository-scoped to
`6ZoSo9/void-node`.

Only after discovery succeeds does it:

- install the reviewed helper as
  `/usr/local/libexec/void/precision-host-control-v1.py`;
- require helper SHA-256 `e94246d3316c647f5f6c76c25d291aadc25899e814169e4193cf2fe74d3d5308`;
- render the sudoers placeholder to the exact detected beta runner OS user;
- install `/etc/sudoers.d/void-precision-host-control-v1` as root `0440`; and
- validate the rendered policy with `visudo -cf`.

Installer SHA-256:

`b53dec1e5e6e7374968f9d9969af324eb7a52f8b5613a1d8d1d604f0ec704412`

The installer does not modify the runner registration/service or VOID services.

## Sudo boundary

The sudoers source contains placeholder:

`__VOID_BETA_RUNNER_USER__`

The installer replaces it only with the exact detected repository runner OS
account.

That user receives `NOPASSWD` authority only for:

- installed helper + `inspect_custodian_binding`;
- installed helper + `daemon_reload_custodian_binding`.

It receives no sudo shell and no direct sudo `systemctl`.

The helper additionally requires a real non-root `SUDO_USER` and validates all
operation arguments again.

## Verification without GitHub-hosted compute

Run locally:

`python3 scripts/prove_void_precision_host_control_v1.py`

Expected marker:

`VOID_PRECISION_HOST_CONTROL_EXISTING_BETA_RUNNER_V1_PROOF_GREEN`

The proof establishes:

- existing beta runner labels are reused;
- no new runner registration occurs;
- control workflow is manual-only;
- no GitHub-hosted runner label appears;
- no repository checkout occurs in the control job;
- no GitHub token permissions are granted;
- helper and installer SHA values are pinned;
- only two operations/confirmations exist;
- inspect performs no mutation;
- reload happens exactly once;
- PID change fails closed;
- sudoers exposes no shell/direct `systemctl`; and
- credential/RPC/broadcast/money authority remains zero.

There is no GitHub-hosted proof workflow in this lane.

## CI publication policy

To avoid automatic `push`/`pull_request` workflow compute while this lane is
being prepared, source-only publication commits should use GitHub's supported
`[skip ci]` commit annotation.

This does not apply to manually dispatched workflows.

## Authority boundary

This source lane does not:

- install the helper;
- install sudoers;
- modify or restart the existing beta runner;
- register a new runner;
- dispatch a workflow;
- restart/start `void-node-live.service`;
- read production credentials;
- access a signer/wallet;
- create custody store/socket;
- call RPC;
- invoke `submit_once`;
- broadcast a transaction;
- decrement inventory;
- close a live fulfillment;
- mutate Work Credits/validators; or
- move funds.

Source review/merge, one-time helper installation, first manual GitHub dispatch,
custodian activation, broadcaster activation, real submission, and live canary
remain separate explicit authorization gates.
