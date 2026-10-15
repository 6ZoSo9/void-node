# Buy VOID user-manager query ELF acceptance lock v1

Marker: `VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_LOCK_V1`.

Status: **source/CI acceptance of one exact executed ELF pair only**.

## Accepted candidate

Parent candidate: #3047 exact head
`ead116e22e1bb70b06a8b96ae727d1b1a911fd57`.

Hosted run `38676947271` produced exact-byte-identical metadata and binaries
across independent slots a/b/c. The exact stripped candidate pair was executed
through the fixed-path LD_PRELOAD adversary before its hashes were published.

Accepted identities:

- preexec source blob `f0fbfaae97df3294097a281100f06ada2ef157ff`;
- query source blob `ad49cd7f71c41e0f559a561b5a62a00cec60c215`;
- embedded peer source blob `cab88f4642ab929d1f7a4d2f1511462a94ef34ca`;
- static preexec SHA-256 `8963c77f02c83c04c386912525b7c6177a6ef99507c7f85113c8b7c74e245c11`, 706504 bytes;
- query SHA-256 `98fb0de18c7e2acc133db38f15036acc8345f503b2dd196cc07193523dd0a435`, 34872 bytes;
- compiler SHA-256 `1b99826121ae6682a634e5efe09bd3e3df58ce58e0b28f849114ab5b89139c26`;
- strip-tool SHA-256 `0d980587ada7ab12193f39271f060d5663aa2f289b0e80d2a0274ce7306e4e42`.

Hosted artifact IDs:
- a `11946183568`;
- b `11945674523`;
- c `11946183573`.

The exact hosted metadata is retained as
`ops/security/buy-void-user-manager-query-elf-candidate-v1.json` with
SHA-256 `a39ba5b63cba844f1fbb382041a59a51139e066c8b76ff10f59ac61455ae2776`
and Git blob `1ac068dab592afa923b51434e87bc13b01966246`.

## Independent lock proof

The lock proof pins the candidate workflow/source blobs, re-compiles both
binaries with the exact accepted compiler/strip identities, rechecks byte
length/SHA-256 and static no-interpreter status, runs the dynamic query
self-test under the fixed sanitizer environment, and requires the committed
candidate/lock bytes to match the derived values exactly.

Node 22/24/26 must derive byte-identical lock JSON.

## Lock identity

`voidbuyumqelflock1_0b0b791995f7a3346c3562387e211e9e2bb54ca6a050a964950e70a0e4cd1a16`

## Authority boundary

The lock accepts only the binary identity. It does not install those binaries,
authorize replacement of any `/opt` path, run the live collector, mutate
systemd/Polkit/request roots, or grant economic authority.

`candidate_accepted=true`

`install_authorized=false`

`protected_install_performed=false`

`complete_host_evidence_collector=false`

`production_host_evidence_authority=false`

`payment_acceptance=false`

`public_presale_activation=false`

`funds_movement=false`

A separate guarded install/collector integration must consume this exact lock.
