# VOID Network – Gate Deployment Runbook (AdminGate / UpdateGate / ConfigGate v1)

This runbook describes how to deploy and wire the three core governance gates for VOID (chainId 2050):

- **AdminGate** – master key router.
- **UpdateGate** – protocol version policy.
- **ConfigGate** – on-chain config registry.

## 0. Preconditions

- ChainId 2050 network live (VOID mainnet or staging).
- MasterKey EOA / multisig selected and under hardware control.
- Deployment wallet funded for gas.
- Contracts compiled (AdminGate.sol, UpdateGate.sol, ConfigGate.sol).

## 1. Deploy AdminGate

- Deploy `AdminGate` with:
  - `chainId = 2050`
  - `masterKey = <MasterKey EOA or multisig>`

Record:
- `ADMIN_GATE = 0x...`

## 2. Deploy UpdateGate

- Deploy `UpdateGate` with:
  - `chainId = 2050`
  - `masterKey = ADMIN_GATE`
  - Initial signer set + threshold for protocol updates.

Record:
- `UPDATE_GATE = 0x...`

## 3. Deploy ConfigGate

- Deploy `ConfigGate` with:
  - `chainId = 2050`
  - `adminGate = ADMIN_GATE`

Record:
- `CONFIG_GATE = 0x...`

## 4. Wire gates together

- In AdminGate:
  - Set `updateGate = UPDATE_GATE`.
- In ConfigGate:
  - Verify `adminGate = ADMIN_GATE`.
- In UpdateGate:
  - Ensure `masterKey` points at `ADMIN_GATE`.

## 5. Node-side configuration (off-chain for v1)

Nodes use environment variables:

- `VOID_PROTOCOL_VERSION` – local protocol the binary implements (e.g. 5 or 6).
- `VOID_UPDATE_POLICY` – `"pinned"` / `"follow"` / `"manual"` (v1 uses `"pinned"`).
- Future:
  - Nodes may read:
    - Target protocol hint from UpdateGate.
    - Config values (e.g. `"WAL_MAX_PRESSURE"`, `"MAX_BLOCK_GAS"`) from ConfigGate.

## 6. Monitoring

- Prometheus monitors:
  - `void:update_protocol:local` / `target` / `diff`.
  - Derived series `outdated` and `ahead`.
  - Alerts:
    - `VoidNodeProtocolOutdated` – node is behind target.
    - `VoidNodeProtocolAhead` – node reports a protocol ahead of target.

This runbook will be extended when we:
- Implement on-chain UpdateGate usage by void-node.
- Wire ConfigGate-backed parameters into WAL / Vector7 guardrails.
