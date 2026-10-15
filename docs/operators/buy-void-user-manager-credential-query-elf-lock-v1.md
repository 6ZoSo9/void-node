# Buy VOID authenticated credential-query ELF acceptance lock v1

Marker: `VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_LOCK_V1`.

Status: **source/CI acceptance of one exact authenticated credential-query + static-preexec ELF pair only**.

## Hosted candidate evidence

Candidate head:

`bd9526032a926bcd4ede09b6ad1c8a26ca415b46` (#3157).

Hosted derivation run:

`38779415675`.

Artifacts:

- slot a: `11995740384`;
- slot b: `11995087368`;
- slot c: `11994932598`.

All three derive jobs and the independent cross-job byte comparison are GREEN.

Accepted source generation:

- source parent: `a44308f094bc67841da2a7ce3eb22c36782318fe`;
- private-manager peer guard: `d8b30ac499c3bb8a5d223dbc6be687dd175be611`;
- credential-query source: `e12e0b16df6e6eb5fd912a6dbf6ae970673246f9`;
- credential-query proof: `ec3803e766fd679eb53c84cc0b3d7069e33c2932`;
- static credential-preexec source: `0ccd2d07a951389d85a9fc56ec892a774d9dd681`;
- static credential-preexec proof: `58df08ca966f4629893c3885f1df37c837762520`;
- candidate workflow: `4f4559234d6418c9a97c5743cdf813a6530e3d2c`.

Accepted binary identities:

- static preexec: 706,504 bytes, SHA-256
  `67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c`;
- credential query: 43,064 bytes, SHA-256
  `7b968a20f1507215477f43a59c5d82b9e9adca918ce5f2df566292d8380b4cb1`;
- compiler SHA-256:
  `1b99826121ae6682a634e5efe09bd3e3df58ce58e0b28f849114ab5b89139c26`;
- strip SHA-256:
  `0d980587ada7ab12193f39271f060d5663aa2f289b0e80d2a0274ce7306e4e42`.

Candidate metadata is committed byte-exact at:

`ops/security/buy-void-user-manager-credential-query-elf-candidate-v1.json`

with 1,478 bytes, SHA-256
`dabc9fb5e5fca1717ceb8f86b59174930a719ee3f52f64b2af244bcd139a023a`,
and Git blob
`beedebce690b8ed26422f3bc579f90d6d1405936`.

## Acceptance proof

The lock proof independently:

- requires canonical #3157 candidate ancestry and a five-file lock-only delta;
- pins every credential-query/preexec source and proof blob;
- pins the exact candidate workflow and candidate metadata;
- requires the hosted compiler and strip identities;
- recompiles and strips both binaries from exact source;
- requires the exact hosted bytes and SHA-256 identities;
- executes the credential-query self-test with the reviewed sanitized marker;
- recomputes the candidate metadata content address;
- deterministically rederives the lock JSON and lock ID.

The focused lock workflow additionally repeats the fixed-path hostile-loader test.
A direct dynamic query launched with the test `LD_PRELOAD` must execute the
sentinel and fail. The static preexec must block that caller loader injection,
execute the retained fixed-path query descriptor, and preserve
`credential_contents_read=false`.

## Lock identity

`voidbuyumqcredelflock1_65a1839c14b692349dda8cccdbe8657a9485754c5d10ffa5b57421ce87e3753c`

Node 22, 24 and 26 independently rederive the lock and must produce byte-identical
lock JSON.

## Authority

This lock accepts binary identity only:

- `candidate_accepted=true`;
- `install_authorized=false`;
- `live_query_authorized=false`;
- `credential_contents_read=false`;
- `complete_host_evidence_collector=false`;
- `production_host_evidence_authority=false`;
- `payment_acceptance=false`;
- `public_presale_activation=false`;
- `transaction=false`;
- `funds_movement=false`.

No Precision installation, protected replacement, service/systemd mutation, live
credential query, credential-content read, wallet/signer access, transaction,
WC/presale activation, treasury/liquidity action or funds movement is authorized.

The next gate is a separately reviewed protected create-only/replacement installer
that consumes this exact lock and retains the existing fixed trust-root boundary.

PROTECT THE CORE.
