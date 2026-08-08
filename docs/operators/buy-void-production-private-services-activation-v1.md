# Buy VOID production private services activation v1

Marker:

`VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_V1`

Tracks blocker #1105 and is stacked after production RPC readiness PR #1104.

## Purpose

Compose the existing production activation plan, read-only chain-2050 readiness
probe, credential-backed custodian activation, and submission-capable broadcaster
activation into one bounded private-service lifecycle.

This lane does not submit a transaction. It creates the private signing and
submission capabilities required by a later separately authorized live canary.

## Dry-run boundary

Dry run is the default and performs:

- zero RPC probes;
- zero custodian starts;
- zero broadcaster starts;
- zero credential reads;
- zero signing;
- zero transaction submission/broadcast; and
- zero money movement.

Dry run re-derives the merged production activation plan and returns the exact
plan ID plus the exact coordinator confirmation required for apply.

## Explicit apply boundary

Apply requires byte-exact values:

```text
confirmation=buyVoidStartProductionPrivateServicesV1
expected_plan_id_sha256=<exact dry-run plan ID>
```

Whitespace, case changes, stale plan IDs, or other substitutions are not
normalized into authority.

After those echoes pass, the coordinator executes in this order:

1. re-run the exact #1104 read-only production RPC readiness boundary;
2. start the credential-backed custodian using its merged activation primitive;
3. validate the returned custodian capability against the production plan;
4. start the submission-capable broadcaster using its merged activation primitive;
5. validate the returned broadcaster capability against chain 2050, the exact
   RPC fingerprint, and the existing activation authority; and
6. return both private service handles only after the full sequence succeeds.

The broadcaster activation may perform its existing read-only chain transport
preflight. No `submit_once` invocation occurs in this coordinator.

## Partial-start rollback

The custodian starts before the broadcaster. This ordering keeps broadcaster
submission capability unavailable until the signer side is known to have
started successfully.

If broadcaster activation returns held or throws after custodian start, the
coordinator attempts exactly one custodian stop before returning held.

If a started broadcaster returns a boundary-invalid result, both started
services are stopped: broadcaster first, then custodian.

Rollback outcome is explicit in the decision:

- whether each service start was performed;
- whether rollback was attempted;
- whether rollback succeeded; and
- whether a service may still be active after return.

A cleanup failure is never reported as a clean rollback.

There is no automatic retry, background restart, startup execution, or hidden
second activation attempt.

## Activation truth

Successful apply establishes only:

- chain-2050 RPC readiness was observed;
- the private custodian service is started;
- the private broadcaster service is started;
- later private prepare/sign capability exists; and
- later private `submit_once` capability exists.

Activation itself reports and requires:

```text
credential_read_performed=false
signing_performed=false
submit_once_performed=false
transaction_broadcast_performed=false
money_movement_performed=false
```

A later prepare request may read the systemd credential and sign. A later
broadcaster `submit_once` may broadcast and move native VOID. Those are separate
operational actions and are not authorized by source publication or merge.

## Proof boundary

The synthetic proof covers:

- dry-run zero RPC/start behavior;
- wrong and whitespace-modified coordinator confirmation;
- wrong and whitespace-modified plan ID;
- RPC readiness failure before either service starts;
- custodian failure before broadcaster start;
- broadcaster failure after custodian start with exact rollback;
- explicit reporting when custodian rollback fails;
- started-broadcaster boundary failure with rollback of both services; and
- exact successful sequencing of one readiness call, one custodian activation,
  and one broadcaster activation.

The proof injects synthetic activation dependencies. It does not open a real
production RPC connection, read a credential, start a production Unix socket,
sign, submit, broadcast, or move funds.

## Authority boundary

Source, proof, documentation, CI, branch publication, and draft PR only.

A future invocation with `apply=true` is an operational private-service mutation
and remains separately authorized from source review/merge.

No deployment/service-manager restart, production credential read, signing,
`submit_once`, `eth_sendRawTransaction`, transaction broadcast, inventory
mutation, public fulfilled closeout, Work Credit/validator mutation, or fund
movement is performed by this source lane.
