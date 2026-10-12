# VOID two-box DataNet materialization explicit target v1

Marker: `VOID_TWO_BOX_DATANET_MATERIALIZE_EXPLICIT_TARGET_V1`

Status: source-only fail-closed target hardening.

## Problem

The standalone DataNet provenance/materialization scripts still embedded the
retired Alienware Tailnet SSH and HTTP coordinates as defaults.

That was unsafe even after the parent operator cycle became explicit-target:
operators or other scripts can invoke these child entrypoints directly, and
`two-box-datanet-materialize-proof.sh` deliberately drives an apply path.

## Contract

These scripts now require both `ALIEN` and `REMOTE_BASE` before creating an
output directory or performing SSH/HTTP activity:

- `ops/two-box-datanet-provenance-diff.sh`
- `ops/two-box-datanet-materialize-from-peer.sh`
- `ops/two-box-datanet-materialize-proof.sh`

The retired Alienware IP/Funnel/hostname family is rejected even when explicitly
supplied.

`LOCAL_BASE` remains locally defaultable because it resolves only the current
machine's loopback/public HTTP coordinate.

The materialization proof explicitly forwards the selected `ALIEN` and
`REMOTE_BASE` values to both provenance comparisons and the apply child. It no
longer reconstructs a retired remote URL internally.

## Mutation boundary

`two-box-datanet-provenance-diff.sh` remains read-only.

`two-box-datanet-materialize-from-peer.sh` remains dry-run by default and
materializes only when its existing `--apply` / `APPLY=1` gate is crossed.

`two-box-datanet-materialize-proof.sh` remains an intentional apply proof. This
lane changes only target selection and propagation; it does not weaken or
silently enable the apply boundary.

## Proof

The focused source proof verifies:

- retired defaults are absent;
- missing `ALIEN` or `REMOTE_BASE` fails closed;
- retired Alienware coordinates fail closed;
- target validation precedes output/network activity;
- the materialize proof forwards the explicit target pair to every child; and
- the standalone materializer retains its dry-run gate.

CI performs no SSH, HTTP probe, materialization, Work Credit mutation, wallet
action, transaction, or funds movement.
