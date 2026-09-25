# Economic EVM successor migration v1

Marker: `VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1`

Status: architecture/source-only. No RPC mutation, state export, wallet access,
signing, transaction broadcast, token movement, contract deployment, migration,
or public activation is authorized by this document.

## Decision

The existing private Anvil EVM is retained as an **immutable Economic Genesis
Archive**.

It is **not** the long-term public economic execution layer.

A clean successor EVM will carry forward the authoritative economic state under
an exact conservation proof. The successor must use a production, non-development
EVM client. Anvil is forbidden as the successor runtime.

The public VOID node/P2P/block chain remains the public truth layer. Successor
economic state must publish content-addressed checkpoints/state roots into that
truth layer before public economic activation.

This avoids two bad outcomes:

1. discarding real premine/contract history merely because Anvil was originally
   used for testing; or
2. turning a development runtime with known default accounts into permanent
   production infrastructure.

## Economic asset rule

Canonical `VoidToken` is the only economic VOID asset.

The successor's native EVM gas unit is execution metering only. It is not part
of the 666,666,666-VOID supply, not a second token, not a participant investment
asset, and not something public market pricing may depend on.

Production must implement one reviewed model in which participants do not need
to acquire a second economic gas asset. The acceptable V1 target is zero-fee or
system-sponsored execution with bounded gas metering and abuse protection.

No hidden conversion such as:

```text
VoidToken -> native gas coin
WC -> native gas coin
BTC -> native gas coin
```

is created by this migration.

## Why the premine is preserved

The retained economic history contains real canonical `VoidToken` supply and
custody.

The reconciled historical snapshot at block 37371 records:

```text
total supply = 333,333,333 VOID
VoidTreasury = 333,207,333 VOID
UpgradeStaking = 126,000 VOID
unreconciled VOID = 0
```

Later accepted economic mutations exist after block 37371, so these numbers are
historical evidence rather than a migration balance sheet. Migration must take a
**fresh final authoritative snapshot** at or above every accepted economic
mutation.

The migration rule is therefore:

```text
successor VoidToken total supply
  == source final-snapshot VoidToken total supply

for every nonzero source holder H:
  successor.balanceOf(H)
  == source.balanceOf(H)

sum(successor holder balances)
  == successor total supply
```

No migration mint, burn, silent treasury refill, historical test redelivery, or
holder omission is allowed.

## Canonical contract state that must survive

The current frozen/core roles are preserved as state, not recreated from memory:

| Role | Address |
| --- | --- |
| VoidToken | `0x470075b85352eb86f7d089fb9ba88945f12aad94` |
| VoidTreasury | `0x554ecc7be6f0b7cc3d1c578c2bb848e535c02514` |
| OpsTreasury | `0xf0d64c62a87034e1838db8ec1e2e33666814e7d9` |
| AdminGate | `0xdadb70747fb39e79c867811f5a5592c1611bcb52` |
| ConfigGate | `0xcf4239ec209bbdb25f5c22903a5aa2050752dd24` |
| ValidatorSet | `0x4b3f78e86b0427f750938e7b022d98aa4275f2f7` |
| EmissionsController | `0x72b2dead8ce4728a1f3b800f96502a7ace091b81` |
| RewardEngine | `0xe2670614ab3cab77999847f3fd2ff6fc34fe2292` |
| UpgradeStaking | `0x77dfeedd19a4741f299c902ad5bbe0de917a9e59` |

For these contracts the migration must attest:

- deployed runtime hash;
- complete storage/state root or equivalent exhaustive state proof;
- account nonce;
- `VoidToken` balance;
- privileged role bindings;
- referenced contract dependencies; and
- successor equality after import.

Where historical Solidity source is absent or incomplete, runtime/storage
preservation is authoritative. The migration must not substitute freshly
recompiled code and claim equivalence without an independent bytecode/state
proof.

## Later contracts

Contracts added after the frozen bootstrap are not guessed from filenames.

The final source snapshot must discover every live contract and classify it.

A later contract migrates only when at least one of these is proven:

- it is a canonical live role;
- canonical contract storage references it;
- it holds nonzero canonical `VoidToken`;
- it owns an active authority/registry role;
- it is required by a still-live presale/market/validator/DataNet path.

Examples requiring final-snapshot review include:

- role-authority registry;
- Buy VOID fulfillment contracts;
- WC/VOID market vault;
- validator upgrade views/registries;
- DataNet commitment registry.

A caller may not simply append an address to the allowlist.

## Relayer treatment

The old WC relayer does **not** migrate as production authority.

Current repository evidence classifies the WC relayer as an off-chain loopback
operator service, and devnet `WorkCreditsRelayerV1` references are
development/helper state rather than a canonical Mainnet-0 contract role.

Therefore:

```text
legacy_wc_relayer_migrates=false
legacy_wc_relayer_migration_authority=false
devnet_wc_contracts_migrate=false
```

If final-snapshot discovery finds a contract historically called a relayer, it
is still quarantined unless live canonical state proves an explicit required
dependency. Naming alone grants no migration authority.

## Anvil development accounts

Default/prefunded Anvil accounts and any balance controlled by a publicly known
development private key do not migrate as usable successor economic capability.

Before successor activation:

- enumerate known/default development EOAs in the source state;
- account for their native balances/nonces;
- prove none holds unreconciled `VoidToken`;
- zero/quarantine non-economic native balances in the successor;
- reject old known-key signed submissions; and
- preserve their historical receipts only in the archive.

Historical blocks are not rewritten.

## AdminGate and treasury authority

AdminGate and treasury contracts are preserved.

The migration does **not** use a state transition as a covert authority reset.

For each privileged role, the final migration packet must choose exactly one:

```text
PRESERVE
  successor role == source role

ROTATE
  old role + new role + explicit authorization +
  exact migration transition proof
```

No implicit rotation is allowed.

This applies at minimum to:

- AdminGate master authority;
- treasury administration;
- OpsTreasury administration/spend authority;
- validator administration;
- UpgradeStaking administration;
- later fulfillment/market/registry controllers.

## Execution epoch and replay wall

The successor uses:

```text
chain_id = 2050
execution_epoch = 2
```

Chain ID remains 2050 for existing contract/domain compatibility, but the public
gateway must bind execution epoch 2 in its request/session/receipt identity.

Before epoch 2 activates:

- old Anvil write RPC is disabled;
- every pending or retained signed legacy transaction is censused;
- privileged signer nonces or keys receive an explicit replay fence;
- old known-development keys are rejected;
- the archive is read-only; and
- a transaction accepted in epoch 2 cannot be replayed through a writable epoch
  1 endpoint.

Raw public JSON-RPC remains forbidden.

## Public read and signed submission boundary

Participants need independent economic control without exposing a dangerous raw
operator RPC.

The successor therefore requires two public surfaces.

### Read gateway

Allowlisted read-only economic methods sufficient to independently verify:

- chain/execution epoch;
- block/state checkpoint identity;
- contract runtime code hash;
- `VoidToken.balanceOf`;
- transaction and receipt status;
- relevant contract views;
- migration anchor/state-root evidence.

### Signed submission gateway

A bounded gateway accepts participant-signed economic transactions only after
checking:

- execution epoch;
- allowed target contract/method;
- no native-value transfer unless separately approved;
- gas limit;
- nonce;
- expiry;
- rate/outstanding limits;
- known-development-key blocklist;
- replay protection;
- simulation/preflight where applicable; and
- current authoritative successor checkpoint.

The gateway never receives participant private keys.

## Public VOID-chain anchor

The successor is not allowed to become an unanchored private database.

Each accepted economic checkpoint must produce a content-addressed commitment
containing at minimum:

```text
execution_epoch
successor block number
successor block hash
successor state root
migration/genesis manifest hash
VoidToken address
VoidToken total supply
canonical contract-set root
```

The commitment must be admitted into the public VOID truth layer under a
reviewed finality policy.

The first successor checkpoint must also bind the archived source snapshot:

```text
source final block/hash
source state-dump hash
source archive-manifest hash
successor genesis/state-manifest hash
```

Until that anchor is final, public economic activation remains HOLD.

## Migration ceremony

The intended phases are:

1. **Freeze**
   - disable new economic writes;
   - wait for all accepted transactions to reach required finality;
   - census pending signed transactions and open economic obligations.

2. **Snapshot**
   - capture latest source block/hash;
   - capture full Anvil state dump;
   - enumerate `VoidToken` holders;
   - enumerate live contract code/storage/nonces;
   - enumerate authorities and contract dependencies;
   - hash the archive manifest.

3. **Classify**
   - canonical state to preserve;
   - conditional live dependencies;
   - dev/test state to quarantine;
   - known-key accounts to neutralize.

4. **Build successor**
   - production non-dev EVM runtime;
   - no default prefunded accounts;
   - exact preserved canonical addresses/code/storage;
   - exact `VoidToken` holder balances/supply;
   - reviewed native-gas execution policy;
   - execution epoch 2.

5. **Offline equivalence proof**
   - source vs successor balances;
   - supply;
   - contract code;
   - storage;
   - roles;
   - validator/staking state;
   - representative read-only calls.

6. **Public anchor**
   - publish source/successor migration manifest;
   - anchor successor root into public VOID truth.

7. **Canary**
   - bounded zero-value/read canary;
   - bounded economic canary only under separate explicit authorization;
   - verify receipt, state root, public read gateway, and checkpoint anchor.

8. **Promotion**
   - archive epoch 1 permanently read-only;
   - activate epoch 2 only after all gates are green.

## Explicit HOLD

The checked-in candidate intentionally remains `HOLD`.

No source in this lane authorizes:

- exporting live state;
- changing Anvil;
- starting a successor;
- changing an authority;
- moving premine;
- deploying a contract;
- signing or broadcasting a transaction;
- enabling a public submission gateway;
- opening the presale;
- opening WC/VOID or BTC/VOID; or
- moving funds.

The first live step, later, is a **read-only final source snapshot/census**.

`PROTECT THE CORE`.
