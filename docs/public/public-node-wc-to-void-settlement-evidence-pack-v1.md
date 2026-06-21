# VOID WC → VOID Settlement Evidence Pack v1

Marker: `VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_PACK_V1`

This is the static public evidence pack for the first WC → native VOID settlement.

## Settlement facts

- chain_id: `2050`
- value_void: `1.000000`
- value_wei: `1000000000000000000`
- tx_hash: `0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717`
- settlement_record_key: `710e514643aa0e77c52ea07b24986f0cfcf23ab5426be352b7e52265fb46cec1`

## Existing public routes

- JSON redacted receipt: `/public-node/wc-to-void/redacted-settlement-receipt-v1.json`
- HTML redacted receipt: `/public-node/wc-to-void/redacted-settlement-receipt-v1`

## Boundaries

- Read-only public evidence pack.
- Does not execute commands.
- Does not broadcast transactions.
- Does not send VOID.
- Does not call RPC.
- Does not create public mutation.
- Does not replace the private settlement ledger.
- Plaintext party addresses remain redacted.

## Proof stack

```bash
bash ops/mainnet0/wc-to-void-settlement-evidence-pack-v1-proof.sh
bash ops/mainnet0/wc-to-void-redacted-settlement-receipt-runtime-scope-fix-v1-proof.sh
bash ops/mainnet0/wc-to-void-redacted-settlement-receipt-runtime-v1-proof.sh
bash ops/mainnet0/wc-to-void-redacted-settlement-receipt-v1-proof.sh
VOID_WC_TO_VOID_TX_HASH="0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717" bash ops/private/wc-to-void-post-execution-settlement-record-v1-proof.sh
bash ops/mainnet0/public-mutation-method-boundary-audit-v1.sh
bash ops/mainnet0/public-surface-safety-index-v1-proof.sh
bash ops/mainnet0/funding-gateway-card-v1-proof.sh
npm run build

