# Buy VOID dispatcher PostgreSQL claimed runtime live fixture v1

Status: isolated CI qualification for
`VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_V1`.
It adds no runtime mount, service action, production credential, Chain-2050 RPC
service, signer, broadcaster, inventory mutation, or funds authority.

## Purpose

The source-only claimed runtime must prove that its server-owned dispatcher
authority works against a real PostgreSQL 16 service before it can be proposed
for the loopback operator parent.

This fixture extends the already accepted #1599 TLS/PostgreSQL setup with one
synthetic private preparation-custody record. It then invokes the claimed
runtime with only:

- the exact synthetic `attempt_id`;
- `apply=true`; and
- the exact claimed-runtime confirmation token.

The caller never supplies a dispatcher client ID, worker ID, lease generation,
lease token, lease TTL, PostgreSQL connection, Pool, root, signer, broadcaster,
RPC URL, or runtime stage.

## Live path

The dedicated Node 22/24/26 workflow:

1. starts disposable PostgreSQL 16;
2. creates a one-day local CA and localhost server certificate;
3. places the PostgreSQL password and CA in private mode-0400
   `/run/credentials/...` files;
4. forces TLS and verifies the service reports SSL on;
5. provisions the exact least-privilege production dispatcher roles, database,
   schema, tables, ACLs, and application identity;
6. creates an isolated runtime root;
7. asserts the fulfillment-wallet credential is absent;
8. writes one synthetic private custody record under that isolated root;
9. invokes the claimed runtime;
10. requires a real dispatcher enqueue and fixed-server-identity claim;
11. requires the claim-side factory to close successfully;
12. requires the already accepted admitted child to open a fresh factory and
    pass live schema admission; and
13. requires the child to stop at the deterministic pre-effect runtime-preview
    HOLD caused by the deliberately absent execution-attempt/saga state.

There is no Chain-2050 RPC listener on the configured synthetic RPC port, and no
fulfillment-wallet credential exists. Reaching the expected HOLD therefore also
proves dependency bootstrap did not occur.

## Expected result

The outer claimed runtime must return:

```text
ok=false
status=held
stage=child
reason=guarded_broadcast_context_held
enqueue_status=submitted
claim_status=claimed
lease_capability_issued=true
lease_capability_returned=false
claim_factory_close_failed=false
child_invoked=true
transaction_broadcast_accepted=false
money_movement_performed=false
money_movement_may_have_occurred=false
automatic_retry_allowed=false
```

The admitted child must report a worker-stage HOLD with
`guarded_broadcast_context_held`, and its guarded worker must report
`context_reason=runtime_preview_held` with dependency bootstrap, broadcast,
and money movement all false.

The serialized returned result must contain no `lease_token` key and no raw
signed transaction.

## Independent database evidence

After the Node proof returns, the workflow queries the disposable dispatcher
database as the fixture administrator and requires the real job row to contain:

- the exact synthetic attempt ID;
- request fingerprint `aa...aa`;
- `lease_owner=void-buy-void-postgres-worker-v1`;
- `lease_gen=1`;
- a 32-hex-character lease token; and
- `published=false`.

This database observation is test-only evidence. The lease token is never
printed or returned through the runtime result.

## Authority boundary

This fixture does not change any production enable/apply value. All enabling
environment variables exist only in the disposable GitHub Actions job.

No production PostgreSQL database, runtime service, wallet credential, signer,
Chain-2050 RPC endpoint, transaction broadcast, VOID inventory, WC ledger,
treasury, liquidity, deployment, or funds are touched.

Acceptance of this fixture only qualifies the source composition for a later,
separate operator-parent mount proposal.
