# VOID read-replica publisher fail-closed retention v1

## Scope

This source-only lane reconstructs the deployed read-replica publisher at the canonical path and repairs its retention boundary. It does not install or deploy the publisher, alter the production release tree, change systemd configuration, restart a service, activate paid work, execute a payment, write Work Credits, access a wallet or signer, or move funds.

The reconstructed source is bound to private capture packet SHA-256 `6aa1787c82e26440425b8532281240f2267b459a07bcdcf35ff918ac835da748` and deployed publisher SHA-256 `7facc61d233274403b1a032828219f6085b667b89758ae70e76baa3fcb84410d`.

## Proven failure

The deployed publisher made the new local release current and then pruned sealed releases before attempting the remote push. A retention `PermissionError` therefore produced a failed oneshot and skipped the remote push even though the local publication had already advanced.

The owner-read-only release layout is intentional. Retention must accommodate that layout without turning uncertain paths into deletion authority and without converting housekeeping failure into publication failure.

## Contract

The canonical candidate:

- admits only absolute, direct children of the configured releases root;
- requires the releases root, current symlink, candidate root, and every candidate entry to be publisher-owned and on the expected device;
- rejects hidden candidates, symlink candidates, and symlinks anywhere inside a candidate tree;
- snapshots directory device/inode/mode identity before adding only owner read/write/execute bits needed for removal;
- restores surviving directory modes after a removal failure;
- protects the current release independent of modification time and retains at least five releases by default;
- preflights every deletion candidate before deleting any candidate;
- serializes publishers with an owner-only, non-followed advisory lock;
- completes the remote push before retention begins;
- reports retention as `ok` or `degraded`, including exact blocked operations, while setting `publication_blocked=false`;
- performs no ownership mutation.

Unexpected current-pointer state or retention metadata fails closed by retaining releases and surfacing a degraded retention receipt. It does not silently authorize a broader deletion.

## Proof

Run from the repository root:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 \
  scripts/prove_void_read_replica_publisher_fail_closed_retention_v1.py \
  --candidate ops/mainnet0/publish_void_read_replica_snapshot_v1.py
```

The proof uses temporary fixture trees only. It covers read-only pruning, current-release protection, symlink escape rejection with zero deletion, owner/device/direct-child guards, invalid-current and delete-denial bounding, exclusive publisher locking, push-before-retention ordering, and static destructive-call authority. Success ends with:

```text
VOID_READ_REPLICA_PUBLISHER_FAIL_CLOSED_RETENTION_V1=PASS
```

## Deferred authority

Review and merge do not authorize deployment. A separate exact deployment lane must bind the merged source hash, compare it to the installed publisher, independently snapshot service and release-tree state, and obtain explicit authority before any install or restart.
