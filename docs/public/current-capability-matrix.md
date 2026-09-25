# VOID current capability matrix

<!-- VOID_CURRENT_CAPABILITY_MATRIX_V1 -->

Reviewed: **September 25, 2026**

This table is the compact current-state reference for VOID Mainnet-0.

| Capability | State | Current boundary |
|---|---|---|
| Mainnet-0 block/runtime operation | Live | Project-operated multi-node runtime; broad outside decentralization is still a growth goal. |
| Public P2P bootstrap introductions | Live for the public-bootstrap child | Source-pinned direct IPv4 + Tor v3 introductions, exact expected node IDs, independent failure domains, and live N-1 acceptance. This is onboarding redundancy, not proof of broad decentralization. |
| Public-node discovery | Live, public read-only | `/public-node` and `/.well-known/void-public-node.json`; no private RPC or mutation authority. |
| Participant application | Live | `/app/` exposes Home, Wallet, Earn, Data, Buy, Validate, and Network; each action keeps its own gate. |
| Native Voidchain/NullFeed sites | Live | DataNet-backed content with bootstrap fallback; fallback alone is not DataNet proof. |
| DataNet read and verification | Live | Public evidence and verification paths are available. |
| DataNet publish/mirror/pin | Live within authorized path | Public evidence does not imply anonymous public writes. |
| Data weighting | Live, public read-only evidence | Persistence does not imply equal trust, visibility, promotion, or Chain-2050 truth. |
| DataNet-to-Chain promotion | Guarded | No automatic promotion; canonical Chain-2050 writes require the applicable proof, authority, finality, and constitutional gates. |
| Work Credit proof summaries | Live, public read-only | Proof and verifier links only; no award authority. |
| Work Credit earning | Bounded pilot | Coordinator-issued capability ticket, remote execution, verified receipt, caps, and duplicate protection. |
| Permissionless WC issuance | Not enabled | No public generic-credit route. |
| WC-to-VOID policy | Defined | No fixed redemption ratio. WC are unlimited accounting units and may be exchangeable for VOID at a market-determined price where a separately enabled market exists. |
| WC-to-VOID settlement | Guarded | Explicit authorization and evidence required; not public self-service and not a fixed treasury redemption claim. |
| Production WC/VOID market | Guarded / `HOLD` | Coupled to presale opening; `10,000,000 VOID` protocol inventory, `0 WC` seed, no fixed conversion/opening price. Final vault, funding/lock, opening discovery, settlement adapter/review, replay protection, canary, and coupled activation gates remain incomplete. |
| Local account wallet | Live | User-controlled local unlock/signing; no public custodial signer. |
| Public wallet/signer API | Not enabled | Private keys and signing authority are not public. |
| Buy VOID request creation | Live | Guided request path only. |
| Buy VOID fulfillment | Guarded | Payment verification, explicit authorization, and transaction-reference recording required. |
| Automatic Buy VOID fulfillment | Not enabled | Must pass bounded-payment, replay, recipient, and accounting gates before release. |
| Public presale intake | Guarded / `HOLD` | Fixed presale economics remain `10,000,000 VOID` at `2 VOID / 1 USDC` (`$0.50/VOID`), but public opening is coupled to WC/VOID readiness and neither lane may open alone. |
| Validator candidate registration | Positive-readiness / candidate-waiting | Public evidence exists; active admission remains disabled. |
| Active validator admission | Not enabled | Separate stake, identity, readiness, capacity, and operator policy required. |
| Operator self-check | Live | Read-only public-route verification. |
| Operator evidence pack | Live | Offline review and recursive checksums. |
| Signed operator attestation | Live | Dedicated SSHSIG namespace and exact evidence-pack binding. |
| One-command operator evidence workflow | Live | Self-check through independent attestation verification; no mutation attempted. |
| Official stable node release | Not published | Package version is `0.1.0`, but no `release-v0.1.0` tag/stable node release exists; the July external-agent packet release is not a node distribution. |
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
