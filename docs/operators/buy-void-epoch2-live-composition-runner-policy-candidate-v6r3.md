# Buy VOID Epoch-2 live-composition runner/policy candidate V6R3

Marker: `VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_CANDIDATE_V6R3`.

Status: **source/test/CI candidate only**. This does not install or execute a live credential composition.

## Purpose

Freeze the first installation-generation input after the two-head source/runtime repair in #3543.

The accepted native preentry V3 binary is intentionally reused unchanged:

- native source Git blob: `5021727f1def1ec11f870d735cab65acc1701a5e`;
- native binary SHA-256: `85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8`;
- native bytes: `726976`;
- accepted V6R2 lock: `voidbuye2nativecandlock6r2_ab95f15c8f2731adf6bfd97dfd5467495c90bdb5ee267948efc6a522be74b417`.

The candidate is being re-derived against repaired Runner V4. The prior Runner
V4 blob `46da5a2d...` and candidate ID are superseded and carry no install
authority. The repaired runner no longer compile-binds a transient current
source HEAD; it observes current `main` at runtime and requires local ancestry,
clean tracked state, exact dependency-blob equality, and no untracked-path
authority.

## Policy boundary

Policy bytes are deliberately **not** frozen by hosted CI because policy V3 binds
the protected host's actual Node executable identity.

The future protected plan must derive:

```text
schema=VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V3
expected_head=4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb
runner_sha256=<accepted Runner V4 SHA-256>
runner_bytes=<accepted Runner V4 bytes>
node_sha256=<descriptor-bound Precision Node SHA-256>
node_bytes=<descriptor-bound Precision Node bytes>
```

Current source HEAD `0ada7fde...` must never replace the runtime expected head in that policy.

## Authority

The only positive authority is source-only candidate derivation plus a create-only
candidate-report file chosen by the caller.

Always false:

```text
candidate_accepted=false
protected_install_authorized=false
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

Next gate after exact-head candidate evidence:
`void_buy_void_epoch2_live_composition_runner_policy_candidate_lock_v6r3`.

PROTECT THE CORE.


## Superseded candidate generation

Historical candidate
`voidbuye2runnerpolcand6r3_eee91de4...` was derived from Runner V4 blob
`46da5a2d...`. The subsequent self-invalidating-head repair changed Runner V4
to blob `4d50bec847c697bac75e40121173b4840eeab879`.

Therefore the historical candidate and lock are superseded. Re-derive the
candidate and then re-address the lock before any upgrade-plan source may claim
an accepted V6R3 generation.
