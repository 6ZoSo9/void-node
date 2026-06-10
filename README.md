# void-node

## Native public sites

VOID now serves its public site bundle directly from a VOID node with DataNet-backed content and repo static fallback for bootstrap availability.

Proven public routes:

- `/download` redirects to `/site/voidchain`
- `/voidchain` redirects to `/site/voidchain`
- `/nullfeed` redirects to `/site/nullfeed`
- `/site/voidchain` serves the Voidchain public site
- `/site/nullfeed` serves the NullFeed public preview

Current cross-box checkpoint:

- commit: `96ec9e76`
- tag: `ckpt-public-docs-index-site-bundle-green-20260528-131718`

DataNet roots:

- Voidchain dataset: `1b8bf41db2d64f8877d0aec397373fa1`
- Voidchain content root: `db0c54edcad0130b8de61e73ec61ff60701e97bee6bb3ac065d6c55efbd634e2`
- NullFeed dataset: `2930d5e8436eb5674be06d2b0152d20c`
- NullFeed content root: `f4c8b03bb8f5dae627bb6df9eddab48060bc0dab1a8c886d56dbeab2b4b0c372`

See `docs/public/README.md` and `docs/public/mainnet0-current-public-status.md` for the public status path. Follower nodes must seed the packed DataNet site bundles until peer materialization is automated; see `ops/runbooks/datanet-site-bundle-seeding.md`.

Guardrail: repo static fallback is bootstrap availability only. DataNet-backed public site proof requires `datanet_live_v1` headers and expected content roots.

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
