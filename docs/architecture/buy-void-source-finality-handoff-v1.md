# Buy VOID source-finality handoff v1

Marker: `VOID_BUY_VOID_SOURCE_FINALITY_HANDOFF_V1`

Status: source/proof reference adapter only. It does not authenticate live RPC,
call a source chain or Chain-2050, deploy a contract, reserve inventory, access a
wallet or signer, construct/sign/broadcast a transaction, fund inventory, activate
the presale, or move funds.

## Purpose

Close the deterministic reference seam between the independently reviewed Ready
source-policy/finality contract in #1463 and the independently reviewed Ready
two-phase Chain-2050 settlement reference in #1465.

Pinned reviewed generations:

- `main`: `090cd3ef1d60852f614c29cb7aee9ebdacde3e1b`
- #1463: `35ce04e34320be7ab5f7773066de7c6c6384b034`
- #1465: `846be5fceedc6ef1139bec546578e7cde6fbc8f4`
- current verified-payment source:
  `src/economic/buy_void_verified_payment_v2.ts`

The adapter is intentionally standalone because #1463 and #1465 are Ready but
unmerged. A future integration generation must consume the actual validated
module outputs rather than treating caller-written JSON as authority.

## Exact policy commitment mapping

#1463 derives `combined_stable_sha256` from the canonical stable projection of
both Base and Ethereum rail configurations plus the fixed presale economics. It
separately derives `observation_sha256` from that stable commitment plus the two
current finalized-reference block numbers.

This adapter independently reconstructs those same two hashes from a closed
policy-generation packet and requires the exact #1463 policy ID:

```text
policy_id = "void-buy-void-dual-rail-policy-v1-" + stable_config_sha256
```

The #1465 field is defined exactly as:

```text
source_policy_fingerprint_sha256 = stable_config_sha256
```

There is no second or ambiguous rehash.

## Exact finality-attestation preimage

A #1463 admitted finality result is normalized as a closed object and must bind:

- source chain and EVM chain ID;
- canonical payment identity;
- transaction hash and log index;
- receipt block;
- finalized reference block;
- derived confirmation count;
- finality-adapter ID;
- policy ID;
- stable policy commitment;
- observation-generation commitment; and
- all #1463 authority-grant flags remaining `false`.

The #1465 field is:

```text
source_finality_attestation_sha256 = SHA256(
  ASCII("VOID_BUY_VOID_SOURCE_FINALITY_ATTESTATION_V1\0") ||
  U32BE(byte_length(canonical_attestation_preimage_json)) ||
  canonical_attestation_preimage_json
)
```

The canonical preimage contains the exact normalized fields above, excluding the
three constant false authority flags after they have been fail-closed validated.
Changing the payment event, receipt block, finalized reference, adapter, policy,
or policy observation generation therefore changes the attestation digest.

## Verified payment join

Current `buy_void_verified_payment_v2.ts` independently matches the exact USDC
`Transfer` log and proves the USDC contract, payer/from address, configured
receive address, delivery address, amount, requested amount, transaction hash,
log index and block number.

The handoff requires all of the following before building the #1465 projection:

1. verified payment chain / tx / log / block exactly match the admitted #1463
   finality result;
2. verified USDC contract and receive address exactly match the selected admitted
   policy rail;
3. payer/from equals delivery address, matching current verifier behavior;
4. exact paid amount equals requested amount;
5. #1463 finality adapter, policy ID, stable hash, observation hash and finalized
   reference exactly match the admitted policy generation;
6. confirmation count is independently recomputed from finalized-reference and
   receipt blocks and meets the admitted minimum; and
7. the canonical payment identity and payment key are re-derived.

The output is exactly the field shape expected by #1465's
`normalizeFinalizedSourcePaymentV1()`:

```text
void_buy_void_finalized_source_payment_v1
VOID_BUY_VOID_FINALIZED_SOURCE_PAYMENT_V1
```

## Log-index bounds

The shared canonical payment identity/payment-key domain in #1463's chain-anchor
contract and #1465 accepts canonical unsigned `u64` log indexes. The current
#1463 **dual-rail finality evaluator**, however, admits source payment log indexes
only through its existing `u32` bound. This adapter preserves that actual
upstream finality contract and therefore accepts only the `u32` subset when
building a finalized handoff.

This is not a hidden purchase minimum, buyer throttle, rate change, or inventory
change. It is an exact record of the current upstream finality-admission domain.
A future widening of #1463 finality admission would require a new reviewed handoff
generation; #1465's target shape already permits `u64`.

## Finality boundary

This adapter does not authenticate live RPC, fork choice, checkpoint signatures,
light-client proofs, bridge proofs, or source-chain finality. It consumes a
reference object that is already claimed to be admitted by #1463 and proves only
the deterministic transformation and cross-object consistency.

Caller-written JSON is not production authority. Confirmation count alone is not
finality. Production integration still requires a reviewed source-chain verifier
and finality authority that produces the admitted #1463 object, plus the sensitive
Chain-2050 settlement implementation.

## V510 boundary

- Source chains own finalized USDC transfer truth.
- Chain-2050 will own finalized payment-keyed reservation, fulfillment and finite
  inventory truth once the sensitive successor actually exists.
- DataNet owns byte availability, not economic truth.
- Local finalized indexes remain projections/caches after chain finalization.

This adapter grants no economic or operational authority and does not alter those
responsibilities.
