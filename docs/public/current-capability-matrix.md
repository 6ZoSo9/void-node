# VOID current capability matrix

<!-- VOID_CURRENT_CAPABILITY_MATRIX_V1 -->

Reviewed: **July 20, 2026**

This table is the compact current-state reference for VOID Mainnet-0.

| Capability | State | Current boundary |
|---|---|---|
| Mainnet-0 block/runtime operation | Live | Project-operated multi-node runtime; broad outside decentralization is still a growth goal. |
| Public-node discovery | Live, public read-only | `/public-node` and `/.well-known/void-public-node.json`; no private RPC or mutation authority. |
| Participant application | Live | `/app/` exposes Home, Wallet, Earn, Data, Buy, Validate, and Network; each action keeps its own gate. |
| Native Voidchain/NullFeed sites | Live | DataNet-backed content with bootstrap fallback; fallback alone is not DataNet proof. |
| DataNet read and verification | Live | Public evidence and verification paths are available. |
| DataNet publish/mirror/pin | Live within authorized path | Public evidence does not imply anonymous public writes. |
| Data weighting | Live, public read-only evidence | Persistence does not imply equal trust, visibility, or promotion. |
| Work Credit proof summaries | Live, public read-only | Proof and verifier links only; no award authority. |
| Work Credit earning | Bounded pilot | Coordinator-issued capability ticket, remote execution, verified receipt, caps, and duplicate protection. |
| Permissionless WC issuance | Not enabled | No public generic-credit route. |
| WC-to-VOID policy | Defined | `100 WC : 1 VOID`; WC are intended to be unlimited accounting units. |
| WC-to-VOID settlement | Guarded | Explicit authorization and evidence required; not public self-service. |
| Local account wallet | Live | User-controlled local unlock/signing; no public custodial signer. |
| Public wallet/signer API | Not enabled | Private keys and signing authority are not public. |
| Buy VOID request creation | Live | Guided request path only. |
| Buy VOID fulfillment | Guarded | Payment verification, explicit authorization, and transaction-reference recording required. |
| Automatic Buy VOID fulfillment | Not enabled | Must pass bounded-payment, replay, recipient, and accounting gates before release. |
| Validator candidate registration | Positive-readiness / candidate-waiting | Public evidence exists; active admission remains disabled. |
| Active validator admission | Not enabled | Separate stake, identity, readiness, capacity, and operator policy required. |
| Operator self-check | Live | Read-only public-route verification. |
| Operator evidence pack | Live | Offline review and recursive checksums. |
| Signed operator attestation | Live | Dedicated SSHSIG namespace and exact evidence-pack binding. |
| One-command operator evidence workflow | Live | Self-check through independent attestation verification; no mutation attempted. |
| Treasury movement | Guarded | No public treasury authority. |
| Private operator mutation routes | Guarded/private | Explicit method and confirmation boundaries; not part of public discovery. |

## Status definitions

### Live

Deployed and usable within the exact documented trust boundary.

### Bounded pilot

Real end-to-end behavior with limits such as coordinator issuance, fixed awards, per-account caps, global caps, or restricted roles.

### Guarded

Implemented or demonstrated, but requires explicit trusted authorization and is not exposed as unrestricted public authority.

### Not enabled

No supported public path exists.

## Canonical references

- [Current public status](mainnet0-current-public-status.md)
- [Start here](start-here.md)
- [Run a node](run-a-node.md)
- [Participant onboarding](participant-onboarding.md)
- [Operator evidence workflow](../public-node/public-node-operator-evidence-workflow-v1.md)
- [Validator positive-readiness release](../validators/validator-registration-positive-readiness-public-release-v1.md)
