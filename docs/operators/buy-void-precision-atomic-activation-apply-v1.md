# Buy VOID Precision atomic activation apply v1

Marker: `VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_APPLY_WRAPPER_V1`

## Purpose

This is the separately reviewed operational crossing that follows the existing
GREEN Precision atomic preflight and inactive live/rollback staging lane.

It enables the private Buy VOID payment-keyed fulfillment runtime on the
Precision production node. It does **not** open public Buy VOID request intake,
activate the public presale, activate WC/VOID, submit a fulfillment command,
sign or broadcast a transaction, or move funds.

The required sequence is therefore:

1. private Buy VOID runtime activation;
2. bounded production canary and reconciliation;
3. separately reviewed coupled public Buy VOID + WC/VOID opening.

## Why the stage is not authority

The existing stage manifest intentionally says
`STAGED_BYTES_ONLY_NOT_PREFLIGHT_AUTHORITY`. This wrapper never treats it as
fresh activation authority.

Every invocation first runs:

```text
ops/precision/void_precision_buy_void_atomic_activation_stage_v1.sh
```

That wrapper itself reruns the complete reviewed atomic preflight, including
current canonical `main`, gate ownership, dormant process state, runtime
fingerprints, and loopback PostgreSQL TLS/schema requalification. Only after
that fresh wrapper returns GREEN does this executor inspect the newly bound
private stage.

The stage manifest, repository HEAD/tree, preflight-log digest, exact live
bytes, and exact rollback bytes are revalidated before any mutation.

## Plan mode

Plan mode is the default:

```bash
bash ops/precision/void_precision_buy_void_atomic_activation_apply_v1.sh
```

It performs the fresh preflight + staging transaction and prints the exact
activation confirmation. It performs no active drop-in write, daemon reload,
service restart, transaction command, signing, broadcast, public intake
activation, or funds movement.

Expected terminal marker:

```text
VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_APPLY_WRAPPER_V1_PLAN_GREEN
```

The confirmation is content-bound:

```text
activate-buy-void-precision-atomic-v1:<live_configuration_sha256>:<live_dropin_sha256>
```

## Apply mode

Apply mode requires the exact confirmation printed by a fresh plan/revalidation
run:

```bash
APPLY=1 \
CONFIRM='<exact activation_confirmation from the fresh run>' \
bash ops/precision/void_precision_buy_void_atomic_activation_apply_v1.sh
```

The wrapper then:

1. creates private create-once evidence for the activation generation;
2. atomically installs only the exact staged live
   `96-buy-void-payment-keyed-postgres-atomic-activation-v1.conf`;
3. fsyncs the installed file and parent directory;
4. runs one `systemctl --user daemon-reload`;
5. requires the effective Buy VOID gate tuple to be exactly live
   (`1,1,1,1,1`);
6. refuses to proceed if `VOID_BUY_REQUESTS_ENABLED=1`;
7. performs one controlled restart of `void-node-live.service`;
8. requires health/readiness GREEN and the private Buy VOID runtime status to
   report full/apply + claimed/admitted runtime enabled with the reviewed
   policy/history-carrier prerequisites still ready;
9. writes post-activation evidence.

No Buy VOID command endpoint is called by this wrapper.

Successful private activation ends at:

```text
status=PRIVATE_BUY_VOID_RUNTIME_ACTIVATION_GREEN_PUBLIC_INTAKE_HOLD
public_buy_request_intake_enabled=false
public_presale_activation=false
wc_void_public_activation=false
canary_required=true
```

## Automatic rollback

Once the active drop-in has changed, any later error enters the rollback trap.
The wrapper atomically installs the exact staged dormant rollback bytes,
daemon-reloads, verifies the dormant effective gate tuple
(`1,0,0,0,0`), restarts the service, and waits for the private runtime to
return to dormant readiness.

Successful rollback reports:

```text
VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_APPLY_WRAPPER_V1_ROLLBACK_GREEN
rollback_state=dormant_staged_rollback_active
```

The rollback drop-in intentionally remains installed as the explicit dormant
winner. A later retry must be separately reconciled rather than silently
removing that emergency state.

If rollback cannot re-establish the dormant state, the wrapper reports
`ROLLBACK_INCOMPLETE_MANUAL_INTERVENTION_REQUIRED` and never claims success.

## Authority boundary

The operational apply transaction authorizes only:

```text
exact staged active drop-in write=true
daemon_reload=true
single_controlled_restart=true
private_buy_void_runtime_gate_activation=true
```

It explicitly does not authorize:

```text
public_buy_request_intake_activation=false
public_presale_activation=false
wc_void_public_activation=false
buy_void_command_invocation=false
wallet_or_signer_access=false
transaction_signing=false
transaction_broadcast=false
funds_movement=false
```

The next gate after a successful apply is a separately reviewed bounded real
Buy VOID canary. Public intake remains fail-closed until that canary and the
coupled WC/VOID launch checks are green.
