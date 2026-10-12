# Economic epoch-1 write-surface census v1

Marker: `VOID_ECONOMIC_EPOCH1_WRITE_SURFACE_CENSUS_PRECISION_V1`

Precision performed a read-only census immediately after the durable
block-`37392` Economic Genesis Archive checkpoint was captured.

Observed:

- the private EVM head remained exactly `37392` before and after the census;
- the block hash remained
  `0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52`;
- `eth_accounts` returned zero unlocked accounts;
- exactly one listener owned loopback port `8545`;
- that listener was the pinned Anvil executable with SHA-256
  `b47362d2159aa0f2f575320e5e529bb5a91093cb62dc6bd30c0022018aa9f738`;
- `void-private-chain2050-rpc-v1.service` was active and enabled;
- `void-wc-relayer.service` was inactive and disabled;
- `void-workcredits-devnet-http.service` was inactive and disabled;
- the Buy VOID full runtime status endpoint was available but both
  `enabled=false` and `apply_enabled=false`;
- no established TCP client remained connected to `8545` after observation.

Therefore the current operational write surface is narrow enough for a
separately authorized service-quiesce gate.

This evidence does **not** itself stop or disable Anvil and therefore does not
yet prove the archive write freeze. Block 37392 remains a durable final-candidate
snapshot, not final migration authority.

No systemd mutation, signal, process action, credential/environment content
read, key/wallet access, signing, broadcast, Chain-2050 write, token movement,
or funds movement occurred.
