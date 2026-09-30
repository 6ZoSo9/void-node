# Participant post-purchase coupled candidate promotion v1

Marker: `VOID_PARTICIPANT_POSTPURCHASE_COUPLED_CANDIDATE_PROMOTION_V1`

Status: source-only promotion/admission mechanism. It does not modify the
checked-in coupled candidate, activate WC/VOID, open the presale, access a
wallet/signer/key, submit a transaction, or move funds.

## Purpose

The merged production-runtime binding collector establishes a read-only
production evidence seam for participant post-purchase `VoidToken` control.

A successful collector receipt deliberately stops at:

```text
production_runtime_binding_verified=true
participant_postpurchase_voidtoken_control_runtime_binding_source_ready=true
participant_post_purchase_voidtoken_control_ready=false
coupled_candidate_updated=false
candidate_promotion_required=true
```

The coupled production candidate therefore still records:

```text
gates.participant_post_purchase_voidtoken_control_ready=false
```

This tool defines the missing admission step without granting launch authority.

## Fixed source inputs

The caller cannot select a candidate or successor-migration file. The tool
always reads these repository paths:

```text
ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json
ops/mainnet0/economic-evm-successor-migration-candidate-v1.json
```

Both are passed through the existing
`classifyVoidCoupledEconomicSuccessorGateV1` contract.

The canonical candidate must already be a valid `HOLD`, must have
`participant_post_purchase_voidtoken_control_ready=false`, and must still
have `coupled_activation_ready=false`.

## Runtime-binding receipt admission

Promotion requires one saved receipt created by the merged
`void-participant-postpurchase-production-runtime-binding-v1` collector.

The caller must provide:

1. the absolute canonical receipt path; and
2. an independently reviewed exact raw-file SHA-256.

The promotion tool does **not** perform a new network observation and does not
pretend that a content hash authenticates who performed the observation. The
reviewed file digest is the admission authority for the exact saved collector
artifact.

Receipt file admission is fail-closed:

- one `O_RDONLY | O_NOFOLLOW` descriptor;
- exact descriptor-bound regular-file and size checks;
- mode must not grant group/other access;
- no symlink/path alias;
- exact pre/post file-generation stability;
- byte-bounded read;
- strict UTF-8 and JSON;
- exact collector pretty-JSON serialization;
- exact reviewed raw-file SHA-256.

The normalized receipt contract is then independently checked for:

- exact #2176 marker/version/status;
- content-addressed `voidpprtb1_` runtime-binding identity;
- production runtime binding verified;
- finality evidence imported;
- exact production public origin;
- Chain ID 2050 / execution epoch 2;
- reviewed production genesis block hash/state root;
- successful delivery/control receipt identities;
- canonical `VoidToken` recipient;
- participant address == control-transaction sender;
- control block not earlier than delivery;
- exact #2176 authority object;
- candidate promotion required;
- market/presale/funds authority false.

The runtime-binding ID is recomputed from the same normalized identity fields
used by the merged collector.

## Promotion result

The output is a create-only mode-0600 JSON artifact containing:

- exact source-candidate raw-file SHA-256;
- exact successor-migration-candidate raw-file SHA-256;
- exact reviewed runtime-binding file SHA-256;
- runtime-binding ID and finality-import ID;
- participant address;
- original classifier result;
- a promoted candidate copy;
- promoted candidate canonical SHA-256;
- post-promotion classifier result; and
- a content-addressed `voidppccp1_` promotion ID.

Exactly one candidate field may change:

```text
gates.participant_post_purchase_voidtoken_control_ready:
  false -> true
```

The tool proves this by reconstructing the prestate from the promoted candidate
and comparing it byte-for-byte in canonical JSON.

The post-promotion candidate must still classify `HOLD`. Its missing-gate
list must equal the original list with only:

```text
participant_post_purchase_voidtoken_control_required
```

removed.

Therefore this source slice does **not** claim the production candidate is
launch-ready.

## Command

After independently reviewing the collector artifact digest:

```bash
node tools/void-participant-postpurchase-coupled-candidate-promotion-v1.mjs prepare \
  --runtime-binding /absolute/runtime-binding.json \
  --runtime-binding-sha256 <64-hex-reviewed-file-sha256> \
  --output /absolute/participant-control-promotion.json
```

The output is private evidence only. The canonical checked-in candidate is not
modified.

## Remaining application gate

A green promotion artifact means only that an exact reviewed production-runtime
binding can deterministically produce a one-gate candidate successor.

It still reports:

```text
canonical_candidate_file_updated=false
candidate_promotion_application_required=true
coupled_activation_ready=false
market_activation=false
public_presale_activation=false
funds_movement=false
```

Applying the promoted candidate to canonical source remains a separate reviewed
change. Other unresolved candidate gates remain independent blockers.

## Authority boundary

This source lane authorizes no:

- external network request;
- raw public RPC;
- runtime/service mutation;
- credential/private-key/wallet/signer access;
- transaction construction, signing, submission, or broadcast;
- authoritative Chain-2050 write;
- token or Work Credit mutation;
- inventory funding;
- validator mutation;
- market activation;
- public presale activation; or
- funds movement.

## Proof

```bash
node --check tools/void-participant-postpurchase-coupled-candidate-promotion-v1.mjs
node --check scripts/prove_void_participant_postpurchase_coupled_candidate_promotion_v1.mjs
node scripts/prove_void_participant_postpurchase_coupled_candidate_promotion_v1.mjs
```

The proof uses only local deterministic fixtures. It performs no external
network request and never changes the canonical candidate.
