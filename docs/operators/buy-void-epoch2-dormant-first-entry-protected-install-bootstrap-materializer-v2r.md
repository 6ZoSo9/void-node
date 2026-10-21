# Buy VOID Epoch-2 canonical runtime-head protected-bootstrap materializer V2R

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_MATERIALIZER_V2R`.

Status: **source/CI artifact materialization only**.

## Purpose

V2R is the corrective materializer for canonical acceptance lock V3.

Historical materializer V2 (#3421) remains preserved. It was bound to the
pull-request preview lock/report and is not current install authority.

V2R binds:

- canonical lock V3:
  `voidbuye2bootstraplock3_690d119c90f5c8c20f429fcc14919b62691f9a1b3bfe2226476267ede993197f`;
- lock Git blob:
  `64c9a42ca1108a9e8f88218c34d53e50668c653e`;
- canonical source head:
  `344f0abcc57d6f2fbacbb6a57e27009ae9ea7a4b`;
- canonical tree:
  `4085987d856fa303b8bc81087e3b5a207bc8964f`;
- candidate ID:
  `voidbuye2bootstrapcand2_b71b8757fa64fc36c2df0e95e3812c00eccef114b71e0b854c34ddfd62285def`.

## Canonical candidate report

- bytes: `4789`;
- SHA-256:
  `2ca03a4d7e609076df740a7590abfae572101ef7bf78feacf11240e309a43ee4`;
- Git blob:
  `fbaab61d0e169516a49c5c07feeceba1a7204e83`.

## Accepted bootstrap ELF

The binary identity remains:

- bytes: `731072`;
- SHA-256:
  `37a6979c274e93fa09860b26664804a9d912201a290db65deb9b4499e39aa276`;
- Git blob:
  `45ca1ed7a6237fccbd6bb0b9d73ef5ff47c72d62`.

The binary is unchanged from the preview derivation. V2R exists because the
source-addressed candidate report changed after canonical merge, not because the
ELF changed.

## Frozen canonical rederivation

The materializer requires V3 on the current clean checkout, then creates a
disposable detached worktree at canonical candidate head
`344f0abcc57d6f2fbacbb6a57e27009ae9ea7a4b`.

It requires candidate proof Git blob:

`4f9b5a2ca77b3aebc9e70ea835c92155601a1a06`

and executes those verified proof bytes in memory.

The derived report and ELF must equal all canonical identities above exactly.

## Historical V2 preservation

Historical materializer V2 remains present in main as immutable prior evidence.

V2R requires the V3 lock to assert:

```text
canonical_main_candidate_authority=true
superseded_v2_lock_install_authority=false
superseded_v1_lock_install_authority=false
```

V2R does not repin or rewrite V2.

## Create-only output

The requested output parent must already exist. The output leaf is opened with:

```text
O_CREAT | O_EXCL | O_NOFOLLOW | O_CLOEXEC
```

The retained descriptor is:

1. written completely;
2. set to mode `0555`;
3. fsynced;
4. rewound and reread completely;
5. compared to the expected bytes/SHA/Git blob;
6. checked against the visible inode/generation;
7. followed by parent-directory fsync.

A duplicate output fails closed.

An uncertain post-create failure does not delete the visible output pathname by
name.

## Runtime-head contract

The accepted V2 ELF remains:

```text
runtime_expected_head_compile_bound=false
runtime_expected_head_strict_lowercase_hex=true
runtime_expected_head_forwarded_unchanged=true
repository_head_not_embedded_in_bootstrap=true
```

The materializer performs no bootstrap execution except the inert self-test in
hosted CI.

## Authority

Materialization does not authorize or perform:

- writes under `/opt`;
- protected-bootstrap installation;
- protected-installer apply;
- live bootstrap/binder execution;
- credential/private-key access;
- signing;
- RPC/transaction;
- payment acceptance;
- public presale or WC/VOID activation;
- treasury/liquidity action;
- funds movement.

Next gate:

`void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_install_v2r`.

**PROTECT THE CORE.**
