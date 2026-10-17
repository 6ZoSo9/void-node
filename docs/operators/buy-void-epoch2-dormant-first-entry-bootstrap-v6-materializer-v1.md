# Buy VOID Epoch-2 dormant first-entry bootstrap V6 materializer V1

Marker: `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_MATERIALIZER_V1`.

Status: **source/CI artifact publication only**.

## Purpose

Materialize the exact V6 static bootstrap ELF accepted by lock:

`voidbuye2dormantbootstraplock3_5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b`

and pair it with the exact immutable source-generation manifest needed by the future protected bootstrap installation.

## Published identities

Bootstrap ELF:

- file: `void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6`;
- bytes: `874608`;
- SHA-256:
  `c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b`;
- artifact mode: `0555`.

Source-generation manifest:

- file: `source-generation-v3.conf`;
- bytes: `2382`;
- SHA-256:
  `aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662`;
- artifact mode: `0444`.

The materializer verifies the accepted lock and candidate-tool Git blobs before executing the candidate derivation code. It also verifies source-generation V3's exact inner-installer V5 Git blob `ce6930bc1be8239a3171d4922c44b96a50f5778b`. It rederives the ELF and rejects any bytes/size mismatch with the accepted identity.

The accepted V6 lock also binds the descriptor-independent build contract:
- compiler logical source name is `stdin`;
- distinct sealed-source FD numbers were exercised;
- descriptor number is not candidate identity;
- the distinct-FD builds are byte-identical.

The materializer rechecks those fields and requires ELF Git-blob identity
`a91707c3e5803071fc73c3451c9bcb3b774f8b48` before publishing any artifact bytes.

## Host policy deliberately excluded

The future installed V5 bootstrap root also requires `policy-v1.conf`, but that policy binds the actual protected host generations of:

- `/usr/bin/python3`;
- `/usr/bin/git`.

Therefore the hosted artifact does **not** manufacture a host policy. A later Precision plan must derive that policy from the host's exact root-custodied tools and bind it into a separately reviewed create-only install.

## Publication

Hosted CI publishes:

- accepted V6 ELF;
- exact source-generation manifest;
- SHA256SUMS;
- materializer receipt.

The artifact is a handoff convenience only. A future host installer must independently verify every byte, the source-generation V3 identity, and the accepted V6 lock before publication.

## Authority

Still false:

- protected install;
- bootstrap execution;
- inner installer execution/apply;
- credential/private-key access;
- signing;
- transaction/RPC;
- payment acceptance;
- public presale/WC activation;
- treasury/liquidity action;
- production-host evidence authority;
- funds movement.

No `/opt` write occurs in this lane.

PROTECT THE CORE.
