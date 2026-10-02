# Production Epoch-2 RPC target promotion apply admission v1

Marker: `VOID_PRODUCTION_EPOCH2_RPC_TARGET_PROMOTION_APPLY_ADMISSION_V1`

## Purpose

This is the retained read-only/source-only admission gate that was used between
the compiled production Epoch-2 RPC selected-target candidate and canonical
source promotion.

It does **not** edit the repository and does not itself select the target. The
canonical target is now selected by the separately reviewed source-promotion
manifest.

The authoritative CLI accepts only:

- a clean local `main`;
- local `HEAD` equal to live GitHub `refs/heads/main`;
- canonical `6ZoSo9/void-node` origin;
- exact SHA-256-pinned selected candidate bytes;
- the exact activation plan and activation receipt bytes used by the compiler;
- the exact independent runtime-observation receipt; and
- a candidate that recompiles byte-for-byte from those evidence artifacts.

## Historical-source ancestry

The independent host observation may remain valid after later source-only merges,
but only if its source lineage remains within canonical history.

The CLI therefore independently requires every available activation/runtime
source generation to be an ancestor of current live `main`:

- the observation's captured canonical-main head;
- the observation's reviewed activation-source head;
- the activation plan's start-admission observed head; and
- every Precision/Nimo/Xiphos install-receipt source generation.

Both legacy `installed_repo_head` and current
`install_receipt_observed_repo_head` row shapes are recognized. Missing or
noncanonical install lineage HOLDs.

## Candidate binding

The admission gate does not trust the selected candidate because it has the
right IDs.

It reruns
`buildProductionEpoch2RpcSelectedDescriptorV1(...)` from the exact activation
and observation bytes, serializes the result with the canonical repository
pretty-JSON representation, and requires the supplied candidate SHA-256 and
semantics to match that exact result.

Any mutation to RPC URL, independent-host acceptance, activation IDs, receipt
hashes, observation ID, validator evidence, or authority fields therefore
HOLDs.

## Output

A green authoritative CLI run emits one create-only mode-0600 JSON receipt
outside the repository.

The receipt records:

- current canonical `main` head/tree;
- all historical source commits proven ancestral to that head;
- selected-candidate SHA-256;
- activation plan/receipt IDs and SHA-256 values;
- runtime observation ID and SHA-256;
- exact selected RPC URL; and
- an authority boundary that remains source-evidence-only.

The receipt is content-addressed as:

```text
voidpe2rpctapply1_<sha256>
```

The exported builder cannot mint that authoritative marker because it does not
possess the module-private verified-source capability. It produces preview-only
output instead.

## Live usage

Run only after the promotion compiler has produced a real selected candidate:

```bash
node tools/void-production-epoch2-rpc-target-promotion-apply-admission-v1.mjs \
  --candidate /absolute/selected-candidate.json \
  --candidate-sha256 <64hex> \
  --activation-plan /absolute/activation-plan.json \
  --activation-plan-sha256 <64hex> \
  --activation-receipt /absolute/activation-receipt.json \
  --activation-receipt-sha256 <64hex> \
  --runtime-observation /absolute/runtime-observation.json \
  --runtime-observation-sha256 <64hex> \
  --output /absolute/outside-repo/promotion-apply-admission.json
```

The tool performs Git source identity/ancestry reads only. It makes no RPC call.

## Authority boundary

```text
source_evidence_admission_only=true
canonical_target_write=false
repository_write=false
branch_create=false
git_push=false
rpc_call=false
service_action=false
docker_mutation=false
credential_access=false
wallet_or_signer_access=false
private_key_access=false
transaction_construction=false
transaction_signing=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
validator_mutation=false
migration_authorized=false
market_activation=false
public_presale_activation=false
funds_movement=false
```

## Next gate

The real production candidate received a green authoritative admission before
canonical source promotion. This tool remains as provenance/regression evidence.
The next gate is downstream fresh read-only revalidation against the selected
production target; later write/deployment/public-activation authority remains
separate.
