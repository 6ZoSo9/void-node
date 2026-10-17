# Buy VOID Epoch-2 dormant first-entry protected-install bootstrap install V1

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V1`.

Status: **source/test/CI-only protected bootstrap installer; no Precision apply is performed by this PR**.

## Purpose

Install only the already accepted static bootstrap that authenticates the
dormant-binder first-entry protected installer before privileged Python begins.

Accepted lock:

`voidbuye2bootstraplock1_4f11418d278908c99cc3b2de622112321600c3f3704f8919e893a2d7011b1b23`.

Accepted candidate:

`voidbuye2bootstrapcand1_24d4c84d307c525cc4e28f010c7f2258db2e55256af7d8cf0cb303cf1c4ee851`.

Accepted bootstrap ELF:

- bytes: `731072`;
- SHA-256:
  `1b570f704841f8b833707de2c85ca66d2a344f3a77b5d1979ab29eaae2ec1189`;
- Git blob:
  `5d35e762fa4b510baeb89b2840d5287cc4fd6716`.

The installer does not derive a new bootstrap identity and does not execute the
bootstrap.

## Protected namespace

A future separately authorized apply may create only:

```text
/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v1/
  bin/
    void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v1
  policy-v1.conf
```

Required ownership/modes:

- root directory: `root:root 0755`;
- `bin/`: `root:root 0755`;
- accepted bootstrap ELF: `root:root 0555`;
- policy: `root:root 0444`.

The policy is exactly three lines:

```text
schema=VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V1
python_sha256=<exact /usr/bin/python3 SHA-256>
python_bytes=<exact /usr/bin/python3 byte count>
```

## Read-only plan

Plan mode requires:

- a clean exact `main` checkout named by `--expected-head`;
- exact accepted lock Git blob;
- an absolute regular candidate input matching the accepted ELF byte count,
  SHA-256 and Git-blob identity;
- a stable root-owned `/usr/bin/git` generation;
- a stable root-owned `/usr/bin/python3` generation;
- either the exact absent final root or an already-GREEN installed root.

It emits:

`voidbuye2bootstrapinstall1_<64hex>`.

Plan mode performs no filesystem write.

## Create-only apply

A future separately authorized apply requires:

- root execution;
- Python isolated mode;
- the exact plan's `--expected-head`;
- exact `--expected-plan-id`;
- exact confirmation:
  `INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_V1_CREATE_ONLY`.

The confirmation check precedes plan rederivation and protected-root mutation.

Apply then:

1. rederives the complete plan;
2. creates one hidden stage under `/opt`;
3. writes the accepted ELF and policy through retained descriptors;
4. rereads each staged file through the same retained descriptor and verifies
   exact SHA-256 before close;
5. fsyncs files and directories;
6. revalidates checkout, accepted lock, Python generation and staged root;
7. publishes once with `renameat2(RENAME_NOREPLACE)`;
8. fsyncs `/opt`;
9. verifies the visible final root and revalidates checkout/Python.

An existing final root is never replaced. Prepublication cleanup is attempted
only against the retained stage-directory generation. After possible
publication there is no rollback-by-name; any post-publication uncertainty is
reported as `published_needs_inspection`.

## Bootstrap trust boundary

This installation step writes inert bytes only. It does not execute the
bootstrap. The later installed read-only qualification must prove the exact
root, bootstrap binary, policy and Python generation before the bootstrap may
be used as privileged first instruction.

Only after that qualification may a fresh operation-bound authorization invoke
the installed bootstrap to plan or apply the already reviewed dormant-binder
first-entry protected installer.

## Authority

This source gate and installer do not authorize or perform:

- bootstrap execution;
- dormant-binder protected-installer apply;
- dormant binder/native live execution;
- service/systemd mutation;
- credential/private-key access;
- signing;
- RPC/transaction;
- payment acceptance;
- public presale or WC/VOID activation;
- treasury/liquidity action;
- funds movement.

Next operational gate after a future GREEN install:

`EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_INSTALLED_READ_ONLY_QUALIFICATION_V1`.

PROTECT THE CORE.
