# Buy VOID authenticated credential-query ELF acceptance lock v3

Marker: `VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_LOCK_V3`.

Status: **source/CI acceptance of one exact V3 authenticated credential-query
ELF plus the unchanged accepted static preexec only**.

## Hosted candidate evidence

Candidate PR #3262 exact head:

`33ee23d70bac9c7f315cd1ddf76204ea4580e260`.

Hosted derivation run:

`38850709119`.

Artifacts:

- slot a: `12025225996`;
- slot b: `12025725090`;
- slot c: `12025660396`.

All three derive jobs and the independent cross-job byte comparison were GREEN.

Accepted binary identities:

- unchanged static preexec: 706,504 bytes, SHA-256
  `67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c`;
- V3 credential query: 47,160 bytes, SHA-256
  `d60e5719a4d785dbfaca90074ed3313ef9e0cae84c3f933af44d7faf84763923`.

Candidate metadata is committed byte-exact at
`ops/security/buy-void-user-manager-credential-query-elf-candidate-v3.json`:
1,953 bytes, SHA-256
`41d7c91ac9ff66e28892a71839bef892b36719ff50b7e8f4a980f4426f786ac6`,
Git blob `f3a2a625d539543d1864fe8eb43cf85c6ce6d95f`.

## Accepted V3 semantics

V3 preserves the accepted V2 authenticated private-manager connection and
bounded complete metadata observations while adding exact generation identities
for the complete unrelated metadata sets.

The query requires:

- maximum 64 canonical drop-in paths;
- maximum 32 effective `LoadCredential` entries;
- unique credential IDs;
- canonical absolute credential source paths;
- exactly one `buy-void-epoch2-fulfiller-v1` credential;
- exactly one Epoch-2 credential drop-in;
- unrelated credentials allowed but retained in the complete generation;
- two stable observations over one retained authenticated manager connection;
- SHA-256 of the exact canonical complete `DropInPaths` bytes;
- SHA-256 of the exact canonical complete `LoadCredential` metadata bytes;
- credential contents never opened or read.

Those complete-set hashes close equal-count/equal-byte-length unrelated metadata
substitution without exposing unrelated credential contents.

## Lock identity

`voidbuyumqcredelflock3_cff58f9fa4093d55899cde3e79b8d9a550c6e3479e27c3bd7f17b04ead688763`

The lock proof independently pins V3 source/proof/workflow blobs, requires the
exact hosted candidate bytes, rebuilds and strips the preexec/query using the
hosted compiler/strip identities, executes the V3 self-test, and
content-addresses the accepted lock.

The V2 lock remains immutable predecessor evidence:

`voidbuyumqcredelflock2_c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54`.

## Hosted hostile-loader isolation

The fixed-path adversary is proof infrastructure only.

The workflow records the host `/opt` identity read-only, creates a private
mount namespace, makes propagation private, mounts a root-owned tmpfs at the
namespace-local `/opt`, and installs the accepted V3 pair there.

A hostile loader constructor must reach the direct dynamic query but must not
cross the accepted static preexec. The preexec child must emit the V3 self-test
including both complete-set hash capability markers.

After the namespace exits, the host `/opt` identity must be unchanged and the
fixed fixture path must remain absent in the host namespace.

## Authority

This lock accepts binary identity only:

- `candidate_accepted=true`;
- `replacement_authorized=false`;
- `live_query_authorized=false`;
- `credential_contents_read=false`;
- `production_host_evidence_authority=false`;
- `payment_acceptance=false`;
- `public_presale_activation=false`;
- `wc_void_market_activation=false`;
- `transaction=false`;
- `funds_movement=false`.

No Precision protected replacement, live query, credential-content read,
private-key/signer access, service/systemd mutation, transaction, presale/WC
activation, treasury/liquidity action, or funds movement is authorized.

The next gate is a separately reviewed V3 protected replacement generation that
preserves V2/V1 predecessor evidence and consumes this exact lock.

PROTECT THE CORE.
