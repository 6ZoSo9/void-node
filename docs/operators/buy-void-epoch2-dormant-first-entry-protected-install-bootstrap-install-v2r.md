# Buy VOID Epoch-2 canonical protected-bootstrap install V2R

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V2R`.

Status: **source/CI-only create-only installer definition; no Precision apply authority**.

## Purpose

This is the canonical create-only install gate for the runtime-head V2 bootstrap
materialized by V2R.

It preserves the final V1 filesystem-publication mechanics while replacing the
historical frozen-head V1 identity with:

- canonical V3 acceptance lock;
- canonical post-merge V2 candidate report;
- runtime-head V2 bootstrap ELF;
- V2 protected Python policy/root.

It does not execute the bootstrap and does not invoke #3391.

## Canonical authority

Accepted V3 lock:

`voidbuye2bootstraplock3_690d119c90f5c8c20f429fcc14919b62691f9a1b3bfe2226476267ede993197f`

Lock Git blob:

`64c9a42ca1108a9e8f88218c34d53e50668c653e`.

Canonical candidate source:

- head: `344f0abcc57d6f2fbacbb6a57e27009ae9ea7a4b`;
- tree: `4085987d856fa303b8bc81087e3b5a207bc8964f`;
- candidate ID:
  `voidbuye2bootstrapcand2_b71b8757fa64fc36c2df0e95e3812c00eccef114b71e0b854c34ddfd62285def`.

Accepted ELF:

- bytes: `731072`;
- SHA-256:
  `37a6979c274e93fa09860b26664804a9d912201a290db65deb9b4499e39aa276`;
- Git blob:
  `45ca1ed7a6237fccbd6bb0b9d73ef5ff47c72d62`.

The lock requires:

```text
runtime_head_contract_accepted=true
canonical_main_candidate_authority=true
superseded_v2_lock_install_authority=false
superseded_v1_lock_install_authority=false
```

## V2R materialization

The source/test chain binds merged V2R materialization:

- materializer Git blob:
  `f79e52b5d0af99194b0cf89a73ae5bf3285d3840`;
- materializer proof Git blob:
  `c66bcd1f1d0d4751de475d5d6c1c98cab1eba31a`;
- hosted artifact run: `38996667442`;
- hosted artifact ID: `12087870657`.

That run independently rederived the canonical report and ELF and published
create-only install input evidence.

The installer still verifies the supplied bootstrap bytes itself. An artifact
name or download location is never authority.

## Fixed V2 production namespace

The final root is exactly:

`/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v2`

Exact final entries:

```text
/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v2/
├── bin/
│   └── void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v2
└── policy-v1.conf
```

Ownership/modes:

- root and `bin/`: root:root `0755`;
- V2 bootstrap: root:root `0555`;
- policy: root:root `0444`.

No native/binder binary, installer source, credential, wallet, service unit or
runtime state is copied into this root.

## V2 protected Python policy

The V2 bootstrap expects:

```text
schema=VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V2
python_sha256=<64 lowercase hex>
python_bytes=<positive decimal>
```

The plan snapshots exact root-protected `/usr/bin/python3` and derives the
policy from that generation. Apply revalidates Python before and after
publication.

## Runtime-head model

Unlike V1, the V2 ELF is not compile-bound to repository HEAD.

The install receipt exposes:

```text
bootstrap_runtime_head_compile_bound=false
runtime_expected_head_strict_lowercase_hex=true
runtime_expected_head_forwarded_unchanged=true
canonical_main_candidate_authority=true
superseded_v2_lock_install_authority=false
```

The installer's own `--expected-head` still requires the current local checkout
to be clean branch `main` at the exact supplied head before any future apply.
That value is an install-generation binding, not a compile-time V2 ELF binding.

## Read-only plan

A future host plan requires:

- clean `main` checkout at explicit `--expected-head`;
- exact canonical V3 lock from that checkout;
- absolute normalized mode-`0555` bootstrap input with exact accepted
  bytes/SHA/Git-blob identity;
- trusted `/opt`;
- no staging root;
- absent final root or exact already-installed generation;
- root-protected Git and Python generations.

Plan is read-only and returns an operation-bound
`voidbuye2bootstrapinstall2r_<sha256>` ID.

## Apply boundary

Apply additionally requires:

- effective UID 0;
- Python isolated mode;
- no loader/Python injection environment;
- exact prior plan ID;
- exact install confirmation:
  `INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_V2R_CREATE_ONLY`.

The accepted V2 bootstrap's internal #3391 confirmation remains its independently
reviewed compile binding:

`INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V1_CREATE_ONLY`.

These are deliberately different contracts.

## Create-only publication

The publication mechanics are inherited from the final V1 installer:

1. re-run exact plan;
2. create only the fixed hidden stage under `/opt`;
3. bind the created stage by device/inode;
4. create files with `O_EXCL|O_NOFOLLOW`;
5. set root ownership/final modes;
6. fsync files/directories;
7. revalidate checkout, Python, V3 lock and bootstrap input generation;
8. verify the complete stage tree;
9. publish using `renameat2(..., RENAME_NOREPLACE)`;
10. fsync `/opt`;
11. verify final tree and source/tool generations.

Prepublication cleanup may touch only the exact stage generation created by that
invocation. Unknown/rebound stage state fails closed.

After publication there is no rollback. Any postpublication verification or
install-parent close failure emits a truthful terminal receipt.

## Deliberate non-execution

This gate never launches:

- V2 bootstrap;
- #3391 protected installer;
- dormant-binder native/binder code;
- services or systemd.

Hosted CI runs only source syntax/invariant checks, `--self-test`, and
`--source-plan`.

## Authority

Source/CI does not authorize host apply.

Even a future separately authorized successful install does not authorize:

```text
bootstrap_execution=false
protected_installer_apply=false
live_execution=false
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
```

Next gate after a future GREEN install:

`SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_INSTALLED_READ_ONLY_QUALIFICATION_V2R`.

**PROTECT THE CORE.**
