# Dormant first-entry protected-install bootstrap V4

Bootstrap V4 is an additive source and proof successor that authenticates the
repaired inner installer V3. Its native behavior comes directly from canonical
bootstrap V3, Git blob `2c3c9ed120cc9949a0528e43be886354aa25da5a`.
The C source changes only eight generation and child-protocol strings. Native
self custody, sealed snapshot execution, Python policy authentication, runtime
HEAD forwarding, and terminal receipt behavior remain the canonical behavior.

This source change does not accept a new release artifact or install anything
on Precision. The existing bootstrap candidate lock V4 continues to describe
canonical bootstrap V3 and inner installer V2. Its identity is preserved; it is
not acceptance evidence for bootstrap V4 or inner installer V3.

## Files and generation contracts

| Item | Contract |
| --- | --- |
| Native source | `ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v4.c` |
| Native proof | `scripts/prove_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v4.py` |
| Authenticated child | `ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v3.py` |
| Bootstrap root | `/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v4` |
| Fixed native name | `void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v4` |
| Native marker | `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_V4` |
| Policy schema | `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V4` |
| Policy filename | `policy-v1.conf`, retaining the canonical field format |
| Child apply confirmation | `INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V3_CREATE_ONLY` |
| Child plan prefix | `voidbuye2dormantfirstentryinstall3_` |
| Installed payload root | `/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1` |

The proof pins the complete child Git blob, byte count, and SHA-256. Compilation
requires an explicit installer SHA-256, installer byte count, and exact V3 apply
confirmation. The native self-test rejects malformed digests, a zero or excessive
byte count, and an incompatible confirmation. The proof checks the values
reported by a successful self-test against the authenticated source bytes.

The caller supplies `--expected-head` as exactly 40 lowercase hexadecimal
characters. Bootstrap V4 forwards it unchanged to the authenticated child. It
does not compile a repository HEAD into the ELF, and accepting the argument's
syntax does not itself verify that checkout. The child performs the checkout
verification required by its plan and apply operations.

The accepted payload lock V1, runtime installer V2, and installed payload
namespace V1 remain the existing dependency contract. Draft launcher, candidate,
or qualification successors do not become dependencies through this source
change.

## Repaired child boundary

Inner installer V3 keeps canonical V2's descriptor-relative install cleanup,
terminal publication behavior, and inert `--source-plan` function. It has no
module-level checkout-root resolution that would prevent startup through
`/proc/self/fd/<sealed-source>`.

Its repository reader uses policy
`private_metadata_pinned_objects_raw_checkout_v3`. The source-bound reader takes
its reference, index, and object snapshots into private temporary metadata;
authenticates raw commit, tree, and blob bytes; and compares tracked checkout
bytes and Git's owner-execute bit. Its subprocess operations are a closed set:
raw `cat-file --batch` object reads and two `ls-files` index/untracked enumerations.
The object command receives internally constructed full object IDs through a
pipe. Caller stdin is not passed through to Git. The private configuration and
closed child environment disable repository-supplied configuration, callbacks,
lazy fetching, and external protocols.

The inner V3 proof owns the repository regression fixtures. The native proof
binds that corrected source through its exact identity and checks its wrapper,
configuration, operation-vector, and owner-execute contracts. It does not claim
to execute a repository clean-filter callback as a test.

`--source-plan` retains the canonical inert reporting behavior. Actual host plan
and apply can create bounded temporary Git metadata and therefore report that
write capability. They do not authorize source-repository mutation or object
fetching. Reading existing files may affect access-time metadata according to
the filesystem's mount policy; this change makes no blanket zero-write or
zero-atime claim.

## What the native proof exercises

The proof first authenticates ten frozen inputs: the original inner V1, native
V1 and V2, accepted payload lock V1, runtime installer V2, historical bootstrap
lock V3, canonical inner V2, canonical native V3, canonical inner V2 terminal
proof, and canonical bootstrap lock V4. It verifies that applying the eight
declared generation substitutions to canonical C V3 reproduces C V4 exactly.
The frozen source and acceptance records are not rewritten.

The proof writes the exact real inner V3 bytes to a memfd, applies all four
required seals, verifies the retained bytes, and confirms that a write fails.
It then starts the actual child with isolated Python flags from that descriptor
using only `--source-plan`, in an empty temporary working directory. Exact inert
output and unchanged empty working-directory contents are required. This checks
real startup from a sealed source descriptor. It does not execute a real host
plan or apply, and that direct isolated Python check is not a claim of native
first-entry authority.

The native execution fixtures use a separate, uniquely created root-owned
fixture namespace under `/root` and a synthetic child with fixture-only paths.
They compile and execute the actual C V4 source with fixture identities. The
cases cover:

- A static ELF without `PT_INTERP` or dynamic `NEEDED` entries, individually
  mandatory compile definitions, and invalid-binding self-test rejection.
- Fixed-self path and root-custody rejection, including a copied executable and
  a group-writable fixed executable.
- Exact runtime HEAD forwarding for two valid values and rejection of empty,
  short, long, uppercase, and nonhex values before child startup.
- Caller stdin rejection, a closed child environment, exact plan/apply
  arguments, and rejection of both earlier V1/V2 confirmations and plan prefixes.
- Child substitution before startup, covering both incorrect size and an
  incorrect digest with the same size, plus Python policy digest mismatch.
- Continued execution from the sealed snapshot after visible child replacement,
  with the native parent withholding success for both plan and apply.
- Canonical truthful apply-failure reporting: once an apply child has started,
  a later hold reports an unknown or partial apply state instead of asserting
  that no apply occurred.

The complete proof needs a compiler with static linking support, Linux memfd and
AF_ALG support, and root or noninteractive sudo for that temporary native fixture.
Its fixture namespace is create-only and distinct from all production roots.
Only the synthetic child receives native plan/apply requests. A proof success
does not establish a customer's host state, installed acceptance, or operational
readiness.

## Remaining acceptance boundary

The following conclusions remain explicitly false in this proof:

```text
full_issue_3413_closure_proven=false
prechild_immutable_dependency_manifest_verified=false
private_parent_proof_verified=false
candidate_artifact_accepted=false
real_v3_installer_host_plan_executed=false
real_v3_installer_apply_executed=false
production_host_evidence_authority=false
```

The broader issue #3413 requires separate evidence for a complete immutable
prechild dependency manifest and private parent proof. Preserving canonical
bootstrap behavior does not add either mechanism. The cleanup fixtures also do
not establish closure against arbitrary concurrent filesystem mutation.

A subsequent release step must identify this exact native/child generation,
produce and evaluate its candidate evidence, record explicit acceptance, and
propagate the accepted identities through the active materializer and outer
installer path. Version names for those steps must be reconciled with their
current owners when that work is taken up. Existing locks and an older ELF are
not evidence that the repaired child has reached the operator path.

Nothing here grants launcher or binder execution, credential access, signing,
transaction submission, customer payment acceptance, public presale activation,
WC/VOID market activation, treasury liquidity action, or funds movement.
