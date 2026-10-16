# Buy VOID authenticated credential-query ELF candidate v3

Marker: `VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_CANDIDATE_V3`.

Status: **hosted reproducible candidate generation only**.

This candidate compiles the reviewed V3 credential-query successor at source
parent `e5e40a09db4877665567b6897e36aed90d8de7cb` while preserving the accepted
static preexec and the accepted V2 lock as predecessor evidence.

V3 preserves the accepted V2 bounds and target requirements:

- maximum 64 canonical drop-in paths;
- maximum 32 effective `LoadCredential` entries;
- unique credential IDs;
- exactly one `buy-void-epoch2-fulfiller-v1` binding;
- unrelated credentials allowed and retained in the complete stable set;
- credential contents never opened or read.

V3 adds SHA-256 identities for the complete canonical `DropInPaths` and
`LoadCredential` metadata sets. Those identities allow a later double-query
qualifier to bind the complete metadata generation across native query
invocations without printing unrelated credential IDs or source paths.

The three independent derive jobs must produce byte-identical:

- unchanged static preexec ELF;
- V3 credential-query ELF;
- candidate metadata JSON.

The hostile-loader proof runs only inside a root private mount namespace. A
fresh tmpfs is mounted at namespace-local `/opt`; the historical fixed-path
fixture is created only there. The workflow verifies the host namespace's
`/opt` device/inode/UID/GID/mode tuple is unchanged and verifies the fixed
fixture path is absent after the namespace exits.

The fixed-path test proves the direct dynamic query remains vulnerable to the
hostile loader while the accepted static preexec removes that loader influence
before dispatching the V3 self-test. It does not execute a production query and
does not inspect any production credential source.

Authority remains false for candidate acceptance, protected replacement, live
query, credential-content access, signer/key access, service/systemd mutation,
payment acceptance, transaction, public presale/WC activation, and funds
movement.

A GREEN candidate only supplies deterministic hosted binary evidence for a
separate V3 acceptance-lock review.

PROTECT THE CORE.
