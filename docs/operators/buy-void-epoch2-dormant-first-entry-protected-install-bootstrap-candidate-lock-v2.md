# Buy VOID Epoch-2 runtime-head protected-bootstrap candidate lock V2

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_CANDIDATE_LOCK_V2`.

Status: **canonical candidate identity acceptance only; not installed and no protected-installer apply authority**.

## Accepted canonical candidate

The accepted V2 candidate is the post-merge canonical-main derivation:

- source head: `344f0abcc57d6f2fbacbb6a57e27009ae9ea7a4b`;
- source tree: `4085987d856fa303b8bc81087e3b5a207bc8964f`;
- workflow run: `38992362910`;
- source-proof job: `117277316976`;
- derive A/B/C:
  `117277390838`, `117277390764`, `117277390783`;
- compare job: `117277532037`;
- artifacts A/B/C:
  `12086055391`, `12086105502`, `12086085720`.

All three hosted report/ELF pairs were byte-identical after extraction, and the
compare job independently rederived both report and ELF.

## Candidate report identity

- candidate ID:
  `voidbuye2bootstrapcand2_b71b8757fa64fc36c2df0e95e3812c00eccef114b71e0b854c34ddfd62285def`;
- bytes: `4789`;
- SHA-256:
  `2ca03a4d7e609076df740a7590abfae572101ef7bf78feacf11240e309a43ee4`;
- Git blob:
  `fbaab61d0e169516a49c5c07feeceba1a7204e83`.

The report binds:

- candidate proof blob `4f9b5a2ca77b3aebc9e70ea835c92155601a1a06`;
- candidate workflow blob `46488e048565b79676de05732ee58a35badfd395`;
- candidate doc blob `b5580a5be7d28ea915f16d0d2fd1e952ddb0018a`;
- V2 source blob `19f9baf8d6d707da43dbd0e247667af1a10e46c5`;
- V2 source bytes `19450`;
- V2 source SHA-256
  `8f013230fc6a0874d8843ab895f22cec8f5baeceb6c15fb6b7d97fc5b50081e3`;
- #3391 installer blob `383b84e71b371de65579e4113469e86a59b807ab`;
- exact confirmation
  `INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V1_CREATE_ONLY`;
- fixed V2 root, fixed #3391 path and `/usr/bin/python3`.

## Accepted V2 ELF

- bytes: `731072`;
- SHA-256:
  `37a6979c274e93fa09860b26664804a9d912201a290db65deb9b4499e39aa276`;
- Git blob:
  `45ca1ed7a6237fccbd6bb0b9d73ef5ff47c72d62`;
- static, no `PT_INTERP`;
- no dynamic `NEEDED`;
- inert self-test GREEN;
- root-protected compiler/strip/static-link identities revalidated.

The V2 ELF is byte-identical to the PR-head preview ELF even though the canonical
candidate report changed from the preview head to the merge head. This is
expected and proves repository HEAD is not a V2 compile input.

## Runtime-head acceptance

The accepted candidate contract requires:

```text
runtime_expected_head_compile_bound=false
runtime_expected_head_strict_lowercase_hex=true
runtime_expected_head_forwarded_unchanged=true
repository_head_not_embedded_in_bootstrap=true
```

The lock proof independently rederives the candidate from a detached worktree at
the canonical source head, checks the exact candidate report/ELF bytes, rejects
a compile-binding `expected_head` field, and rejects the ELF if the canonical
source HEAD bytes are embedded.

Repository HEAD is authenticated later at invocation time by V2 plus the sealed
#3391 child; this lock does not weaken that boundary.

## Lock identity

`voidbuye2bootstraplock2_8524098b733e02451e307a8814fb593bbce9f6239f1e45ecda1563efb95e3ce7`

The suffix is SHA-256 over canonical JSON of the complete lock body excluding
the `lock_id` field.

## Authority boundary

This lock accepts identity only:

```text
candidate_accepted=true
bootstrap_binary_identity_accepted=true
bootstrap_source_identity_bound=true
installer_source_identity_bound=true
runtime_expected_head_not_compile_bound=true
runtime_expected_head_contract_accepted=true
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

No Precision filesystem mutation, bootstrap installation/execution, #3391 apply,
service/systemd action, credential/key access, signing, transaction/RPC,
payment acceptance, presale/WC activation, treasury action, or funds movement
is authorized.

Next gate:

`void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_install_v2`.

**PROTECT THE CORE.**
