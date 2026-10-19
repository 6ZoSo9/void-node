# Buy VOID Epoch-2 canonical runtime-head bootstrap candidate lock V3

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_CANDIDATE_LOCK_V3`.

Status: **canonical candidate/bootstrap identity acceptance only; no install/apply authority**.

## Why V3 exists

Merged lock V2 accepted the pull-request preview report derived at
`917a6247973310c539a4186c59825b1474ce0251`.

After #3418 merged, the candidate workflow ran again on canonical main at:

`344f0abcc57d6f2fbacbb6a57e27009ae9ea7a4b`.

Because the V2 candidate report is intentionally source-generation-addressed,
the canonical main-push report has a different candidate ID even though the
static bootstrap ELF is byte-identical.

V3 preserves lock V2 byte-for-byte as historical evidence and makes only the
canonical main-push report authoritative for the next materialization gate.

## Canonical hosted evidence

Workflow run: `38992362910`.

Jobs:

- source proof: `117277316976`;
- derive A: `117277390838`;
- derive B: `117277390764`;
- derive C: `117277390783`;
- compare: `117277532037`.

Artifacts:

- A: `12086055391`;
- B: `12086105502`;
- C: `12086085720`.

The three hosted reports and three bootstrap ELFs were byte-identical. The
compare job independently rederived both report and ELF.

## Canonical candidate report

Source head:

`344f0abcc57d6f2fbacbb6a57e27009ae9ea7a4b`.

Source tree:

`4085987d856fa303b8bc81087e3b5a207bc8964f`.

Candidate ID:

`voidbuye2bootstrapcand2_b71b8757fa64fc36c2df0e95e3812c00eccef114b71e0b854c34ddfd62285def`.

Report:

- bytes: `4789`;
- SHA-256:
  `2ca03a4d7e609076df740a7590abfae572101ef7bf78feacf11240e309a43ee4`;
- Git blob:
  `fbaab61d0e169516a49c5c07feeceba1a7204e83`.

The source tree is intentionally identical to the preview source tree; the
report differs because its provenance binds canonical merge HEAD.

## Accepted bootstrap ELF

The binary identity did not change across preview and canonical derivations:

- bytes: `731072`;
- SHA-256:
  `37a6979c274e93fa09860b26664804a9d912201a290db65deb9b4499e39aa276`;
- Git blob:
  `45ca1ed7a6237fccbd6bb0b9d73ef5ff47c72d62`.

The accepted evidence still requires:

```text
runtime_expected_head_compile_bound=false
runtime_expected_head_strict_lowercase_hex=true
runtime_expected_head_forwarded_unchanged=true
repository_head_not_embedded_in_bootstrap=true
```

The sealed #3391 child remains responsible for authenticating the supplied
runtime HEAD against clean branch `main` and exact accepted lock/source
identities.

## Historical V2 preservation

Historical V2 lock:

`voidbuye2bootstraplock2_7a306d22914d51844489688ab33152d98c8ea1d30b0eb887d8e1adfe883c7170`

Git blob:

`90dfe7728fa56c8d41a396399578bd1b8c52c2f4`.

Historical V2 preview candidate:

`voidbuye2bootstrapcand2_a8acbc7a61ed1a5a59a29529b678e1473c044584a663bcdb1174756c29c71eb5`.

V3 proof requires that historical V2 remains present at its exact blob and that
all V2 action-authority fields remain false.

V2 is not repinned or rewritten.

## V3 lock identity

`voidbuye2bootstraplock3_690d119c90f5c8c20f429fcc14919b62691f9a1b3bfe2226476267ede993197f`.

The suffix is SHA-256 over canonical JSON of the V3 lock body excluding
`lock_id`.

## Authority

```text
candidate_accepted=true
bootstrap_binary_identity_accepted=true
bootstrap_source_identity_bound=true
installer_source_identity_bound=true
runtime_head_contract_accepted=true
canonical_main_candidate_authority=true
superseded_v2_lock_install_authority=false
superseded_v1_lock_install_authority=false
protected_bootstrap_install_authorized=false
protected_installer_apply_authorized=false
live_execution_authorized=false
credential_access_authorized=false
private_key_access_authorized=false
signing_authorized=false
transaction_authorized=false
rpc_call_authorized=false
payment_acceptance_authorized=false
public_presale_activation_authorized=false
wc_void_market_activation_authorized=false
treasury_liquidity_action_authorized=false
funds_movement_authorized=false
production_host_evidence_authority=false
```

No Precision filesystem mutation or bootstrap execution occurs.

Next gate:

`void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_materializer_v2r`.

**PROTECT THE CORE.**
