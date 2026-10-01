# VOID two-box DataNet operator-cycle dry-run v1

Marker: `VOID_TWO_BOX_DATANET_OPERATOR_CYCLE_DRY_RUN_V1`

Status: source-only operator safety hardening.

## Problem

`ops/two-box-datanet-operator-cycle.sh` exposed `APPLY=0` as its default and
printed a dry-run message, but the script synchronized the remote checkout with
`git reset --hard origin/main` and restarted `void-node.service` before it
checked `APPLY`.

The same entrypoint also defaulted its remote SSH/HTTP coordinates to retired
Alienware values.

That means the nominal dry-run was not a dry-run.

## Contract

The operator cycle now:

1. requires explicit `ALIEN` and `REMOTE_BASE`;
2. rejects the retired Alienware IP/Funnel/hostname family;
3. exports those explicit values to child proofs;
4. performs only the read-only provenance comparison before the `APPLY` gate;
5. exits successfully at `APPLY!=1` without remote Git mutation, service
   restart, or materialization; and
6. permits remote sync/restart/materialization only after `APPLY=1`.

The apply path retains the existing behavior after the gate:

- fetch and hard-align the explicitly selected remote checkout to `origin/main`;
- restart the explicitly selected remote node service;
- perform bounded materialization; and
- verify the provenance-count drop.

This lane does not execute that apply path.

## Proof

`scripts/prove_void_two_box_datanet_operator_cycle_dry_run_v1.mjs` proves:

- retired defaults are absent;
- missing and retired targets exit with code `2`;
- the provenance read occurs before the dry-run decision;
- every remote Git reset/restart/materialization token occurs after the
  `APPLY` gate; and
- explicit target values are forwarded to child scripts.

CI performs no SSH connection, restart, Git reset, DataNet materialization, WC
mutation, wallet/signing action, transaction, or funds movement.
