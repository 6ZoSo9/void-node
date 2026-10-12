# Paid DataNet Public Pilot Intake V1

Marker: `VOID_PAID_DATANET_PUBLIC_PILOT_INTAKE_V1`

## Public offer

VOID accepts bounded public pilot requests for three Paid DataNet services:

| Service | What the customer receives | Pricing floor |
|---|---|---:|
| DataNet Object Integrity Check | Request-bound digest verification and an evidence receipt | $2.50 base + $0.25 per object + $0.02 per billable MiB |
| DataNet Public Retrieval Evidence | Bounded public retrieval attempts and reproducible availability evidence | $4.00 base + $0.50 per object + $0.03 per billable MiB |
| DataNet Dataset Replication Audit | Manifest-bound replica coverage and an aggregate coverage report | $12.00 base + $0.10 per object + $0.01 per billable MiB |

The final deterministic quote may be higher when the declared operator cost basis requires the configured minimum margin floor.

Pricing floor details:

- Object Integrity Check: $2.50 base + $0.25 per object + $0.02 per billable MiB
- Public Retrieval Evidence: $4.00 base + $0.50 per object + $0.03 per billable MiB
- Dataset Replication Audit: $12.00 base + $0.10 per object + $0.01 per billable MiB

## No node download required

A customer can request a pilot through the public GitHub issue form without downloading or operating a VOID node.

The issue author’s GitHub account is the public contact surface. The form does not request an email address, phone number, wallet address, payment credential, or private contact detail.

## Eligible requests

The pilot accepts public references or data the requester is authorized to disclose, including:

- public URLs;
- public content identifiers;
- public manifests;
- published SHA-256 digests;
- public replica declarations.

The requester must have the right to submit every reference for the requested service.

## Do not post secrets

The intake issue is public. Do not post:

- passwords or API keys;
- private keys or seed phrases;
- payment credentials;
- personal data;
- confidential customer or employer information;
- private dataset contents;
- non-public infrastructure details.

A request containing unsafe material should be closed without quoting or execution.

## Manual bounded workflow

1. The customer opens the Paid DataNet pilot issue.
2. An operator screens public scope and rejects unsafe or unsupported requests.
3. The merged quote packet component creates a deterministic quote.
4. The operator provides approved payment instructions separately.
5. Payment evidence is verified outside the public issue.
6. The merged admission component records an explicit decision.
7. Work is performed through a separate bounded process.
8. The merged fulfillment component records evidence and delivery outcome.
9. The merged operator workflow CLI verifies the append-only commercial record.

Submission alone does not create a contract, collect payment, guarantee acceptance, or authorize work.

## Commercial controls

- Payment collection in the issue form: disabled.
- Automatic execution: disabled.
- Work Credit mutation: disabled.
- Treasury access: disabled.
- Secret submission: forbidden.
- Operator approval before work: required.
- Verified payment evidence before approved work: required.

## Service limits

The catalog currently enforces:

| Service code | Maximum objects | Maximum total bytes |
|---|---:|---:|
| `datanet.object-integrity-check.v1` | 32 | 268,435,456 |
| `datanet.public-retrieval-evidence.v1` | 16 | 134,217,728 |
| `datanet.dataset-replication-audit.v1` | 256 | 2,147,483,648 |

Requests beyond these limits require a later catalog version and must not be admitted under V1.

## Public intake path

Use the repository’s **Paid DataNet pilot request** issue form.

The form is an intake surface only. It does not execute code, upload datasets, accept secrets, or process payment.
