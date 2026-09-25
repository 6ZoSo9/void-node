# Participant self-paid gas admission v1

Marker: `VOID_PARTICIPANT_SELF_PAID_GAS_ADMISSION_V1`

Status: source-only transaction admission policy. No wallet access, signing,
broadcast, Chain-2050 mutation, or funds movement is authorized.

## Canonical rule

Participants pay their own Chain-2050 gas.

There is no automatic relayer fallback and no sponsored-gas path in this
policy.

Before an operation may advance toward signing, every transaction leg must
already have a bounded gas ceiling and bounded maximum fee. The participant's
current native VOID balance must cover the aggregate maximum upfront
requirement for the **entire operation**.

If it cannot, the operation is refused before the first transaction is signed.

## Why trade output cannot pay current gas

EVM gas must be available before a transaction is accepted and executed.

A WC -> VOID swap may produce VOID, but that output does not exist until after
the approval/swap transaction has consumed gas. Therefore expected trade output
is never counted toward the gas requirement for that same operation.

The policy explicitly reports:

```text
post_execution_proceeds_counted_toward_upfront_gas=false
```

## Multi-leg operations

For each leg:

```text
leg_upfront_requirement =
  native_value_wei
  + gas_limit * max_fee_per_gas_wei
```

The complete operation requires:

```text
aggregate_upfront_native_requirement =
  sum(all leg_upfront_requirements)
```

Admission requires:

```text
participant_native_balance_wei
  >= aggregate_upfront_native_requirement
```

This is important for flows such as WC -> VOID where a first approval
transaction is followed by a swap. The wallet must be able to cover both before
approval begins.

## Bound provenance

Every leg must declare:

```text
gas_limit_source=bounded_preflight_or_reviewed_ceiling
max_fee_source=bounded_preflight_or_policy_cap
```

Missing, unbounded, or guessed leg limits fail closed.

The admission layer does not invent gas estimates or silently increase them.

## Insufficient balance

A short wallet returns:

```text
status=HOLD_INSUFFICIENT_NATIVE_GAS
reason=insufficient_native_gas_for_complete_operation
operation_admitted=false
relayer_used=false
relayer_available=false
sponsorship_allowed=false
```

The next action is simply:

```text
participant_must_add_native_void_gas_then_revalidate_entire_operation
```

No partial first leg should be started merely because a later trade may produce
VOID.

## Sufficient balance

A sufficiently funded wallet returns:

```text
status=SELF_PAID_GAS_ADMITTED
participant_pays_native_gas=true
operation_admitted=true
relayer_used=false
sponsorship_allowed=false
```

Admission is not itself signing or broadcast authority. Those remain separate
transaction lifecycle gates.

## Native-value transfers

For a native VOID transfer, the same admission equation includes both the value
being sent and the maximum gas cost.

This prevents a transaction from being admitted when the wallet can cover the
transfer amount but not the transfer plus gas.

## Authority boundary

This policy performs no:

- credential/private-key access;
- wallet/signer access;
- live RPC;
- transaction construction;
- transaction signing;
- transaction broadcast;
- Chain-2050 write;
- relayer sponsorship;
- funds movement; or
- runtime activation.

## Verification

```bash
node scripts/prove_void_participant_self_paid_gas_admission_v1.mjs
```
