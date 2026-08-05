# VOID Network / `void-node`

<!-- VOID_PUBLIC_DOCS_CURRENT_STATE_V1 -->

**PROTECT THE CORE.**

VOID Network is a Mainnet-0 blockchain, DataNet, and useful-work network built for verifiable coordination between people, operators, and AI agents.

The repository is public and operational, but it is still an early network. Public discovery and proof surfaces are intentionally broader than public mutation authority.

## Current state

Reviewed: **July 20, 2026**

### Live now

- Mainnet-0 block production and multi-node runtime operation.
- Public node discovery at `/public-node` and `/.well-known/void-public-node.json`.
- Read-only public status, proof, DataNet, Work Credit, and validator-candidate evidence.
- Participant-facing application at `/app/` with Home, Wallet, Earn, Data, Buy, Validate, and Network surfaces.
- DataNet publish, read, verify, mirror, pin, and public evidence paths.
- Bounded Work Credit earning through coordinator-issued capability tickets and verified remote-executor receipts.
- Public operator self-checks, offline evidence review, evidence packs, signed attestations, and one-command evidence workflow.
- Positive-readiness evidence for validator registration while active admission remains disabled.

### Still guarded

- Public wallet or signer access.
- Unrestricted public ledger writes.
- Permissionless Work Credit issuance or settlement.
- Automatic Buy VOID fulfillment.
- Public validator activation or validator mutation.
- Treasury movement and private operator routes.

See the [current capability matrix](docs/public/current-capability-matrix.md) for the exact boundary.

## Start here

| You are… | Begin with… |
|---|---|
| Exploring VOID | [Start here](docs/public/start-here.md) |
| Checking current status | [Mainnet-0 current public status](docs/public/mainnet0-current-public-status.md) |
| Running a node | [Run a node](docs/public/run-a-node.md) |
| Participating or earning Work Credits | [Participant onboarding](docs/public/participant-onboarding.md) |
| Reviewing public evidence | [`/public-node`](https://zoso-alienware-aurora-r7.taila47fd.ts.net/public-node) |
| Operating a public node | [Operator evidence workflow](docs/public-node/public-node-operator-evidence-workflow-v1.md) |
| Reviewing validator readiness | [Validator positive-readiness release](docs/validators/validator-registration-positive-readiness-public-release-v1.md) |
| Browsing all public docs | [Public documentation index](docs/public/README.md) |

## What VOID is building

### VOID Chain

A native chain with chain ID `2050`, segmented storage, peer networking, block and transaction APIs, validator truth surfaces, and explicit mutation guards.

### DataNet

A decentralized data layer for storing, serving, mirroring, verifying, weighting, and discovering data. Data can remain persistent without every object receiving equal trust, visibility, or promotion priority.

### Work Credits

Work Credits (`WC`) account for useful, verifiable work.

- WC are intended to be unlimited accounting units.
- The policy conversion is `100 WC : 1 VOID`.
- Current earning is bounded, ticketed, receipt-verified, capped, and duplicate-protected.
- Public self-service issuance and settlement are not enabled.

### Participant and operator surfaces

The application and public-node interfaces expose capability status honestly. A visible button or page does not imply unrestricted authority behind it.

The operator evidence workflow composes:

1. Public-node self-check.
2. Offline receipt review.
3. Evidence-pack creation.
4. Offline evidence-pack review.
5. Signed operator attestation.
6. Independent attestation verification.
