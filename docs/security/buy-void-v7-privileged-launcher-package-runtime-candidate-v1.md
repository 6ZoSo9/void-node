# Buy VOID V7 privileged launcher package-runtime candidate V1

## Purpose

#2951 protects the privileged receipt launcher's source tree, but its real
execution path runs node_modules/tsx/dist/cli.mjs as root. Root ownership
prevents later unprivileged replacement; it does not itself authenticate the
installed TSX runtime bytes.

The first #2952 candidate reused the general reviewed-package collector with
roots ethers + express + tsx. Hosted Node 24 correctly falsified that approach:
esbuild records every platform binary in optionalDependencies while npm installs
only the matching Linux x64 package. The historical collector resolves optional
dependencies by lockfile presence and therefore attempted to inventory absent
Darwin/AIX/Windows package directories.

That negative is preserved. The frozen collector is not weakened or edited.

## Scoped Linux x64 TSX closure

The accepted post-#2865 ethers + express profile is still independently
rederived through the frozen reviewed collector and must exactly match:

- profile ID:
  voidrnpr1_08e05626e80fbd2aecc3018514aaf76e491954f8258fff996f0b2dca1c3055ac
- aggregate:
  77622df7d483bc3f73aa39468246f6860237a3f6749a09a0284644493f3990b6
- canonical SHA-256:
  3493638417e2f02a39bb7c48a08935e299754d7474feb71a5c2a48944d3f1757
- 82 packages / 2,498 files / 21,290,060 bytes.

The TSX-specific candidate validates the exact audited lock and inventories the
actual privileged Linux x64 runtime closure:

- tsx 4.23.15
- esbuild 0.28.2
- @esbuild/linux-x64 0.28.2

It requires fsevents and every non-Linux-x64 esbuild platform package to remain
absent from node_modules. Each installed package must be a direct non-symlink
directory; every package file is stable-read and SHA-256 inventoried.

Node 22, 24 and 26 must derive byte-identical candidate envelopes.

## Authority boundary

profile_candidate_accepted=false
privileged_launcher_package_runtime_verified=false
protected_source_install_authorized=false
privileged_receipt_execution_authorized=false
public_presale_activation=false
funds_movement=false

No protected tree is installed on Precision and no root receipt tool is run.
No service/config/RPC, credential/key/wallet/signer, customer/payment,
transaction, Chain-2050/WC, inventory/treasury/liquidity, presale or funds
action occurs.

A green candidate is evidence for a separately reviewed exact TSX-runtime lock.
Only that lock plus a separately authorized protected-tree installation can
qualify #2951 for a real receipt plan/apply.

PROTECT THE CORE.
