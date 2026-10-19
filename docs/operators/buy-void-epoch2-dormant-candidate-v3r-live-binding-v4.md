# Buy VOID Epoch-2 dormant candidate V3R live binding V4 — dynamic current-source successor

Marker: `VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V4`.

Status: **source/test/CI only**. This Draft does not install the binder, execute the
live binding, read credentials, sign transactions, accept payments, activate the
presale or WC/VOID market, mutate services, or move funds.

## Why V4 exists

The historical V3 source lane compile-bound:

- source HEAD `0ada7fde0d90c3946b10693f4621cbd690bfcde6`;
- source tree `9e930fba9aacfafb5b163767302786cd7f31c81e`;
- historical installed-generation compatibility V3 from PR #3535.

That shape self-invalidates when canonical `main` advances. It also ties current
source authority to a historical compatibility program that is intentionally absent
from the current-main #3546 integration.

V4 removes all compile-time current-source HEAD/tree authority and does not depend on
the historical #3535 compatibility V3 source.

## Runtime/current-source split

Runtime policy authority remains:

```text
runtime_head=4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb
runtime_tree=de12c9d2d5e475d435d21da3b047d7b63b69e2b7
runtime_policy_sha256=746cfbe2f031868fff3a75f8307986f25c62460085f41a4827e712702a2d6549
```

Current source is observed at live execution from the canonical checkout. The binder
requires:

1. canonical Git dir/worktree pinning;
2. `main` branch;
3. exact tracked checkout state without enumerating or granting authority to untracked paths;
4. bounded raw `cat-file -t/-p` commit-parent traversal from current source HEAD to
   the runtime head;
5. no revision-walk/graft metadata as ancestry authority;
6. exact runtime/current equality for the complete nine-entry runtime-sensitive
   credential dependency set already accepted by #3546;
7. the exact dormant candidate V4 Git object at the observed current source HEAD;
8. terminal source HEAD/tree/branch/tracked-state revalidation.

The complete runtime-sensitive set is:

- installed credential qualifier V3R;
- protected qualifier replacement V3R;
- V6 live qualifier;
- V6 protected replacement;
- credential-query ELF lock V3R;
- credential-query ELF lock V2;
- V6 query ELF lock;
- allocation-custody host-evidence parser V4;
- sealed credential attestation V2.

## Sensitive sequence

Native Preentry V4 remains the first live entry. It binds:

- its own installed generation;
- the exact Binder V4 Git blob, SHA-256 and byte count;
- fixed root-custodied `/usr/bin/node`;
- the existing V3 runtime policy and runtime head;
- a private parent/child generation proof carrying both requested source and runtime heads.

Binder V4 then:

1. proves current source compatibility;
2. requires the caller-provided source head to equal the observed canonical source head;
3. authenticates the exact dormant candidate V4 Git object from that source generation;
4. executes the existing fixed V3 native live-composition entry with the runtime policy head only;
5. validates the authenticated credential/live receipt produced by that installed runtime path;
6. repeats the complete current-source compatibility proof;
7. requires the pre/post source snapshots to be identical;
8. revalidates the native parent proof;
9. emits a V4 candidate-binding receipt.

The installed native/runner receipt is runtime evidence. Current-source compatibility is
a separate proof. V4 does not revive or reinterpret historical compatibility V3 output.

## Exact source identities

```text
binder_git_blob=f5cf208d8a0c12a72ed885fec286563092d23a0e
binder_sha256=6ee053d50d99096a6f6617ff8fec6968cb6f1ba8623825c0ae25d3d245ea08a3
binder_bytes=38416
native_preentry_git_blob=afe6dbc8d4e2b80117500ac961e99a0c80a78f60
dormant_candidate_git_blob=e569c9211e01f14c7c00dd1c5041d4dfb0817609
runtime_dependency_count=9
```

These identities are source-candidate identities only. No protected installation or
host execution authority follows from them.

## Negative authority

Always false in this source lane:

```text
host_execution=false
protected_filesystem_mutation=false
canonical_checkout_mutation=false
installed_policy_mutation=false
service_mutation=false
systemd_mutation=false
credential_access=false
private_key_access=false
wallet_or_signer_access=false
signing=false
transaction=false
transaction_broadcast=false
payment_acceptance=false
customer_safe_to_pay=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
production_host_evidence_authority=false
```

## Next gate

After exact-head source CI and independent review, derive a content-addressed
Binder V4 native-preentry candidate lock/install/qualification lifecycle. Installation
and any live execution remain separate authorization boundaries.

PROTECT THE CORE.
