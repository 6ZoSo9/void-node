# Buy VOID authenticated credential-query ELF candidate v3

Marker: `VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_CANDIDATE_V3`.

Status: **hosted reproducible candidate generation only**.

This successor is stacked on accepted V3 source head
`6d8d0725a36d7907e4620371952aa71fd64696df`.

V3 preserves the accepted authenticated private user-manager transport, static
preexec, bounded complete metadata-set observations, unique credential IDs, and
exactly one Epoch-2 credential/drop-in. It adds SHA-256 identities for the exact
canonical complete `DropInPaths` and `LoadCredential` metadata byte strings so
later double-query evidence can detect equal-count/equal-length unrelated
metadata substitution.

The three independent derive jobs must produce byte-identical:

- the **exact accepted V2 static preexec ELF** (706,504 bytes, SHA-256
  `67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c`);
- V3 credential-query ELF;
- V3 complete-provenance candidate metadata JSON.

The candidate deriver does not treat the GCC driver hash as complete build
provenance. It binds the complete executed native toolchain generation used by
both binaries:

- canonical `cc`, `cc1`, assembler, `collect2`, linker and `strip`
  paths, byte lengths and SHA-256 values;
- GCC specs and search-directory identities;
- separately for preexec and query, the preprocessed translation unit and
  compiled object identities;
- a closed `ld -t -t` input grammar that binds every accepted absolute input
  file plus archive/member records;
- normalized raw linker-trace byte length and SHA-256, preserving record order
  and duplicates while replacing only the disposable candidate-object path;
- exact final stripped ELF bytes and SHA-256.

Unknown nonempty linker-trace records, unreadable/non-regular inputs, toolchain
drift, or preexec predecessor-byte drift HOLD candidate derivation.

The fixed-path hostile-loader test runs only inside a disposable private mount
namespace. It mounts a root-owned tmpfs over namespace-local `/opt`, installs
the candidate pair at the historical fixed paths required by the accepted
preexec, proves a hostile loader constructor reaches the direct dynamic query,
then proves the static preexec strips that loader influence before executing
the V3 query self-test. The host `/opt` metadata and contents are never
modified by this candidate workflow.

Candidate metadata binds:

- V2 accepted lock as predecessor identity;
- exact V3 source/proof Git blobs and the exact candidate workflow/deriver
  generation;
- unchanged peer-guard and static-preexec source/proof blobs;
- the exact V2 predecessor preexec identity and a positive
  `preexec_predecessor_identity_required` gate;
- complete native toolchain closure plus distinct preexec/query build closures;
- exact stripped preexec/query SHA-256 and byte lengths;
- 64-drop-in and 32-credential bounds;
- complete-set SHA-256 emission and cross-query generation-binding capability.

The independent compare job checks out the exact candidate head, downloads all
three hosted artifacts outside the repository worktree, **rebuilds both ELFs and
both toolchain closures from scratch**, and requires the complete hosted report
and binary bytes to equal that independent rederivation. A three-way `cmp`
without rederivation is not accepted as provenance evidence.

Authority remains false for candidate acceptance, protected replacement,
live query, credential-content access, signer/key access, service/systemd
mutation, transaction, public presale/WC activation, treasury/liquidity, and
funds movement.

A separate exact acceptance lock must consume byte-identical hosted V3
artifacts before any replacement generation can be reviewed.

PROTECT THE CORE.
