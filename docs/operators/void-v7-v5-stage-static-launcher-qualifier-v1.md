# Canonical V5 staging static root launcher + read-only pair qualifier V1

## Purpose

Implement the source/test forms of the two trust-boundary components planned in
#3713:

1. a static closed-tree root launcher for the already-reviewed V5 source/receipt
   stage builders;
2. an unprivileged read-only qualifier for the hidden V5 staging pair.

This lane does **not** accept a production payload manifest, install the
launcher, execute it as root, apply either stage, exchange fixed paths, or grant
runtime authority.

## Static launcher candidate

Source:

`ops/precision/void_v7_v5_source_receipt_stage_root_launcher_v1.c`

The launcher is derived from the reviewed full-history root-launcher V2 trust
model and uses the distinct fixed root:

`/opt/void-v7-v5-source-receipt-stage-closed-tree-v1`.

Expected layout:

- `bin/void_v7_v5_source_receipt_stage_root_launcher_v1`;
- `policy-v1.conf`;
- `install-receipt-v1.conf`;
- `runtime/bin/python3.12-static`;
- `runtime/lib/python312.zip`;
- complete `source/` snapshot.

Hardened #3712 V5 installer generation now source-bound in this draft.
The focused upstream builder job has succeeded, but its overall workflow
conclusion was still pending when admission plan #3713 was rebound;
no production manifest or apply authority follows:

- source installer blob
  `1f251a8489e0b2a69683d991785cb4f46fa6dff5`,
  129950 bytes,
  SHA-256
  `0266d018eb89b38d80b0dc2c877dfdeb1c3c4e2e11ac61caf4f6c42863981251`;
- receipt installer blob
  `d719de6e8c4974a9356577ee16a9e68fa02b7ca0`,
  20381 bytes,
  SHA-256
  `dcbb9c379c37132020fe93f87c9a2afad2ecdf4fec3be88e3082544c6ff35b4b`.

The corresponding admission plan binds ID
`voidv7v5stageadmissionplan1_050ae2426fcf4b9895ac92b280274c062ed95fc97358fb9786ee6b6b890cee2a`
and Git blob `1688e55a0f2b2065b4c27a651a35c1aa9e0138b8`.

The launcher supplies implementation source authority itself:

- HEAD `5489b50be1e5631a6958d78afeb290f9d1b444bb`;
- tree `3b12eed28fe11a2b20f95ef185f56bd5e37677a1`.

### Four operations only

- `source-stage-plan`;
- `source-stage-apply`;
- `receipt-stage-plan`;
- `receipt-stage-apply`.

Plan operations accept no caller data.

Apply operations accept only:

- `--expected-plan-id`;
- `--confirm`.

The launcher supplies source HEAD/tree to the source installer and uses the
operation-specific confirmation tokens already fixed in the installers.

Caller-controlled paths, candidate paths, receipt bytes, source generation,
exchange commands, transition-journal commands, consumer-fence commands and
service commands are not request surface.

### Production-disabled default

The source candidate intentionally compiles with:

```text
VOID_V7_V5_STAGE_ACCEPTANCE_ID=UNACCEPTED
VOID_V7_V5_STAGE_ACCEPTED_MANIFEST_SHA256=""
VOID_V7_V5_STAGE_ACCEPTED_MANIFEST_BYTES=0
```

Therefore any normal launcher operation fails immediately with:

`production_payload_manifest_lock_not_bound`.

Only `--self-test` is usable in this source generation.

A future accepted production payload must supply those identities at compile
time after a separate manifest-candidate and manifest-acceptance process.

The launcher still retains the predecessor security model:

- fixed root and ancestor custody;
- exact directory layout for launcher/runtime roots;
- root-owned single-link trusted leaves;
- receipt-bound device/inode/hash/mode/nlink;
- complete source snapshot receipt;
- static x86-64 Python ELF requirement;
- static Python and stdlib content hashes;
- runtime UID non-writability audit;
- retained-descriptor revalidation;
- selection of exactly one verified source/receipt installer descriptor;
- explicit close of the unselected installer descriptor;
- clearing `FD_CLOEXEC` **only** for the selected verified installer;
- descriptor-backed script argument `/proc/self/fd/<fd>`, not a separately
  reopened installer pathname, after final descriptor/path identity validation;
- `fexecve` of the retained Python descriptor with that selected installer
  descriptor inherited across process exec;
- `-I -B -S`;
- fixed minimal environment;
- stdin `/dev/null`.

## Read-only staging pair qualifier

Source:

`ops/precision/void_v7_v5_source_receipt_stage_pair_qualifier_v1.py`

When later run unprivileged with `--inspect`, it requires:

### V5 source stage

`/opt/.void-buy-void-v7-reviewed-v1.stage-v5`

- root-owned `0555`;
- physical direct directory;
- HEAD `be2fbe41aaba291d3f874b9de52bcb87336307f5`;
- tree `749877d2320ecee9d659720b32e4726a0c42d697`;
- parent `79081038cf4f03c2971bdcb32c54daf6a87fbabf`;
- clean `main`;
- non-shallow;
- exactly 18,357 reachable commits;
- no missing reachable objects;
- strict full fsck.

### V5 receipt stage

`/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5`

- receipt ID
  `voidbsfdep1_c936b6fad9623418aa3d34756226bb5f26411117dc9d3f77cbb874a98db84b37`;
- SHA-256
  `12d4028d317ce871a61c89c60fd36a1e31421401a39397974063677cb4ab8001`;
- 1136 bytes;
- root:root;
- mode `0444`;
- nlink `1`.

It also requires the fixed V4 source/receipt pair to remain exact and both
reserved V4 predecessor names plus the source installer temporary-stage name to
remain absent.

It verifies each V5 stage shares a filesystem device with its corresponding
fixed V4 object.

### Deliberate exchange HOLD

The hardened #3706 design has not yet selected the exact durable transition
journal path or exclusive consumer-fence path.

The qualifier therefore reports:

```text
staging_pair_exact=true
journal_fence_path_selection_deferred=true
exchange_preconditions_complete=false
fixed_source_exchange_authority=false
fixed_receipt_exchange_authority=false
runtime_cutover_authority=false
```

even when both stages are perfect.

It does not invent those paths or overclaim exchange readiness.

## CI boundary

Focused CI:

- compiles the launcher with `-Wall -Wextra -Werror`;
- runs launcher `--self-test`;
- independently hashes the actual updated #3712 installer bytes and validates exact
  source/receipt Git blobs, byte lengths and SHA-256 identities against the
  native launcher source bindings;
- proves a normal launcher operation fails closed on the unbound manifest lock;
- compiles the qualifier;
- runs qualifier `--self-test` only;
- self-tests the selected installer FD inheritance and procfd identity
  without opening a protected host path;
- runs a disposable, non-root Python path-substitution regression: a script
  renamed away after its descriptor was opened must still execute its originally
  verified bytes through `/proc/self/fd/<fd>`; a new file at the old pathname
  must not affect those bytes.

CI does **not**:

- run launcher plan/apply against a closed tree;
- run either stage installer `--apply`;
- run qualifier `--inspect` against host paths;
- create a production manifest;
- install anything;
- execute as root.

## Authority

```text
implementation_candidate=true
production_payload_manifest_accepted=false
launcher_install_authorized=false
root_execution_authorized=false
source_stage_apply_authorized=false
receipt_stage_apply_authorized=false
stage_pair_host_inspection_performed=false
fixed_source_exchange_authority=false
fixed_receipt_exchange_authority=false
runtime_cutover_authority=false
service_mutation=false
systemd_mutation=false
provider_rpc_contact=false
credential_access=false
private_key_access=false
wallet_or_signer_access=false
signing=false
transaction=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
```

Next gates after exact-head CI:

1. Independently review this exact descriptor-inheritance and path-substitution
   correction and all root-launcher file-descriptor lifetime invariants.
2. The #3713 trusted-admission plan and this launcher source have been rebound
   to updated #3712 head `5489b50be1e5631a6958d78afeb290f9d1b444bb`.
   Obtain a final upstream focused-workflow conclusion and rerun fresh source
   and downstream exact-head CI. No production manifest acceptance is inferred.
3. Rerun complete fresh exact-head CI and only then consider a separate external
   closed-tree manifest candidate review. Source CI is **not** root authorization.

`REVIEW_DESCRIPTOR_EXEC_THEN_REBIND_V5_STAGE_STACK_THEN_DERIVE_EXTERNAL_MANIFEST`

PROTECT THE CORE.
