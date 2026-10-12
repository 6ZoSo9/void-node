# VOID External Opportunity Paper Risk Classification Adapter V1

Marker:
`VOID_EXTERNAL_OPPORTUNITY_PAPER_RISK_CLASSIFICATION_ADAPTER_V1`

## Purpose

This lane connects sanitized paper observations to the merged External
Opportunity Provider Risk Registry V1 without changing the observer, scheduler,
service, credential, wallet, or transaction boundaries.

The adapter is a pure function. A caller supplies:

1. the already-loaded provider risk registry;
2. one already-sanitized paper observation object.

The adapter validates the source boundary, normalizes the allowed economic
fields into `ExternalOpportunityRiskObservationV1`, invokes the merged provider
risk evaluator, and returns a sanitized deterministic classification envelope.

The adapter does not read a JSONL file itself. Filesystem loading and any future
append-only classification journal must remain separate, explicitly reviewed
lanes.

## Real paper-canary fixture

The example fixture is based on the first successful Across scheduled-observer
paper canary:

- quote ID: `49vfz-1784911718830-4cb27a01b8c6`
- opportunity ID:
  `c9a1369c8971bbf1f591266fdc6a9cf2dce25021ba2d33c98dd779f16acbfe6d`
- source record SHA-256:
  `5011973723985a8408878259ba8112182617c1beb332496aaf084cd7cb8bba10`
- gross paper revenue: `$0.999727`
- modeled protocol fee: `$0.005`
- modeled gas cost: `$0.102504`
- modeled slippage: `10 bps` on `$1.00`
- resulting net paper profit: `$0.891223`

No credential value, raw response, transaction payload, wallet data, or private
key is present in the fixture.

## Source acceptance boundary

The adapter requires:

- exact sanitized-observation schema and marker;
- `phase=paper_only`;
- `status=recorded`;
- HTTPS API origin;
- positive chain IDs and valid EVM token addresses;
- safe quote and opportunity identifiers;
- exact lowercase source-record SHA-256;
- finite non-negative economic fields and positive notional;
- `record_append_status=appended`;
- no duplicate fields;
- no pending recovery;
- no retained credential, raw response, or transaction payload;
- no network mutation, wallet/key access, transaction construction, or
  transaction submission;
- no live or general execution authorization.

The adapter recursively rejects explicit secret-bearing keys such as `api_key`,
`authorization`, `credential_value`, `private_key`, `raw_response`,
`transaction_payload`, and signed/raw transaction fields.

## Classification statuses

The output status is one of:

- `classified_paper_positive`
- `classified_paper_negative`
- `risk_held`
- `source_held`

A source-held observation never reaches the provider risk evaluator. A
risk-held observation passed the sanitization boundary but failed provider,
origin, chain, token, quote-age, or registry policy checks.

Only paper-positive and paper-negative decisions may set
`classification_append_authorized=true`. This is an authorization to append a
future classification record, not permission to execute a trade.

## Deterministic binding

The adapter produces a SHA-256 `classification_id` over canonicalized safe
fields:

- adapter marker;
- provider, quote, opportunity, and source-record bindings;
- source-validation reasons;
- normalized risk input;
- provider risk decision;
- final classification status.

The original input object is never copied into the output.

## Explicit non-authority

This lane has no direct authority for:

- filesystem reads or writes;
- observer or scheduler mutation;
- systemd service or timer changes;
- API or RPC requests;
- credential access;
- wallet, key, mnemonic, or signer access;
- transaction construction, signing, or submission;
- live opportunity execution;
- Buy VOID state;
- Work Credit state;
- validator or release state;
- commits, pushes, merges, or deployment by the implementation itself.

## Six-file boundary

1. `src/external_opportunity/paper_risk_classification_adapter_v1.ts`
2. `scripts/prove_external_opportunity_paper_risk_classification_adapter_v1.ts`
3. `fixtures/external-opportunity/paper-risk-classification-adapter-v1.example.json`
4. `schemas/external-opportunity-paper-risk-classification-adapter-v1.schema.json`
5. `.github/workflows/external-opportunity-paper-risk-classification-adapter-v1.yml`
6. this architecture record
