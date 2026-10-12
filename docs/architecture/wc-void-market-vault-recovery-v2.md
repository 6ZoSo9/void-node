# WC/VOID market vault recovery v2

Marker: `VOID_WC_VOID_MARKET_VAULT_RECOVERY_V2`

Status: source-only successor generation for `WCVoidMarketVaultV1`.
This gate adds the separately reviewed recovery/closeout semantics required by
the canonical market policy. It performs no deployment, funding, activation,
wallet access, signing, broadcast, Chain-2050 write, WC mutation, liquidity
movement, or funds movement.

## Why V2 exists

V1 intentionally omitted any recovery or closeout escape hatch. That proved the
base lock semantics but left production readiness on HOLD because canonical
policy permits emergency recovery or formal closeout only through a narrow,
separately reviewed transition.

V2 preserves the locked-market behavior and adds one terminal transition whose
shape cannot act as an ordinary operator withdrawal or manual repricing path.

## Fixed roles

Construction binds immutable:

- native VOID token;
- coupled-launch controller;
- settlement executor;
- closeout controller; and
- coupled launch ID.

The settlement executor and closeout controller are separate contract roles.
A production deployment must review their final identities separately.

## Closeout state machine

The market begins in normal activated state.

### 1. Proposal

Only the immutable closeout controller may call:

```text
proposeCloseout(coupledLaunchId, closeoutId, successorVault)
```

The call requires:

- the exact coupled launch ID;
- a nonzero closeout ID;
- a contract successor, not an EOA and not the current vault; and
- successor lineage that reports:
  - the exact same VOID token;
  - the exact same coupled launch ID; and
  - `predecessorVault() == address(this)`.

A successful proposal immediately sets `closing=true`.

That freezes all new market settlement. There is no cancel, reopen, replacement,
or proposal-reset function in V2.

### 2. Independent approval

Only the immutable settlement executor may approve.

Approval must repeat the exact:

- coupled launch ID;
- closeout ID; and
- successor vault.

The successor lineage is revalidated at approval.

The closeout controller cannot self-approve unless production policy had
separately and explicitly assigned the same address to both roles. The source
contract itself keeps the capabilities distinct.

### 3. Execution

Only the immutable closeout controller may execute after the exact proposal has
been approved.

Execution:

1. revalidates the exact proposal;
2. revalidates successor lineage again;
3. reads the complete live VOID balance;
4. sets terminal closed state;
5. transfers the **entire live reserve** to the approved successor;
6. calls the successor recovery acknowledgement hook with the exact closeout ID
   and transferred amount; and
7. requires the exact V2 acknowledgement digest.

A bad transfer or bad acknowledgement reverts the complete transaction,
including closeout state and token movement.

The operator cannot choose a smaller closeout amount. There is no partial
recovery path.

## Successor contract boundary

A successor must expose:

```text
voidToken()
coupledLaunchId()
predecessorVault()
acceptRecoveredVoid(closeoutId, amountAtoms)
```

This source gate verifies lineage shape but does not pre-approve an arbitrary
future successor implementation. The exact successor used in a real closeout
must still be separately reviewed before that closeout is authorized.

The transition therefore solves the hidden-withdrawal problem without claiming
that every possible successor contract is safe.

## Market lock preservation

Normal settlement remains:

- unavailable before activation;
- unavailable while closing;
- unavailable after closeout;
- executable only by the immutable settlement executor;
- bound to the exact coupled launch ID;
- replay-protected by settlement ID; and
- bounded by the actual live VOID reserve.

The exact 10,000,000-VOID opening-balance requirement is preserved.

## No administrative escape hatch

V2 still contains no:

- owner role;
- generic withdrawal;
- generic ERC-20 approval;
- `transferFrom` path;
- token rescue;
- arbitrary external-call surface;
- delegatecall;
- selfdestruct;
- closeout cancellation;
- market reopen;
- manual price setter; or
- operator-selected closeout amount.

## Production candidate effect

With this source generation, the candidate may truthfully record:

```text
market_vault_contract_name=WCVoidMarketVaultV2
market_vault_source_implemented=true
market_vault_lock_semantics_proven=true
market_vault_recovery_path_ready=true
```

It remains HOLD on:

- compile/runtime bytecode identity;
- deployed Chain-2050 address;
- independent deployment verification;
- exact role bindings;
- inventory funding;
- live inventory-lock evidence;
- WC settlement independent review;
- live ledger persistence/custody;
- participant opening claim policy;
- bounded canary; and
- coupled activation readiness.

## Authority boundary

No value-bearing action follows from this source gate.

Verification:

```bash
node scripts/prove_void_wc_void_market_vault_recovery_v2.mjs
```

The self-contained Solidity suite is:

```text
test/mainnet/WCVoidMarketVaultV2.t.sol
```
