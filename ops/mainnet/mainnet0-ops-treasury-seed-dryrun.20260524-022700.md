# VOID Mainnet-0 OpsTreasury Seed Dry-Run

status: dry_run_green_not_broadcast
chain_id: 2050
rpc: http://127.0.0.1:8545

source_contract: VoidTreasury
source_contract_address: 0x554eCc7be6f0b7cC3d1c578c2BB848e535c02514

destination_contract: OpsTreasury
destination_contract_address: 0xf0D64c62A87034e1838dB8ec1e2e33666814E7D9

asset: VOID
asset_contract: 0x470075B85352Eb86F7d089FB9ba88945f12AAd94

amount_void: 1000000
amount_wei: 1000000000000000000000000

required_signer: treasury_admin
required_signer_address: 0x4E77786f32D41E40E7CEF28389068d6F31F1d6A2

method: sendToOps(uint256,bytes32)
tag_string: OPS_SEED_20260524
tag_bytes32: 0x4f50535f534545445f3230323630353234000000000000000000000000000000

dry_run_command: cast call --rpc-url http://127.0.0.1:8545 --from 0x4E77786f32D41E40E7CEF28389068d6F31F1d6A2 0x554eCc7be6f0b7cC3d1c578c2BB848e535c02514 "sendToOps(uint256,bytes32)" 1000000000000000000000000 0x4f50535f534545445f3230323630353234000000000000000000000000000000

dry_run_result: rc=0 returned_0x
broadcast_status: not_broadcast
live_tx_hash: pending_not_executed

## Safety

This artifact records the successful dry-run only.
It does not broadcast a transaction.
It does not move VOID.
It does not expose private keys.
The live transaction must be sent separately by the treasury admin signer and must record the tx hash.
