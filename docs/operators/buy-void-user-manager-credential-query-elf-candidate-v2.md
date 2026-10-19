# Buy VOID authenticated credential-query ELF candidate v2

Marker: `VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_CANDIDATE_V2`.

Status: **hosted reproducible candidate generation only**.

This candidate compiles the accepted V2 credential-query successor introduced
at source parent `94e9c269041bf32872c3e97f4302314a9f70d2b7` while preserving the accepted V1 static preexec.

The V2 source contract raises the bounded complete drop-in set to 64 and models
a bounded set of at most 32 effective `LoadCredential` entries. Credential IDs
must be unique, every source path canonical absolute, and exactly one
`buy-void-epoch2-fulfiller-v1` binding must be present. Unrelated credentials
are allowed but retained in the full same-generation observation.

The three independent derive jobs must produce byte-identical:

- static preexec ELF;
- V2 credential-query ELF;
- candidate metadata JSON.

The disposable fixed-path test installs the V2 query bytes at the historical
fixed query pathname expected by the accepted static preexec, proves hostile
loader injection is blocked by the preexec boundary, and executes only the V2
self-test. It does not query the production host or read credential contents.

Authority remains false for candidate acceptance, protected replacement, live
query, credential-content access, signer/key access, service mutation,
transaction, public presale/WC activation, and funds movement.

PROTECT THE CORE.
