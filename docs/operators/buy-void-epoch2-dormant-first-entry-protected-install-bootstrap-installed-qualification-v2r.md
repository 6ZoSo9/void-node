# Buy VOID Epoch-2 protected-bootstrap installed qualification V2R

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V2R`.

Status: **read-only qualification definition; no host execution or apply authority**.

## Purpose

This is the non-executing installed qualification successor to #3425's
canonical V2R create-only protected-bootstrap install.

It answers whether the installed runtime-head V2 bootstrap generation is
exactly the accepted canonical generation and whether the current checkout,
Python policy and #3391 protected-installer source are all still the reviewed
generation.

Unlike historical V1, V2R does **not** compare the current checkout HEAD to a
compile-time bootstrap HEAD. The accepted V2 ELF has no compile-time repository
HEAD.

## Canonical accepted authority

V3 lock:

`voidbuye2bootstraplock3_690d119c90f5c8c20f429fcc14919b62691f9a1b3bfe2226476267ede993197f`

Lock Git blob:

`64c9a42ca1108a9e8f88218c34d53e50668c653e`

Canonical candidate source:

- head: `344f0abcc57d6f2fbacbb6a57e27009ae9ea7a4b`;
- tree: `4085987d856fa303b8bc81087e3b5a207bc8964f`;
- candidate ID:
  `voidbuye2bootstrapcand2_b71b8757fa64fc36c2df0e95e3812c00eccef114b71e0b854c34ddfd62285def`.

Accepted V2 ELF:

- bytes: `731072`;
- SHA-256:
  `37a6979c274e93fa09860b26664804a9d912201a290db65deb9b4499e39aa276`;
- Git blob:
  `45ca1ed7a6237fccbd6bb0b9d73ef5ff47c72d62`.

Historical V2/V1 locks remain preserved with install authority false.

## Installed root

The qualifier requires exactly:

`/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v2`

with only:

```text
bin/
  void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v2
policy-v1.conf
```

Required ownership/modes:

- root: root:root `0755`;
- `bin/`: root:root `0755`;
- bootstrap: root:root `0555`;
- policy: root:root `0444`.

No extra root or bin entries are accepted.

## Runtime-head contract

The accepted lock/report must prove:

```text
runtime_expected_head_compile_bound=false
runtime_expected_head_strict_lowercase_hex=true
runtime_expected_head_forwarded_unchanged=true
repository_head_not_embedded_in_bootstrap=true
canonical_main_candidate_authority=true
superseded_v2_lock_install_authority=false
```

The qualifier therefore does not require
`expected_head == candidate_source_head`.

Instead, the explicitly supplied `--expected-head` authenticates the current
clean local `main` checkout. A later separately authorized bootstrap plan will
pass that exact current head into the V2 bootstrap, which forwards it unchanged
to sealed #3391. #3391 then independently proves checkout HEAD equality and
accepted source/lock identities.

## Python policy

The installed policy must exactly match the current root-protected
`/usr/bin/python3` generation:

```text
schema=VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V2
python_sha256=<exact root Python SHA-256>
python_bytes=<exact root Python bytes>
```

Any Python-generation drift holds qualification before any bootstrap execution.

## Protected-installer source

The fixed #3391 source remains:

`/home/zoso/dev/void-node/ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py`

Required:

- Git blob:
  `383b84e71b371de65579e4113469e86a59b807ab`;
- bytes: `42054`;
- SHA-256:
  `e80b68e19d1498d57cffe2cd05a15cb22a6c2f1acb639175e2be2a2f1c18c9ef`.

The current checkout must be clean branch `main`, and the exact tracked blob
at the supplied head must match the reviewed source.

## Read-only behavior

`--source-plan` is repository-only and performs no host read.

A future host `--plan` or `--run` requires `--expected-head` and performs
only:

- Git identity/status reads;
- root-owned directory/file metadata reads;
- stable descriptor reads;
- SHA-256/Git-blob checks;
- exact directory-entry checks.

It does **not** execute:

- the installed V2 bootstrap, including `--self-test`;
- #3391;
- dormant-binder native/binder code;
- any service or systemd unit.

A GREEN installed qualification advances only to:

`SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALLER_BOOTSTRAP_PLAN_V2R`

That is still a separate authorization and is not #3391 apply authority.

## Source bindings

This generation binds:

- #3425 V2R install source:
  `7d7942dfe4b1def5f5a58201080cc30c3a13d3a0`;
- canonical V2R materializer:
  `f79e52b5d0af99194b0cf89a73ae5bf3285d3840`;
- V2 bootstrap source:
  `19f9baf8d6d707da43dbd0e247667af1a10e46c5`;
- #3391 source:
  `383b84e71b371de65579e4113469e86a59b807ab`;
- qualification source:
  `3b6efd9a22c43e7d3f8698265ac68920cec08a2f`;
- qualification proof:
  `8f96c3a6c49de7bcef4d7decebb66db7d4c945bc`.

## Authority

Always false:

```text
filesystem_write=false
bootstrap_execution_performed=false
protected_installer_apply_performed=false
service_mutation=false
credential_access=false
private_key_access=false
signing=false
transaction=false
rpc_call=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
production_host_evidence_authority=false
```

This source gate does not authorize a Precision run.

**PROTECT THE CORE.**
