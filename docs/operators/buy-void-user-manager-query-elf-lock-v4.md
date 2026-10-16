# Buy VOID user-manager query ELF acceptance lock v4

Marker: `VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_LOCK_V4`.

Status: **source/CI acceptance of the canonical #3101 PrivateUsers-bound ELF pair only**.

## Accepted candidate

Parent candidate: Draft #3117 exact head

`12cec975bc560ebd90c430732261c1b98c4af1d2`.

Hosted derivation run `38749311537` completed all three independent derive jobs and the cross-job equality gate.

Artifacts:

- slot a: `11980875596`;
- slot b: `11979773954`;
- slot c: `11980940884`.

Accepted identities:

- canonical source parent `1f46c16d272f7eb1917719f1f0c17d7cf398819e`;
- peer source blob `d8b30ac499c3bb8a5d223dbc6be687dd175be611`;
- static preexec source blob `f0fbfaae97df3294097a281100f06ada2ef157ff`;
- repaired query source blob `6aefc385bcc4212d3c45e36871bfde0da3529baa`;
- static preexec: 706504 bytes, SHA-256 `8963c77f02c83c04c386912525b7c6177a6ef99507c7f85113c8b7c74e245c11`;
- query: 43064 bytes, SHA-256 `e8df6ed33ed798e2e3015f7c9a8a3548031049eb1867029e35e3e20953aeed56`;
- candidate metadata: 1192 bytes, SHA-256 `8c0cdaa52e62c1ecccdbf6707264133cac46e44eac24a4f07214c7289b1394cf`, Git blob `988542122028843b2848063dbbaf7a94c32d6cd4`;
- compiler SHA-256 `1b99826121ae6682a634e5efe09bd3e3df58ce58e0b28f849114ab5b89139c26`;
- strip SHA-256 `0d980587ada7ab12193f39271f060d5663aa2f289b0e80d2a0274ce7306e4e42`.

Historical canonical V2 lock `voidbuyumqelflock2_fa3cd31d2ba07c17daeb0dcea725dc72ad461af0afc6e336079be25b34e2b89c` remains frozen predecessor evidence.

## Security contract

This candidate preserves:

- accepted user-manager reexec/deserialization argv closure;
- authenticated retained private-manager connection;
- systemd `NoNewPrivileges=true`;
- systemd `PrivateUsers=false`;
- systemd ambient capabilities zero;
- kernel `NoNewPrivs=1`;
- kernel non-bounding capability sets zero;
- exact kernel CapBnd ↔ authenticated systemd CapabilityBoundingSet equality;
- service/manager generation, pidfd, cgroup, executable and post-query security revalidation.

## Lock identity

`voidbuyumqelflock4_846047629dd2dd58f73f926d85cddde5b0a1510493d59a2d7ef778d235a70301`

Node 22, 24 and 26 independently recompile/strip the exact source pair, check compiler/strip identities, execute the query self-test and require byte-identical lock JSON.

## Authority

The lock accepts only the binary identity:

- `candidate_accepted=true`;
- `install_authorized=false`;
- `live_query_authorized=false`;
- `protected_install_performed=false`;
- `production_host_evidence_authority=false`;
- `payment_acceptance=false`;
- `public_presale_activation=false`;
- `funds_movement=false`.

A later protected replacement/live-query lane must explicitly consume this exact lock. This PR performs no host/service/systemd mutation and no live query.

PROTECT THE CORE.
