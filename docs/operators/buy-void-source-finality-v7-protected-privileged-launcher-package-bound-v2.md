# Buy VOID V7 protected privileged launcher package-bound V2

## Purpose

Compose the protected source-custody launcher from #2951 with the exact
privileged-launcher package-runtime lock from #2954.

The launcher must not execute TSX as root merely because node_modules sits
inside a root-owned tree. Before either qualification success or receipt-tool
dispatch it now requires:

- exact reviewed #2954 lock-manifest Git blob;
- exact reviewed package-preservation proof Git blob;
- protected source custody under the unprivileged runtime UID/GID;
- stable commit/tree/branch/clean-state census; and
- successful independent re-inventory of the accepted package identity inside that same protected tree.

The historical #2952 candidate and #2954 lock proof remain immutable and intentionally refuse the tightened launcher rather than being repinned. The preservation proof rederives the accepted ethers+express profile and exact TSX Linux-x64 package bytes, then verifies the current launcher still puts package authentication before TSX.

Only after those checks may the launcher reach the allowlisted TSX receipt tool.

## CI fixture repair

The historical #2951 disposable fixture failed closed because its synthetic
tree did not actually contain the source-custody checker at the path the
launcher executed.

V2 stops synthesizing a partial repository. After audited npm installation the
proof copies the complete exact checkout, including Git history and node_modules,
switches only the disposable copy to branch main at the exact reviewed head,
then transfers that copy to root:root custody under /var/lib.

This makes the hosted positive exercise the same files and package bytes that
the protected launcher actually validates. The mutable-checkout, writable-tree,
dirty-tree, wrong-commit and hostile-PATH negatives remain.

## Authority boundary

Even GREEN V2 proves only that an exact protected repository plus exact package
runtime can qualify the launcher.

It still does not authorize:

protected_source_install_authorized=false
privileged_receipt_execution_authorized=false
runtime_service_mutation=false
credential_access=false
wallet_or_signer_access=false
rpc_call=false
transaction_broadcast=false
public_presale_activation=false
funds_movement=false

A separately authorized Precision host lane must install a reviewed accepted
main generation into protected root custody before any real receipt plan/apply.

PROTECT THE CORE.
