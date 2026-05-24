# VOID Mainnet-0 OpsTreasury Seed Live Execution

status: live_execution_green
created_at_utc: 20260524-115943
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
derived_signer: 0x4E77786f32D41E40E7CEF28389068d6F31F1d6A2
signer_match: true

method: sendToOps(uint256,bytes32)
tag_string: OPS_SEED_20260524
tag_bytes32: 0x4f50535f534545445f3230323630353234000000000000000000000000000000

tx_hash: 0x98288e5a34ea28d63aa2ab396ef83a21c4fcc55747b7acebc53122591ed86fb2
block_hash: 0x0e906354fb3d6abdb3d5b610a4fe1e08453384c4666987298bbea85b41845c7d

pre_void_treasury_balance_wei: 333207333000000000000000000
pre_ops_treasury_balance_wei: 0
post_void_treasury_balance_wei: 332207333000000000000000000
post_ops_treasury_balance_wei: 1000000000000000000000000

delta_void_treasury_wei: -1000000000000000000000000
delta_ops_treasury_wei: +1000000000000000000000000

private_key_printed: false
live_tx_recorded: true
balance_delta_verified: true

## Safety

This artifact records the live OpsTreasury seed transaction.
It does not expose private keys.
It does not authorize additional treasury sends.
Further money movement requires a separate exact dry-run, signer check, tx hash, and post-state proof.
