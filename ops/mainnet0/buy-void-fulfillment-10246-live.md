# VOID Buy Fulfillment 102.46 Live Proof

artifact: VOID_BUY_VOID_FULFILLMENT_10246_LIVE_V1
result: fulfilled
chain_id: 2050
buyer: 0x45dd104e3F7CC2A080F2edA094D011D09c51960B

## Summary

Two Buy VOID requests were fulfilled through the guarded treasury path.

Base request:
- request_id: buyvoid_mq421r14_573c3952
- amount_void: 50.48
- amount_wei: 50480000000000000000
- tag_bytes32: 0x627579766f69645f6d713432317231345f353733633339353200000000000000
- sendToOps_tx: 0x853314073dde64e393985952b03651dcf56dace22921db6d5de8fec86efdb9b3
- spend_tx: 0xa9976ddf2f32ff69dab187cb6860cef8f74a3e7d6853b37f5210bfef77cf6d8d

Ethereum request:
- request_id: buyvoid_mq421r7b_1664ac2c
- amount_void: 51.98
- amount_wei: 51980000000000000000
- tag_bytes32: 0x627579766f69645f6d713432317237625f313636346163326300000000000000
- sendToOps_tx: 0x6c506f2a89148056c7799751c7e7237496d38781a3ab71f716a8ddf4445286f3
- spend_tx: 0xafeef64e72dea6bb1370eea364e20b4d70cd3833740999201707fd7257d40c7f

## Final proven balances

buyer_final_balance_wei: 102460000000000000000
buyer_final_balance_void: 102.46
ops_treasury_final_balance_wei: 0
void_treasury_final_balance_wei: 333210230540000000000000000

## Total

total_amount_wei: 102460000000000000000
total_amount_void: 102.46

## Transaction statuses

base_send_status: true
base_spend_status: true
eth_send_status: true
eth_spend_status: true

## Guardrail

The failed earlier JavaScript/ethers lane was not reused.

The successful execution used the established guarded treasury path:

VoidTreasury.sendToOps(uint256,bytes32)
OpsTreasury.spend(address,uint256,bytes32)

## Verifier

Rerun:

RPC=http://127.0.0.1:18545 ops/mainnet0/buy-void-fulfillment-10246-live-proof.sh

Expected final line:

VOID_BUY_VOID_FULFILLMENT_10246_LIVE_PROOF_GREEN
