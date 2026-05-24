# VOID Network Whitepaper

status: public_mainnet0_live
version: v0.1-mainnet0
checkpoint: 49f460ea / ckpt-mainnet0-public-release-bundle-closeout-green-20260524-091935
network_state: public_mainnet0_live / GO_PUBLIC_MAINNET0

## 1. Abstract

VOID Network is a verifiable data, compute, and participant network designed around locally runnable nodes, public proof artifacts, guarded operational lanes, and a participant-first wallet surface.

Mainnet-0 is the first public-live checkpoint. It establishes the public launch state, public documentation bundle, onboarding path, release hygiene boundary, and proof-backed operator posture. Mainnet-0 is intentionally conservative: the public status surface is live, but public active validator admission, vault126 onboarding, future treasury spend, and Buy VOID fulfillment remain guarded by separate proof lanes.

VOID is built to support:

- verifiable node runtime state,
- participant-operated accounts and wallets,
- off-chain encrypted DataNet storage indexed by on-chain commitments,
- Work Credits for accepted useful work,
- validator runtime truth and epoch manifests,
- proof-gated operations,
- future AI-agent integrations through wallet-operated oracle/agent flows,
- public release hygiene that excludes secrets and private runtime artifacts.

This document is technical and informational. It is not financial advice, not a promise of profit, and not an offer to sell securities.

## 2. Mainnet-0 status

VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0.

The public release bundle is cross-box proven at:

    49f460ea / ckpt-mainnet0-public-release-bundle-closeout-green-20260524-091935

The bundle records:

- public live closeout,
- public onboarding docs,
- public announcement docs,
- root README public docs pointer,
- public release hygiene,
- sanitized public release export / gitleaks clean path,
- Precision and Alienware cross-box readiness.

Mainnet-0 public-live status does not mean every control lane is open. The following guardrails remain active:

- Public active validator admission remains disabled.
- Public validator registration remains candidate/waiting only.
- Vault126 onboarding has not been executed.
- Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.
- Future treasury spend remains separately guarded.
- No additional authority transfer is authorized by the public release bundle.

## 3. Design goals

VOID Network is designed around five core goals.

### 3.1 Verifiability

Every major operational transition should be backed by a proof script, a committed artifact, a tag, and, where possible, a cross-box proof. Public claims should be reproducible from repository state rather than dependent on memory or private screenshots.

### 3.2 Local-first participation

A participant should be able to run a node locally, open a participant page, manage wallet/account actions, inspect status, and interact with network features from their own environment.

### 3.3 Guarded mutation

Potentially dangerous operations are separated from public UI state. Validator admission, treasury movement, authority transfer, Buy VOID fulfillment, and launch-state promotion are not casual button clicks. They require exact proof lanes, explicit artifacts, and operator intent.

### 3.4 AI-ready data infrastructure

VOID is intended to become useful to AI systems by giving them verifiable data receipts, DataNet indexed storage, participant work proofs, and eventually wallet-operated agent/oracle flows.

### 3.5 Public hygiene

A public release must be sanitized. Secret-bearing paths, runtime private artifacts, local proof logs, wallet files, keystores, private keys, mnemonic phrases, passphrases, seed material, caches, build output, and local databases must not be part of public export.

## 4. Network architecture

VOID is composed of several cooperating layers.

### 4.1 Node runtime

The node exposes local HTTP routes, participant surfaces, status endpoints, DataNet endpoints, validator truth routes, and operational proof routes.

A healthy node exposes readiness through:

    /__void/ready.json

Healthy Mainnet-0 readiness requires:

- ready = true,
- gap = 0,
- txroot_live = 1.

### 4.2 Participant surface

The participant page is the user-facing control surface served by a local node.

Current path:

    http://127.0.0.1:4100/participant

The participant page is intended for wallet setup, account status, Buy VOID instructions, staking/validator candidate status, DataNet flows, and public safety notices.

### 4.3 Validator runtime truth

Validator truth is represented through runtime endpoints and verified epoch manifests. Runtime truth tracks loaded epochs, latest epoch, validator counts, schedules, proposer lookup, and window slices.

Mainnet-0 has proof-backed validator runtime through epoch127.

Public active validator admission remains disabled. Public registration is candidate/waiting only. The next guarded operator selector remains:

    vault126 / epoch128 / expectedValidatorCount=127

This selector is not public active admission. It is a guarded operator lane that requires separate proof and explicit live-execution enablement.

### 4.4 DataNet

DataNet is the off-chain data layer. Data is stored off-chain and indexed or committed on-chain through roots, hashes, manifests, pointers, receipts, and access-policy commitments.

The intended model is:

- store bulk data off-chain,
- commit compact proofs or pointers on-chain,
- encrypt data by default,
- allow users to choose public data when desired,
- fetch/read data through controlled DataNet paths,
- award Work Credits only for accepted useful work receipts.

On-chain storage is intentionally limited to small records, metadata, receipts, commitments, hashes, Merkle roots, access-policy commitments, and DataNet/VPod pointers. Large raw files should not be stored directly on the base chain.

### 4.5 VPod concept

VPod storage is intended to behave like a shifting data substrate. Data location and redundancy can move based on demand, availability, and policy. The long-term goal is for data to seek equilibrium like water: more replicated where demand is high, repaired when availability drops, and reduced where storage is wasteful.

### 4.6 Work Credits

Work Credits are participant-earned credits for accepted, useful, verifiable work. The default policy is agent-selected useful work triggered by a wallet action such as Earn Work Credits.

Important rules:

- Work Credits are not awarded for button clicks alone.
- Work Credits are not awarded for nonsense tasks.
- Work Credits require accepted receipts.
- Work selection should be network-useful by default.
- User override should mainly allow stop/opt-out, not arbitrary fake work selection.

Current WC flow remains participant-ledger based, with future movement toward on-chain WC so users can hold WC in wallets and later swap WC for network-native assets such as NFTs.

### 4.7 Obelisk Wallet and wallet-operated agent/oracle

The intended wallet architecture includes a wallet-operated oracle/agent, called Obelisk Agent.

The wallet can:

- compress data,
- encrypt data,
- upload data off-chain,
- commit roots or metadata on-chain,
- perform off-chain processing,
- return results/proofs to VOID contracts,
- use wallet-derived keys and EIP-712 signatures.

This avoids depending on external oracle systems as the default core primitive. The wallet itself becomes a participant-controlled edge agent.

## 5. Proof philosophy

VOID uses proof scripts as operational contracts. A proof script should check a specific claim and fail closed when the claim is false.

Examples of proofed claims include:

- node readiness,
- cross-box status,
- public launch state,
- validator runtime truth,
- DataNet accepted receipt paths,
- Work Credit receipt gating,
- Buy VOID hard-stop behavior,
- treasury dry-run and live seed recording,
- public release hygiene,
- sanitized public export / gitleaks clean state,
- public docs and announcement bundle.

A typical checkpoint includes:

1. code or documentation change,
2. proof script,
3. local proof,
4. commit,
5. tag,
6. push,
7. cross-box sync,
8. remote proof,
9. final cross-box proof.

## 6. Consensus and validator model

Mainnet-0 currently uses a conservative validator posture. Operator/bootstrap validators establish runtime truth and help prove the chain and participant surface. Public registration exists as candidate/waiting posture, but public active validator admission is disabled.

Core policies:

- Public active validator admission remains disabled at Mainnet-0 public launch.
- Public registration is candidate/waiting only.
- Public registration does not mutate the active validator set.
- Active admission requires guarded operator epoch steps.
- Future public validator activation should use churn limits and explicit proof gates.
- Repeatable runtime truth must be proven before claims about active validator state.

Longer-term, public validators should enter through transparent candidate, admission, demotion, and rotation policies. The design preference is validator rotation a few times per year to preserve fairness and reduce capture risk.

## 7. Treasury architecture

VOID separates cold treasury and operational treasury behavior.

Mainnet-0 includes:

- VoidTreasury as a cold treasury holding premine funds.
- OpsTreasury as a hot operational treasury.
- A guarded sendToOps path from VoidTreasury to OpsTreasury.
- A guarded spend path from OpsTreasury to recipients.

The Mainnet-0 OpsTreasury seed was executed and recorded:

- OpsTreasury seed amount: 1,000,000 VOID.
- VoidTreasury post-seed balance: 332,207,333 VOID.
- OpsTreasury post-seed balance: 1,000,000 VOID.

Future treasury movement is not authorized by the launch status. Any future movement must use its own dry-run, signer check, broadcast transaction, tx hash record, post-state balance proof, and closeout artifact.

## 8. Tokenomics

VOID has a capped supply design.

Current tokenomics pillar:

- Maximum supply cap: 666,666,666 VOID.
- Mainnet tokenomics split: 333,333,333 premine plus 333,333,333 emissions.
- Founder trust allocation is recorded in prior tokenomics work as 230,000,000 VOID.
- OpsTreasury seed: 1,000,000 VOID moved from cold treasury to operational treasury for Mainnet-0 operations.
- Future emissions and distribution should remain tied to useful network behavior, validator economics, participant incentives, and abuse controls.

Token utility is intended to include:

- network fees,
- staking or validator-related roles,
- Work Credit economics,
- DataNet usage,
- future AI-agent/data flows,
- participant and application-level activity.

The token-value thesis is based on demand for verifiable data, work receipts, DataNet usage, wallet/agent execution, and network fees, while supply is constrained by the fixed cap and controlled emissions.

## 9. Buy VOID flow

Buy VOID is guarded.

Current policy:

- Use the participant page.
- Use supported payment rails only.
- Do not send blind deposits.
- Do not send from exchanges or custodial accounts when the participant flow warns against it.
- Payment confirmation does not equal VOID sent.
- VOID fulfillment requires explicit payment verification and a recorded VOID transaction reference.

This prevents accidental fulfillment, unsupported deposits, and operator ambiguity.

## 10. Data and privacy

VOID uses an off-chain encrypted data model with on-chain commitments.

Data may be:

- encrypted by default,
- readable with the correct password or key material,
- optionally public if the user chooses,
- indexed by on-chain roots/pointers/commitments,
- retrieved through DataNet fetch/read paths.

Users should not store large raw files on-chain. Bulk data belongs in DataNet/VPod-style off-chain storage, with compact commitments on-chain.

## 11. Security model

Mainnet-0 security posture includes:

- proof-gated release and launch claims,
- public release hygiene,
- gitleaks scanning of sanitized export trees,
- avoidance of secret-bearing public artifacts,
- controlled treasury movement,
- guarded validator active admission,
- status smoke checks,
- cross-box verification,
- readiness checks with ready/gap/txroot_live,
- proof scripts for major operational claims.

Planned/desired hardening includes:

- signed genesis manifests,
- peer authentication,
- DoS guards,
- timestamp drift checks,
- emergency halt with multisig/timelock,
- reproducible builds,
- SBOM generation,
- artifact signing,
- SLSA-style pipelines,
- hardware-token-backed release signing,
- key rotation,
- KMS/age support,
- erasure coding,
- adaptive networking,
- light clients,
- dashboards and SLOs,
- chaos/fault testing,
- disaster recovery playbooks.

## 12. Public release hygiene

Public release hygiene is now public-live green.

The public release hygiene checkpoint is:

    9b904aa1 / ckpt-public-release-hygiene-public-live-green-20260524-090437

The final bundle closeout checkpoint is:

    49f460ea / ckpt-mainnet0-public-release-bundle-closeout-green-20260524-091935

The release hygiene path verifies:

- public docs exist,
- root README points to public docs,
- launch notes are present,
- run-a-node instructions are present,
- participant onboarding is present,
- announcement materials are present,
- public release hygiene doc is public-live green,
- sanitized public export is gitleaks-clean,
- status smoke passes,
- cross-box proof passes.

## 13. Running a node

Basic Linux path:

    git clone https://github.com/6ZoSo9/void-node.git
    cd void-node
    npm install
    npm run build

Verify node readiness:

    curl -fsS http://127.0.0.1:4100/__void/ready.json

A healthy response should include:

    ready=true
    gap=0
    txroot_live=1

Open participant page:

    http://127.0.0.1:4100/participant

Windows users should use WSL2 for Mainnet-0. Native Windows packaging can come later.

## 14. Roadmap

Near-term after Mainnet-0:

- improve public docs,
- improve participant UX,
- continue proof-backed release hygiene,
- refine Buy VOID fulfillment operations,
- expand public onboarding,
- continue validator candidate/waiting flow,
- add safer status panels,
- improve node installation paths,
- document WSL2 setup,
- package desktop launcher flows.

Medium-term:

- public validator admission design and guarded rollout,
- richer DataNet/VPod behavior,
- Work Credit wallet integration,
- wallet-operated Obelisk Agent flows,
- better developer SDKs,
- typed APIs,
- OpenAPI/Swagger docs,
- node/web SDKs,
- voidctl CLI,
- more public dashboards.

Long-term:

- on-chain Work Credits,
- mobile app support for participant features,
- mobile relay roles where safe,
- ZK/light-client paths,
- stronger distributed storage policy,
- public ecosystem applications,
- AI-first verifiable data markets.

## 15. Risks

VOID is early.

Risks include:

- solo-operator/bootstrap risk,
- implementation bugs,
- economic design uncertainty,
- validator centralization during Mainnet-0,
- UX confusion,
- user wallet mistakes,
- Buy VOID payment mistakes,
- infrastructure outages,
- regulatory uncertainty,
- security vulnerabilities,
- insufficient adoption.

Mainnet-0 intentionally keeps high-risk lanes guarded while public status and onboarding go live.

## 16. Conclusion

VOID Mainnet-0 is live and proof-backed.

The network now has a public-live status, public docs, announcement materials, public release hygiene, and bundle closeout. The technical architecture is built around verifiable runtime truth, proof-gated operations, participant-run nodes, off-chain encrypted data with on-chain commitments, Work Credits for accepted useful work, and future wallet-operated agent/oracle flows.

The next phase is not reckless expansion. It is public onboarding, careful operations, better UX, and proof-backed opening of future lanes only when they are ready.
