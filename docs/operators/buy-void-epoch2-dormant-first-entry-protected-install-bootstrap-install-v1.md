# Buy VOID Epoch-2 protected-bootstrap install V1

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V1`.

Status: **source/CI-only create-only installer definition; no Precision apply authority**.

## Purpose

This gate installs the already accepted protected-installer bootstrap into its
fixed root-custodied production namespace. It does not execute the bootstrap and
does not execute the protected installer that the bootstrap will later
authenticate.

The source chain is:

1. #3401 defines the authenticated static bootstrap;
2. #3405 derives its canonical candidate;
3. #3406 accepts that exact candidate;
4. #3407 materializes the accepted binary without relying on transient CI
   artifacts;
5. this gate defines the bounded create-only root publication step.

A later read-only installed qualification remains separate.

## Accepted bootstrap identity

Accepted lock:

`voidbuye2bootstraplock1_4f11418d278908c99cc3b2de622112321600c3f3704f8919e893a2d7011b1b23`

Lock Git blob:

`a96dee99c89ef386a6cbd05609b8f4a764caada8`

Frozen candidate generation:

- head: `0ea097a3fa43dc95a1a0a5272c61afe570361fc7`;
- tree: `681e9387826f2c0fe8c0336604dfd6e57ff16d93`;
- candidate ID:
  `voidbuye2bootstrapcand1_24d4c84d307c525cc4e28f010c7f2258db2e55256af7d8cf0cb303cf1c4ee851`.

Accepted static bootstrap:

- bytes: `731072`;
- SHA-256:
  `1b570f704841f8b833707de2c85ca66d2a344f3a77b5d1979ab29eaae2ec1189`;
- Git blob:
  `5d35e762fa4b510baeb89b2840d5287cc4fd6716`.

The accepted binary remains compile-bound to the frozen candidate head above.
This installer exposes that fact in plan/apply receipts; it does not silently
rebind the bootstrap to a newer checkout.

## Fixed production namespace

The only final root created by this gate is:

`/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v1`

Exact final entries:

```text
/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v1/
├── bin/
│   └── void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v1
└── policy-v1.conf
```

Required ownership and modes:

- root directory: root:root, `0755`;
- `bin/`: root:root, `0755`;
- bootstrap: root:root, `0555`;
- policy: root:root, `0444`.

No installer source, native binder binary, credential, wallet, service unit, or
runtime state is copied into this root.

## Python policy

The bootstrap authenticates the fixed `/usr/bin/python3` generation against
exactly three newline-terminated policy lines:

```text
schema=VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V1
python_sha256=<64 lowercase hex>
python_bytes=<positive decimal>
```

The install plan snapshots the root-protected Python target and derives this
policy from that exact generation. Apply revalidates Python both before and
after publication.

## Read-only plan

A future host plan requires:

- clean `main` checkout at the explicitly supplied head;
- accepted lock at its exact Git blob;
- an absolute normalized mode-`0555` bootstrap input with exact accepted
  bytes/SHA/Git-blob identity;
- trusted `/opt`;
- no existing staging root;
- either an absent final root or an already exact final generation;
- root-protected Git and Python generations.

Plan performs no filesystem write and returns an operation-bound
`voidbuye2bootstrapinstall1_<sha256>` plan ID.

## Apply boundary

Apply additionally requires:

- effective UID 0;
- Python isolated mode;
- absence of loader/Python injection environment variables;
- the exact prior plan ID;
- exact confirmation:
  `INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_V1_CREATE_ONLY`.

The create-only publication protocol is:

1. re-run the exact plan;
2. create only the fixed hidden staging directory under `/opt`;
3. create stage files with `O_EXCL|O_NOFOLLOW`;
4. set root ownership and final modes;
5. fsync files/directories;
6. revalidate checkout, Python, accepted lock and bootstrap input generation;
7. verify the complete stage tree;
8. publish with `renameat2(..., RENAME_NOREPLACE)`;
9. fsync `/opt`;
10. verify the final installed tree and source/tool generations.

If a prepublication failure occurs, cleanup is limited to the exact stage
directory generation created by this invocation. The installer records the
created stage device/inode and refuses cleanup if the visible stage root no
longer names that generation. Unknown extra stage entries likewise fail closed
instead of being deleted.

After publication there is **no rollback**. Any postpublication verification
failure emits a truthful `published_needs_inspection` receipt. Failure while
closing the retained `/opt` parent descriptor after successful publication is
also publication-aware and reports `failure_phase=install_parent_close`
instead of escaping as a raw exception or regressing to `publication=false`.

## Deliberate non-execution

This installer never launches:

- the accepted bootstrap;
- #3391 protected installer;
- dormant-binder native code;
- binder code;
- a service or systemd unit.

The next gate after a GREEN install is:

`SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_INSTALLED_READ_ONLY_QUALIFICATION_V1`

That qualification must remain read-only.

## Authority

Source/test/CI work on this gate authorizes no host apply.

Even a future successful create-only install does **not** authorize:

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

Any eventual Precision apply requires a separate explicit authorization after
the source generation is accepted and merged.

**PROTECT THE CORE.**
