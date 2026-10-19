# Buy VOID Epoch-2 dormant binder native candidate lock V3

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_LOCK_V3`.

Status: **post-#3363 candidate/native identity acceptance only; not installed and not authorized for live execution**.

## Why V3 exists

Pre-#3363 V2 locks were derived before the dormant-binder candidate helper was
changed to execute the already-verified merged V1 helper bytes directly in
memory.

Merged #3363 changed the content-addressed candidate evidence identity while
preserving the native ELF bytes.

Those earlier locks are therefore historical only and explicitly carry no
installation authority:

- `voidbuye2dormantbinderlock2_34df85425460aa9fc5192cee326de4b711deefbcb195dc6b7b6c3ebd23eb5597`;
- `voidbuye2dormantbinderlock2_ff414ad8704f0a4fc487bae78a3938d5b7312205c084a0ae9fe0cbafcc80b96a`.

## Accepted post-#3363 candidate

Exact candidate PR head:

`f5e92afdf392230ca41de77d2542dcd2c1365a33`.

Merged generation:

`2b76758851d550e8cbd5fc71412e4b85cfaa8791`.

Candidate ID:

`voidbuye2dormantbindercand2_8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d`.

Candidate report:
- bytes: `7870`;
- SHA-256:
  `f21445a333a2c05d132692c29aa929a1de727d6f6f35ce2edac600a7cccfa4a2`;
- Git blob:
  `4ba13c0b8a471d36c7644754e27ec0b8c07481ca`.

Native static ELF:
- bytes: `726976`;
- SHA-256:
  `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`.

The ELF is intentionally byte-identical to the pre-#3363 derivation. Only the
evidence identity changed.

## Verified helper execution

The accepted report binds merged V1 helper:
- Git blob `5ac4264d7f9bdb394cf5be4490aa1eadd1f929ee`;
- bytes `29870`;
- SHA-256
  `ee796b5e32267d61b877bd934818bf0318ca810cd222626dc66a7958ad538f71`;
- `executed_from_verified_bytes=true`;
- `mutable_path_import=false`.

The helper pathname is not reopened through importlib after verification.

## Hosted evidence

Workflow run:

`38953341680`.

Jobs:
- source proof: `117149942343`;
- derive A: `117150120811`;
- derive B: `117150120884`;
- derive C: `117150120735`;
- independent compare/rederivation: `117150690661`.

Artifacts:
- A: `12069128951`;
- B: `12069029721`;
- C: `12069029667`.

The three reports and three native ELFs are byte-identical. The compare job
independently rederived both once more.

## Lock identity

`voidbuye2dormantbinderlock3_a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a`.

The suffix is SHA-256 over canonical JSON of the complete V3 lock body excluding
the `lock_id` field.

## Authority boundary

This lock changes only candidate/native identity acceptance:

```text
candidate_accepted=true
native_binary_identity_accepted=true
binder_source_identity_bound=true
protected_install_authorized=false
live_execution_authorized=false
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

No Precision installation, live binder execution, credential/key access,
signing, RPC, transaction, payment acceptance, presale/WC activation,
treasury action, or funds movement is authorized.

Next gate:

`void_buy_void_epoch2_dormant_binder_native_protected_install_v2`.

PROTECT THE CORE.
