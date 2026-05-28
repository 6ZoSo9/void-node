# void-node

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
