# VOID Public Ticket Claim v1

Status: implementation lane. Public activation remains a separate deployment step and must be proven after merge.

Marker: `VOID_WC_PUBLIC_TICKET_CLAIM_V1`

## Purpose

Public Ticket Claim v1 removes the private operator handoff from the first Work Credit earning path without exposing the operator issue route.

An executor proves possession of its VOID node Ed25519 key, requests one bounded claim over the public HTTPS gateway, receives one single-use capability ticket, and runs the existing participant CLI. The coordinator—not the participant—chooses the task, dataset, expected input hash, award, and expiry.

The fixed award remains exactly **3 WC** after verified useful work.

## Routes

| Route | Method | Boundary |
| --- | --- | --- |
| `/wc/public-earning-pilot-v1/claim-ticket` | POST | Public, signed, rate-limited claim for one server-selected outbound ticket |
| `/wc/public-earning-pilot-v1/sign-claim` | POST | Loopback executor helper; requires `dry=0&confirm=wcPublicTicketClaimSign` |
| `/download/wc-public-ticket-claim-v1.sh` | GET/HEAD | One-command public claim-and-earn CLI |
| `/download/wc-public-earning-participant-v1.sh` | GET/HEAD | Existing ticket execution CLI |

`/wc/public-earning-pilot-v1/operator/issue` remains loopback-only and is not public-adapter allowlisted.

## Signed claim contract

The public request body contains exactly:

```json
{
  "claim": {
    "domain": "void:mainnet-0:wc-public-ticket-claim-v1",
    "marker": "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
    "version": 1,
    "account": "participant-account",
    "executor_node_id": "32-lowercase-hex",
    "executor_pubkey": "-----BEGIN PUBLIC KEY----- ...",
    "claim_nonce": "32-lowercase-hex",
    "claim_ts_ms": 0
  },
  "signature": {
    "alg": "ed25519",
    "key_id": "same-32-lowercase-hex-node-id",
    "sig": "128-lowercase-hex"
  }
}
```

The coordinator derives the node ID from the public key, verifies the Ed25519 signature, enforces the timestamp window, and persists a claim ID plus nonce, public-key, and signature hashes. The raw capability token is never written to the public-claim record.

A repeated signed claim is rejected as replay.

## Server-selected work

The participant request cannot provide a dataset, input hash, task class, award, or TTL.

The deployment selects one bounded public work packet through:

- `VOID_WC_PUBLIC_TICKET_CLAIM_DATASET_ID`
- `VOID_WC_PUBLIC_TICKET_CLAIM_EXPECTED_INPUT_HASH`
- `VOID_WC_PUBLIC_TICKET_CLAIM_TTL_MS`

The route returns `503 public_claim_work_unavailable` until both work-binding values are valid.

Every claim ticket uses:

- task `datanet_fetch_verify`
- transport `outbound_bundle`
- no inbound participant port
- fixed award `3 WC`
- account binding
- executor node binding
- dataset binding
- expected input hash binding
- expiry
- single-use capability
- signed result and persisted receipt verification

## Abuse bounds

Public claims do not use the legacy operator canary's consumed-ticket lifetime cap. That lifetime cap would permanently stop a real executor after one completed claim.

Public Ticket Claim v1 instead enforces:

- one active ticket per account
- one active ticket per executor node
- a bounded global active-ticket cap
- a cooldown between claims
- per-account claims per 24 hours
- per-executor claims per 24 hours
- a global claims-per-24-hours cap
- edge rate limiting by public client address
- exact request and response size limits

Deployment controls:

- `VOID_WC_PUBLIC_TICKET_CLAIM_COOLDOWN_MS`
- `VOID_WC_PUBLIC_TICKET_CLAIM_MAX_PER_24H`
- `VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_ACTIVE_CAP`
- `VOID_WC_PUBLIC_TICKET_CLAIM_GLOBAL_MAX_PER_24H`
- `VOID_EARN_GATEWAY_CLAIM_RATE_LIMIT_PER_MINUTE`
- `VOID_EARN_GATEWAY_CLAIM_MAX_BODY_BYTES`

The operator issue route retains its existing legacy cap behavior.

## One-command participant flow

```bash
curl -fsS   https://PUBLIC-VOID-GATEWAY/download/wc-public-ticket-claim-v1.sh   -o wc-public-ticket-claim-v1.sh

chmod 700 wc-public-ticket-claim-v1.sh

./wc-public-ticket-claim-v1.sh   participant-account   https://PUBLIC-VOID-GATEWAY   TRUSTED-COORDINATOR-NODE-ID
```

The claim CLI:

1. verifies the local executor node and trusted coordinator identities;
2. checks that public claim policy is enabled and available;
3. asks the local executor to sign a fresh claim;
4. submits only the signed claim to the public gateway;
5. validates the server-selected ticket and capability-token hash;
6. stores the ticket in a mode-600 file;
7. downloads and syntax-checks the existing participant CLI;
8. performs the exact ticket-bound work and signed result submission;
9. verifies the canonical `+3 WC` delta;
10. deletes the consumed capability ticket.

The capability token is not printed or passed in process arguments.

## Authority boundary

Public Ticket Claim v1 does not expose:

- generic job submission
- participant-selected WC amounts
- participant-selected datasets or input hashes
- arbitrary task classes
- wallet creation, import, unlock, export, signing, or sending
- WC to VOID execution
- Buy VOID fulfillment
- validator admission or mutation
- operator or administrative APIs
- money movement

A successful claim only creates a bounded useful-work ticket. WC is written only after the existing coordinator verifies the executor signature, ticket bindings, persisted job, persisted receipt, input hash, and exact-once acceptance.
