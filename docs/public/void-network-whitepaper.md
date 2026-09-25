# VOID Network Whitepaper

status: public_mainnet0_live
version: v0.1-mainnet0
checkpoint: 49f460ea / ckpt-mainnet0-public-release-bundle-closeout-green-20260524-091935
network_state: public_mainnet0_live / GO_PUBLIC_MAINNET0
reviewed_at: 2026-09-25

## 1. Abstract

VOID Network is a verifiable data, compute, and participant network designed around locally runnable nodes, public proof artifacts, guarded operational lanes, and a participant-first wallet surface.

Mainnet-0 is the first public-live checkpoint. It establishes the public launch state, public documentation bundle, onboarding path, release hygiene boundary, and proof-backed operator posture. Mainnet-0 is intentionally conservative: public visibility and read-only proof surfaces are broader than public mutation authority. Public active validator admission, automatic Buy VOID fulfillment, treasury movement, public presale intake, and production WC/VOID activation remain behind separate exact-green gates.

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

VOID Mainnet-0 is `public_mainnet0_live / GO_PUBLIC_MAINNET0`.

The original public release bundle remains a historical cross-box launch checkpoint:

    49f460ea / ckpt-mainnet0-public-release-bundle-closeout-green-20260524-091935

That bundle records the May 24 public-live closeout, onboarding and announcement docs, README/public-doc pointers, release hygiene, sanitized export, and cross-box readiness. It is launch evidence, not a claim that every later capability is open.

Current Mainnet-0 posture as reviewed September 25, 2026:

- Public VOID-node block production and the project-operated multi-node P2P runtime are live.
- Public discovery, the participant application, DataNet evidence, bounded Work Credit earning, and operator evidence workflows are live within their documented boundaries.
- Ordinary public clone/run synchronization now has source-pinned direct IPv4 and Tor v3 P2P introduction classes bound to exact expected node identities, with a live N-1 acceptance lane.
- Public active validator admission remains disabled; public registration remains candidate/waiting only.
- Public presale intake and production WC/VOID market activation are coupled and remain closed. The checked-in WC/VOID production candidate is `HOLD`; economic execution-layer identity/public verification, native-gas accounting, shared-nonce coordination, and complete two-sided settlement remain separate launch gates.
- Automatic Buy VOID fulfillment remains disabled; payment verification and fulfillment remain distinct auditable transitions.
- Future treasury spend and authority changes remain separately guarded.
- The package version is `0.1.0`, but no official stable VOID node release has yet been published.

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

The node exposes local HTTP routes, participant surfaces, status endpoints, DataNet endpoints, validator truth routes, P2P networking, and operational proof routes.

A healthy node exposes readiness through:

    /__void/ready.json

Healthy Mainnet-0 local readiness requires:

- `ready = true`,
- `gap = 0`,
- `txroot_live = 1`.

Local readiness is not proof that a follower is caught up to the canonical producer; synchronization claims must compare canonical source/height evidence separately.

For public bootstrap, a normal clone/run synchronization child can consume two source-reviewed first-party P2P introduction classes: direct IPv4 and Tor v3. Both use the normal VOID HELLO/AUTH protocol and are pinned to exact expected node identities. Their failure domains are independent and the live acceptance workflow exercises N-1 behavior in both directions. This improves bootstrap resilience without claiming broad external decentralization or granting any wallet, signer, validator, treasury, Work Credit, or money-moving authority.

See [public P2P direct + Tor introductions v1](void-public-p2p-direct-tor-introductions-v1.md).

### 4.1A Economic EVM boundary

Current `VoidToken`, treasury, presale, registry, and market-contract tooling
uses a private loopback EVM/Anvil execution layer configured with chain ID
`2050`. That economic history is operationally distinct from the public
VOID-node P2P/block runtime unless and until a reviewed binding proves otherwise.

Before public economic activation, VOID must explicitly define which history is
canonical for economic state, provide independent participant verification of
balances/receipts/code/finality, define native-gas currency supply/replenishment,
and provide a reviewed path for participants to authorize and submit later
transfers/use of delivered `VoidToken`. A healthy private RPC or successful
operator-side delivery is not by itself public economic readiness.

### 4.2 Participant surface

The participant application is the user-facing control surface served by a local node.

Current path:

    http://127.0.0.1:4100/app/

It exposes Home, Wallet, Earn, Data, Buy, Validate, and Network surfaces. Each surface retains its own authority boundary: a visible page or button is not evidence that unrestricted mutation, custody, settlement, validator admission, or treasury control is enabled.

### 4.3 Validator runtime truth

Validator truth is represented through runtime endpoints, verified epoch/state evidence, identity binding, stake/readiness policy, and guarded mutation lanes.

Mainnet-0 deliberately separates historical/operator bootstrap validator state from public participant admission:

- public registration is candidate/waiting only;
- public registration does not mutate the active validator set;
- public active admission remains disabled;
- operator/bootstrap validator changes require their own exact proof and live-execution gates; and
- current validator claims should be read from the canonical current-status and runtime-truth surfaces rather than from an old epoch number embedded in this whitepaper.

This keeps the whitepaper architectural while allowing exact validator state to advance independently under proof.

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

Work Credits (`WC`) are unlimited accounting units for accepted, useful, verifiable work.

Current earning policy requires real work and verifiable receipts. The public earning lane remains bounded by coordinator-issued capability tickets, per-account/global caps, and duplicate protection; a click or arbitrary self-declared task does not create WC.

WC economics are explicitly separate from a fixed treasury redemption promise:

- there is no fixed WC-to-VOID conversion or redemption ratio;
- WC issuance creates no fixed claim on finite VOID supply or treasury reserves;
- the production WC/VOID market is intended to discover price from real participant WC rather than an administrator-set opening rate;
- the protocol-side opening target is `10,000,000 VOID` `VoidToken` and `0 WC`;
- the fixed presale price does not set, peg, or seed WC/VOID; and
- `VoidToken` inventory is distinct from the Chain-2050 native gas balance used by transaction executors.

The public presale and production WC/VOID market are a coupled opening: neither may open alone. The current production candidate remains `HOLD` until its vault/runtime identity, funding/lock, settlement review, replay protection, bounded canary, cross-lane gas reservation and nonce scheduling, fresh fee checks, terminal-receipt gas reconciliation, native-gas sustainability, reverse VOID→WC settlement, and coupled activation readiness are concrete.

Even a later `SOURCE_READY` decision is source classification only. It does not grant funding, wallet/signer access, transaction broadcast, market activation, presale activation, or funds movement.

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

Current supply policy:

- maximum supply: `666,666,666 VOID`;
- premine: `333,333,333 VOID`;
- non-premined emissions supply: `333,333,333 VOID`, released by the existing protocol emission rules over 100 years.

Current reviewed economic-lane accounting includes:

- `10,000,000 VOID` finite fixed-price presale inventory;
- `10,000,000 VOID` protocol-side WC/VOID opening inventory;
- separately gated `10,000,000 VOID` BTC/VOID and `10,000,000 VOID` ETH/VOID market inventories.

The presale and WC/VOID are the coupled first economic opening, but they use different price mechanisms. The presale remains fixed at `2 VOID per 1 USDC` (`$0.50/VOID`), while WC/VOID must begin from `0 WC` protocol seed and discover its price from real participant WC. BTC/VOID and ETH/VOID remain post-presale markets behind their own implementation, funding, settlement, and activation gates.

VoidToken utility is intended to include validator/staking roles, Work Credit exchange, DataNet usage, agent/data flows, and participant/application activity. Current Chain-2050 transaction gas is accounted from a distinct native balance; this document does not claim that holding or retaining VoidToken directly pays or replenishes base-chain gas. A capped supply or planned utility is not a promise of market value.

## 9. Buy VOID flow

Buy VOID remains guarded.

Canonical presale economics are:

- finite maximum: `10,000,000 VOID` delivered as canonical Chain-2050 `VoidToken`;
- rate: `2 VOID per 1 USDC` (`$0.50/VOID`);
- exact supported payment required;
- payment confirmation does not equal VOID sent;
- duplicate/replay protection and exact buyer/request binding are required; and
- fulfillment requires explicit verification and a recorded VOID transaction reference.

Public presale intake is not open merely because the app exposes the Buy surface or the source contains a proven fulfillment path. Opening is coupled to production WC/VOID readiness: the presale must not open without WC/VOID ready for the same launch ceremony, and WC/VOID must not open before or without the presale.

The presale price is not WC/VOID price authority. A per-payment gas reservation can prevent new unfunded fulfillment obligations, but it does not by itself prove lifetime gas capacity for the entire sale. Any future customer refund on a source chain requires its own source-chain fee budget. Automatic Buy VOID fulfillment is not enabled.

A separate economic-DoS boundary remains: very small payments can create nearly
the same fulfillment transaction cost as large payments. Public activation must
therefore bind an explicit anti-grief mechanism before payment authority. VOID
does not select a hidden minimum by implication; an eventual disclosed minimum,
batching/amortization, user-paid gas, or another bounded mechanism must be
reviewed and proven.

A separate unpaid-reservation abuse path must also be closed. Payment/trade
instructions that temporarily reserve gas or inventory require a bounded TTL,
per-participant/global outstanding caps, payment-absence recheck before release,
and deterministic handling for a source-chain payment observed after expiry.

WC/VOID's one-sided opening has an additional market-formation risk. Because
the protocol contributes no WC seed, the price-forming WC cohort must be defined
before the final reserve ratio is accepted. Launch requires a fixed commitment
window, participant provenance/eligibility, concentration and Sybil controls, a
reviewed minimum real-WC depth, and exclusion of non-production/test WC from the
opening cohort.

The private EVM history also contains standard Anvil prefunded development
accounts whose keys are publicly known. Historical use remains auditable
evidence, but a public economic execution layer cannot treat those balances as
ordinary production gas. Public submission requires an explicit forward
neutralization/reconciliation transition and rejection of known dev-key
transactions until that transition is proven.

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

Public release hygiene and stable release publication are different states.

The original Mainnet-0 public-release hygiene checkpoint remains historical launch evidence:

    9b904aa1 / ckpt-public-release-hygiene-public-live-green-20260524-090437

The final May launch bundle checkpoint is:

    49f460ea / ckpt-mainnet0-public-release-bundle-closeout-green-20260524-091935

Since then, the repository has added deterministic release archives, checksum manifests, SPDX SBOM/provenance paths, user-scoped installation, update/rollback controls, qualification matrices, immutable publication controls, canary receipts, promotion/freeze/revocation logic, and a first-official-release launch gate.

Those controls do not themselves mean a stable node release exists. As of September 25, 2026:

- source package version: `0.1.0`;
- official `release-v0.1.0` tag: not published;
- official stable VOID node GitHub Release: not published;
- currently published GitHub Release inventory: one immutable July 27 external-agent credential-request packet, which is not a node distribution.

The first official node release must start from an exact clean `main`, pass deterministic build and qualification checks, the required independent-review or explicitly weaker solo-time-lock path, immutable publication, isolated release canary, and stable-channel promotion.

See [Release state and published artifacts](../../RELEASES.md).

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

Near-term:

- complete and prove durable historical/follower catch-up across legacy commit-direct, WAL replay, and crash-recovery boundaries;
- keep the direct + Tor public-bootstrap path healthy while adding more independent operators and failure domains;
- complete the presale + WC/VOID coupled readiness gates without introducing a fixed WC/VOID price;
- harden Buy VOID payment/replay/accounting boundaries before any bounded automatic fulfillment;
- keep public validator admission candidate/waiting-only until the policy/runtime gates support active admission;
- qualify and publish the first official stable node release through the repository's exact-source release lane.

Medium-term:

- reduce coordinator dependence in Work Credit earning and settlement;
- expand independent validator/operator participation under explicit churn and safety policy;
- activate post-presale BTC/VOID and ETH/VOID only after their separate settlement, inventory, canary, and activation gates are green;
- deepen DataNet replication, retention, trust weighting, and agent-facing interfaces;
- improve typed APIs, SDKs, `voidctl`, observability, and self-service operator evidence.

Long-term:

- broaden independent public infrastructure so project-operated nodes are no longer critical bootstrap or availability assumptions;
- strengthen light-client and compact-verification paths;
- support richer wallet-operated agent/oracle workflows and verifiable data markets;
- evolve economic and governance mechanisms only when they can preserve finite-VOID constraints, auditable authority, and explicit failure boundaries.

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

VOID Mainnet-0 is live, but the network intentionally distinguishes public evidence from public authority.

As of September 25, 2026, the network combines public VOID-node production, a project-operated multi-node mesh, source-pinned direct + Tor bootstrap introductions, DataNet, bounded useful-work earning, participant/operator evidence surfaces, and guarded economic/validator lanes. The private EVM economic layer remains a separate explicitly guarded execution boundary.

The immediate economic objective is explicit: public presale intake and production WC/VOID market activation move together or not at all. That coupling does not create a WC/VOID peg; the market remains zero-WC-seeded and price-discovered. The current production candidate is still `HOLD`.

The release objective is equally explicit: source on `main` is not a stable release. The first official node release must clear the deterministic build, qualification, approval/time-lock, immutable publication, canary, and promotion chain before it is described as stable.

VOID's operating principle remains to make claims no broader than the proof that supports them, then expand authority only after the next boundary is exact-green.
