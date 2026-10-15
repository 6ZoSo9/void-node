# Apollyon training materials create-only install v1

Marker: `VOID_APOLLYON_TRAINING_MATERIALS_CREATE_ONLY_INSTALL_V1`

Status: **source-only create-only installer; not executed on Xiphos by this lane**.

## Purpose

The Xiphos read-only census captured at `2026-10-15T00:28:38Z` returned census
ID:

```text
void_xiphos_apollyon_readonly_census_v1:97e5553562de6fa4cf170cc7eef5b77a61b4bf29ded7d2425900e5a7d7bc04e1
```

That evidence established:

- the designated hostname was exactly `Xiphos`;
- the dedicated `voidapollyontrain` account did not exist;
- the reviewed unit, pre-entry ELF and training-entrypoint ELF were absent;
- the training service was inactive and not found;
- the user-level VOID node remained active on ports 4102 and 4702;
- GPU compute process count was zero on the NVIDIA GeForce RTX 5070;
- 11,741 MiB of GPU memory, about 59.7 GiB of system memory and about 827 GiB
  of root-filesystem space were available; and
- no training, wallet, signer, transaction or funds action occurred.

The missing boundary is therefore installation, not compute capacity.

This lane adds one reviewed operator primitive that can create the dedicated
account and install the exact accepted source generations. It deliberately stops
before systemd reload or execution.

## Stack and accepted identities

This Draft is stacked on #2947 and requires its exact source-level entrypoint
binary lock. It also consumes the merged #2918/#2932 unit and native pre-entry
lineage.

The installer pins:

```text
unit Git blob
62fbabe1cf7ae0d940f5d96e19b06282f841267b

pre-entry source Git blob
9503d19c8bc0b4f073ba117f6a547d339b7623d0

pre-entry lock Git blob
ddff9c18153aa37e7e8b3faa3a43eb1dde921a3d

pre-entry ELF
bytes=17352
sha256=6e2885ceddf83bc9bf4636768ce6f046ab357268b0959cfa71bcbb766909cb47

entrypoint source Git blob
bfeff81f3eab98988a9be9600a05c696674c49d6

entrypoint lock Git blob
014957fbe9cceae6d3bfa4ee1c360917309213f5

entrypoint ELF
bytes=17384
sha256=7a1ec91b612998824e37aa0f8522a94d7ceffe9f4f21e0702fe0a0d5ca5bdd9a
```


Both binaries must be reproduced twice with the reviewed Ubuntu 24.04 GCC 13.3
recipe, be byte-identical, match the locked size and SHA-256, begin with ELF
magic and pass their exact self-test transcript before any persistent mutation.

## Plan mode

```bash
python3 -I -B \
  ops/xiphos/install_apollyon_training_materials_create_only_v1.py \
  --plan
```

Plan mode is read-only. It verifies:

- exact repository source and lock blobs;
- exact compiler identity and systemd major 255;
- the designated hostname;
- root-owned, non-writable trusted ancestry;
- account absence or exact previously created identity;
- target directories and files are absent or exact;
- the service is inactive, dead, has MainPID 0 and is not enabled; and
- all economic, credential and training authority remains false.

It emits a deterministic content-addressed `plan_id`. Apply recomputes that plan
both before compilation and immediately before persistent mutation. Any drift
HOLDS.

## Apply mode

Apply requires root plus all operation-bound acknowledgements:

```text
--expected-plan-id <exact plan_id>
--confirm-create-only-account-and-files
--ack-no-daemon-reload
--ack-service-remains-disabled-and-inactive
```

The create-only operation may:

1. create the system user and primary group `voidapollyontrain` with fixed home
   and nologin shell;
2. create exact root-custodied `/opt` and `/var/lib` directories plus a private
   training output directory;
3. reproduce and self-test both locked ELF binaries in a private temporary build
   directory;
4. atomically create the final files with `O_EXCL`/hard-link publication; and
5. emit a content-addressed installation receipt.

Existing exact state is preserved. Partial accounts, symlinks, unexpected
ownership/modes, hard-link count drift, differing bytes or an active/enabled
service HOLD instead of being overwritten.

## Deliberate stop boundary

This installer:

- does not run `systemctl daemon-reload`;
- does not enable, start, stop, or restart the service;
- does not execute the pre-entry normal path;
- does not execute training;
- does not claim an attempt or mutate candidate weights;
- does not access credentials, private keys, wallets or signers;
- does not construct or submit a transaction; and
- does not move funds.

A successful apply proves only create-only installed bytes and account/path
custody. It does not prove PID 1 loaded the new unit, live descriptor isolation,
training-process cgroup identity, durable attempt claim or model mutation.

## Focused proof

```bash
python3 -m py_compile \
  ops/xiphos/install_apollyon_training_materials_create_only_v1.py \
  scripts/prove_apollyon_training_materials_create_only_install_v1.py
python3 -I -B \
  scripts/prove_apollyon_training_materials_create_only_install_v1.py
```

The proof validates the pinned repository identities, lock contracts, exact
compiler recipe, reproducible ELF outputs, exact self-test transcripts,
content-addressed plan discipline, create-only publication primitives and the
absence of systemd activation commands.

## Authority

Source/CI only in this PR:

```text
xiphos_contact=false
host_installation=false
account_mutation=false
filesystem_mutation=false
daemon_reload=false
service_enable=false
service_start=false
service_restart=false
attempt_claim=false
training_execution=false
candidate_weight_mutation=false
credential_access=false
wallet_or_signer_access=false
transaction=false
funds_movement=false
```

The next separately authorized gate is to run plan mode on Xiphos, review the
exact plan ID, and separately authorize the create-only apply. After that, a
second distinct gate may perform systemd daemon reload and installed/live
identity qualification. It must still refuse training until durable attempt
claim and execution authorization are independently proven.
