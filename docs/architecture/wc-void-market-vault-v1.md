# WC/VOID market vault v1

Marker: `VOID_WC_VOID_MARKET_VAULT_V1`

Status: source-only Chain-2050 custody contract for the WC/VOID market. This
gate does not deploy, fund, activate, sign, broadcast, or move production funds.

## Purpose

`WCVoidMarketVaultV1` is the dedicated native-VOID custody boundary for the
approved WC/VOID market inventory.

It is designed around the canonical market policy:

- exactly `10,000,000 VOID` must be present at opening activation;
- protocol WC seed remains `0 WC`;
- the presale and WC/VOID use one coupled launch ceremony;
- there is no administrator-set market price;
- the vault is not an operator treasury;
- active market inventory cannot be manually withdrawn or reassigned; and
- returned VOID from later two-way market activity remains real reserve and can
  be used in later reviewed settlements.

## Immutable identities

The constructor binds four immutable values:

- native VOID token;
- coupled-launch controller;
- market settlement executor; and
- exact `coupledLaunchId`.

Zero addresses and a zero launch ID fail closed.

The launch controller and settlement executor are deliberately distinct
capability roles at the contract interface even if a later deployment policy
were to bind them to related infrastructure.

## Activation lock

Before activation, no VOID settlement is permitted.

`activate(coupledLaunchId)` can be called only by the immutable launch
controller and only once. It succeeds only when:

```text
token.balanceOf(WCVoidMarketVaultV1) == 10,000,000 VOID
```

Both underfunded and overfunded opening state fail closed.

The exact-balance requirement applies only to the opening transition. After the
market is active, real market activity may change the reserve.

The contract has no deactivation method.

## Settlement boundary

After activation, only the immutable settlement executor may call:

```text
settleVoid(coupledLaunchId, settlementId, recipient, amountAtoms)
```

The call requires:

- the exact immutable coupled launch ID;
- a nonzero settlement ID;
- a nonzero recipient;
- a nonzero VOID amount;
- a settlement ID not previously consumed; and
- enough real VOID currently held by the vault.

Each settlement ID is create-once. State is recorded before the token transfer;
a failed token transfer reverts the entire transaction, including settlement
identity and counters.

The vault emits the settlement ID, launch ID, recipient, amount, post-transfer
reserve, and block number.

## No false lifetime cap

The opening inventory is exactly 10,000,000 VOID, but the contract intentionally
does **not** impose a 10,000,000-VOID lifetime-outflow ceiling.

That ceiling would be wrong for a two-way market. For example:

1. the vault starts with 10,000,000 VOID;
2. it settles 1,000,000 VOID out;
3. a participant later returns 500,000 VOID through market activity; and
4. that real returned VOID may participate in a later settlement.

The adversarial Foundry suite explicitly proves lifetime outflow can exceed the
opening allocation only when real VOID has first returned to the vault.

Every individual outflow remains bounded by the actual current token balance.

## Locked inventory semantics

V1 intentionally has no:

- owner role;
- generic withdrawal function;
- ERC-20 approval function;
- `transferFrom` path;
- token rescue function;
- arbitrary external call;
- delegatecall;
- selfdestruct;
- manual price setter;
- emergency withdrawal; or
- closeout/recovery function.

Therefore an operator cannot bypass the settlement executor with a generic
withdrawal path.

A narrow emergency recovery or formal market-closeout mechanism is deliberately
**not** smuggled into V1. Canonical policy requires that path to be separately
reviewed. The production readiness candidate therefore remains:

```text
market_vault_source_implemented=true
market_vault_lock_semantics_proven=true
market_vault_recovery_path_ready=false
market_vault_address=null
market_vault_runtime_code_sha256=null
market_vault_independently_verified=false
inventory_funded=false
inventory_lock_proven=false
```

A later recovery mechanism must not become hidden discretionary withdrawal or
manual repricing authority.

## Remaining deployment gates

Source correctness is not deployment proof.

Before the WC/VOID launch can use this vault, separate gates still must establish:

1. reviewed recovery/closeout semantics;
2. exact compiler profile and creation/runtime bytecode identities;
3. exact launch-controller identity;
4. exact settlement-executor identity;
5. deployed Chain-2050 address and runtime code;
6. independent deployment verification;
7. a bounded funding canary;
8. exact funding to 10,000,000 VOID;
9. observed activation lock/post-state;
10. bounded market canary; and
11. the coupled presale + WC/VOID activation decision.

## Authority boundary

This source gate grants no:

- deployment authority;
- treasury transfer;
- inventory funding;
- wallet/signer access;
- transaction construction/signing/broadcast;
- Chain-2050 mutation;
- WC mutation;
- liquidity movement;
- market activation;
- public presale activation; or
- funds movement.

Verification:

```bash
node scripts/prove_void_wc_void_market_vault_v1.mjs
```

and the self-contained Foundry suite:

```text
test/mainnet/WCVoidMarketVaultV1.t.sol
```
