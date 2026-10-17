# Buy VOID Epoch-2 repaired protected-bootstrap candidate lock V4

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_CANDIDATE_LOCK_V4`.

Status: **canonical candidate/bootstrap identity acceptance only; no install/apply authority**.

## Why V4 exists

Merged #3431 added the repaired bootstrap V3 candidate derivation gate after
merged #3430. The pull-request preview candidate was not final authority.

After #3431 merged, the V3 workflow ran again on canonical main:

`78875f7379c2dd995e1b545dd0543c934e59907a`

Tree:

`a2c1b6b9989ceb11c4fbea3f2fc4ecf64eb50176`.

V4 accepts only that post-merge main-push generation. Historical V3/V2/V1
locks remain byte-frozen and have no authority for the repaired V3 generation.

## Canonical hosted evidence

Workflow run: `39011843315`.

Jobs:

- source proof: `117335846267`;
- derive A: `117335919564`;
- derive B: `117335919589`;
- derive C: `117335919631`;
- compare: `117335995633`.

Artifacts:

- A: `12092852842`;
- B: `12093177757`;
- C: `12093252278`.

All three artifacts are bound to `main@78875f73...`. The three reports and
three bootstrap ELFs are byte-identical and the compare job independently
rederives both.

## Canonical V3 candidate

Candidate ID:

`voidbuye2bootstrapcand3_9e914f52eb3cde5a5fef42fbdf065b375f89fdabb768034b09615861bba67ce3`.

Candidate report:

- bytes: `4789`;
- SHA-256:
  `90f70f1dbabd71bc97860608a3650331b1ed6efb007c64f2257e4523e2362050`;
- Git blob:
  `a94f63689f7a1e1ca63cd3051aec84cf89b74d46`.

Accepted bootstrap V3 ELF:

- bytes: `731072`;
- SHA-256:
  `904e6b05df45bc9212be7689ea0617ccfbf65d5edf8535a381abcbb588f236cd`;
- Git blob:
  `69e3bf6db7baf614eb0b7d8c5e93aafce0deab46`.

The canonical report binds:

- candidate proof blob
  `1c49abf74e464b3d509a33e2fa3f1a9acc42c771`;
- candidate workflow blob
  `2e48100a85dfd629aeef6cef532bbdcb6ce7b37d`;
- candidate documentation blob
  `81752a785713754ea80d83e7b1d440ade14f8d6b`;
- bootstrap V3 source blob
  `2c3c9ed120cc9949a0528e43be886354aa25da5a`;
- repaired inner installer V2 blob
  `69a018c0eccedf3782055c56725579d02463b05e`.

The repaired inner installer is 58,454 bytes with SHA-256
`6db5c9520af7070056acfd854d79219053fbcb561f63e7530423974ddd80562a`.

## Runtime-head contract

The accepted V3 bootstrap preserves:

```text
runtime_expected_head_compile_bound=false
runtime_expected_head_strict_lowercase_hex=true
runtime_expected_head_forwarded_unchanged=true
repository_head_not_embedded_in_bootstrap=true
```

Its compile-time confirmation is:

`INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V2_CREATE_ONLY`.

Its fixed production root is:

`/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v3`.

## Historical preservation

Historical V3 lock remains frozen:

- ID
  `voidbuye2bootstraplock3_690d119c90f5c8c20f429fcc14919b62691f9a1b3bfe2226476267ede993197f`;
- Git blob
  `64c9a42ca1108a9e8f88218c34d53e50668c653e`;
- install authority: false.

Historical V2 and V1 locks also remain preserved with install authority false.

No historical lock is repinned as V4.

## V4 lock identity

`voidbuye2bootstraplock4_6568c1cd0195405d49001fbf6cb9a086364e401f78f3bfcf1d6cbb080947cb67`.

The suffix is SHA-256 over canonical JSON of the complete V4 lock body excluding
the `lock_id` field.

The lock proof rederives the candidate from a detached worktree at exact
canonical source head `78875f73...` and requires exact report/ELF byte
identity before accepting the lock.

## Relationship to #3413

This lock accepts the reproducible repaired V3 bootstrap identity. It does not
by itself close #3413's complete immutable-dependency-manifest,
repository-object-store-indirection, or prechild/private-proof requirements.

## Authority

```text
candidate_accepted=true
bootstrap_binary_identity_accepted=true
bootstrap_source_identity_bound=true
installer_source_identity_bound=true
runtime_head_contract_accepted=true
canonical_main_candidate_authority=true
superseded_v3_lock_install_authority=false
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

`void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_materializer_v3`.

**PROTECT THE CORE.**
