# Buy VOID claimed PostgreSQL dispatcher parent mount v1

Status: source-only operator-parent mount. This change adds a new command action to
the existing loopback-only Buy VOID parent but does **not** enable the parent,
the claimed dispatcher runtime, the admitted PostgreSQL worker, or the
payment-keyed apply gate in production.

## Purpose

The qualified dispatcher path now has:

1. durable preparation custody;
2. PostgreSQL enqueue;
3. server-owned fixed-worker claim;
4. cryptographic 30-second lease custody;
5. live schema/ACL admission;
6. guarded worker execution; and
7. a real PostgreSQL/TLS composition fixture.

The remaining source boundary is to expose that path through the existing
loopback operator parent without giving the caller lease, worker, PostgreSQL,
root, signer, broadcaster, RPC, or transaction authority.

## Parent action

The new parent action is:

```text
run_payment_keyed_dispatcher_claimed_fulfillment
```

The parent adapter accepts only:

```text
action
attempt_id
apply
confirmation
```

The action must be exact. The child claimed runtime independently requires:

- an exact lowercase 64-hex attempt ID;
- `apply=true`; and
- `VOID_CONFIRM_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_V1`.

Unknown caller fields are rejected before the child is invoked.

The existing parent remains loopback-only, disabled by default, and
server-root-controlled.

## Selection and mutation exclusivity

The selector is the already qualified child enable:

```text
VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED=1
```

When this selector is absent/zero, the existing payment-keyed parent behavior is
unchanged.

When it is exactly `1`, any explicit parent mutation command other than the
claimed dispatcher action is rejected. This includes the older direct
`run_payment_keyed_fulfillment` action and legacy pipeline mutation actions.

The rule is fail-closed even if the full-runtime apply flag is accidentally
zero: selecting the claimed dispatcher does not fall back to a legacy mutation
path. The claimed action then holds at its own independent missing apply gate.

## Direct-route defense in depth

The payment-keyed full runtime also owns an older loopback command route outside
the aggregate parent. Parent-only exclusivity would therefore be bypassable.

This gate adds a second guard to that direct handler:

- dry/internal preview remains available;
- explicit direct `apply=true` is rejected with HTTP 409 whenever the claimed
  dispatcher selector is on; and
- the response identifies the claimed parent action as the replacement.

The underlying `runBuyVoidPaymentKeyedFullRuntimeV1` function is not globally
disabled because the admitted dispatcher path needs its dry preview semantics
for server-derived stage/context validation. The restriction is specifically on
the externally reachable direct command handler.

## Claimed parent adapter

The adapter itself mounts no route. It is reachable only through the existing
loopback parent dispatch.

It projects a read-only status containing:

- claimed runtime selected/not selected;
- admitted runtime enabled/not enabled;
- full runtime enabled/not enabled;
- full runtime apply enabled/not enabled;
- required parent action and confirmation; and
- the child/parent authority records.

It calls the fixed
`runBuyVoidPaymentKeyedDispatcherPostgresClaimedRuntimeV1` child and performs
no retry.

## Authority boundary

```text
standalone_route_mount=false
parent_loopback_gate_required=true
parent_enable_gate_required=true
only_action_attempt_apply_confirmation_allowed=true
caller_root_dir_authority=false
caller_client_id_authority=false
caller_worker_id_authority=false
caller_lease_authority=false
caller_lease_ttl_authority=false
caller_postgres_authority=false
caller_pool_authority=false
caller_factory_authority=false
caller_signer_authority=false
caller_broadcaster_authority=false
caller_rpc_url_authority=false
automatic_retry=false
background_loop=false
service_mutation=false
```

This source proposal does not:

- add or alter a systemd unit/drop-in;
- change an enable/apply value;
- access production PostgreSQL;
- access a wallet/signer credential;
- contact Chain-2050;
- sign or broadcast a transaction;
- mutate VOID inventory or WC;
- restart a service; or
- move funds.

## Proof

The hermetic mount proof requires:

- parent contract selector equals the qualified child enable name;
- extra caller worker authority is rejected;
- wrong parent action is rejected;
- wrong child confirmation holds before credential access;
- direct full-runtime `apply=true` is rejected when the claimed selector is on;
- exact claimed command delegates to the child and holds at the deliberately
  absent admitted-runtime gate before any PostgreSQL credential read; and
- no broadcast or money movement occurs.

The existing aggregate runtime integration proof additionally verifies:

- status projection through the real loopback parent;
- claimed selection retires the older direct parent apply action;
- claimed selection retires legacy parent mutation actions;
- caller worker selection is rejected through the real parent; and
- the exact claimed parent command reaches the pre-credential child hold.

## Next gate

After exact-head CI acceptance, the next boundary is host/runtime configuration
qualification: determine the exact PostgreSQL credential/configuration material
and systemd environment needed on the designated production host while keeping
all enable/apply switches at zero. That host-specific proof may require a
Precision command. Production activation remains a later, separately authorized
gate.
