# Site-bundle peer explicit target v1

Marker: `VOID_SITE_BUNDLE_PEER_EXPLICIT_TARGET_V1`

Status: source-only operator hardening. This lane does not execute SSH, remove a
packed site bundle, change a systemd drop-in, restart a service, or mutate a live
VOID runtime.

## Problem

The public-site bundle peer proofs still carried active defaults for the retired
Alienware machine. The persistence proof was especially risky because it could
restart both local and remote user services while defaulting:

- remote SSH to `zoso@100.122.79.39`;
- the local service's peer to `http://100.122.79.39:4100`; and
- the remote service's peer to the historical Precision Tailnet address.

The active operator fleet is Precision, Nimo, and Xiphos. Cross-box targets must
therefore be an explicit operator choice.

## Contract

The auto-materialize and peer-readiness proofs require `ALIEN` explicitly.
The legacy variable name is retained only for command compatibility and means
remote SSH target.

The persistence proof requires all three coordinates explicitly:

- `ALIEN`: remote SSH target;
- `LOCAL_PEER`: peer HTTP origin written into the local service drop-in; and
- `REMOTE_PEER`: peer HTTP origin written into the remote service drop-in.

All three scripts reject the retired Alienware IP, Funnel hostname, or a target
containing `alienware` before SSH. The persistence proof validates the combined
SSH/peer coordinates before any systemd mutation. The auto-materialize proof
validates its remote target before its destructive local cache exercise.

## Boundary

The CI proof is static and source-only. It checks shell syntax, explicit target
requirements, retired-coordinate rejection, guard ordering, and removal of the
three stale defaults. It does not execute SSH, curl against a live node,
`systemctl`, cache removal, DataNet materialization, wallets, validators, Work
Credits, transactions, or funds movement.
