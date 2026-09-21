# Buy VOID payment-keyed durable history reconciliation v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_HISTORY_RECONCILIATION_V1`

Status: read-only current-runtime reconciliation gate. It does not create or
modify claims, reservations, obligations, execution attempts, saga state,
credentials, wallets, transactions, runtime flags, public state, or funds.

## Purpose

The current payment-keyed runtime already derives execution from a durable
fulfillment intent, inventory reservation, execution attempt, and saga binding.
The inventory journal also preserves paid-but-unreservable obligations.

This gate makes the historical identity relationship explicit before a broader
payment-key history carrier is added.

## Required identity bindings

Every durable inventory reservation must resolve to exactly one fulfillment
intent using all of:

- `payment_key_sha256`;
- `request_key_sha256`;
- canonical payment identity;
- request ID;
- instruction ID;
- normalized delivery address;
- VOID amount; and
- the inventory journal intent fingerprint.

Every execution attempt must resolve to exactly one fulfillment intent and
exactly one inventory reservation using the same payment-key identity tuple.
The attempt's own intent fingerprint must match the current execution-attempt
fingerprint function.

A reservation is allowed to exist before an execution attempt. This preserves
the current crash-consistent stage ordering and does not manufacture an
attempt merely to make reconciliation green.

Every paid-unreservable obligation must resolve to exactly one fulfillment
intent, including the verified source-chain payment binding. An obligation
payment key must not simultaneously have an inventory reservation or execution
attempt. That boundary keeps operator reconciliation separate from automatic
retry.

## Saga boundary

For each existing execution attempt the gate recomputes the exact saga binding
inputs used by the payment-keyed runtime:

- request ID;
- canonical payment identity;
- request key;
- payment key;
- delivery address;
- VOID amount;
- Chain 2050; and
- presale pool ID.

The reconciliation records a deterministic fingerprint over those inputs. It
does not read or mutate the saga store and does not advance a saga.

## Authority boundary

The gate is read-only. In particular:

```text
filesystem_write=false
credential_access=false
wallet_access=false
rpc_call=false
signing=false
transaction_broadcast=false
runtime_activation=false
public_activation=false
automatic_retry=false
money_movement=false
```

This is a prerequisite for the bounded payment-key history carrier tracked by
#1620; it is not activation authority by itself.
