# VOID Network Public Docs

status: public_mainnet0_live
checkpoint: 10657b80 / ckpt-mainnet0-public-onboarding-pack-green-20260524-081134

Start here:

0. `start-here.md` — shortest public entry point and reading order.
1. `mainnet0-launch-notes.md` — what is live, what remains guarded, and the launch checkpoint.
2. `run-a-node.md` — how to run a VOID Mainnet-0 node.
3. `participant-onboarding.md` — how participants should start safely.
4. `mainnet0-announcement.md` — public launch announcement.
5. `mainnet0-short-announcement.txt` — short copy/paste launch blurb.
6. `void-network-whitepaper.md` — detailed technical and economic whitepaper.
7. `mainnet0-current-public-status.md` — current public status and guardrails.
8. `mainnet0-faq.md` — common questions for users, operators, and potential investors.
9. `quick-start.md` — fastest path for new users to run a node.
10. `windows-wsl2-quick-start.md` — Windows WSL2 path for running a node.
11. `support-runbook.md` — first-response support checklist for node/user issues.
12. `developer-reference.md` — public technical reference for endpoints, proofs, and guarded boundaries.
13. `proof-cadence.md` — lightweight proof tiers for public repo development and checkpoint closeout.
14. `branch-release-policy.md` — public-safe branch, merge, tag, and release rules.

## Mainnet-0 status

VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0.

Public active validator admission remains disabled.
Public validator registration remains candidate/waiting only.
Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.
Future treasury spend remains separately guarded.

## Current public status

- [Mainnet-0 public release status summary](mainnet0-public-release-status-summary.md)

Use this first for a concise public-live status summary: safe-now actions, guarded actions, proof stack, trust boundary, and current safety line.

## Safety

Do not share private keys or seed phrases.
Do not send blind deposits.
Do not confuse candidate/waiting validator registration with active validator admission.

## Native public site bundle

Status: cross-box proven.

Checkpoint: 25899017 / ckpt-public-site-status-doc-green-20260528-131313

Public routes:

- /download redirects to /site/voidchain
- /voidchain redirects to /site/voidchain
- /nullfeed redirects to /site/nullfeed
- /site/voidchain serves the Voidchain public site
- /site/nullfeed serves the NullFeed public preview

DataNet-backed site roots:

- Voidchain dataset_id: 1b8bf41db2d64f8877d0aec397373fa1
- Voidchain content_root: db0c54edcad0130b8de61e73ec61ff60701e97bee6bb3ac065d6c55efbd634e2
- NullFeed dataset_id: 2930d5e8436eb5674be06d2b0152d20c
- NullFeed content_root: f4c8b03bb8f5dae627bb6df9eddab48060bc0dab1a8c886d56dbeab2b4b0c372

Canonical detail:

- Current public status: mainnet0-current-public-status.md
- DataNet site bundle seeding runbook: ../ops/runbooks/datanet-site-bundle-seeding.md

Operational guardrail: repo static fallback is bootstrap availability only. DataNet-backed public site proof requires datanet_live_v1 headers and the expected content roots.

- [Node network troubleshooting](node-network-troubleshooting.md) — recover when the local node is ready but the host loses internet.

## Public launch/share checklist

- [Mainnet-0 public launch/share checklist](mainnet0-public-launch-share-checklist.md)

Use this before public posts, onboarding replies, or social updates. It records the safe path, required warnings, and things not to say.

## Public share posts

- [Mainnet-0 public share posts](mainnet0-public-share-posts.md)

Proof-checked public templates for Reddit, X/Twitter, Discord, GitHub announcements, and onboarding replies.

## Demo 002 local data-drop closeout <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_CLOSEOUT_INDEX_POINTER_V1 -->

The Demo 002 closeout card summarizes the full public-node local data-drop evidence lane:

       docs/public/public-node-local-data-drop-demo002-closeout.md

Latest closeout checkpoint:

       603169e4
       ckpt-public-node-local-data-drop-demo002-closeout-card-green-20260612-225519

It covers public read routes, tester smoke receipts, offline receipt verification, local receipt intake, intake status, evidence roundtrip, shareable evidence pack creation, offline evidence-pack verification, and the safety/trust boundary.

## Demo 002 local data-drop evidence lane closed <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_CURRENT_STATUS_POINTER_V1 -->

Status: green / closed.

The Demo 002 public-node local data-drop evidence lane is now complete and verifiable:

       docs/public/public-node-local-data-drop-demo002-closeout.md

Latest closeout checkpoint:

       f17b335d
       ckpt-public-node-local-data-drop-demo002-closeout-index-pointer-green-20260612-225901

What is covered:

       public read object
       tester smoke receipt
       offline receipt verification
       local receipt intake
       intake status
       one-command evidence roundtrip
       shareable evidence pack
       offline evidence-pack verifier
       closeout card
       public docs index pointer

Trust boundary:

       offline_verified=true
       network_fetch_during_import=false
       network_fetch=false
       trusted_as_network_truth=false

Safety boundary:

       public_routes_only=true
       read_only=true
       mutation=false
       money_movement=false
       wallet_send=false
       validator_mutation=false

Meaning: Demo 002 is ready as a public-node tester/handoff proof lane. It proves read-only local data-drop serving, receipt generation, local intake, shareable evidence packaging, and offline verification without promoting local receipts into automatic network truth.


## DataNet Core public verification external reviewer <!-- VOID_DATANET_CORE_PUBLIC_VERIFICATION_EXTERNAL_REVIEWER_DOCS_INDEX_POINTER_V1 -->

Current public-safe reviewer entry point:

       docs/public/public-node-datanet-core-public-verification-external-reviewer-public-landing-page-v1.md

Current evidence bundle:

       docs/public/public-node-datanet-core-public-verification-external-reviewer-evidence-bundle-v1.md

Status:

- public reviewer safe
- external reviewer readable
- seed-stage/operator-heavy disclosed
- reveal decision pending
- final reveal approval not granted
- no command reveal, print, or execute
- no candidate identity
- no candidate record write
- no reviewer contact
- no packet share
- no public mutation
- no ledger write
- no Work Credit award

Latest public landing page checkpoint:

       3b7c799f / ckpt-datanet-core-public-verification-external-reviewer-public-landing-page-v1-cross-box-green-20260619-145151

## Refined tracked raw empty catches terminal seal

- [Refined tracked raw empty catches public discovery index v1](./refined-tracked-raw-empty-catches-public-discovery-index-v1.md)
