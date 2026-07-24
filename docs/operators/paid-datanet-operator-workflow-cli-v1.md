# Paid DataNet Operator Workflow CLI V1

Marker: `VOID_PAID_DATANET_OPERATOR_WORKFLOW_CLI_V1`

## Purpose

This CLI turns the merged Paid DataNet commercial components into one bounded, offline operator workflow:

1. create a deterministic customer quote packet;
2. bind customer acceptance and verified payment evidence;
3. record an explicit operator admission decision;
4. record a completion or failure receipt after work is performed elsewhere;
5. verify the resulting workflow envelope and embedded receipt chains.

The CLI reads local JSON files and writes JSON to standard output. It never writes workflow files itself. The operator preserves append-only history by redirecting each successful command to a new file.

## Workflow stages

A valid workflow progresses through these stages:

1. `QUOTED_AWAITING_PAYMENT_EVIDENCE`
2. `ADMITTED_AWAITING_SEPARATE_EXECUTION` or `REJECTED`
3. `FULFILLED_DELIVERED` or `FULFILLMENT_FAILED`

Each update increments `workflow_sequence`, binds `previous_workflow_sha256`, and produces a new deterministic `workflow_sha256`.

## Create a quote workflow

```bash
npx --no-install tsx \
  scripts/paid_datanet_operator_workflow_cli_v1.ts \
  quote \
  --issuer-name "VOID Operator" \
  --customer-name "Example Customer" \
  --customer-reference customer-ref-001 \
  --request-id request-workflow-001 \
  --requester-id customer-workflow-001 \
  --service-code datanet.object-integrity-check.v1 \
  --object-count 2 \
  --total-bytes 1048577 \
  --operator-cost-basis-cents 200 \
  --requested-at-ms 1800000000000 \
  --format pretty \
  > workflow-001-quote.json
```

## Admit or reject the request

The payment evidence reference and SHA-256 are opaque bindings to evidence verified outside this CLI.

```bash
npx --no-install tsx \
  scripts/paid_datanet_operator_workflow_cli_v1.ts \
  admit \
  --input-json workflow-001-quote.json \
  --accepted-at-ms 1800000001000 \
  --payment-evidence-ref payment-evidence-001 \
  --payment-evidence-sha256 <64-lowercase-hex> \
  --payment-verifier-id payment-verifier-001 \
  --payment-observed-at-ms 1800000002000 \
  --submitted-at-ms 1800000003000 \
  --operator-id admission-operator-001 \
  --decision APPROVE \
  --reason-code PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE \
  --decided-at-ms 1800000004000 \
  --format pretty \
  > workflow-001-admitted.json
```

An approved workflow remains explicitly `ADMITTED_AWAITING_SEPARATE_EXECUTION`. The CLI does not authorize or perform execution.

## Evidence file

Fulfillment evidence is supplied as a JSON array:

```json
[
  {
    "evidence_ref": "evidence-result-001",
    "evidence_sha256": "<64-lowercase-hex>",
    "media_type": "application/json",
    "byte_length": 512
  }
]
```

## Record fulfillment

```bash
npx --no-install tsx \
  scripts/paid_datanet_operator_workflow_cli_v1.ts \
  fulfill \
  --input-json workflow-001-admitted.json \
  --evidence-json workflow-001-evidence.json \
  --fulfillment-operator-id fulfillment-operator-001 \
  --execution-started-at-ms 1800000005000 \
  --completed-at-ms 1800000006000 \
  --outcome COMPLETED \
  --outcome-code DELIVERED_AS_QUOTED \
  --result-summary-sha256 <64-lowercase-hex> \
  --operator-attestation-sha256 <64-lowercase-hex> \
  --format pretty \
  > workflow-001-fulfilled.json
```

## Verify a workflow

```bash
npx --no-install tsx \
  scripts/paid_datanet_operator_workflow_cli_v1.ts \
  verify \
  --input-json workflow-001-fulfilled.json \
  --format pretty
```

Verification checks:

- deterministic workflow SHA-256;
- quote packet integrity;
- admission request integrity;
- admission receipt chain;
- fulfillment receipt chain;
- admission-to-fulfillment bindings;
- stage and sequence consistency;
- disabled commercial controls.

## File behavior

The CLI:

- reads regular local JSON files up to 16 MiB;
- writes successful payloads only to standard output;
- writes errors only to standard error;
- does not create, replace, append, rename, or delete files.

Shell redirection is an operator action outside the CLI.

## Hard boundary

The CLI does not:

- collect, refund, or transfer payment;
- verify a payment provider directly;
- contact any network;
- authorize or execute DataNet work;
- issue, debit, or settle Work Credits;
- access wallets, signing keys, or treasury funds;
- add HTTP routes or public UI;
- deploy or restart services.

## Proof

```bash
npx --no-install tsx \
  scripts/prove_paid_datanet_operator_workflow_cli_v1.ts
```

The focused proof covers deterministic quote, admission, rejection, completed fulfillment, failed fulfillment, append-only workflow linkage, CLI file input, stdout-only output, verification, tamper rejection, parser boundaries, malformed inputs, duplicate evidence, and disabled controls.
