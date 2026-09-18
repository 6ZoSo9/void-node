# Buy VOID payment-keyed full runtime v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1`

Status: canonical operator-parent child, mounted but **disabled by default** and
**apply-disabled by default**.

This is the first runtime composition that spans the complete payment-keyed
source path:

```text
preparation
  -> guarded broadcast
  -> broadcast reconciliation
  -> receipt reconciliation
  -> payment-keyed terminal closeout
```

It does not automatically loop across those stages. Each operator command may
advance **at most one** server-derived stage.

## Parent action

The canonical Buy VOID operator parent exposes one additional action:

```text
run_payment_keyed_fulfillment
```

The child also exposes loopback-only status/command routes for direct operator
inspection.

The parent and child remain private operator surfaces. No public Buy VOID route
is introduced by this module.

## Default-off controls

Two child flags are independent:

```text
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=1
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=1
```

The first is required before the child command may perform even read-only stage
preview work.

The second is additionally required before a command with `apply=true` can
mutate journals, sign, broadcast, or run terminal closeout.

The canonical parent retains its own existing enable flag as an additional
outer gate for parent-dispatched commands.

## Caller surface

The child accepts only:

```text
action
attempt_id
apply
confirmation
```

`action` is optional on the child route and, when present, must equal the
parent action.

The caller cannot supply:

- stage;
- root directory;
- RPC URL;
- policies or policy fingerprints;
- saga ID;
- nonce/fee plan;
- signer/wallet;
- raw transaction material;
- receipt material; or
- terminal closeout plan.

The stage is derived from durable attempt+saga state.

## Server-owned policy

The runtime derives the preparation policy from the canonical presale policy
plus the existing payment-keyed Chain-2050 environment:

```text
VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL
VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS
VOID_BUY_VOID_PAYMENT_KEYED_GAS_LIMIT_MULTIPLIER_BPS
VOID_BUY_VOID_PAYMENT_KEYED_MAX_GAS_LIMIT
VOID_BUY_VOID_PAYMENT_KEYED_FEE_MULTIPLIER_BPS
VOID_BUY_VOID_PAYMENT_KEYED_MAX_FEE_PER_GAS_WEI
VOID_BUY_VOID_PAYMENT_KEYED_MAX_PRIORITY_FEE_PER_GAS_WEI
VOID_BUY_VOID_PAYMENT_KEYED_RPC_TIMEOUT_MS
VOID_BUY_VOID_PAYMENT_KEYED_RPC_MAX_RESPONSE_BYTES
```

Receipt policy reuses the same loopback RPC/wallet/contract binding and the
reviewed canonical delivery token configuration:

```text
VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS
VOID_BUY_VOID_DELIVERY_MIN_CONFIRMATIONS
```

The configured fulfillment wallet must match the checked-in canonical
credential-binding evidence.

## Server-derived stage selection

The runtime reads the exact execution attempt and crash-consistent saga and maps
durable state as follows:

| Attempt / saga state | Selected stage |
| --- | --- |
| `reserved` | preparation |
| `prepared + attempt_reserved` | preparation recovery |
| `prepared + transaction_prepared` | guarded broadcast |
| `prepared + broadcast_not_attempted` | guarded broadcast, explicit retry only |
| `broadcast_intent_committed` | broadcast reconciliation |
| `broadcast_unknown` | broadcast reconciliation |
| `broadcast_accepted` with missing canonical broadcast projection | broadcast reconciliation |
| canonical broadcast + `broadcast_accepted` | receipt reconciliation |
| `receipt_confirmed` | payment-keyed terminal closeout |
| `receipt_reverted` | terminal reverted / no closeout |
| `closed` | complete / no mutation |

There is no caller-selected stage and no background progression.

## One-stage command rule

Every command first performs the selected stage's dry/read-only preview.

When `apply=false`, the runtime returns that preview plus the single outer
confirmation token and performs no dependency bootstrap.

When `apply=true`, the child apply-enable flag and exact outer confirmation are checked **before any stage preview**. A disabled or wrongly confirmed apply request therefore performs zero stage RPC, signer, broadcaster, or closeout work.

After those outer gates pass, apply additionally requires:

1. selected stage dry preview is GREEN; and
2. server-derived inner confirmation/fingerprint values from that preview.

Only that same stage is then applied. The command does not advance again after a
successful stage transition.

This preserves explicit operator control and `automatic_retry=false`.

## Payment-keyed dependency bootstrap

Preparation and guarded-broadcast apply are the only stages that may require
signing dependencies.

The runtime creates those dependencies per command from:

- the same fixed systemd credential ID already used by Buy VOID;
- the checked-in canonical fulfillment-wallet credential-binding evidence;
- the durable delivery submission guard; and
- the dedicated payment-keyed Chain-2050 broadcaster.

The dependency bootstrap performs no credential read, RPC, signing, submission
guard mutation, or broadcast while it is being composed.

`get_address()` returns the server-configured canonical wallet without reading
the credential.

Only `sign_transaction(...)` may create the fixed credential signer. Before
that credential read, the wrapper independently verifies an exact Chain-2050
type-2, zero-value `fulfill(bytes32,address,uint256)` transaction to the
configured fulfillment contract.

After signing, the returned transaction is decoded and revalidated again
against the expected wallet, contract, nonce, gas/fees, value and calldata.

## Stage-specific capability boundaries

### Preparation

Explicit apply may perform read-only planning RPC and signing. It does not
broadcast.

A prepared-attempt / `attempt_reserved` crash recovery uses the merged
signerless recovery path and does not bootstrap signing dependencies.

### Guarded broadcast

Explicit apply may sign the exact durable custodian request, commit the saga
write-ahead broadcast intent, claim the durable submission guard and call the
dedicated payment-keyed broadcaster once.

No automatic retry is introduced.

### Broadcast reconciliation

No signer or broadcaster is bootstrapped. The merged reconciliation contract
may perform only read-only exact-hash Chain-2050 inspection and local recovery
projections.

### Receipt reconciliation

No signer or broadcaster is bootstrapped. The merged receipt contract may
perform read-only receipt RPC, persist immutable terminal receipt evidence and
repair local receipt projections.

### Terminal closeout

No signer, broadcaster or Chain-2050 RPC is bootstrapped. The payment-keyed
terminal gate requires confirmed receipt evidence before delegating to the
existing request-locked append-only inventory/public closeout engine.

## Parent authority

The canonical parent itself still:

- does not hold a wallet;
- does not sign;
- does not broadcast;
- does not accept raw signed transaction input; and
- does not move funds.

Its status truthfully reports that the explicitly enabled payment-keyed child
can delegate read RPC, signing, broadcast, and terminal closeout under its
separate enable/apply gates.

The pre-existing ERC-20 delivery runtime remains present; this PR mounts the
payment-keyed successor as a separate default-off child rather than silently
rewriting the old runtime's activation state.

## Activation boundary

Source merge does **not** activate this runtime.

No environment enable flags are changed, no dependency credentials are read, no
service is restarted, no live RPC is called, no transaction is signed or
broadcast, and no real inventory/public closeout occurs during source proof.

Production activation remains a separate host/runtime authorization gate.
