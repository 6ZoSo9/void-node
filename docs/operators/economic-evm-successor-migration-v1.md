# Economic EVM successor migration v1

Marker: `VOID_ECONOMIC_EVM_SUCCESSOR_MIGRATION_V1`

Status: architecture/source-only. No state export, wallet access, signing,
broadcast, token movement, deployment, migration, or activation is authorized.

## Decision

The current private Anvil EVM becomes a read-only **Economic Genesis Archive**.

The production successor is a clean non-Anvil EVM execution layer using:

```text
chain_id = 2050
execution_epoch = 2
```

The migration carries forward **economic value and live obligations**, not the
old bootstrap architecture.

That means:

- preserve `VoidToken` supply and ownership;
- preserve participant balances;
- preserve contract-held value through an explicit successor mapping;
- preserve active presale/staking/market obligations;
- use fresh reviewed successor custody contracts and fresh ceremony authority;
- archive AdminGate, ConfigGate, legacy relayer, default Anvil accounts, and
  zero-balance bootstrap plumbing unless a final live dependency proves value
  would otherwise become inaccessible.

## Why this is simpler

The original Anvil state was useful for development and later accumulated real
economic state. Those are different concerns.

We do not need to preserve every old contract merely because it once existed.

The migration question is only:

> What value or live obligation exists at freeze time, and where does it go in
> the successor?

If an old contract has:

- no `VoidToken` balance;
- no participant claim or debt;
- no required live economic dependency; and
- no successor role;

it stays in the archive.

## Premine and supply

The historical reconciled premine reference is:

```text
333,333,333 VOID
```

Maximum supply remains:

```text
666,666,666 VOID
```

The migration does **not** hardcode 333,333,333 as the forever supply because
legitimate emissions may exist by migration time.

At freeze:

```text
source_final_supply = VoidToken.totalSupply()

successor_total_supply
  == source_final_supply
  <= 666,666,666 VOID
```

Migration supply delta must be exactly zero.

No migration mint, burn, hidden refill, historical test redelivery, or omitted
holder is allowed.

## Holder rule

## Canonical VoidToken identity

The successor keeps the canonical `VoidToken` at the same address. Its runtime
identity plus all balance/supply state must match the final source snapshot.

This is intentionally different from preserving the whole old contract graph.

If `VoidToken` contains a privileged authority field, that field may change
only through the reviewed migration manifest and only to a verified address from
the May 23 ceremony set. Balances, total supply, token identity, and ordinary
holder ownership do not change.

No participant is asked to swap into a "new VOID token."

### Participant / ordinary EOA

A normal holder keeps:

```text
same address
same VoidToken balance
```

No manual claim should be required merely because the execution layer changed.

### Contract holder

An old contract holding economic value gets exactly one reviewed disposition:

```text
PRESERVE
  old contract state is genuinely still required

or

REMAP
  exact old contract-held value
    -> exact reviewed successor custody contract
```

Every remap appears in the migration manifest and proves accounting
equivalence.

No value may remain trapped in a contract classified as retired.

## Current known value buckets

Historical evidence already shows meaningful contract-held value in at least:

- `VoidTreasury`;
- `UpgradeStaking`; and
- the funded Buy VOID fulfillment contract after its later 10,000,000-VOID
  funding transaction.

Their **value/obligations** must survive.

Their old code and address do not automatically need to survive.

The final live snapshot is authoritative because custody may have changed after
older evidence was captured.

## AdminGate

AdminGate is **not required** in the successor.

Current retained bootstrap source shows AdminGate was deployed separately and
used as ConfigGate authority in that bootstrap path. It does not show
VoidTreasury or OpsTreasury depending on AdminGate, and the same source says
`AdminGate.systemContracts` keys were not yet wired there.

Successor policy is therefore:

```text
admin_gate_required=false
admin_gate_migrates=false
config_gate_required=false
config_gate_migrates=false
legacy_admin_gate_master_migrates=false
```

AdminGate history remains in the archive.

If final live-state inspection unexpectedly proves some economically necessary
dependency, that dependency must be handled explicitly rather than reviving the
whole old governance layer.

## Fresh ceremony authority

The successor uses direct role-specific authority.

The May 23 Mainnet-0 ceremony artifact records fresh public addresses and states
that secret material stayed outside the repository.

That ceremony artifact did **not** itself transfer the old Anvil AdminGate or
other live contract authority. This is useful: the successor does not need to
inherit the test-era authority graph.

Before migration, the exact fresh-address-to-successor-role map must be reviewed
and verified.

No old Anvil authority receives successor write power by default.

The successor's privileged role map must be drawn from the recorded May 23
ceremony public-address set unless a later **separate explicit authorization**
approves a new key. The verified VOIDKEY2 backup receipt remains part of the
continuity proof. Private material stays off-repo.

The migration itself does not generate replacement privileged keys.

## Funds-safety rule

Migration preparation must not move funds.

The preferred migration mechanism is an **offline state build/import**, not a
series of live treasury transfers.

Before any live cutover can even be proposed:

1. source economic writes are frozen;
2. all accepted economic mutations are finalized;
3. two independent read-only snapshot reconciliations agree on the same final
   block/hash, `VoidToken.totalSupply()`, every holder balance, and every open
   customer/staking/market obligation;
4. a successor is built offline from that snapshot;
5. source-versus-successor equivalence is proven;
6. unmapped `VoidToken` equals exactly zero;
7. orphaned contract-held `VoidToken` equals exactly zero; and
8. the ceremony-key successor role map and backup continuity are verified.

Only then may a **new separately authorized live cutover ceremony** be proposed.

No snapshot, census, proof, or offline successor build may transfer `VoidToken`
or spend treasury funds.

## Treasury

The successor should use a small, explicit custody model rather than reproducing
historical plumbing.

At minimum, the final migration manifest must identify successor destinations
for:

- core treasury reserve;
- active presale inventory/obligation;
- validator stake custody;
- any already-funded market inventory;
- any participant or third-party contract-held balance discovered at freeze.

Zero-balance `OpsTreasury` or other historical contracts do not migrate merely
because their names appear in old deployment metadata.

## Validator stake

`UpgradeStaking` historically held 126,000 VOID.

The successor must preserve the economic beneficiary/accounting of that stake.

That may be done by:

- exact state preservation if the old staking state is still authoritative; or
- explicit remap into a reviewed successor staking/custody contract.

The migration must not transform locked/attributed stake into free treasury
liquidity.

## Presale

The private EVM later funded the Buy VOID fulfillment contract with
10,000,000 VOID.

If that inventory is still authoritative at freeze, its remaining inventory and
all paid/unfulfilled obligations migrate into the successor presale custody
model.

The migration must not:

- restart sold inventory;
- erase fulfilled amounts;
- recreate superseded owner-test canaries;
- duplicate buyer claims; or
- change the fixed presale economics.

## WC relayer

The legacy WC relayer does not migrate.

Current source shows it as an off-chain loopback service. Devnet
`WorkCreditsRelayerV1` references do not establish a canonical live relayer
contract.

Therefore:

```text
legacy_wc_relayer_migrates=false
legacy_wc_relayer_migration_authority=false
```

If final live-state inspection discovers an on-chain contract historically
called a relayer, it is still retired unless real value or an active obligation
depends on it.

## Native gas

`VoidToken` is the only economic VOID asset.

Successor native gas is execution metering only.

It is not:

- part of VOID token supply;
- a second investment asset;
- a market pair;
- something participants must buy from treasury; or
- something migrated from default Anvil balances.

The successor must use a reviewed zero-fee or system-sponsored execution model
with bounded gas metering and abuse controls.

## Anvil accounts

Default/prefunded Anvil accounts and publicly known development keys receive no
production economic capability.

Their historical blocks/receipts remain in the archive.

Their native balances do not migrate as economic value.

Any `VoidToken` held by a known-key address at final freeze must still be
accounted for under the explicit value-migration manifest rather than silently
discarded.

## Replay wall

Before epoch 2 becomes authoritative:

- epoch-1 Anvil write access is disabled;
- pending/retained signed transactions are censused;
- old known-development keys are rejected;
- privileged old signer replay is fenced;
- public gateways bind execution epoch 2; and
- an epoch-2 transaction cannot be replayed through the archived epoch-1
  runtime.

## Public participant interface

Raw public JSON-RPC remains forbidden.

The successor needs:

1. a read-only gateway for balance, receipt, contract-code, state/checkpoint,
   and migration evidence; and
2. a bounded signed-submission gateway for approved economic actions.

The gateway receives signed transactions or bounded signed intents, never user
private keys.

## Public VOID anchor

The successor economic layer must not become an unanchored private database.

Accepted successor checkpoints must commit at least:

```text
execution_epoch
successor block number/hash
successor state root
migration manifest hash
VoidToken identity
VoidToken total supply
economic custody manifest root
```

into the public VOID truth layer.

The first epoch-2 anchor also binds the final archived epoch-1 block/hash and
state/archive manifest hashes.

## Migration ceremony

### 1. Freeze

- stop new economic writes;
- finalize accepted transactions;
- census pending signed transactions and open obligations.

### 2. Snapshot

- final source block/hash;
- full source state dump;
- `VoidToken.totalSupply()`;
- every nonzero `VoidToken` holder;
- every contract holding `VoidToken`;
- every live customer/market/staking obligation.

### 3. Classify

For each holder/contract:

```text
same-address participant balance
preserve required contract
remap contract-held value
archive/no migration
```

### 4. Build successor offline

No live token transfers occur in this phase.

- clean non-Anvil client;
- no default funded dev accounts;
- canonical token identity/state;
- reviewed successor custody contracts;
- fresh ceremony role mapping;
- zero-fee/system-sponsored metered execution;
- epoch 2.

### 5. Prove conservation twice

Use two independent read-only reconciliation paths and prove:

- source final supply == successor supply;
- all participant balances preserved;
- every contract-held value bucket mapped exactly once;
- no value left trapped in retired contracts;
- presale obligations conserved;
- staking value/accounting conserved;
- no dev/test authority migrated.

### 6. Anchor

Publish the migration manifest and anchor the successor state root into the
public VOID truth layer.

### 7. Canary and promotion

A later separately authorized canary proves the read/submission/checkpoint path.

Only then does epoch 2 become authoritative and epoch 1 become permanently
read-only.

## Current HOLD

Epoch-1 source finalization is complete.

The canonical final source snapshot is now:

```text
block_number=37392
block_hash=0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52
VoidToken.totalSupply=333333333 VOID
nonzero_holder_count=3
write_rpc=disabled
archive_checkpoint_state_sha256=94b25d36990d32616a7328f5419f5075fee757c15a955617c79ef30497a14505
```

Two independent read-only reconciliations agree on the final block, token
runtime, supply, holder set, holder balances, and presale accounting. The
epoch-1 RPC service is inactive and disabled, port 8545 has no listener, and a
persistent archive-freeze systemd condition guard is installed.

Canonical public source evidence:

- `ops/mainnet0/economic-genesis-archive-final-snapshot-v1.json`;
- `ops/mainnet0/economic-genesis-archive-epoch1-freeze-v2.json`;
- `ops/mainnet0/economic-genesis-archive-block37392-checkpoint-v1.json`;
- `ops/mainnet0/economic-evm-reconciliation-a-v1.json`; and
- `ops/mainnet0/economic-evm-reconciliation-b-v1.json`.

The migration candidate remains `HOLD` because epoch-2 has not been built or
proven.

The next source gates are:

1. complete the live-obligation census for the final snapshot, especially
   `UpgradeStaking`;
2. produce the exact contract-holder destination manifest;
3. review the minimal successor custody contracts and ceremony-role map;
4. build the epoch-2 successor offline;
5. prove source-versus-successor balance, supply, and obligation equivalence;
6. prove zero unmapped/orphaned `VoidToken`;
7. finish execution-gas sponsorship and replay/epoch fencing;
8. expose bounded public read/submission verification; and
9. anchor the successor state root into the public VOID truth layer.

No source in this lane authorizes deployment, wallet access, signing, broadcast,
token movement, presale activation, market activation, live cutover, or funds
movement.

`PROTECT THE CORE`.
