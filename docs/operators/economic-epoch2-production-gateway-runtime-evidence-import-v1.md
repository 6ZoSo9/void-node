# Epoch-2 production gateway runtime evidence import v1

Marker:

`VOID_ECONOMIC_EPOCH2_PRODUCTION_GATEWAY_RUNTIME_EVIDENCE_IMPORT_V1`

Status: source-ready importer/reviewer for one exact production-gateway runtime
evidence candidate.

This lane is stacked on the inactive runtime and machine-local evidence
collector. It does not start a service, open a route, contact RPC, submit a
transaction, or mutate Chain-2050.

## Inputs

The importer requires all of:

1. the exact reviewed runtime service contract object;
2. the caller-pinned `voide2grc1_<sha256>` contract ID;
3. the exact runtime-evidence file bytes;
4. the caller-pinned evidence-file SHA-256;
5. the caller-pinned `voide2gre1_<sha256>` evidence ID; and
6. one explicit UTC import-evaluation time.

The service contract and evidence are independently canonicalized and
content-addressed again during import.

## Independent semantic review

The importer rejects:

- service-contract ID drift;
- contract flags that would enable a route, public submission, transaction
  submission/broadcast, or authoritative Chain-2050 write;
- evidence-file SHA mismatch;
- evidence-ID mismatch;
- hostname/service-unit/unit-file/runtime-source/replay-root/status-path drift;
- malformed startup-receipt identity;
- replay-root custody drift;
- inactive/stopped service evidence;
- invalid or oversized cgroup/process observations;
- any nonzero service socket-FD count;
- missing same-UID/network-namespace observations;
- any premature upstream-live/promotion/cross-epoch/activation truth;
- collector authority drift;
- malformed time windows; or
- evidence that is no longer current at the explicit import time.

A successful import records:

```text
runtime_service_identity_verified=true
same_uid_process_model_verified=true
production_gateway_replay_store_binding_verified=true
```

for that exact imported evidence pair.

## Content-addressed import receipt

The returned receipt is content-addressed as:

`voide2gri1_<sha256>`

and binds:

- service-contract ID;
- evidence-file SHA-256;
- evidence ID;
- hostname/service unit;
- startup-receipt identity;
- replay-root path hash;
- MainPID/start-time/InvocationID/cgroup identity;
- observed/evaluated/valid-until times; and
- exact import evaluation time.

The CLI can write that receipt create-once with `wx`.

## Deliberate remaining HOLD

A single imported gateway receipt does **not** close the entire cross-epoch
replay wall.

It retains:

```text
cross_epoch_replay_protection_proven=false
migration_authorized=false
public_activation_authorized=false
funds_movement_authorized=false
```

The separate closure/promoter must compose this imported gateway binding with
fresh all-production-validator epoch-domain enforcement and independently
revalidate both live evidence sets.

## CLI

```bash
node tools/void-economic-epoch2-production-gateway-runtime-evidence-import-v1.mjs \
  --service-contract /absolute/private/service-contract.json \
  --expected-service-contract-id voide2grc1_<sha256> \
  --evidence /absolute/private/runtime-evidence.json \
  --expected-file-sha256 <sha256> \
  --expected-evidence-id voide2gre1_<sha256> \
  --evaluation-time-utc YYYY-MM-DDTHH:MM:SSZ \
  --output /absolute/path/import-receipt.json
```

## Authority boundary

The importer is source/repository review only. It performs no service action,
network request, credential/key/wallet access, validator mutation, transaction
construction/signing/submission/broadcast, authoritative Chain-2050 write,
token/funds movement, migration, or public activation.

Verification:

```bash
node scripts/prove_void_economic_epoch2_production_gateway_runtime_evidence_import_v1.mjs
```
