# VOID current capability matrix

<!-- VOID_CURRENT_CAPABILITY_MATRIX_V1 -->

Reviewed: **August 5, 2026**

Source baseline: `main` at `c2decba4e738489fa8c45e041aa7a15c58c64935`.

This table separates runtime evidence from merged source, draft review, and activation authority. The documentation refresh did not re-probe a host or perform a live mutation.

| Capability | State | Current boundary |
|---|---|---|
| Mainnet-0 block/runtime operation | Live runtime evidence | Project-operated multi-node evidence exists; broad outside decentralization remains a growth goal. |
| Public-node discovery | Live, public read-only | `/public-node` and `/.well-known/void-public-node.json`; no private RPC or mutation authority. |
| Participant application | Live within documented boundary | `/app/` exposes Home, Wallet, Earn, Data, Buy, Validate, and Network; each action retains its own gate. |
| Node clone and run | Merged source | Linux x86-64 and WSL2 launcher supports Node.js 22, 24, and 26; Node.js 24 LTS is default. |
| DataNet read and verification | Live, public read-only | Public evidence and verification paths are available. |
| DataNet publish/mirror/pin | Live within authorized path | Public evidence does not imply anonymous public writes. |
| Data weighting | Live, public read-only evidence | Persistence does not imply equal trust, visibility, or promotion. |
| Work Credit proof summaries | Live, public read-only | Proof and verifier links only; no award authority. |
| Work Credit earning | Bounded pilot plus merged source | Coordinator-issued ticket, bounded execution, verified receipt, caps, and duplicate protection. One-command participant tooling exists. |
| Deterministic first 3-WC packet | Merged source | Packet and guarded activation/rollback source exist; no ticket was issued, work executed, or WC written by the merge. |
| Permissionless WC issuance | Not enabled | No public generic-credit route. |
| WC-to-VOID policy | Defined | `100 WC : 1 VOID`; WC are intended to be unlimited accounting units. |
| WC-to-VOID settlement | Guarded | Explicit authorization and evidence required; not public self-service. |
| Local account wallet | Live within local custody boundary | User-controlled local unlock/signing; no public custodial signer. |
| Public wallet/signer API | Not enabled | Private keys and signing authority are not public. |
| Buy VOID request creation | Live within guided path | Request creation does not guarantee payment acceptance or fulfillment. |
| Buy VOID candidate readiness | Merged source plus draft hardening | Canonical request discovery ignores orphan operator events. Direct-root regular-JSON hardening remains draft PR #996. |
| Buy VOID fulfillment | Guarded | Payment verification, recipient checks, replay protection, explicit authorization, and transaction-reference recording required. |
| Automatic Buy VOID fulfillment | Not enabled | No source merge authorizes claiming payment, reserving inventory, signing, broadcasting, or moving funds. |
| Buy VOID crash-consistent fulfillment saga | Draft review | PR #1004 adds source-only atomic persistence, leases, fencing, restart recovery, and ambiguous-broadcast reconciliation; it is not runtime integration. |
| Validator observer checks | Merged source | Readiness, peer floor, and latest-block checks are read-only and do not prove active consensus membership. |
| Validator candidate packet | Merged source, blocked on public inputs | Exact chain 2050, 10,000-VOID minimum, registry bytecode, balance, identity, and calldata checks; no private-key input. |
| Validator registry compiler profile | Merged source | solc 0.8.20, Paris, optimizer 200, and review outputs are fixed. |
| Validator registry reproducibility | Merged source | Native solc and solc-js outputs match exactly; this is not bytecode acceptance or deployment authorization. |
| Stake-safe validator registry | Merged source, undeployed | Exit, unbonding, withdrawal, active-set-removal evidence, capacity safety, and ownership-transfer hardening are merged. Historical unsigned deployment evidence is obsolete. |
| Public validator registry pointer | Not enabled | No reviewed deployed registry address and RPC have been published. |
| Active validator admission | Not enabled | Candidate, Waiting, and Active transitions remain separate authority and runtime gates. |
| Authenticated paid-work post-expiry recovery | Merged source | The expired credential and missing pre-expiry evidence are preserved honestly; no current authentication is established. |
| Canonical replacement issuance plan | Merged source | PR #991 merged the reviewed content-addressed plan and in-memory sanitized request adapter. No request file or private material was generated. |
| Private-runtime reconciliation ancestry repair | Draft review | PR #1001 repairs squash-merge ancestry semantics while preserving all denied authorities. |
| Listener/cgroup operator collector | Draft review | PR #994 is source-only and read-only; it has not been run against Precision. |
| Current authenticated paid-work submission | Not enabled | Requires replacement credential, exact trusted context, replay state, composed runtime revalidation, signatures, quote, digest, and fresh confirmation. |
| VOID Agent Alliance contracts | Merged source, inactive | Voluntary, auditable, revocable, least-authority, provider-neutral, lawful nonviolent membership and admission rules. |
| Alliance enrollment or live charter | Not enabled | No agent is enrolled and no production Sovereign signature or registry mutation occurred. |
| VOID Realms integrity guards | Merged source, source-only | Checkpoint graph, tri-scale transitions, and replica advertisements are validated deterministically. |
| Live VOID Realms world | Not enabled | No server start, world authority, region lease, gameplay commit, deployment, or production claim. |
| USDC/wVOID Base market plan | Merged source, inactive | Separate from fixed-price Buy VOID; no wrapper, pool, liquidity, wallet action, or funds movement. |
| Operator self-check | Live, public read-only | Read-only public-route verification. |
| Operator evidence pack | Live | Offline review, recursive checksums, signed attestation, and independent verification. |
| Release and update infrastructure | Merged source | Installer, update, qualification, rehearsal, and launch gates exist; source merge does not publish a release. |
| Treasury movement | Guarded | No public treasury authority. |
| Private operator mutation routes | Guarded/private | Explicit method and confirmation boundaries; not part of public discovery. |

## Status definitions

### Live

Deployed and usable within the exact documented trust boundary.

### Bounded pilot

Real end-to-end behavior with coordinator issuance, fixed awards, caps, restricted roles, or other explicit limits.

### Merged source

Present and proven on `main`; not automatically deployed, activated, funded, or authorized.

### Draft review

Present only in an open draft pull request and not part of `main`.

### Guarded

Implemented or demonstrated, but requires explicit trusted or sovereign authorization.

### Not enabled

No supported public path exists.

## Canonical references

- [Current public status](mainnet0-current-public-status.md)
- [Start here](start-here.md)
- [Run a node](run-a-node.md)
- [Participant onboarding](participant-onboarding.md)
- [Public earning and validator onboarding](public-earn-validator-onboarding-v1.md)
- [Operator evidence workflow](../public-node/public-node-operator-evidence-workflow-v1.md)
- [Validator positive-readiness release](../validators/validator-registration-positive-readiness-public-release-v1.md)
- [Validator dual-compiler reproducibility](../operators/void-validator-candidate-registry-dual-compiler-reproducibility-v1.md)
- [Alliance membership](../architecture/void-agent-alliance-membership-v1.md)
