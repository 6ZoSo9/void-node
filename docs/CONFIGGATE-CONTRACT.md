# VOID Network – ConfigGate Contract Spec (v1)

ConfigGate is the on-chain key–value config registry for VOID.

It does **not** enforce consensus rules itself. Instead, it stores small,
critical configuration values that VOID nodes and system contracts can read,
such as:

- current AdminGate address,
- feature flags (enable/disable certain modules),
- small numeric parameters (limits, timeouts, epoch sizes),
- well-known system contract addresses.

The behavior matches the intent of `ConfigGate.t.sol` tests:

- `testChainIdAndAdminGate()` – ConfigGate is tied to a specific chainId
  and knows which AdminGate governs it.
- `testSetAdminGate()` – only privileged governance can update AdminGate.
- `testSetUintBoolAddress()` – privileged governance can set typed config
  entries (uint, bool, address) identified by a key.

---

## 1. Responsibilities

ConfigGate MUST:

- Be initialized with:
  - immutable `CHAIN_ID` (e.g. 2050 for VOID),
  - an `adminGate` address that controls privileged calls.
- Allow **only** AdminGate / governance to:
  - update the `adminGate` reference (migration, upgrades),
  - set typed config entries:
    - `setUint(bytes32 key, uint256 value)`
    - `setBool(bytes32 key, bool value)`
    - `setAddress(bytes32 key, address value)`
- Expose read APIs for all stored config:
  - `getUint(bytes32 key) returns (uint256)`
  - `getBool(bytes32 key) returns (bool)`
  - `getAddress(bytes32 key) returns (address)`
  - plus `chainId()` and `adminGate()` accessors.

ConfigGate SHOULD:

- Use simple `bytes32` keys (e.g. `keccak256("VOID_CONFIG_FOO")`).
- Keep storage minimal and gas-efficient (no dynamic arrays of configs).
- Emit events on config changes:
  - `UintSet(bytes32 key, uint256 value)`
  - `BoolSet(bytes32 key, bool value)`
  - `AddressSet(bytes32 key, address value)`
  - `AdminGateUpdated(address old, address next)`

---

## 2. Data Model

Suggested storage layout:

- `uint256 public immutable CHAIN_ID;`
- `address public adminGate;`

- `mapping(bytes32 => uint256) private uintConfig;`
- `mapping(bytes32 => bool)    private boolConfig;`
- `mapping(bytes32 => address) private addressConfig;`

Config keys are free-form `bytes32` but should be standardized in separate
docs (e.g. `VOID_CONFIG_MIN_STAKE`, `VOID_CONFIG_JOB_TTL`, etc.).

---

## 3. Access Control

All mutating functions MUST enforce:

- `msg.sender` must be **AdminGate** (or a role that AdminGate delegates).
- Optional: future extension for multi-sig / timelock via AdminGate.

Reads MUST be permissionless so that:

- nodes,
- wallets,
- agents,
- indexers

can read config directly from the chain.

---

## 4. Non-Goals / MUST NOT

ConfigGate MUST NOT:

- Implement consensus or fork choice logic.
- Hold large data structures (no arrays of configs per user, etc).
- Directly manage funds, staking balances, or slashing.
- Replace higher-level governance contracts (it is a config store, not a DAO).

---

## 5. Integration Notes

- VOID nodes should read CHAIN_ID + critical parameters from ConfigGate
  (once live on mainnet) to sanity-check they are on the correct network.
- System contracts (JobQueue, registries, etc.) can reference ConfigGate
  for feature flags or limits rather than hard-coding constants.
