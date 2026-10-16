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

- unchanged accepted static preexec ELF;
- V3 credential-query ELF;
- V3 candidate metadata JSON.

The fixed-path hostile-loader test runs only inside a disposable private mount
namespace. It mounts a root-owned tmpfs over namespace-local `/opt`, installs
the candidate pair at the historical fixed paths required by the accepted
preexec, proves a hostile loader constructor reaches the direct dynamic query,
then proves the static preexec strips that loader influence before executing
the V3 query self-test. The host `/opt` metadata and contents are never
modified by this candidate workflow.

Candidate metadata binds:

- V2 accepted lock as predecessor identity;
- exact V3 source/proof Git blobs;
- unchanged peer-guard and static-preexec source/proof blobs;
- exact stripped preexec/query SHA-256 and byte lengths;
- exact compiler and strip binary SHA-256;
- 64-drop-in and 32-credential bounds;
- complete-set SHA-256 emission and cross-query generation-binding capability.

Authority remains false for candidate acceptance, protected replacement,
live query, credential-content access, signer/key access, service/systemd
mutation, transaction, public presale/WC activation, treasury/liquidity, and
funds movement.

A separate exact acceptance lock must consume byte-identical hosted V3
artifacts before any replacement generation can be reviewed.

PROTECT THE CORE.
