# Mainnet-0 readiness explicit peer v1

Marker: `VOID_MAINNET0_READINESS_EXPLICIT_PEER_V1`

The historical two-box Mainnet-0 readiness proof still defaulted its remote SSH
target to the retired Alienware Tailnet address. The validator-status stamper
also carried an unused `MAIN_BASE` default pointing at that same address.

## Readiness proof

`ops/two-box-mainnet0-readiness-proof.sh` now requires an explicit remote
target through `CROSSBOX_SSH_TARGET`. The legacy `ALIEN` variable remains
accepted only as an explicit compatibility alias; it has no default.

The proof accepts only a simple SSH alias/hostname or `user@host`. It rejects
leading option syntax, whitespace/control characters, shell-fragment characters,
and target material containing:

- `100.122.79.39`
- `zoso-alienware-aurora-r7.taila47fd.ts.net`
- `alienware`

Rejected, malformed, or missing targets exit with status 2 before
output-directory creation, local HTTP observation, or SSH.

## Validator-status stamper

`ops/void-mainnet0-stamp-validator-status.sh` never consumed `MAIN_BASE`.
The unused retired default has therefore been removed rather than replaced with
another implicit network coordinate.

The stamper continues to derive its two-box judgment from the local
`/__void/peer-main-status.json` response and local readiness data.

## Boundary

This lane is source-only. It performs no SSH, runtime observation, validator
mutation, service restart, signing, transaction, or funds movement.

Expected proof marker:

`VOID_MAINNET0_READINESS_EXPLICIT_PEER_V1_GREEN`
