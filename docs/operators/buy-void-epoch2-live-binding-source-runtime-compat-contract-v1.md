# Buy VOID Epoch-2 live-binding source/runtime compatibility contract V1

Marker: `VOID_BUY_VOID_EPOCH2_LIVE_BINDING_SOURCE_RUNTIME_COMPAT_CONTRACT_V1`.

Status: **source/test/CI only**. No Precision execution, installation, credential access, signing, payment acceptance, activation, or funds movement is authorized.

## Observed host state

The separately authorized Precision evidence established:

- canonical source HEAD `0ada7fde0d90c3946b10693f4621cbd690bfcde6`;
- canonical source tree `9e930fba9aacfafb5b163767302786cd7f31c81e`;
- installed runtime/policy HEAD `4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`;
- installed policy SHA-256 `746cfbe2f031868fff3a75f8307986f25c62460085f41a4827e712702a2d6549`;
- exact source/runtime compatibility: 15 ADD-only source paths, no modified/deleted/renamed pre-existing runtime paths;
- installed generation qualification GREEN through the reviewed V3 compatibility host-evidence path;
- no installed-policy mutation and no canonical checkout rewind.

The runtime policy is therefore valid historical runtime authority and **must not be rewritten merely to equal current source main**.

## Exact seam

The current dormant binding V2 and credential live-composition runner V3 each use one `expectedHead` for two different identities:

1. canonical source checkout identity; and
2. installed runtime/policy identity.

That assumption became false after source-only main advances.

The outer dormant native preentry V2 additionally requires the requested head to equal the installed live-composition policy head before streaming the binder. The credential native preentry V3 has the same policy-head equality, but that boundary is correct for the runtime-sensitive credential flow.

## Required successor split

The repair must preserve two independently authenticated identities:

- **runtime head**: `4c80887...`, used for installed V6R2 policy/native/runner qualification, sealed credential/process evidence, and the credential live-composition sensitive sequence;
- **source head**: `0ada7fde...`, used for canonical source checkout identity and source/runtime compatibility evidence.

Required implementation order:

1. credential live-composition runner V4 adds source/runtime compatibility while retaining runtime-policy head for the sensitive sequence;
2. a V6R3 runner/policy candidate-lock/install/qualification lifecycle upgrades only runner/policy as required; the existing credential native preentry V3 binary remains valid and policy-bound;
3. dormant candidate live-binding V3 adopts the same two-head evidence model;
4. dormant binder native preentry V3 candidate-lock/install/qualification binds the new binder byte identity.

No layer may silently reinterpret source HEAD as runtime-policy HEAD.

## Authority

Always false in this contract:

```text
host_execution_authorized=false
filesystem_mutation_authorized=false
canonical_checkout_mutation_authorized=false
installed_policy_mutation_authorized=false
service_mutation_authorized=false
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

Next source gate: `IMPLEMENT_EPOCH2_CREDENTIAL_RUNNER_V4_SOURCE_RUNTIME_COMPAT_SOURCE_ONLY`.

PROTECT THE CORE.


## Step 1 source implementation

The first required successor is now present in this Draft as:

`ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v4.mjs`.

This V4 source is **not installed** and grants no live authority. It preserves the existing installed native preentry V3 fixed-path/policy boundary and V3 confirmation token, but replaces the runner's historical single-head checkout requirement with an exact source/runtime compatibility check:

- runtime head is fixed to `4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`;
- source head is fixed to `0ada7fde0d90c3946b10693f4621cbd690bfcde6`;
- source tree is fixed to `9e930fba9aacfafb5b163767302786cd7f31c81e`;
- runtime→source delta must be exactly the reviewed 15 ADD-only paths;
- tracked checkout drift is rejected while unrelated untracked paths remain non-authoritative;
- credential-qualification and sealed-probe Git blobs must be identical at runtime and source heads;
- all live Git observation runs with global/system config disabled, replacement objects disabled, lazy fetch disabled, prompts/askpass disabled, and all Git transports denied; missing objects HOLD locally rather than contacting a remote;
- the sensitive sequence continues to use the runtime head authenticated by the installed native preentry.

The V4 receipt adds explicit source-checkout compatibility fields while keeping transaction/payment/activation/funds authority false.

Next source gate after exact-head CI: derive the V6R3 runner/policy candidate-lock/install/qualification lifecycle. The existing credential native preentry V3 binary remains intentionally unchanged.

## CI-only execution-path correction

The production target remains deliberately bound to fixed `/usr/bin/node` through
the installed native-preentry policy. Hosted CI is not the production host and
must not pretend that its toolcache layout is `/usr/bin/node`.

The focused Python source proof therefore resolves `node` from the hosted CI
`PATH` only for inert `--self-test` / `--plan` execution. This does not alter
the live runner's fixed target-host `NODE="/usr/bin/node"` constant or installed
policy identity.

The workflow also pins `actions/checkout` to the repository-reviewed immutable
commit and disables persisted checkout credentials. These are CI provenance
controls only; they grant no live authority.
