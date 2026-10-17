# Buy VOID Epoch-2 runtime-head protected-install bootstrap candidate lock V2

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_CANDIDATE_LOCK_V2`.

Status: **candidate/bootstrap identity acceptance only; not installed and no protected-installer apply authority**.

## Accepted canonical candidate

The accepted V2 candidate was derived at exact source head
`917a6247973310c539a4186c59825b1474ce0251`, tree
`4085987d856fa303b8bc81087e3b5a207bc8964f`, and merged as
`344f0abcc57d6f2fbacbb6a57e27009ae9ea7a4b`.

Hosted evidence:
- workflow run `38992179155`;
- source-proof job `117276747701`;
- derive jobs A/B/C `117276822040`, `117276821865`, `117276821885`;
- artifacts A/B/C `12085925401`, `12086085389`, `12085587684`;
- compare job `117276938623`.

The three hosted reports and three bootstrap ELFs were byte-identical. The compare
job independently rederived both report and ELF.

## Candidate report identity

- candidate ID:
  `voidbuye2bootstrapcand2_a8acbc7a61ed1a5a59a29529b678e1473c044584a663bcdb1174756c29c71eb5`;
- bytes: `4789`;
- SHA-256:
  `f740e5e9194cbef3b967050ba215b83ccb442000ad549eccf342c5be2e7acb36`;
- Git blob:
  `1d0505dbb67b9c9ce710335f20d606d56d91570f`.

The report binds:
- candidate proof blob `4f9b5a2ca77b3aebc9e70ea835c92155601a1a06`;
- candidate workflow blob `46488e048565b79676de05732ee58a35badfd395`;
- candidate doc blob `b5580a5be7d28ea915f16d0d2fd1e952ddb0018a`;
- bootstrap source blob `19f9baf8d6d707da43dbd0e247667af1a10e46c5`;
- #3391 installer blob `383b84e71b371de65579e4113469e86a59b807ab`;
- fixed V2 root
  `/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v2`;
- fixed Python `/usr/bin/python3`;
- exact apply confirmation
  `INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V1_CREATE_ONLY`.

## Runtime-head contract

The accepted ELF contains no compile-time repository HEAD. The accepted evidence
requires:
- `runtime_expected_head_compile_bound=false`;
- strict lowercase 40-hex runtime-head admission;
- the runtime head forwarded unchanged to the authenticated child; and
- the candidate repository HEAD bytes absent from the ELF.

The sealed #3391 child remains the component that proves the supplied runtime
head equals the actual clean checkout on branch `main`.

## Accepted bootstrap ELF

- bytes: `731072`;
- SHA-256:
  `37a6979c274e93fa09860b26664804a9d912201a290db65deb9b4499e39aa276`;
- Git blob:
  `45ca1ed7a6237fccbd6bb0b9d73ef5ff47c72d62`;
- static with no `PT_INTERP`;
- no dynamic `NEEDED`;
- inert self-test GREEN;
- root-protected toolchain revalidated after build.

## Lock identity

`voidbuye2bootstraplock2_7a306d22914d51844489688ab33152d98c8ea1d30b0eb887d8e1adfe883c7170`.

The suffix is SHA-256 over canonical JSON of the complete lock body excluding
the `lock_id` field.

The frozen-head V1 lock remains historical evidence only:

`voidbuye2bootstraplock1_4f11418d278908c99cc3b2de622112321600c3f3704f8919e893a2d7011b1b23`.

It has no V2 installation authority.

## Authority boundary

```text
candidate_accepted=true
bootstrap_binary_identity_accepted=true
bootstrap_source_identity_bound=true
installer_source_identity_bound=true
runtime_head_contract_accepted=true
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

`void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_materializer_v2`.

PROTECT THE CORE.
