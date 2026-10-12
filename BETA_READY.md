# VOID Node Beta Ready — 2026-03-23

## Current tester commands

Fastest path:

    cd "$HOME/dev/void-node"
    ./ops/public-beta-quickstart.sh

Equivalent:

    make public-beta

Live status:

    make public-beta-status

Bounded proof gates:

    make public-beta-preflight
    make wc-wallet-proof

Command summary:

    make beta-help

Release handoff bundle:

    make beta-pack

## What a tester should expect

### `make public-beta-status`
Shows the live current snapshot:
- main head
- proposer state
- submit-path truth
- follower snapshot / lag

Expected ending:

    PASS install-path-status

### `make wc-wallet-proof`
Runs the isolated bounded per-wallet proof:
- wallet A earns `1 WC`
- wallet B earns `0`
- ledger and receipt truth match wallet A

Expected ending includes:

    ASSERT OK
    PASS

### `make public-beta-preflight`
Runs the bounded beta gate:
- main node health
- isolated node health
- isolated helper/pool visibility
- isolated per-wallet WC proof

Expected ending includes:

    PASS

### `./ops/public-beta-quickstart.sh`
Runs the current user-facing beta path:
- install/build checks
- user-unit setup
- first-run smoke
- public-beta preflight
- broader demo proof

Expected ending:

    PASS public-beta-quickstart

## What is currently green

- local bounded beta proof commands
- public beta quickstart path
- per-wallet WC proof in isolated flow
- main demo proof defaults to a real wallet address
- self-hosted GitHub workflow for real beta proof commands

## Self-hosted workflow

Workflow:

- `self-hosted-beta-proof`

It currently passes on the configured self-hosted runner and runs:

- `make beta-help`
- `make public-beta-status`
- `make wc-wallet-proof`
- `make public-beta-preflight`

## Honest caveats

- the bounded wallet-proof and beta-preflight paths are the strongest proof surfaces
- broader demo/proposer/follower paths are useful, but they are wider operational paths
- the self-hosted runner depends on the local workstation topology and current sudo policy
- `actions/checkout@v4` still emits a Node runtime deprecation warning, though the workflow is already forcing Node 24

## Current checkpoint references

- `44cdb63` — self-hosted beta proof workflow forced onto Node 24
- `f921109` — self-hosted beta proof success recorded
- `b71dc15` — beta proof guards check self-hosted workflow wiring
- `cf33f58` — `make beta-help`
- `b50db9b` — `make public-beta-status`
- `f5ca378` — `./ops/public-beta-quickstart.sh` gated on preflight
- `517d9d6` — `make public-beta-preflight` uses real DataNet publish/fetch/receipt
- `190dd0f` — `make wc-wallet-proof`
