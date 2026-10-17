# Buy VOID Epoch-2 protected-bootstrap installed qualification V3

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V3`.

Status: **read-only qualification definition; no host execution or apply authority**.

## Purpose

This is the non-executing installed qualification successor to merged #3434's
repaired V3 create-only protected-bootstrap install.

It verifies that a future installed V3 bootstrap root is exactly the accepted
canonical repaired generation and that the current checkout, root Python policy,
V4 acceptance lock and repaired inner installer V2 remain the reviewed
generation.

The accepted V3 bootstrap carries the runtime-head contract: repository HEAD is
not compiled into the bootstrap. The explicitly supplied `--expected-head`
must instead authenticate the current clean local `main` checkout and is
forwarded unchanged to the repaired inner installer.

## Canonical accepted authority

V4 lock:

`voidbuye2bootstraplock4_6568c1cd0195405d49001fbf6cb9a086364e401f78f3bfcf1d6cbb080947cb67`

Lock Git blob:

`57ecc08d465fe2a3c395546d349864312cd08a3f`

Canonical V3 candidate source:

- head: `78875f7379c2dd995e1b545dd0543c934e59907a`;
- tree: `a2c1b6b9989ceb11c4fbea3f2fc4ecf64eb50176`;
- candidate ID:
  `voidbuye2bootstrapcand3_9e914f52eb3cde5a5fef42fbdf065b375f89fdabb768034b09615861bba67ce3`.

Accepted V3 ELF:

- bytes: `731072`;
- SHA-256:
  `904e6b05df45bc9212be7689ea0617ccfbf65d5edf8535a381abcbb588f236cd`;
- Git blob:
  `69e3bf6db7baf614eb0b7d8c5e93aafce0deab46`.

Historical V3/V2/V1 acceptance locks are preserved with install authority
explicitly false. They are not repinned.

## Installed root

The qualifier requires exactly:

`/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v3`

with only:

```text
bin/
  void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v3
policy-v1.conf
```

Required ownership/modes:

- root: root:root `0755`;
- `bin/`: root:root `0755`;
- bootstrap: root:root `0555`;
- policy: root:root `0444`.

No extra root or bin entries are accepted.

## Runtime-head contract

The V4 lock/report must prove:

```text
runtime_expected_head_compile_bound=false
runtime_expected_head_strict_lowercase_hex=true
runtime_expected_head_forwarded_unchanged=true
repository_head_not_embedded_in_bootstrap=true
canonical_main_candidate_authority=true
superseded_v3_lock_install_authority=false
superseded_v2_lock_install_authority=false
superseded_v1_lock_install_authority=false
```

Qualification does **not** require
`expected_head == candidate_source_head`.

The supplied `--expected-head` authenticates the current clean local
`main` checkout. A later separately authorized bootstrap plan may pass that
exact current head into V3; V3 forwards it unchanged to the repaired inner
installer, which independently enforces checkout/source/lock identity.

## Python policy

The installed policy must exactly match the current root-protected
`/usr/bin/python3` generation:

```text
schema=VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V3
python_sha256=<exact root Python SHA-256>
python_bytes=<exact root Python bytes>
```

Any Python-generation drift holds qualification before bootstrap execution.

## Repaired protected-installer source

The current repaired inner installer is:

`/home/zoso/dev/void-node/ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v2.py`

Required:

- Git blob:
  `69a018c0eccedf3782055c56725579d02463b05e`;
- bytes: `58454`;
- SHA-256:
  `6db5c9520af7070056acfd854d79219053fbcb561f63e7530423974ddd80562a`.

The checkout must be clean branch `main`, and the tracked blob at the supplied
head must match this exact reviewed source.

## Read-only behavior

`--source-plan` is repository-only and performs no host read.

A future host `--plan` or `--run` requires `--expected-head` and performs
only:

- Git identity/status reads with `GIT_NO_LAZY_FETCH=1` and empty
  `GIT_ALLOW_PROTOCOL`;
- hooks and fsmonitor disabled for Git reads;
- root-owned directory/file metadata reads;
- stable descriptor reads;
- SHA-256/Git-blob checks;
- exact directory-entry checks.

It does **not** execute:

- the installed V3 bootstrap, including self-test;
- the repaired inner installer V2;
- dormant-binder native/binder code;
- any service or systemd unit.

A GREEN installed qualification advances only to:

`SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALLER_BOOTSTRAP_PLAN_V3`

That is a separate plan gate and is not protected-installer apply authority.

## Source bindings

This generation binds:

- #3434 V3 install source:
  `21860bce2c1589cead5c0789342871049c2d6055`;
- #3434 V3 install proof:
  `4d3f3bae1b11b7f16d881de08463bd2d9baef088`;
- #3433 V3 materializer:
  `a62dc7c4e7ac4cde63c3473d0040c355aa28508e`;
- #3433 materializer proof:
  `f23a60dcd7ff0c3538cc2fef0929086c169365da`;
- V3 bootstrap source:
  `2c3c9ed120cc9949a0528e43be886354aa25da5a`;
- repaired inner installer V2:
  `69a018c0eccedf3782055c56725579d02463b05e`;
- qualification source:
  `a2298dbdbf9928f14963ce8bf77d91f54e349ce9`;
- qualification proof:
  `85c51974424a979c67db66c21e0fee08d7125384`.

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

This source gate does not authorize a Precision qualification run.

**PROTECT THE CORE.**
