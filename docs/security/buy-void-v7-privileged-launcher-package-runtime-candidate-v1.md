# Buy VOID V7 privileged launcher package-runtime candidate V1

## Purpose

#2951 protects the privileged receipt launcher's source tree, but real tool
execution still runs the protected-tree node_modules/tsx/dist/cli.mjs as root.
Root ownership prevents later unprivileged replacement; it does not by itself
authenticate the package bytes that were installed.

This source-only child derives an unaccepted reviewed package-runtime candidate
rooted at exactly ethers 6.17.0, express 4.22.3 and tsx 4.23.15.

## Preservation rule

The proof independently rederives the already-accepted post-#2865 enforcement
package identity (ethers + express) and requires its exact profile ID, aggregate,
canonical digest, 82 packages, 2,498 files and 21,290,060 bytes.

Every accepted package record must remain byte-semantically identical in the
new ethers + express + tsx superset. TSX may add its lockfile closure but may not
silently change an accepted enforcement package.

## Three-node derivation

Node 22, 24 and 26 each install the exact audited lock with package scripts
disabled, rederive the accepted enforcement profile, derive the privileged
superset and emit a complete candidate. Cross-node CI requires byte-identical
candidate envelopes. No profile ID, aggregate or count is hand-authored.

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

A green candidate is evidence for a separately reviewed exact profile lock.
Only an accepted package identity plus the separately authorized protected-tree
installation can qualify the #2951 launcher for a real receipt plan/apply.

PROTECT THE CORE.
