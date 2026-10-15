# Buy VOID request-root host profile v1

Marker: `VOID_BUY_VOID_REQUEST_ROOT_HOST_PROFILE_V1`.

Status: **source-only expected host profile; not provisioned**.

## Why this profile exists

The live Precision census found no `VOID_BUY_REQUEST_DIR` in the running
`void-node-live.service`. The source fallback therefore resolved beneath the
immutable release working directory and the candidate request root did not
exist. A request journal must not depend on whichever immutable release is
currently selected.

The custody-readable source policy in #3003 already defines the metadata
contract. This profile chooses one stable pathname outside the immutable release
tree without granting host mutation.

## Selected Precision profile

```text
host=zoso-Precision-Tower-7810
request_root=/var/lib/void-buy-requests-v1
runtime_user=zoso
runtime_uid=1000
runtime_gid=1000
ipc_group=void-buy-custody-ipc
ipc_gid=980
request_root_mode=0750
requests.jsonl_mode=0640
operator-events.jsonl_mode=0640
customer_sidecar_mode=0600
operator_sidecar_mode=0600
VOID_BUY_REQUEST_DIR=/var/lib/void-buy-requests-v1
VOID_BUY_REQUEST_CUSTODY_READ_GID=980
```

The root remains owned by the runtime UID. GID 980 receives read/traverse only;
the fixed journals are not group-writable. Customer and operator sidecars remain
private.

The path is disjoint from:
- `/opt/void-node-live`;
- `/var/lib/void-allocation-ledger-v1`;
- `/var/lib/void-allocation-custody-v1`.

## Deliberate host HOLD

This profile does not create the directory or journals and does not install the
environment variables. It also does not decide what to do with any historical
request data that may exist elsewhere.

Before apply, a separate host plan must prove:
1. exact current parent-path identity and ownership;
2. the stable root is absent or already exact-compatible;
3. both fixed journals are absent for create-only bootstrap or already
   exact-compatible;
4. historical request/payment data disposition is explicit and non-destructive;
5. the active runtime source contains the #3003 custody-read policy;
6. the user service hardening and authenticated manager evidence are accepted;
7. no customer/payment bytes are silently migrated.

Any future apply must be separately authorized and create-only/fail-closed.

## Authority

```text
stable_request_root_path_selected=true
request_root_provisioned=false
runtime_environment_installed=false
historical_request_data_disposition_proven=false
existing_request_data_migration_authorized=false
host_mutation=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```
