# VOID Mainnet-0 Quick Start

status: public_mainnet0_live
decision: GO_PUBLIC_MAINNET0
updated_at_utc: 20260524-110500

current_public_status_checkpoint: 30e9d994 / ckpt-mainnet0-public-faq-green-20260524-105421

## Fast path

Use Linux or WSL2.

    git clone https://github.com/6ZoSo9/void-node.git
    cd void-node
    npm install
    npm run build

Install and start the local user service:

    ./ops/install-user-units.sh

Check the service:

    systemctl --user status void-node.service

Then verify readiness:

    curl -fsS http://127.0.0.1:4100/__void/ready.json

A healthy node should report:

    ready=true
    gap=0
    txroot_live=1

Open the participant page:

    http://127.0.0.1:4100/participant

## Read these next

- Current public status: docs/public/mainnet0-current-public-status.md
- FAQ: docs/public/mainnet0-faq.md
- Whitepaper: docs/public/void-network-whitepaper.md
- Full run-a-node guide: docs/public/run-a-node.md
- Participant onboarding: docs/public/participant-onboarding.md

## Important guardrails

VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0.

Public onboarding is open.

Still guarded:

- Public active validator admission remains disabled.
- Public validator registration remains candidate/waiting only.
- Vault126 onboarding has not been executed.
- Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.
- Future treasury spend remains separately guarded.
- No additional authority transfer is authorized by public launch status.

## Do not do this

Do not send blind deposits.

Do not assume payment confirmation means VOID has been sent.

Do not confuse validator candidate/waiting status with active validator admission.

Do not share wallet secrets, seed phrases, private keys, or keystore files.

## Windows users

Use WSL2 for Mainnet-0.

Native Windows packaging can come later. Serious node operators should eventually move to Linux.

<!-- VOID_PUBLIC_RELEASE_DISTRIBUTION_WALL_V1_BEGIN -->
## Verified release path

For a versioned user-scoped installation that does not require a development
checkout, follow [`download-install-release-v1.md`](download-install-release-v1.md).
The existing source-build path remains available for developers.
<!-- VOID_PUBLIC_RELEASE_DISTRIBUTION_WALL_V1_END -->

## Verified updates

`VOID_PUBLIC_RELEASE_UPDATE_CHANNEL_QUICKSTART_V1`

After installing a verified release, check the stable channel without changing
state:

```bash
void-node update check --channel https://github.com/6ZoSo9/void-node/releases/latest/download/stable-v1.json
```

A stopped service remains stopped during apply. Running-service restart requires
`--restart-if-running` and is protected by readiness-gated rollback.

## Official stable release channel

`VOID_PUBLIC_RELEASE_PUBLICATION_PROMOTION_WALL_V1`

After the first official release is promoted, inspect the reviewed stable
pointer without changing state:

```bash
void-node update check \
  --channel https://raw.githubusercontent.com/6ZoSo9/void-node/main/public/public-node/void-network/channels/stable-v1.json
```

Candidate application is refused unless an operator explicitly supplies
`--allow-candidate`.

## Qualified stable releases

`VOID_PUBLIC_RELEASE_QUALIFICATION_CANARY_WALL_V1`

A release is eligible for the stable channel only after the immutable
publication, canary, complete qualification matrix, and independent reviewer
approval are all hash-bound in promotion state.

## Release rehearsal status

`VOID_FIRST_OFFICIAL_RELEASE_REHEARSAL_WALL_V1`

Before the first official release, operators run a complete no-publish
rehearsal. It creates no release tag and does not deploy or restart a node.

```bash
make public-first-official-release-rehearsal-v1-proof
```

## Official release launch gate

Before any official release publication, operators must pass the exact-source
launch gate. The gate renders the publication command but does not run it.

```bash
make public-first-official-release-launch-gate-v1-proof
```

`VOID_FIRST_OFFICIAL_RELEASE_LAUNCH_GATE_WALL_V1`

## Solo-operator release time-lock

When no second reviewer exists, the exact-source launch gate may use
`solo_time_lock_v1`. That mode records `independent_review=false`, requires a
main-only GitHub wait of at least twelve hours, and still renders rather than
executes the publication command.

```bash
make public-first-official-release-launch-gate-v1-proof
```

`VOID_SOLO_OPERATOR_RELEASE_GATE_WALL_V1`

<!-- VOID_PUBLIC_APP_COMPOSITION_REPAIR_WALL_V1_BEGIN -->
## Public VOID App

The public `/app/` route is served through a GET/HEAD-only composition gateway.
Network status is sanitized. Participant account IDs, wallet records, Work
Credit balances, jobs, and receipts are not enumerable from the public route.
<!-- VOID_PUBLIC_APP_COMPOSITION_REPAIR_WALL_V1_END -->
