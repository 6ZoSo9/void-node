# Apollyon claim-contract canonical JSON V2

Marker: `VOID_APOLLYON_CLAIM_CONTRACT_CANONICAL_JSON_V2`

Status: **source/test/CI-only serializer candidate**. Frozen V1 is unchanged.
No consumer migration, protected-host execution, claim publication, training,
credential/signing, transaction or funds authority follows from this source.

## Why a V2 serializer is needed

Frozen V1 `canonicalApollyonClaimContractJsonV1()` recursively rebuilds plain
objects as ordinary `{}` values and then calls the live realm's
`JSON.stringify`. That preserves the historical bytes in an ordinary clean
realm, but an inherited `Object.prototype.toJSON`, inherited
`Array.prototype.toJSON`, or a replaced `JSON.stringify` can influence the
final canonical bytes after otherwise valid source has loaded.

The #3557 protected-store design therefore cannot treat V1 canonical bytes as
future host authority merely because the caller's own object descriptors were
validated. A changed serializer must be versioned rather than silently changing
historical V1 hashes.

## Exact source generation

- base: `main@61b0f81b2112aab32e3dc16084fe2d43178ec4da`
- frozen V1 path:
  `tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs`
- frozen V1 Git blob:
  `f97fafb0148527ae3a954e2752faef8c7fc9e88e`
- V2 serializer path:
  `tools/apollyon-claim-contract-canonical-json-v2.mjs`
- V2 serializer Git blob:
  `7880229ec73d22c51b176f9a07a64a54f3ac89ae`
- V2 proof path:
  `scripts/prove_apollyon_claim_contract_canonical_json_v2.mjs`
- V2 proof Git blob:
  `789f0717fdf9ef08da34576e526c9798cd8d139e`

The branch is four ADD-only paths. V1 and all current consumers remain byte
unchanged.

## V2 serialization boundary

V2 does not pass constructed objects or arrays to `JSON.stringify`. It emits
canonical JSON directly.

Accepted values are deliberately closed:

- `null`, booleans and safe integers;
- strings up to the reviewed bound, with JSON-compatible control-character and
  lone-surrogate escaping;
- dense ordinary arrays with only their indexed data properties and `length`;
- ordinary or null-prototype objects with enumerable own string **data**
  properties only.

The serializer rejects:

- Proxies before reflective traversal;
- own accessors without executing their getters;
- symbol properties;
- non-enumerable object properties;
- sparse arrays and arrays with extra own properties;
- custom-prototype objects;
- cycles;
- excessive nesting/array/object/string/output sizes; and
- noncanonical numbers or unsupported JS values.

Metadata primitives used by the module are captured during module
initialization. Object/array values are never handed to a live
`JSON.stringify` operation, so later inherited `toJSON` hooks cannot affect
serialization.

This is **not** proof against a realm that was already compromised before module
initialization. A future installed runtime must still prove trusted module
source, loader/runtime identity and initialization provenance before untrusted
callbacks can execute.

## Executable proof

The V2 proof requires byte-for-byte equality with frozen V1 for a representative
valid fixture vector covering nested records, dense arrays, safe integer
boundaries, JSON control escapes, Unicode, emoji and lone surrogates.

After importing V2, the proof separately poisons:

1. `Object.prototype.toJSON`;
2. `Array.prototype.toJSON`; and
3. global `JSON.stringify`.

Each poison must demonstrably change or intercept V1 while V2 returns the exact
pre-poison bytes.

Additional adversaries require zero executed Proxy traps and zero executed
accessor getters while rejecting Proxy/accessor/symbol/non-enumerable/sparse/
extra-array/custom-prototype/cyclic/deep/noncanonical-value surfaces.

Node 22, 24 and 26 each execute the proof. The focused workflow extracts the
fixture-vector SHA-256 from every Node job and requires cross-node equality.

## Authority boundary

Only these source facts may become true:

```text
source_only_serializer=true
frozen_v1_unchanged=true
exact_valid_fixture_equivalence_required=true
post_import_tojson_poison_resistance_required=true
post_import_json_stringify_poison_resistance_required=true
proxy_and_accessor_input_rejected=true
```

These remain false:

```text
trusted_module_initialization_proven=false
consumer_migration_performed=false
installed_runtime_authorized=false
protected_host_execution_authorized=false
claim_publication_authorized=false
training_start_authorized=false
training_execution_authorized=false
credential_access_authorized=false
signing_authorized=false
transaction_authorized=false
funds_movement_authorized=false
```

A later reviewed successor must explicitly adopt V2 in each intended consumer,
prove accepted-schema equivalence/migration, bind the new source blobs and
content IDs, and preserve historical V1 identities. No current V1 consumer is
silently repinned by this lane.

PROTECT THE CORE.
