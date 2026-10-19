# Buy VOID Epoch-2 dormant-binder installer first-entry protected install V1

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_PROTECTED_INSTALL_V1`.

Status: **source/test/CI-only protected installer; no Precision apply is performed by this PR**.

## Purpose

Install the accepted authenticated dormant-binder installer first-entry launcher
as one complete root-custodied create-only generation.

The accepted launcher identity comes from lock:

`voidbuye2dormantfirstentrylock1_bdff90d00036a0e5cebd72dd06aa708842385c3857e4acb3bf9674c2b1e16a85`.

Accepted launcher candidate:

`voidbuye2dormantfirstentrycand1_b7109c847373114e2d5e044928ecc4e30c65ef446880d70d9ec57d5853ad3736`.

Launcher ELF:

- bytes: `731072`;
- SHA-256:
  `4fbf67bff503cead931b59e4364d66ccf2f2d6c0ee40182b6f9498cf96e8f51a`.

The retained native candidate consumed later by the first-entry launcher is:

- bytes: `726976`;
- SHA-256:
  `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`.

## Complete protected namespace

The installed generation is exactly:

```text
/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1/
  bin/
    void_buy_void_epoch2_dormant_binder_installer_first_entry_v1
  input/
    void_buy_void_epoch2_dormant_binder_native_candidate_v2
  source/
    ops/
      precision/
        void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py
  policy-v1.conf
```

Directory modes are root:root `0755`.

File modes:

- launcher: root:root `0555`;
- retained native input: root:root `0444`;
- authenticated installer source: root:root `0444`;
- policy: root:root `0444`.

No extra direct entries are accepted at any directory level.

## Policy binding

The launcher reads only the root-owned policy:

```text
schema=VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_POLICY_V1
python_sha256=<exact /usr/bin/python3 generation>
python_bytes=<exact /usr/bin/python3 byte count>
```

The installer snapshots the real root-owned Python generation and binds that
identity into the content-addressed operation plan.

## Source bindings

The plan requires a clean exact `main` checkout supplied by the operator as
`--expected-head`.

From that exact Git generation it verifies:

- accepted first-entry candidate lock Git blob
  `f8ff6fbb855aecafc329cd60622cf3af782745a3`;
- authenticated dormant-binder protected-installer Git blob
  `f3d6b1559be7490303cf36338c4bfa38fdaa390a`;
- authenticated installer source SHA-256
  `602d7fbc256d346b3f80adc93e3b20a39403be5158e944e23456851764a954b9`;
- authenticated installer source bytes `57255`.

The launcher and native candidates are operator-supplied absolute regular-file
inputs, but their bytes must match the accepted lock exactly before a plan can
be produced.

## Read-only plan

Plan mode verifies the full candidate, lock, checkout, Git, Python, installer
source, policy, and protected-root state.

It emits one content-addressed plan ID:

`voidbuye2dormantfirstentryinstall1_<64hex>`.

Plan mode performs no filesystem mutation and executes none of the installed
launcher/native/binder code.

## Separately authorized apply

Apply requires all of:

- root execution;
- Python isolated mode;
- exact `--expected-head`;
- exact `--expected-plan-id`;
- explicit confirmation:
  `INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V1_CREATE_ONLY`.

The confirmation boundary is checked before candidate or protected-root access
inside apply.

After rederiving the exact plan, apply:

1. creates a hidden root-owned stage under `/opt`;
2. creates only the exact fixed directory tree and files;
3. fsyncs every staged file and containing directory;
4. revalidates checkout, accepted lock, Python generation and staged root;
5. publishes exactly once with
   `renameat2(RENAME_NOREPLACE)`;
6. fsyncs `/opt`;
7. verifies the published root and revalidates checkout/Python.

An existing final root is never overwritten.

A prepublication failure attempts generation-bounded stage cleanup.

After publication there is **no rollback claim**. Any post-publication failure
returns a final failure receipt with
`publication_state=published_needs_inspection`.

## Authority boundary

This installer does **not** execute:

- the first-entry launcher;
- the accepted native input;
- the JavaScript dormant binder.

It does not access credentials/private keys, sign, transact, call RPC, accept a
payment, activate public presale/WC, perform treasury/liquidity actions, mutate
services/systemd, or move funds.

Source/CI execution has no Precision host authority.

After a future separately authorized GREEN Precision install, the next gate is
an installed **read-only qualification** of the complete protected first-entry
generation.

**PROTECT THE CORE.**
