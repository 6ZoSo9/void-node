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

## Frozen predecessor generation

- base: `main@61b0f81b2112aab32e3dc16084fe2d43178ec4da`
- frozen V1 path:
  `tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs`
- frozen V1 Git blob:
  `f97fafb0148527ae3a954e2752faef8c7fc9e88e`
- V2 serializer path:
  `tools/apollyon-claim-contract-canonical-json-v2.mjs`
- predecessor V2 serializer Git blob:
  `07a19a92379aa3e1d1648becf007129820d51a70`
- V2 proof path:
  `scripts/prove_apollyon_claim_contract_canonical_json_v2.mjs`
- predecessor V2 proof Git blob:
  `03de2c24110bbc804a9f7489f8ae62f69c03c59b`

The original V2 generation was four ADD-only paths. The values above are
predecessor identities only.

## Revoked-Proxy successor binding

The revoked/callable-Proxy repair was first derived from
`main@80418e33a22ba26a00f32017610517042b18334d` and preserves the frozen V1
blob above. Current merge-forward generations preserve the reviewed
serializer/proof bytes while the focused workflow derives the effective
current-main source base with `git merge-base EXPECTED_HEAD origin/main`,
so unrelated later main commits do not become part of this four-path delta.

- successor V2 serializer Git blob:
  `4d4b970fa2df3a3e7cae176b18c62aff52e94adc`
- successor V2 proof Git blob:
  `a0831748098a26087cc9a1ee79132fba16bdb20e`

The focused workflow is the authoritative non-circular binder for the complete
candidate generation. It pins the successor base, four-path diff, frozen V1,
serializer, proof, and document blobs; `EXPECTED_HEAD` binds those bytes plus
the workflow itself to the candidate commit. This document intentionally does
not embed its own blob or the workflow blob, because either value would change
the bytes being named and create a circular self-hash. Those outer identities
are carried by the reviewed commit and workflow.

This successor modifies the same four paths to close revoked-Proxy dispatch, including callable and revoked-callable Proxy values before type/array dispatch.
V1 and all current consumers remain byte unchanged.

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

Object-key emission reproduces frozen V1's final ECMAScript property order,
including numeric array-index-like object keys: integer indices are emitted
numerically first, while the remaining keys retain V1's lexicographic insertion
order. The proof includes the 0/2/10/4294967294/4294967295/01 boundary.

The serializer rejects:

- ordinary and revoked Proxies before `Array.isArray` or reflective traversal;
- own accessors without executing their getters;
- symbol properties;
- non-enumerable object properties;
- sparse arrays and arrays with extra own properties;
- custom-prototype objects;
- an own enumerable `__proto__` key, because frozen V1's ordinary-object
  rebuild gives that key special prototype-setter semantics instead of a normal
  data-property byte contract;
- cycles;
- excessive nesting/array/object/string/output sizes; and
- noncanonical numbers or unsupported JS values.

Metadata primitives used by the module are captured during module
initialization, including the `node:util` Proxy detector itself. Object/array
values are never handed to a live `JSON.stringify` operation, so later
inherited `toJSON` hooks cannot affect serialization. Cycle tracking uses an internal linked frame rather than an
array stack, and the proof also installs a post-import numeric setter on
`Array.prototype["0"]`; V2 must emit the same bytes with zero setter calls.

This is **not** proof against a realm that was already compromised before module
initialization. A future installed runtime must still prove trusted module
source, loader/runtime identity and initialization provenance before untrusted
callbacks can execute.

## Executable proof

The V2 proof requires byte-for-byte equality with frozen V1 for a representative
valid fixture vector covering nested records, dense arrays, safe integer
boundaries, integer-like object-key ordering, JSON control escapes, Unicode,
emoji and lone surrogates.

After importing V2, the proof separately poisons:

1. `Object.prototype.toJSON`;
2. `Array.prototype.toJSON`; and
3. global `JSON.stringify`.

Each poison must demonstrably change or intercept V1 while V2 returns the exact
pre-poison bytes.

Additional adversaries replace `types.isProxy` after module import and still
require Proxy rejection with zero traps. They also require zero accessor getters
and zero post-import Array-prototype numeric-setter calls while rejecting
Proxy/accessor/symbol/non-enumerable/sparse/extra-array/custom-prototype/
`__proto__`/cyclic/deep/noncanonical-value surfaces.

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
