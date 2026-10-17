# Buy VOID Epoch-2 dormant first-entry bootstrap V4 materializer V1

Marker: `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V4_MATERIALIZER_V1`.

Status: **source/CI artifact publication only**.

## Purpose

Materialize the exact V4 static bootstrap ELF accepted by lock:

`voidbuye2dormantbootstraplock1_ffd5e877b4bf594b7af4eac3f03fd7b846686949febcae54318ef08ee5793796`

and pair it with the exact immutable source-generation manifest needed by the future protected bootstrap installation.

## Published identities

Bootstrap ELF:

- file: `void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v4`;
- bytes: `839416`;
- SHA-256:
  `a4605ab39da0a37afe8ef7f6084b93f542a57dcbe8c3c9433c47481cb21c7ce3`;
- artifact mode: `0555`.

Source-generation manifest:

- file: `source-generation-v1.conf`;
- bytes: `2380`;
- SHA-256:
  `435345cd442c4d59760984c3445d178461cbbf163a0a53e760a392ca2d0bae77`;
- artifact mode: `0444`.

The materializer verifies the accepted lock and candidate-tool Git blobs before executing the candidate derivation code. It rederives the ELF and rejects any bytes/size mismatch with the accepted identity.

## Host policy deliberately excluded

The future installed V4 root also requires `policy-v1.conf`, but that policy binds the actual protected host generations of:

- `/usr/bin/python3`;
- `/usr/bin/git`.

Therefore the hosted artifact does **not** manufacture a host policy. A later Precision plan must derive that policy from the host's exact root-custodied tools and bind it into a separately reviewed create-only install.

## Publication

Hosted CI publishes:

- accepted V4 ELF;
- exact source-generation manifest;
- SHA256SUMS;
- materializer receipt.

The artifact is a handoff convenience only. A future host installer must independently verify every byte and the accepted lock before publication.

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
