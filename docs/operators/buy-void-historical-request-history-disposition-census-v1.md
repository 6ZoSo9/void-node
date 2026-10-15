# Buy VOID historical request-history disposition census v1

Marker: `VOID_BUY_VOID_HISTORICAL_REQUEST_HISTORY_DISPOSITION_CENSUS_V1`.

Status: **source/CI definition of an operator-invoked read-only Precision census**. It does not migrate history, provision the stable request root, change the running service, accept payment, activate the presale, or move funds.

## Purpose

The merged stable request-root policy requires historical request/operator history to be dispositioned before the runtime can move to:

`/var/lib/void-buy-request-journal-v1`.

The merged V2 topology census deliberately stops before reading historical request bytes. That is the correct default, but it leaves one decision unresolved:

- if surviving request or operator-event bytes exist, a reviewed migration plan is mandatory;
- if no bytes are visible, absence still cannot be trusted without an independent rollback-resistant history/genesis anchor.

This census closes only the first half of that decision.

## Designated-host binding

A live `--run` is permitted only as the ordinary runtime user on the designated Precision host. The collector binds:

- hostname `zoso-Precision-Tower-7810`;
- runtime user `zoso` / UID 1000;
- the accepted descriptor-bound machine-ID SHA-256 from the V2 topology census;
- one stable active user-manager `void-node-live.service` process generation;
- no active system-manager instance of that service.

It derives exactly the same two bounded legacy candidates used by the V1/V2 topology census:

1. the active runtime CWD plus the historical default request-store suffix; and
2. `~/dev/void-node` plus that same historical default suffix.

No arbitrary path argument is accepted.

## Read boundary

For an existing legacy candidate the directory must be a direct UID-1000 mode-0700 directory and both fixed journals must be direct UID-1000 mode-0600, single-link regular files bounded to 64 MiB each.

The collector opens every ancestor descriptor-relative with `O_DIRECTORY|O_NOFOLLOW`, retains the directory descriptors, opens the fixed leaf with `O_NOFOLLOW`, reads exactly the pre-open size, and rechecks file and ancestor identity after the read. The entire candidate observation is repeated; the two aggregate observations must be identical.

Only these content-derived values are printed:

- byte count;
- SHA-256 of the complete `requests.jsonl`;
- byte count;
- SHA-256 of the complete `operator-events.jsonl`.

No request IDs, buyer addresses, transaction hashes, wallet addresses, event rows, filenames, or raw machine ID are emitted.

CI never invokes `--run`; it uses only synthetic temporary fixtures plus `--self-test` and `--plan`.

## Fail-closed disposition

When the designated host and repeated observations are stable:

- **any nonzero journal** produces `SURVIVING_HISTORY_OBSERVED_MIGRATION_PLAN_REQUIRED`;
- that result may set `historical_request_history_disposition_proven=true` only for the narrow disposition **surviving history exists and therefore must be preserved by a reviewed migration plan**;
- `migration_required=true`, but `migration_authorized=false`.

When every bounded candidate is absent or both journals are zero bytes, the result is:

`NO_SURVIVING_BYTES_OBSERVED_EXTERNAL_ANCHOR_REQUIRED`.

That result deliberately keeps:

- `historical_request_history_disposition_proven=false`;
- `migration_required=false`;
- `migration_authorized=false`.

A current empty/absent file tree is not rollback-resistant proof that request history never existed. A separate external high-water/genesis/absence anchor would be required before that branch could advance.

Any malformed, unbounded, aliased, non-private, unstable, or unreadable legacy candidate HOLDS.

## Relationship to existing evidence

The focused proof pins the exact merged dependencies:

- V1 topology collector blob `9ca9cb948a08973d0d874c5473ad2743de14140c`;
- V2 designated-host topology collector blob `3c99359bf4ae020ce29c871d0bfcbf8043a44150`;
- stable request-root policy blob `681adb6bb7b6bc942b8cef690e45649dd38cada5`.

The existing original-request prestate census remains the semantic tool for examining historical request first-row quality when a migration plan is required. This new census does not replace it and does not authenticate historical payment origin.

## Operator interface

Plan only:

```bash
python3 -I -B ops/precision/void_buy_historical_request_history_disposition_census_v1.py --plan
```

A future explicitly authorized read-only host observation:

```bash
python3 -I -B ops/precision/void_buy_historical_request_history_disposition_census_v1.py --run
```

Do not use sudo, chmod/chown the historical request roots, copy them into a different trust domain, or modify the service merely to make this census pass.

## Authority boundary

Even the nonzero-history result grants no migration apply authority. The collector performs no filesystem write, permission change, service/systemd mutation, external or loopback network call, credential/key/wallet/signer access, RPC, transaction, Chain-2050/WC write, payment acceptance, presale activation, treasury/liquidity action, or funds movement.

`production_gate_ready=false` always.

**PROTECT THE CORE.**
