# void-node

<!-- VOID_PUBLIC_DOCS_START -->
## VOID Mainnet-0 is live

Status: public_mainnet0_live / GO_PUBLIC_MAINNET0

Start here:

- Quick start: docs/public/quick-start.md
- Windows WSL2 quick start: docs/public/windows-wsl2-quick-start.md
- Support runbook: docs/public/support-runbook.md
- Current public status: docs/public/mainnet0-current-public-status.md
- FAQ: docs/public/mainnet0-faq.md
- Whitepaper: docs/public/void-network-whitepaper.md
- Public docs index: docs/public/README.md
- Public release bundle closeout: docs/public/mainnet0-public-release-bundle-closeout.md
- Launch notes: docs/public/mainnet0-launch-notes.md
- Run a node: docs/public/run-a-node.md
- Participant onboarding: docs/public/participant-onboarding.md
- Announcement: docs/public/mainnet0-announcement.md

Important guardrails:

- Public active validator admission remains disabled.
- Public validator registration remains candidate/waiting only.
- Vault126 onboarding has not been executed.
- Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.
- Future treasury spend remains separately guarded.
- Do not share private keys or seed phrases.
<!-- VOID_PUBLIC_DOCS_END -->

Minimal block node with segmented storage, pubsub, and HTTP APIs.

## Current Proven Paths (2026-03-23)

Current green paths on `main`:

- `make wc-wallet-proof`
- `make public-beta-preflight`
- `./ops/public-beta-quickstart.sh`
- `./ops/demo-video-proof.sh`

What these currently prove:

- real DataNet publish -> fetch -> verified receipt path works
- WorkCredits credit increments from the verified DataNet receipt path
- isolated per-wallet WC proof is green:
  - wallet A earns `1 WC`
  - wallet B earns `0`
  - ledger truth and receipt truth match wallet A
- public beta quickstart is green on the current dev workstation
- main demo proof now defaults to a real wallet address instead of legacy `demo-user`

Pinned references:

- `acd8670` — wallet-specific WC awards fixed in isolated flow
- `11e2941` — isolated per-wallet WC proof runner added
- `190dd0f` — `make wc-wallet-proof` added
- `517d9d6` — `public-beta-preflight` switched to real DataNet publish/fetch/receipt proof
- `f5ca378` — `public-beta-quickstart` gated on preflight and real wallet proof
- `95020b1` — main demo proof defaults to wallet address

## Quick install / public beta path

Recommended current user-facing path:

    cd "$HOME/dev/void-node"
    ./ops/public-beta-quickstart.sh

Equivalent make target:

    make public-beta

Recommended bounded proof gates:

    cd "$HOME/dev/void-node"
    make wc-wallet-proof
    make public-beta-preflight

Recommended live status:

    cd "$HOME/dev/void-node"
    make public-beta-status

One-command beta help:

    cd "$HOME/dev/void-node"
    make beta-help

Tester-facing beta handoff:

    BETA_READY.md

Self-hosted CI plan for the real bounded proof commands:

    ops/SELF_HOSTED_BETA_CI_PLAN.md

Compatibility / broader demo path:

    cd "$HOME/dev/void-node"
    ./ops/demo-video-proof.sh

Equivalent make target:

    make demo-video-proof

Legacy install aggregator (still available, but not the preferred beta entrypoint):

    cd "$HOME/dev/void-node"
    ./ops/install-all.sh

Notes:

- `make wc-wallet-proof` is the tightest honest proof of wallet-specific WC awarding
- `make public-beta-preflight` is the gate that should be green before relying on the broader demo path
- `./ops/public-beta-quickstart.sh` now runs install/startup, preflight, and demo proof in sequence
- older thin/demo proof surfaces remain available, but they are no longer the primary public-beta story

## Legacy quick start

    npm ci
    npm run build
    BASE=http://localhost:4100 npm run cli -- health

## Environment
See `.env.example` for the full list. Common:
- `DATA_DIR` (default: `data`)
- `HTTP_PORT` (default: `4100`)
- `P2P_PORT` (default: `4700`)
- `BOOTSTRAP_ADDRS` (comma-separated `host:port`)

## APIs
- Health: `GET /api/health`
- Head: `GET /api/head`
- Blocks: `GET /blocks/*`
- Tx: `POST /tx`, `GET /tx/lookup`, `GET /tx/receipt`, `GET /tx/status`
- Index: `POST /index/*`, `GET /index/stats`
- Peers: `GET /peers`, `POST /peers/registry/*`
- Metrics: `GET /metrics` (Prometheus text) and `GET /metrics/prom` (prom-client)

## Runbooks
See `runbook/` for operational guides.

## CI Status
![CI](https://github.com/6ZoSo9/void-node/actions/workflows/ci.yml/badge.svg)

> Note: `main-legacy` is archival; do not push. Current default: `main`.

## Additional verification / compatibility paths

These remain available when you want broader or older proof surfaces:

    cd "$HOME/dev/void-node"
    ./ops/install-path-status.sh
    ./ops/thin-path-proof.sh
    ./ops/fresh-user-smoke.sh
    ./ops/post-install-demo.sh

Notes:

- `./ops/install-path-status.sh` is an honest live snapshot
- `./ops/thin-path-proof.sh` remains available as a compatibility bounded proof surface
- `./ops/post-install-demo.sh` is a compatibility wrapper for older flows and is not the preferred current entrypoint
- `./ops/demo-smoke-follower.sh` remains the follower-only bounded proof
- `ops/FRESH_HOST_RUNBOOK.md` is the longer operational runbook

## Current proof scope

Tightest current proof surfaces:

- `make wc-wallet-proof`
- `make public-beta-preflight`

These prove:

- isolated node health
- isolated helper/pool visibility
- real DataNet publish -> fetch -> verified receipt
- isolated per-wallet WC earnings delta
- wallet A earns `1 WC`
- wallet B earns `0`
- ledger truth and receipt truth match the credited wallet

Broader proof surfaces:

- `./ops/demo-video-proof.sh`
- `./ops/public-beta-quickstart.sh`

These cover the wider demo/install/startup path and are useful, but they are broader operational paths than the bounded isolated wallet-proof gate.

Public beta happy path:

    cd "$HOME/dev/void-node"
    ./ops/public-beta-quickstart.sh

Equivalent make target:

    make public-beta
