# Paid DataNet Object Integrity Fulfillment CLI V1

Marker: `VOID_PAID_DATANET_OBJECT_INTEGRITY_FULFILLMENT_CLI_V1`

Service: `datanet.object-integrity-check.v1`

This is the first bounded fulfillment adapter for the Paid DataNet public-pilot path. It performs the separate execution step only after an exact approved quote and an exact `ADMITTED_AWAITING_SEPARATE_EXECUTION` admission receipt are supplied.

## What it does

The CLI verifies the Admission Decision packet, the approved customer quote packet, the quoted object count and byte scope, and the existing append-only fulfillment receipt chain. It then reads up to 32 local regular files totaling no more than 256 MiB, computes an observed SHA-256 digest for each object, compares the observed digest and byte length with the customer-supplied expectations, and appends one canonical Paid DataNet fulfillment receipt.

The CLI produces either:

- `OBJECT_INTEGRITY_FULFILLMENT_RECEIPT`, with status `FULFILLED_DELIVERED` when every object matches; or
- `OBJECT_INTEGRITY_FULFILLMENT_RECEIPT`, with status `FULFILLMENT_FAILED` and outcome code `INTEGRITY_MISMATCH` when an observed file does not match; or
- `HOLD_FOR_OBJECT_INTEGRITY_FULFILLMENT_REVIEW` before execution when an input contract, scope, path, receipt chain, timestamp, operator identity, or confirmation token is invalid.

## Required inputs

1. The Admission Decision CLI output with:
   - disposition `ADMISSION_DECISION_RECEIPT`;
   - decision `APPROVE`;
   - reason `PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE`;
   - status `ADMITTED_AWAITING_SEPARATE_EXECUTION`;
   - service code `datanet.object-integrity-check.v1`.
2. The Quote Approval CLI output containing the canonical approved quote packet. This is required because the Admission Decision receipt does not retain the quoted object count and total byte scope.
3. The existing Paid DataNet fulfillment receipt array. Use `[]` for the first fulfillment receipt.
4. An object manifest.
5. A bounded fulfillment operator identifier.
6. Canonical UTC execution-start and completion timestamps.
7. A lowercase SHA-256 hash of the operator's external attestation.
8. The exact confirmation token `executePaidDataNetObjectIntegrityV1`.

## Object manifest

```json
{
  "schema": "void-paid-datanet-object-integrity-manifest-v1",
  "admission_request_id": "<64 lowercase hex>",
  "requester_id": "customer-001",
  "service_code": "datanet.object-integrity-check.v1",
  "objects": [
    {
      "object_ref": "customer-object-001",
      "local_path": "/absolute/or/relative/local/path.bin",
      "expected_sha256": "<64 lowercase hex>",
      "expected_byte_length": 1234
    }
  ]
}
```

The manifest object count and the sum of `expected_byte_length` values must exactly match the approved quote. Object references must be unique. Symlinks and non-regular files are rejected. Local paths are hashed in the result evidence and are not copied into the public result summary.

## Command

```bash
npx --no-install tsx \
  scripts/paid_datanet_object_integrity_fulfillment_cli_v1.ts \
  --admission-decision admission-decision.json \
  --approval approved-quote.json \
  --fulfillment-receipts fulfillment-receipts.json \
  --manifest object-manifest.json \
  --operator fulfillment-operator-001 \
  --started-at 2026-07-25T17:30:00.000Z \
  --completed-at 2026-07-25T17:31:00.000Z \
  --attestation-sha256 '<64 lowercase hex>' \
  --confirm executePaidDataNetObjectIntegrityV1 \
  > object-integrity-fulfillment.json
```

Redirect stdout to a new file. The CLI itself does not write files.

## Evidence and receipts

For each object, the result summary binds:

- the request-bound object reference;
- a SHA-256 hash of the local path rather than the path itself;
- expected and observed digests;
- expected and observed byte lengths;
- digest and byte-length verdicts.

Each per-object result is represented by a deterministic `application/json` evidence artifact. The aggregate result summary hash, external operator-attestation hash, evidence artifacts, approved admission receipt, and append-only fulfillment receipt are bound together by the existing `datanet_fulfillment_receipt_v1` contract.

The output also includes `operator_workflow_fulfillment_input`, which is structurally compatible with the existing Paid DataNet Operator Workflow CLI's `fulfill` boundary.

The CLI binds a caller-supplied SHA-256 hash of an external operator attestation. It does not create or verify a cryptographic signature in V1.

## Safety boundary

The operator explicitly triggers this execution after admission. Therefore successful result packets truthfully report:

- `admission_authorized=true`;
- `execution_authorized=true`;
- `execution_performed_by_cli=true`;
- `automatic_execution_enabled=false`.

The CLI permits bounded local file reads only. It has no network access, no filesystem writes, no payment collection or movement, no Work Credit mutation, no wallet or treasury access, no deployment behavior, and no service-restart behavior.
