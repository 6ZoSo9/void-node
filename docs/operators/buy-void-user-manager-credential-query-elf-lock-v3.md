# Buy VOID authenticated credential-query ELF acceptance lock v3

Marker: `VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_LOCK_V3`.

Status: **source/CI acceptance of one exact repaired V3 authenticated
credential-query ELF plus the unchanged accepted V2 static preexec only**.

## Accepted candidate generation

This lock is a fresh successor to closed stale-generation Draft #3264.

Accepted candidate PR #3262:

`a8f133c7542491af1e48018e917f0cbcd73cf15f`

Candidate merge commit:

`2c7350f58faf2588c4c54f5657acd25c94e3c5d5`

Candidate source parent:

`6d8d0725a36d7907e4620371952aa71fd64696df`

Exact candidate proof Git blob:

`4caf5efbcf750e8ab8d687c75e26948f53662a99`

Exact candidate workflow Git blob:

`c0e00a0efe5b34a4b9637647194a3cb236d8e160`

## Hosted evidence

Accepted exact-head workflow run:

`38852664866`

Artifacts:

- lane a: `12025587886`;
- lane b: `12025533003`;
- lane c: `12025933150`.

The three hosted reports were byte-identical and the cross-job independently
rederived the complete native toolchain closure and both binaries.

Candidate ID:

`voidbuyumqcredelfcand3_b5c405437bd40582908e097a6f021bd575315d018a9d8457af6549458cbe0922`

Candidate report wire identity:

- bytes: 62,948;
- SHA-256:
  `4ec781f2fb9a8e6c84246c12d7634f895f93b1c5cbc7cda07ce655a4475b55b2`;
- Git blob:
  `8892892149203a027872034cbe4521c147d03e46`.

Accepted pair:

- unchanged V2 static preexec: 706,504 bytes, SHA-256
  `67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c`;
- V3 credential query: 47,160 bytes, SHA-256
  `d60e5719a4d785dbfaca90074ed3313ef9e0cae84c3f933af44d7faf84763923`.

## Complete provenance boundary

The predecessor #3264 lock is historical negative evidence because it accepted
the pair from a candidate generation that bound only the GCC driver and strip
identities.

This successor does not repeat that design.

The lock proof creates a disposable detached worktree at exact accepted
candidate head `a8f133c...` and executes the exact reviewed candidate proof
from Git blob `4caf5ef...`. The candidate proof itself binds:

- canonical cc, cc1, assembler, collect2, linker and strip bytes/SHA-256;
- GCC specs and search-directory identities;
- preprocessed translation units and compile objects for both native programs;
- ordered closed linker traces and exact regular-file/archive-member identities;
- exact accepted V2 preexec size/SHA-256 before candidate publication;
- two local builds per binary plus the hosted three-run independent comparison.

The lock proof then requires the newly rederived candidate report and both
ELFs to equal the hosted accepted wire identities above. It does not accept a
new contemporaneous candidate merely because several jobs agree.

The candidate report is content-addressed by the lock rather than duplicated as
a second mutable source artifact.

## Accepted semantics

V3 preserves the authenticated retained private-systemd-manager connection and
adds exact complete-set generation identities.

The accepted query requires:

- at most 64 canonical drop-in paths;
- at most 32 effective `LoadCredential` entries;
- unique credential IDs;
- exactly one Epoch-2 fulfiller credential;
- unrelated credentials allowed but included in the complete generation;
- SHA-256 identities for the canonical complete `DropInPaths` and
  `LoadCredential` metadata sets;
- two stable observations over the retained authenticated connection;
- credential contents never opened or read.

The predecessor V2 lock remains immutable evidence:

`voidbuyumqcredelflock2_c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54`

## Lock identity

`voidbuyumqcredelflock3_4b95342dadd37fb8e1a56ff62c36be226af1adb91c8577cdab2addc0f8e287f2`

The lock ID content-addresses the exact candidate head, proof/workflow blobs,
hosted run/artifact identities, candidate-report wire identity, both ELF
identities, complete-provenance requirements and all authority boundaries.

## Fixed-path hostile-loader reproof

Focused CI additionally reconstructs the exact accepted pair, checks both byte
identities, and uses a private mount namespace with a namespace-local
root-owned `/opt`.

A hostile `LD_PRELOAD` constructor must reach a direct invocation of the
dynamic query, but must not cross the accepted static preexec. Host `/opt`
identity is recorded before and after and must remain unchanged.

This is disposable proof infrastructure only.

## Authority

This lock accepts binary/evidence identity only:

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

No protected replacement, live query, credential-content read, private-key or
signer access, service/systemd mutation, transaction, presale/WC activation,
treasury/liquidity action or funds movement is authorized.

The next gate is the separately reviewed
`void_buy_void_user_manager_credential_query_protected_replacement_v3`
generation.

PROTECT THE CORE.
