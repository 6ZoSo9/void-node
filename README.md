# void-node

<!-- VOID_README_CURRENT_STATUS_V1_START -->
## VOID Network current status

VOID Network is a Mainnet-0 public node, DataNet, and Work Credits prototype focused on verifiable public proofs, read-only public discovery, and tightly guarded mutation paths.

Live public entry point:

- `https://zoso-alienware-aurora-r7.taila47fd.ts.net/public-node`

What is public-live now:

- Public node dashboard and route discovery.
- DataNet-backed public proof/read/verify surfaces.
- Public Work Credit proof summaries and verifier links.
- Public build-map, DataNet, Work Credits, validator-candidate, and status documentation.
- Public-safe static/repo fallback surfaces for bootstrap availability.

What remains guarded:

- Private RPC is not public.
- Wallet/signer access is not public.
- Ledger writes are not public.
- Work Credit awards and Work Credit settlement are not public mutation routes.
- VOID transfers, Buy VOID fulfillment, validator admission, validator mutation, and operator/private routes remain behind explicit operator gates.

Work Credits policy:

- Work Credits are useful-work accounting units.
- Work Credits are intended to be unlimited/uncapped.
- Any funded settlement tranche capacity is not a lifetime Work Credit supply cap.

Native public site routes:

- `/download` redirects to `/site/voidchain`
- `/voidchain` redirects to `/site/voidchain`
- `/nullfeed` redirects to `/site/nullfeed`
- `/site/voidchain` serves the Voidchain public site
- `/site/nullfeed` serves the NullFeed public preview

<!-- VOID_README_CURRENT_STATUS_V1_END -->

<!-- VOID_README_PUBLIC_PROOF_FEED_V1_START -->
### Public node proof feed

The live public node exposes a read-only Work Credit proof summary feed used by the public dashboard proof stats card:

- Public dashboard: `https://zoso-alienware-aurora-r7.taila47fd.ts.net/public-node`
- Latest proof summaries: `GET /wc-proofs/latest?limit=12`
- Route marker: `VOID_WC_PROOFS_LATEST_ROUTE_V1`
- Current post-merge live check marker: `VOID_PUBLIC_FUNNEL_WC_PROOFS_LATEST_POST_MERGE_GREEN`

Boundary:

- The public seed adapter allowlist entry is exact: `/wc-proofs/latest`.
- There is no `/wc-proofs/*` wildcard.
- The route is `GET`/`HEAD` public-read-only proof summary access.
- It does not expose private RPC, wallet/signer access, ledger writes, Work Credit awards, Work Credit settlement, validator mutation, operator/private routes, or public mutation authority.

<!-- VOID_README_PUBLIC_PROOF_FEED_V1_END -->

<!-- VOID_PUBLIC_DOCS_START -->
## VOID Mainnet-0 is live

Status: `public_mainnet0_live / GO_PUBLIC_MAINNET0`

VOID Mainnet-0 is public-live. Start with the links below.

### Start here

- [Start here](docs/public/start-here.md)
- [Quick start](docs/public/quick-start.md)
- [Windows WSL2 quick start](docs/public/windows-wsl2-quick-start.md)
- [Run a node](docs/public/run-a-node.md)
- [Participant onboarding](docs/public/participant-onboarding.md)

### Current status and announcements

- [Current public status](docs/public/mainnet0-current-public-status.md)
- [Public live announcement](docs/public/mainnet0-public-live-announcement.md)
- [Launch notes](docs/public/mainnet0-launch-notes.md)
- [Announcement](docs/public/mainnet0-announcement.md)
- [Public release bundle closeout](docs/public/mainnet0-public-release-bundle-closeout.md)

### Help, security, and contributing

- [Support guide](SUPPORT.md)
- [Support runbook](docs/public/support-runbook.md)
- [Security policy](SECURITY.md)
- [Contributing guide](CONTRIBUTING.md)
- [Proof cadence](docs/public/proof-cadence.md)
- [Branch/release policy](docs/public/branch-release-policy.md)

### Technical reference

- [Public docs index](docs/public/README.md)
- [Developer reference](docs/public/developer-reference.md)
- [FAQ](docs/public/mainnet0-faq.md)
- [Whitepaper](docs/public/void-network-whitepaper.md)

### Important guardrails

- Public active validator admission remains disabled.
- Public validator registration remains candidate/waiting only.
- Vault126 onboarding has not been executed.
- Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.
- Future treasury spend remains separately guarded.
- Do not share private keys or seed phrases.
<!-- VOID_PUBLIC_DOCS_END -->

Minimal block node with segmented storage, pubsub, participant UI, Work Credits, DataNet, validator truth, and HTTP APIs.

## First-user trust boundary

The participant page is public-live, but not every action is automatic or unguarded.

Safe now:

- Set up or unlock your Account Wallet.
- Earn WC through approved useful work.
- Use DataNet publish/read/verify flows.
- Create a guided Buy VOID request from the participant page.

Guarded:

- VOID delivery requires operator verification and an explicit recorded VOID tx ref.
- WC→VOID swaps and wallet sends require explicit unlock/sign confirmation.
- Public validator registration is candidate/waiting only; active validator admission remains capped, proof-backed, and operator-governed.
- Blind deposits, exchange sends, and custodial sends are not supported.

## Recommended public path

New users should start with the public Mainnet-0 docs linked above.

The shortest path is:

1. [Start here](docs/public/start-here.md)
2. [Quick start](docs/public/quick-start.md)
3. [Run a node](docs/public/run-a-node.md)
4. [Participant onboarding](docs/public/participant-onboarding.md)
5. [Support guide](SUPPORT.md)

## Local health check

After starting a node, check:

    curl -fsS http://127.0.0.1:4100/__void/ready.json

Healthy local readiness should show:

    ready=true
    gap=0
    txroot_live=1

## Environment

See [.env.example](.env.example) for the full list.

Common settings:

- DATA_DIR
- HTTP_PORT
- P2P_PORT
- BOOTSTRAP_ADDRS

## Public APIs

Common local routes:

- Health/readiness: GET /__void/ready.json
- Participant UI: GET /participant
- Blocks: GET /blocks/*
- Transactions: POST /tx, GET /tx/lookup, GET /tx/receipt, GET /tx/status
- Index: POST /index/*, GET /index/stats
- Peers: GET /peers, POST /peers/registry/*
- Metrics: GET /metrics

Developer and operator endpoints are documented in [Developer reference](docs/public/developer-reference.md).

## Proof cadence

Use the lighter public proof cadence:

- small docs changes: targeted proof + make mainnet0-status-smoke
- runtime/protocol/security changes: branch + targeted proof + local runtime proof
- meaningful checkpoints: tag main
- cross-box checks: reserve for runtime, protocol, security-sensitive, or checkpoint closeout work

See [Proof cadence](docs/public/proof-cadence.md) and [Branch/release policy](docs/public/branch-release-policy.md).

## Maintainer compatibility commands

Some older proof and demo commands still exist in the repo for maintainers.

They are not the recommended public entry point.

New users should use the public Mainnet-0 docs at the top of this README.

## CI Status

![CI](https://github.com/6ZoSo9/void-node/actions/workflows/ci.yml/badge.svg)

## Support and security

- [Support guide](SUPPORT.md)
- [Security policy](SECURITY.md)
- [Contributing guide](CONTRIBUTING.md)

Do not share private keys, seed phrases, wallet files, .env contents, or screenshots containing secrets.

## Mainnet-0 public status

- [Mainnet-0 public release status summary](docs/public/mainnet0-public-release-status-summary.md)

This concise summary explains what is safe now, what remains guarded, which proof stack is green, and the current Mainnet-0 safety line.

## Public launch/share checklist

- [Mainnet-0 public launch/share checklist](docs/public/mainnet0-public-launch-share-checklist.md)

Use this before posting publicly about VOID Network. It keeps public posts pointed at the safe path: README -> public status summary -> participant page -> guided actions only.

## Public share posts

- [Mainnet-0 public share posts](docs/public/mainnet0-public-share-posts.md)

Use these proof-checked templates for Reddit, X/Twitter, Discord, GitHub announcements, and onboarding replies.

## Public node entry point <!-- VOID_PUBLIC_NODE_README_POINTER_V1 -->

The public node surface starts at:

    /public-node

Operators exposing a node to the internet should start it with the public base URL testers should copy:

    PUBLIC_NODE_EXTERNAL_BASE_URL=https://your-domain.example npm start

Outside testers can fetch the smoke pack:

    /public-node/public-exposure-smoke-pack.json

Or run the short public-route smoke check:

    PUBLIC_NODE_BASE=https://your-domain.example; for p in /public-node /public-node/route-index.json /public-node/external-base-url.json /public-node/public-exposure-smoke-pack.json /proofs; do curl -fsS "$PUBLIC_NODE_BASE$p" >/dev/null && echo "ok $p"; done

This checks public routes only. It does not touch private APIs, wallets, swaps, Buy VOID fulfillment, validators, or proof mutation.

## Public node data weighting path <!-- VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_README_POINTER_V1 -->

VOID public nodes now expose the storage-to-weighting path:

- Local Data Drop: operator-local files served through public read-only routes.
- Data Weight Record v1: public schema for ranking stored data by verification, freshness, duplicate status, suspicion state, tombstone state, storage tier, AI visibility, trust score, and promotion eligibility.

Public route:

`/public-node/data-weight-record.json`

Docs:

- `docs/public/public-node-local-data-drop.md`
- `docs/public/public-node-data-weight-record.md`

Proof:

`ops/mainnet0/public-node-data-weight-record-rollup-proof.sh`

Policy boundary: persistent does not mean equal priority. VOID can preserve data without treating every object as equally trusted, equally visible, or equally eligible for promotion.

## Public node outside tester path <!-- VOID_PUBLIC_NODE_OUTSIDE_TESTER_README_POINTER_V1 -->

For an outside tester, start with the public-node share link:

    /public-node/share-link.json

That route gives a copy-paste invite and points testers to:

    /public-node
    /public-node/tester-bundle.json
    /public-node/tester-result-receipt.json

The tester bundle links the quickstart, handoff, smoke pack, route index, and public proofs. This path is public-route and read-only only: no wallet sends, no WC to VOID swaps, no Buy VOID fulfillment, no validator mutation, and no money movement.

## Public Node Outside Tester Lane <!-- VOID_PUBLIC_NODE_TESTER_LANE_README_POINTER_V1 -->

VOID public nodes now expose a complete read-only outside tester lane.

Start here:

    /public-node/tester-share

Machine-readable summary:

    /public-node/tester-lane-summary.json

A tester can open the share page, run one curl/bash command, get the expected green marker, and send back `tester-receipt.json`.

Expected green marker:

    VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN

Safety boundary: public routes only, read-only, no money movement, no wallet send, no WC to VOID swap, no Buy VOID fulfillment, no validator mutation, and tester receipts are not treated as network truth.

## First Tester Request Copy Pack <!-- VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_README_POINTER_V1 -->

VOID public nodes expose ready-to-post first-tester recruiting copy.

Copy pack route:

    /public-node/first-tester-request-copy-pack.json

It includes:

- Reddit post copy
- X/Twitter post copy
- short DM copy
- GitHub blurb
- tester share page link
- standalone smoke command
- expected green marker
- tester receipt instructions

Expected green marker:

    VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN

Expected receipt file:

    tester-receipt.json

Safety boundary: public routes only, read-only, no money movement, no wallet send, no WC to VOID swap, no Buy VOID fulfillment, no validator mutation, and tester receipts are not treated as network truth.

## Public beta status

Current public beta operator checks:


Self-hosted beta CI plan: SELF_HOSTED_BETA_CI_PLAN.md

Boundary: public read-only/bootstrap surfaces may be inspected and smoke-tested, while mutation, wallet movement, validator mutation, WC issuance, and automatic fulfillment remain locked behind explicit operator gates.

## Public beta status command references

Required beta proof commands:

make public-beta-status
make public-beta-preflight
make wc-wallet-proof

Self-hosted beta CI plan: SELF_HOSTED_BETA_CI_PLAN.md

<!-- VOID_LOCAL_MULTIBOX_RUNTIME_README_STATUS_NOTE_V1_START -->
## Local multi-box runtime verification

Marker: `VOID_LOCAL_MULTIBOX_RUNTIME_README_STATUS_NOTE_V1`

VOID now exposes a public-safe verification path for the local multi-box runtime stack. External testers and agents can start at:

`/.well-known/void-public-node.json`

From there, the well-known discovery document links to the runtime discovery surface, smoke card, smoke pack JSON, and smoke script:

- `/public-node/index.json`
- `/public-node/runtime`
- `/public-node/runtime#runtime-smoke-check`
- `/public-node/runtime/smoke-pack-v1.json`
- `/public-node/runtime/smoke-pack-v1.sh`

The smoke script verifies the route chain end-to-end and should print:

`VOID_LOCAL_MULTIBOX_RUNTIME_SMOKE_PACK_V1_GREEN`

Boundary: this is read-only discovery/smoke visibility only. It does not enable wallet send, money movement, buy-VOID fulfillment, WC-to-VOID swap execution, validator mutation/admission, public WC self-serve earning, mutation routes, or public internet mesh completion.

<!-- VOID_LOCAL_MULTIBOX_RUNTIME_CLOSEOUT_README_LINK_V1_README_START -->
### Canonical runtime discovery closeout

Marker: `VOID_LOCAL_MULTIBOX_RUNTIME_CLOSEOUT_README_LINK_V1`

The local multi-box runtime discovery path is sealed by a canonical closeout rollup:

- `/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.json`
- `/public-node/runtime/local-multibox-runtime-discovery-closeout-rollup-v1.html`

Expected marker: `VOID_LOCAL_MULTIBOX_RUNTIME_DISCOVERY_CLOSEOUT_ROLLUP_V1`

This is read-only discovery/status documentation only; it does not enable mutation, wallet, money, validator, WC self-serve, or public mesh behavior.
<!-- VOID_LOCAL_MULTIBOX_RUNTIME_CLOSEOUT_README_LINK_V1_README_END -->

More detail: [`docs/public/local-multibox-runtime-verification-path-v1.md`](docs/public/local-multibox-runtime-verification-path-v1.md)
<!-- VOID_LOCAL_MULTIBOX_RUNTIME_README_STATUS_NOTE_V1_END -->

## Public verification indexes

- [Refined tracked raw empty catches public discovery index v1](docs/public/refined-tracked-raw-empty-catches-public-discovery-index-v1.md)

