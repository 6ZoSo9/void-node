# Buy VOID authenticated credential-query ELF acceptance lock v2

Marker: `VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_LOCK_V2`.

Status: **source/CI acceptance of one exact V2 authenticated credential-query
ELF plus the unchanged accepted static preexec only**.

## Hosted candidate evidence

Candidate PR head:

`293da4c552a27de3b8fa548e1becebb9a76f0baa` (#3251).

Hosted derivation run:

`38846795162`.

Artifacts:

- slot a: `12023208599`;
- slot b: `12023039735`;
- slot c: `12022969763`.

All three derive jobs and the independent cross-job byte comparison were GREEN.

Accepted binary identities:

- unchanged static preexec: 706,504 bytes, SHA-256
  `67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c`;
- V2 credential query: 47,160 bytes, SHA-256
  `af02d006176db1a16eee52625751736c63af3bd1b250b46f81f200359fb48718`.

The candidate metadata is committed byte-exact at
`ops/security/buy-void-user-manager-credential-query-elf-candidate-v2.json`: 1,783 bytes, SHA-256
`ae4e17d0c6874c35378a10cfd3803777d25acb0cbead25767ce3ab2734259949`,
Git blob `e193d74abbd7c55a792c6a82280a6a0382a8a719`.

## Accepted V2 semantics

The accepted query remains bounded and fail-closed:

- maximum 64 canonical drop-in paths;
- maximum 32 effective `LoadCredential` entries;
- all observed credential IDs unique;
- all observed credential source paths canonical absolute;
- exactly one `buy-void-epoch2-fulfiller-v1` credential;
- exactly one Epoch-2 credential drop-in;
- unrelated credentials are allowed but retained in the complete
  same-generation comparison;
- credential contents are never opened or read.

This accepts the composed Precision unit shape without weakening the target
Epoch-2 credential requirement.

## Lock identity

`voidbuyumqcredelflock2_c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54`

The lock proof independently pins all source/proof/workflow blobs, rederives the
exact candidate metadata, rebuilds and strips both binaries using the hosted
compiler/strip identities, executes the V2 self-test, and deterministically
rederives this lock.

## Hosted hostile-loader isolation

The fixed-path hostile-loader adversary is proof infrastructure, not a host
installation. The hosted workflow therefore does not normalize or rewrite the
runner's pre-existing `/opt`.

Before privileged proof setup it requires host `/opt` to be a direct
directory and records its device, inode, UID, GID, and mode. The actual
`/opt/void-buy-void-user-manager-credential-query-v1` fixture is created only
inside a root private mount namespace after mount propagation is made private
and a fresh root-owned mode-0755 tmpfs is mounted at namespace-local `/opt`.

The direct poisoned V2 query and the static-preexec hostile-loader test execute
inside that namespace against the accepted binary hashes. When the namespace
exits, the workflow requires the host `/opt` device/inode/UID/GID/mode tuple
to equal the read-only preflight and requires the fixed fixture path to remain
absent from the host namespace.

There is no host `chmod`/chown, no bind/replacement of host `/opt`, and no
best-effort restoration path whose success is needed to preserve runner
ancestry.

## Authority

This lock accepts binary identity only:

- `candidate_accepted=true`;
- `replacement_authorized=false`;
- `live_query_authorized=false`;
- `credential_contents_read=false`;
- `production_host_evidence_authority=false`;
- `payment_acceptance=false`;
- `public_presale_activation=false`;
- `transaction=false`;
- `funds_movement=false`.

No Precision protected replacement, live credential query, credential-content
read, private-key/signer access, service/systemd mutation, transaction,
presale/WC activation, or funds movement is authorized.

The next gate is a separately reviewed protected replacement plan that preserves
the installed V1 query as predecessor evidence and consumes this exact lock.

PROTECT THE CORE.
