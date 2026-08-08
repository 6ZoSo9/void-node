# VOID Precision host control v1

Marker:

`VOID_PRECISION_HOST_CONTROL_V1`

Decision:

`SOURCE_ONLY_RESTRICTED_GITHUB_TO_PRECISION_CONTROL_BOUNDARY`

## Purpose

Reduce repetitive operator copy/paste for a very small class of Precision-local
checks without giving repository workflows general access to ZoSo's account,
wallet material, services, or arbitrary root shell.

The v1 design separates GitHub's self-hosted runner from the privileged host
operation:

1. a dedicated OS account, `void-gh-runner`, runs the GitHub Actions runner;
2. the host-control workflow never checks out repository content on that runner;
3. the workflow targets the exact label `void-precision-control-v1` and only
   accepts `workflow_dispatch` from `refs/heads/main`;
4. a reviewed helper is installed outside the repository at
   `/usr/local/libexec/void/precision-host-control-v1.py` as `root:root 0755`;
5. the workflow requires that installed helper to match its pinned SHA-256;
6. sudo grants the runner account access only to that installed helper; and
7. the helper itself accepts a closed operation enum, exact confirmation,
   current `main` SHA, and exact custodian-binding SHA-256.

No registration or installation is performed by this source lane.

## V1 operation allowlist

Exactly two operations exist.

### `inspect_custodian_binding`

Exact confirmation:

`voidPrecisionInspectCustodianBindingV1`

This is read-only. It verifies the exact Precision hostname, canonical clean
`main` SHA, exact `0600` custodian binding, absent custody store/socket, running
`void-node-live.service`, and disabled preparation/execute/submission gates.

### `daemon_reload_custodian_binding`

Exact confirmation:

`voidPrecisionDaemonReloadCustodianBindingV1`

This performs exactly one mutation:

`systemctl --user daemon-reload`

The helper then requires the service MainPID, load state, active state, and
sub-state to remain unchanged; requires `NeedDaemonReload=no`; requires the
binding drop-in to be recognized; and requires the custody store/socket to
remain absent and money-capable gate metadata unchanged and disabled.

The helper contains no start, stop, restart, enable, disable, credential,
signing, RPC, transaction, wallet, validator, Work Credit, or fund-moving
operation.

## Why the runner must not run as ZoSo

A normal self-hosted runner executes repository-defined workflow commands. If it
ran directly as ZoSo, a future workflow mistake could inherit ZoSo's filesystem
access. V1 therefore requires a dedicated `void-gh-runner` account with no
membership in ZoSo's private groups and no general sudo authority.

The runner's only privileged bridge is the root-owned installed helper. The
helper uses fixed absolute paths and fixed subprocess argv; caller input is
never evaluated as shell, command, path, environment assignment, or service
name.

## Host-control workflow boundary

`.github/workflows/void-precision-host-control-v1.yml` has:

- `workflow_dispatch` only;
- `refs/heads/main` only;
- no GitHub token permissions (`permissions: {}`);
- exact self-hosted labels `[self-hosted, Linux, X64, void-precision-control-v1]`;
- no repository checkout;
- no repository script execution on the host runner;
- no secrets references;
- a pinned installed-helper SHA-256;
- a single fixed concurrency lane; and
- a five-minute timeout.

The workflow does not install, update, or repair the helper. Hash, ownership, or
mode mismatch fails closed.

## Installation boundary — not performed here

A later explicit operator gate may install/register the runner. That gate must
independently verify at least:

- current reviewed `main` and exact source blobs;
- dedicated runner identity/groups;
- runner work directory outside `/home/zoso`;
- repository scope rather than organization scope;
- exact `void-precision-control-v1` label;
- private handling of the GitHub runner registration token;
- root-owned `0755` helper at the exact fixed path and pinned SHA-256;
- root-owned sudoers policy validated with `visudo -cf`;
- no other `NOPASSWD` or general sudo for `void-gh-runner`; and
- no production restart, credential read, wallet access, RPC call, transaction
  action, or money movement during installation.

Runner registration/service start is a separate host-activation gate from this
source lane.

## Authority boundary

This source lane does not install/register a runner, obtain a runner token,
create the runner OS account, install helper/sudoers files, run a Precision
command, reload a live service, read production credentials, access a signer or
wallet, create custody state/socket, call RPC, invoke `submit_once`, broadcast a
transaction, decrement inventory, close a fulfillment, mutate Work Credits or
validators, or move funds.

Source review/merge, runner installation, runner registration, first GitHub host
control dispatch, custodian activation, broadcaster activation, and transaction
submission remain separate explicit authorization gates.
