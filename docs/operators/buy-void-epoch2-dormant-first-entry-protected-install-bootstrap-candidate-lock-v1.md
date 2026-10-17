# Buy VOID Epoch-2 dormant first-entry protected-install bootstrap candidate lock V1

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_CANDIDATE_LOCK_V1`.

Status: **candidate/native bootstrap identity acceptance only; not installed and no protected-installer apply authority**.

## Accepted canonical candidate

The accepted candidate was derived from canonical merged main:

- source head: `0ea097a3fa43dc95a1a0a5272c61afe570361fc7`;
- source tree: `681e9387826f2c0fe8c0336604dfd6e57ff16d93`;
- candidate workflow run: `38986855724`;
- source-proof job: `117260218054`;
- derive jobs A/B/C:
  `117260304902`, `117260304907`, `117260304895`;
- compare job: `117260613658`;
- artifacts A/B/C:
  `12083705966`, `12083357954`, `12083014356`.

The three hosted reports and three bootstrap ELFs were byte-identical. The compare
job independently rederived both report and ELF.

## Candidate report identity

- candidate ID:
  `voidbuye2bootstrapcand1_24d4c84d307c525cc4e28f010c7f2258db2e55256af7d8cf0cb303cf1c4ee851`;
- bytes: `4705`;
- SHA-256:
  `b3f909c391ce617b7a8e796749bb57ce69f95b27259dd9da1c0fae849d6e74f7`;
- Git blob:
  `0675dbcc993171edb2bbbbc7fd9481e4ed0ef006`.

The report binds:

- candidate proof blob `d1417455330837c4d584f7bf36f932a869c903cb`;
- candidate workflow blob `a4ef30d41a2a950c12db63f6a013cf5bc2b8abcf`;
- candidate doc blob `a7d4af84c6c21f5d6e4d894c130f7d4965885a96`;
- bootstrap source blob `243583d4ed0522796b2bbf448abd4e9c28958f50`;
- merged installer blob `383b84e71b371de65579e4113469e86a59b807ab`;
- exact compile confirmation
  `INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V1_CREATE_ONLY`;
- production defaults under
  `/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v1`,
  the fixed merged installer path, and `/usr/bin/python3`.

## Accepted bootstrap ELF

- bytes: `731072`;
- SHA-256:
  `1b570f704841f8b833707de2c85ca66d2a344f3a77b5d1979ab29eaae2ec1189`;
- Git blob:
  `5d35e762fa4b510baeb89b2840d5287cc4fd6716`;
- static, no `PT_INTERP`;
- no dynamic `NEEDED`;
- inert self-test GREEN;
- root-protected toolchain identity was revalidated after build.

## Lock identity

`voidbuye2bootstraplock1_4f11418d278908c99cc3b2de622112321600c3f3704f8919e893a2d7011b1b23`.

The suffix is SHA-256 over canonical JSON of the complete lock body excluding
the `lock_id` field.

The lock CI does not merely trust the historical artifact IDs. It creates a
detached worktree at the frozen candidate source head, independently rederives
the candidate report and bootstrap ELF, and requires exact equality with the
accepted report/ELF byte identities.

## Authority boundary

This lock changes only candidate identity acceptance:

```text
candidate_accepted=true
bootstrap_binary_identity_accepted=true
bootstrap_source_identity_bound=true
installer_source_identity_bound=true
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

No Precision filesystem mutation, bootstrap installation, protected-installer
apply, service/systemd action, credential/key access, signing, transaction/RPC,
payment acceptance, presale/WC activation, treasury action, or funds movement
is authorized.

Next gate:

`void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_install_v1`.

PROTECT THE CORE.
