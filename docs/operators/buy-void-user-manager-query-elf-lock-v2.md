# Buy VOID user-manager query ELF acceptance lock v2

Marker: `VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_LOCK_V2`.

Status: **source/CI acceptance of the exact post-reexec-selector ELF pair only**.

## Reason for a new generation

Precision live evidence selected the real user manager PID 2693 with the exact
root-owned systemd executable, UID/GID 1000, init.scope cgroup and PPid 1, but
its normal daemon-reexec argv was:

`/usr/lib/systemd/systemd --user --deserialize=44`

#3084 repairs only that closed argv boundary. Because the private-peer source is
embedded into the dynamic unit-query binary, the historical V1 ELF lock cannot
be silently repinned.

## Hosted candidate

Parent: #3084 exact head
`6619131d424e4e8e1f589da16e57b454dad7950c`.

Hosted run `38735005407` produced byte-identical candidate outputs in slots
a/b/c and retained the existing fixed-path LD_PRELOAD adversary.

Artifacts:
- a `11973295334`
- b `11972720683`
- c `11973455270`

Exact identities:
- peer source blob `d8b30ac499c3bb8a5d223dbc6be687dd175be611`;
- preexec unchanged: 706504 bytes, SHA-256
  `8963c77f02c83c04c386912525b7c6177a6ef99507c7f85113c8b7c74e245c11`;
- query: 38968 bytes, SHA-256
  `3b0e03ab00f3e763e9e8525e2a732a6b43cf4e02bb8c72b3aae06d9097c54b3f`.

The exact hosted candidate metadata is retained at
`ops/security/buy-void-user-manager-query-elf-candidate-v2.json`.

## Independent acceptance

Node 22/24/26 each recompile and strip the exact sources with the pinned
compiler/strip identities, require the static preexec to remain no-PT_INTERP,
run the dynamic query self-test under the sanitized loader environment, and
derive the exact committed lock bytes.

V1 remains frozen as predecessor evidence.

## Lock

`voidbuyumqelflock2_fa3cd31d2ba07c17daeb0dcea725dc72ad461af0afc6e336079be25b34e2b89c`

## Authority

Only the candidate identity is accepted.

`candidate_accepted=true`

Still false:
`install_authorized`,
`protected_install_performed`,
`production_host_evidence_authority`,
`payment_acceptance`,
`public_presale_activation`,
`funds_movement`.

A separately reviewed protected-install successor must consume this V2 lock.
The currently installed V1 pair is not replaced by this PR.

PROTECT THE CORE.
