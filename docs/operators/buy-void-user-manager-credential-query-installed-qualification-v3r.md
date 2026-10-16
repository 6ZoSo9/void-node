# Buy VOID credential-query V3R installed qualification v1

Marker:

`VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V3R`.

Status: **read-only installed-state qualification source; live run remains
separately authorized**.

## Purpose

The protected V2→V3R replacement source names
`V3_INSTALLED_READ_ONLY_QUALIFICATION` as its next gate.

This qualifier closes that source gap without granting replacement or live-query
authority.

It consumes exact reviewed generations:
- V3R replacement source blob
  `98f8b9fda89e33c50e19008268d97655aad54e6d` (post-merge PRE_MUTATION authority/flush repair);
- V3R lock
  `voidbuyumqcredelflock3r_8b064214e22ce54ac193b426f38b9d6a7ea4cee07b38b68c8d1eeb6c51de6f34`;
- V6 security qualifier source blob
  `83bfd3f3baf5c9d2a9e21852b0f752f27d7749bc`.

## Installed V3R state

A future root run requires exact protected state:

`CREDENTIAL_QUERY_V3_GREEN_WITH_V1_V2_PREDECESSORS`.

Before, between and after live observations it verifies:
- unchanged static credential preexec;
- exact V3R dynamic credential query
  SHA-256 `d60e5719a4d785dbfaca90074ed3313ef9e0cae84c3f933af44d7faf84763923`;
- exact V1 predecessor;
- exact V2 predecessor;
- root ownership, mode 0555, single links, byte counts, SHA-256 and stable inode
  metadata for all four files.

## V3 credential transcript

The fixed preexec is executed twice.

Each native V3 transcript must prove:
- authenticated private user-manager peer;
- same retained private connection;
- public user bus unused;
- loaded/active/running service;
- stable MainPID and service/manager generations;
- NeedDaemonReload=no;
- bounded complete DropInPaths set:
  - at most 64 entries;
  - at most 64 KiB canonical bytes;
  - exactly one reviewed Epoch-2 drop-in;
  - complete-set SHA-256 emitted;
- bounded complete LoadCredential set:
  - at most 32 credentials;
  - at most 64 KiB canonical bytes;
  - unique credential IDs;
  - exactly one
    `buy-void-epoch2-fulfiller-v1`;
  - unrelated reviewed credentials allowed;
  - complete-set SHA-256 emitted;
- credential contents never read.

Both complete native transcripts must be identical, which binds the complete
DropInPaths and LoadCredential set hashes across the qualification window.

## V6 composition

The qualifier also executes the merged V6 read-only security qualification.

Credential and V6 observations must identify the same:
- runtime UID;
- authenticated user-manager PID;
- manager start ticks;
- service MainPID;
- service start ticks.

V6 must independently retain:
- authenticated private manager authority;
- stable protected V6 generation;
- PrivateUsers=false;
- zero active kernel capabilities;
- stable cap_last_cap projection;
- configured/kernel bounding-set equality;
- stable double query.

## Authority

Hosted CI runs only:
- syntax/proof;
- self-test;
- inert `--plan`.

A future live run remains separately authorized.

Even a GREEN run keeps:
- `credential_contents_read=false`;
- `host_mutation=false`;
- `service_mutation=false`;
- `systemd_mutation=false`;
- `private_key_access=false`;
- `wallet_or_signer_access=false`;
- `payment_acceptance=false`;
- `transaction=false`;
- `public_presale_activation=false`;
- `wc_void_market_activation=false`;
- `funds_movement=false`;
- `production_host_evidence_authority=false`.

Next source gate after a future GREEN live run:

`BIND_V3R_AUTHENTICATED_CREDENTIAL_METADATA_IN_EPOCH2_LIVE_COMPOSITION_SUCCESSOR`.

PROTECT THE CORE.
