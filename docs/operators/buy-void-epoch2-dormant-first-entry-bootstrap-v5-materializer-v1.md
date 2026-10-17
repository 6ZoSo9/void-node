# Buy VOID Epoch-2 dormant first-entry bootstrap V5 materializer V1

Marker: `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V5_MATERIALIZER_V1`.

Status: **source/CI artifact publication only**.

## Purpose

Materialize the exact V5 static bootstrap ELF accepted by lock:

`voidbuye2dormantbootstraplock2_f2e419eb1643989a4b881b2d817ff097eff9d68d6d763a933d624301a93930e3`

and pair it with the exact immutable source-generation manifest needed by the future protected bootstrap installation.

## Published identities

Bootstrap ELF:

- file: `void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v5`;
- bytes: `874600`;
- SHA-256:
  `4392f1aa3e35edf4e347fd81c15c9b1ba0810c71111f4e96dafcbf2e1cb52374`;
- artifact mode: `0555`.

Source-generation manifest:

- file: `source-generation-v2.conf`;
- bytes: `2382`;
- SHA-256:
  `3ab7f9b6e23c6fd2fe82486fd2a396c3bd207e335675e6c5bfe58776ab99d6ff`;
- artifact mode: `0444`.

The materializer verifies the accepted lock and candidate-tool Git blobs before executing the candidate derivation code. It rederives the ELF and rejects any bytes/size mismatch with the accepted identity.

## Host policy deliberately excluded

The future installed V5 bootstrap root also requires `policy-v1.conf`, but that policy binds the actual protected host generations of:

- `/usr/bin/python3`;
- `/usr/bin/git`.

Therefore the hosted artifact does **not** manufacture a host policy. A later Precision plan must derive that policy from the host's exact root-custodied tools and bind it into a separately reviewed create-only install.

## Publication

Hosted CI publishes:

- accepted V5 ELF;
- exact source-generation manifest;
- SHA256SUMS;
- materializer receipt.

The artifact is a handoff convenience only. A future host installer must independently verify every byte, the repaired V2 source-generation identity, and the accepted V5 lock before publication.

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
