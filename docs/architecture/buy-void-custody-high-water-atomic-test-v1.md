# Custody high-water V2: synthetic-only fault-stage proof

This Draft is stacked on the exact [custody read-only observation PR #2684](https://github.com/6ZoSo9/void-node/pull/2684)
at `d882c7435bac405fb8cb9fdc2f143deb730f27a3`.
It does not install, mount, enable, or expose a custody high-water writer.
The new script writes solely beneath its own guarded OS-temp test fixtures.
Its CLI has no arbitrary root/file argument and rejects every mode except
`--self-test` (with optional `--with-v2`).

The test pins exact parent source Git blobs:
`src/economic/buy_void_custody_launch_authority_v2.mjs` =
`223ebdb8317009228094b8ebecef19dc37d87a91` and
`src/economic/buy_void_custody_launch_observed_read_v1.mjs` =
`e4da36b14c4bea4aee59ea959c2e6cf1d69bd5aa`.
With locked npm dependencies it checks its synthetic canonical payload against
the actual V2 exported high-water serializer. It does NOT call the V2
signature/receipt classifier; synthetic input carries no valid launch
authority.

## Synthetic stages and negative tests

Under a brand-new, mode-0700 temporary directory it models:
exact previous-byte check, canonical V2 record shape, sequence/source
antirollback checks, `O_EXCL|O_NOFOLLOW` mode-0600 same-directory pending
creation, full write, pending-file fsync, previous-byte recheck,
atomic rename, directory fsync, then exact readback.

Five injected throw/abort points cover before pending creation, after
pending write, after pending fsync, after rename but before directory fsync,
and after directory fsync. **An injected throw is not a real process crash
or power failure.** Any fault path is unacknowledged, including the case
where replacement bytes are already visible. The first three fault points
must leave the previous high-water file unchanged in this process model.

Additional tests require bootstrap once, monotonic advance, idempotent
same-byte replay without an extra write, decreasing sequence HOLD,
same-sequence different-content HOLD, different source composition HOLD,
stale expected-prior HOLD, forged in-memory fixture token HOLD, pending
symlink collision HOLD, and restored positive behavior.

The Node 22/24/26 workflow produces deterministic inert text receipts
and requires byte-for-byte equality.

## Strict boundaries

This is NOT an approved atomic custody writer, real reboot durability
qualification, linearizable multi-writer transaction, validated dual-signed
activation receipt, original buyer/payment provenance, trusted UID/IPC
identity or deployed operator route. Rechecking prior bytes before rename
is NOT linearizable if multiple writers race. No privileged external
antirollback anchor exists here. An actual filesystem power interruption
could differ from this tested process-level model, even when fsync succeeds.

The implementation must NOT be imported as a production writer. A separate,
independently reviewed custody-owned service successor needs authenticated
server paths, cross-UID ownership, an exclusive serialization domain,
exact signed receipt/lease revalidation at commit, protected rollback
anchor, crash recovery and reserve/recover before it could be considered.

Every receipt explicitly keeps power-loss durability, cross-UID serialization,
signature authority, cross-file atomicity, allocation readiness and funds
movement FALSE. No service/host, real customer records, keys/wallet/signer,
transactions, Chain-2050/WC, inventory/treasury/liquidity, presale or market
is accessed or changed. Keep Draft/unmerged.

**PROTECT THE CORE.**
