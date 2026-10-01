# Two-box remote jobs explicit target v1

Marker: `VOID_TWO_BOX_REMOTE_JOBS_EXPLICIT_TARGET_V1`

## Problem

Three current two-box operator wrappers still silently selected Alienware's retired
Tailscale address when no remote target was supplied:

- `ops/two-box-remote-jobs-submit-proof.sh`;
- `ops/two-box-remote-jobs-submit-product-proof.sh`; and
- `ops/two-box-remote-datanet-view-proof.sh`.

That made a normal Make/operator invocation target a machine that no longer exists.

## Contract

All three wrappers now require the operator to provide `ALIEN` explicitly as the
SSH target.

The two wrappers that also read public product surfaces require
`REMOTE_NODE_BASE` explicitly as an HTTP(S) origin. They do not infer that origin
from an SSH alias because SSH aliases are not guaranteed to be HTTP-resolvable.

The retired Alienware IP and Funnel hostname are rejected even if supplied manually; hostname matching is case-insensitive.

The underlying `jobs-submit-e2e-proof.sh` is intended to run on the remote machine
after SSH and is separately bound to that machine's loopback node and local evidence.

## Example shape

```bash
ALIEN='user@reviewed-host' \
REMOTE_NODE_BASE='http://reviewed-host:4100' \
bash ops/two-box-remote-jobs-submit-product-proof.sh
```

This document intentionally does not publish a current host address.

## Authority boundary

These wrappers are mutation-capable when an operator deliberately runs them because
they ultimately submit a DataNet job and can produce Work Credit evidence.

The focused CI lane does not invoke SSH, HTTP, job submission, or the mutation-capable
proofs. It checks shell syntax and static source contracts only.
