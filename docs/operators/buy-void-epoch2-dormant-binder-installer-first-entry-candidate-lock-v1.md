# Buy VOID Epoch-2 dormant-binder installer first-entry candidate lock V1

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_CANDIDATE_LOCK_V1`.

Status: **candidate/launcher identity acceptance only; not installed and not authorized for live execution**.

## Accepted canonical merge generation

The accepted candidate was derived from canonical merge:

`9eebcd1bb15ea0b853c3c7cfe0ffd8dd60030a30`

with tree:

`edff3fcf5b23763c6afe86ba3eb6ba1c92a79bee`.

The candidate workflow is the merge-bound push run:

- workflow run: `38976884616`;
- source-proof job: `117228356239`;
- derive A: `117228465638`, artifact `12078904521`;
- derive B: `117228465478`, artifact `12079600783`;
- derive C: `117228465525`, artifact `12079510968`;
- compare/rederivation job: `117228626981`.

All three reports and launcher ELFs were byte-identical and the compare job independently rederived both.

## Accepted report

Candidate ID:

`voidbuye2dormantfirstentrycand1_b7109c847373114e2d5e044928ecc4e30c65ef446880d70d9ec57d5853ad3736`.

Candidate report:

- bytes: `5400`;
- SHA-256:
  `a345e861b81cd19288b71122bd353a1d586d070febfc87933ed8181c0d3abebe`;
- Git blob:
  `3a2fe37452a35621d738713b5e4b51391f5c4400`.

The report binds exact source generations:

- launcher source Git blob:
  `5f1195d0c0a328be4334ad5b7f6e32b150776cab`;
- authenticated protected installer Git blob:
  `f3d6b1559be7490303cf36338c4bfa38fdaa390a`;
- accepted dormant-binder native lock V3 Git blob:
  `5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1`;
- accepted native candidate derivation helper Git blob:
  `f97cb8aff642f2f3e138fe8e087eece22223b934`.

The accepted native input remains:

- lock:
  `voidbuye2dormantbinderlock3_a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a`;
- candidate:
  `voidbuye2dormantbindercand2_8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d`;
- native ELF SHA-256:
  `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`;
- native ELF bytes: `726976`.

## Accepted first-entry launcher

Static launcher ELF:

- bytes: `731072`;
- SHA-256:
  `4fbf67bff503cead931b59e4364d66ccf2f2d6c0ee40182b6f9498cf96e8f51a`;
- Git-blob identity:
  `eb66ce5313a8c0b01639ebec79564111d55163c4`.

The candidate proves:

- two launcher builds are byte-identical;
- source compilation is from a sealed memfd;
- compiler/strip/static-link inputs are root-protected and revalidated;
- no `PT_INTERP`;
- no dynamic `NEEDED`;
- inert launcher self-test is GREEN;
- semantic candidate-report validation is fail-closed.

Compile-time bindings include the exact candidate merge HEAD and exact confirmation token:

`INSTALL_ACCEPTED_EPOCH2_DORMANT_BINDER_V3_CREATE_ONLY`.

## Lock identity

Lock ID:

`voidbuye2dormantfirstentrylock1_bdff90d00036a0e5cebd72dd06aa708842385c3857e4acb3bf9674c2b1e16a85`.

The suffix is SHA-256 over canonical JSON of the complete lock body excluding the `lock_id` field.

## Independent lock proof

The lock proof does not rederive against its own newer lock-branch HEAD.

Instead it creates a disposable detached Git worktree at the exact accepted merge
`9eebcd1b...`, executes the candidate derivation there, and requires exact
candidate-report and launcher-ELF byte identities before accepting the lock.

This prevents a lock branch from silently accepting a newly compiled launcher
whose expected-head macro names the lock branch rather than the reviewed
canonical candidate merge.

## Authority boundary

This lock changes only candidate/launcher binary identity acceptance:

```text
candidate_accepted=true
launcher_binary_identity_accepted=true
protected_install_authorized=false
precision_install_authorized=false
native_or_binder_live_execution_authorized=false
credential_access_authorized=false
private_key_access_authorized=false
signing_authorized=false
transaction_authorized=false
payment_acceptance_authorized=false
public_presale_activation_authorized=false
wc_void_market_activation_authorized=false
treasury_liquidity_action_authorized=false
funds_movement_authorized=false
production_host_evidence_authority=false
```

No Precision installation, service/systemd mutation, dormant-binder execution,
credential/key access, signing, RPC, transaction, payment acceptance,
presale/WC activation, treasury action, or funds movement is authorized.

Next gate:

`void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1`.

**PROTECT THE CORE.**
