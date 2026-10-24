# Buy VOID Epoch-2 V6R2 policy chain rebind V3

Marker:

`VOID_BUY_VOID_EPOCH2_V6R2_POLICY_CHAIN_REBIND_V3`.

Status: **source/test/CI only**. This generation does not mutate Precision by
its existence and does not grant live economic authority.

## Purpose

Precision currently carries the accepted V6R2 native/runner pair while its
protected `policy-v3.conf` remains bound to historical reviewed source HEAD:

`4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`.

A read-only live census observed that policy as:

- 305 bytes;
- root:root mode 0444;
- SHA-256
  `746cfbe2f031868fff3a75f8307986f25c62460085f41a4827e712702a2d6549`;
- runner SHA-256
  `7d67e3490b7066c089418eb1da9412570a39db2b422cdc1c62afb2482bf2bd94`;
- Node SHA-256
  `fde6a4bf8d0562f7751d1a2d6cb9b417c4cfe107bbcb0aa3e9a24e125e348f48`;
- Node bytes `124827920`.

The same census proved the prior policy witness chain is intact:

1. original `65b4515b...` policy:
   SHA-256
   `dd27149ac4faa950843b16a39824bb77ec88cdab63593d7ee836ca879ddc6cd9`;
2. retained `b92ba19c...` policy:
   SHA-256
   `9d18271055dc430335a6607a426c3082f950148087b87a6bc790a818d8b6286d`;
3. current live `4c80887...` policy:
   SHA-256
   `746cfbe2f031868fff3a75f8307986f25c62460085f41a4827e712702a2d6549`.

The retained historical V4 protected-root predecessor is also exact and no
historical V1/V2 policy-rebind stage is present.

V1 and V2 intentionally model earlier hops. V3 adds only the next lineage hop.
It does not rewrite historical policy witnesses.

## Verified dependency

V3 consumes the exact V2 source generation:

- path:
  `ops/precision/void_buy_void_epoch2_live_composition_policy_chain_rebind_v2.py`;
- Git blob:
  `891cce24244c62756caeba6d2bf702cc92e8a956`.

V2 in turn retains the reviewed V1 atomic `renameat2` primitive and protected
V6R2 installer bindings. V3 reuses that exact atomic mechanism rather than
introducing a new publication primitive.

## Exact immediate predecessor

The V3 READY state requires the live protected policy to derive exactly from:

`4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`.

Its exact identity is:

- bytes: `305`;
- SHA-256:
  `746cfbe2f031868fff3a75f8307986f25c62460085f41a4827e712702a2d6549`.

The focused self-test independently rebuilds this policy from the exact observed
Node generation and requires the resulting digest to equal that value.

## Required predecessor witnesses

Before any future apply, all of these must remain exact:

- retained V4 protected root;
- original policy witness
  `/opt/.void-buy-void-epoch2-live-composition-v3.policy-predecessor-65b4515b`;
- previous policy witness
  `/opt/.void-buy-void-epoch2-live-composition-v3.policy-predecessor-b92ba19c`;
- current live `4c80887...` policy;
- accepted V6R2 native and runner.

V3 also requires all earlier rebind staging paths and its own V3 stage to be
absent.

An unknown, missing, altered, interrupted, or mixed lineage is HOLD.

## V3 READY state

`EPOCH2_V6R2_POLICY_4C80887_READY_FOR_CHAIN_REBIND` requires:

1. current protected native and runner match accepted V6R2;
2. retained V4 predecessor is exact;
3. exact `65b...` witness is present;
4. exact `b92...` witness is present;
5. no retained `4c80887...` witness exists yet;
6. live policy is exactly the canonical `4c80887...` policy;
7. no historical or V3 policy-rebind stage exists;
8. checkout/Git/setpriv/Node generations bind to the requested clean successor
   HEAD.

## Atomic third hop

A future separately authorized apply:

1. derives a new policy only from the exact requested successor HEAD and fixed
   accepted Node/runner generation;
2. stages the exact new 305-byte policy create-only;
3. revalidates checkout, Node, V6R2 root, V4 predecessor and the existing
   two-policy witness chain;
4. atomically exchanges the staged policy with live `policy-v3.conf` using
   `RENAME_EXCHANGE`;
5. verifies the new live policy and exact displaced `4c80887...` policy;
6. publishes that displaced policy create-only at:
   `/opt/.void-buy-void-epoch2-live-composition-v3.policy-predecessor-4c80887a`;
7. fsyncs and revalidates the complete three-witness lineage.

The `65b...` and `b92...` witnesses are never renamed, overwritten, or
deleted.

## GREEN state

`EPOCH2_V6R2_POLICY_HEAD_REBOUND_WITH_65B_B92_AND_4C80887_POLICIES_RETAINED`
requires:

- live policy equals the requested successor HEAD;
- exact retained `65b...` witness;
- exact retained `b92...` witness;
- exact retained `4c80887...` witness;
- exact retained V4 protected predecessor;
- no V1, V2, or V3 rebind stage.

A GREEN policy rebind still grants no live credential/signing or economic
authority. The installed V5 read-only qualification must be run again against
the same exact HEAD before the V3R dormant-candidate live-binding boundary is
considered.

## Rollback and failure truth

If failure occurs after the live exchange, V3 restores the exact
`4c80887...` predecessor through the same atomic exchange primitive.

If the `4c80887...` backup has already been published, rollback exchanges that
exact backup with the live policy and removes only the displaced new policy
after exact verification.

If publication has occurred, the failure receipt remains publication-aware even
when rollback returns to READY. Unproven rollback or final state is reported as
UNKNOWN and never silently converted into a pre-mutation claim.

## Hosted proof

Hosted CI performs source-only checks:

- exact dependency/source blob binding;
- Python syntax;
- production self-test;
- source plan;
- independent reconstruction of the observed `4c80887...` policy digest;
- READY/GREEN state-classifier tests with synthetic path presence;
- interrupted V3-stage refusal;
- publication-aware failure receipt checks;
- exact no-authority markers.

Hosted CI does not read Precision `/opt`, credentials, private keys, service
state, wallets, or transaction state.

## Authority boundary

Source/test/CI only:

```text
protected_policy_mutation_authorized=false
native_mutation_authorized=false
runner_mutation_authorized=false
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
```

A future host plan remains read-only. Any apply requires a separately reviewed
exact plan ID and explicit V3 confirmation token.

PROTECT THE CORE. PROTECT THE TRUTH.
