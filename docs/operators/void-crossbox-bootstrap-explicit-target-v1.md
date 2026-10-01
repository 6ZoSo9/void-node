# Cross-box bootstrap explicit target v1

Marker: `VOID_CROSSBOX_BOOTSTRAP_EXPLICIT_TARGET_V1`

Status: source-only operator hardening. This lane does not execute SSH, restart a
service, change a systemd drop-in, alter Tailnet configuration, or mutate a VOID
runtime.

## Problem

Four legacy bootstrap/Tailnet diagnostics still silently defaulted their remote
SSH peer to the retired Alienware address `zoso@100.122.79.39`. The
post-bootstrap proof also silently defaulted Precision's Tailnet address.

Those defaults are unsafe after the active fleet moved to Precision, Nimo, and
Xiphos: an operator command could target a retired machine without an explicit
choice.

## Contract

The following scripts now require the legacy `ALIEN` environment variable to
be supplied explicitly. The variable name is retained only for command
compatibility; it means **remote SSH target**, not an active Alienware role.

- `ops/mainnet0/mutual-tailnet-peer-env-proof.sh`
- `ops/mainnet0/tailnet-http-public-base-proof.sh`
- `ops/post-bootstrap-crossbox-proof.sh`
- `ops/tailscale-ssh-auth-preflight-proof.sh`

Every script rejects a target containing the retired Alienware IP, Funnel name,
or the word `alienware` before its first SSH action. The mutual-peer script
also proves the guard occurs before its first systemd mutation.

`ops/post-bootstrap-crossbox-proof.sh` additionally requires `PREC_TS`
explicitly; it no longer embeds the historical Precision Tailnet address.

## Example

```bash
ALIEN='zoso@CURRENT_REMOTE_HOST' \
PREC_TS='CURRENT_PRECISION_TAILNET_IP' \
bash ops/post-bootstrap-crossbox-proof.sh
```

For scripts that do not use `PREC_TS`, only `ALIEN` is required. Optional
derived fields such as `ALIEN_TS` remain overrideable.

## Boundary

The CI proof is static and source-only. It checks target requirements, retired
host rejection, guard ordering, shell syntax, and the absence of the two old
defaults. It does not execute SSH, Tailscale, curl against a live host,
`systemctl`, service restarts, wallets, validators, Work Credits, transactions,
or funds movement.
