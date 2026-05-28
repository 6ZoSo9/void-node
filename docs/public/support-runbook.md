# VOID Mainnet-0 Public Support Runbook

status: public_mainnet0_live
decision: GO_PUBLIC_MAINNET0
updated_at_utc: 20260524-123000

current_public_status_checkpoint: 2f71d8b3 / ckpt-current-public-status-quickstarts-green-20260524-121756

## Current public route triage

When a user says the public surface is confusing or broken, verify the current route truth before deeper debugging:

    curl -i http://127.0.0.1:4100/

Expected result:

- HTTP 302
- `Location: /participant`

Then verify the download/install aliases:

    curl -i http://127.0.0.1:4100/download
    curl -i http://127.0.0.1:4100/voidchain

Expected result:

- HTTP 302
- `Location: /site/voidchain`

Then verify the public pages:

    http://127.0.0.1:4100/participant
    http://127.0.0.1:4100/site/voidchain

Do not treat public-live status as permission to use guarded mutation lanes. Validator active admission, Buy VOID fulfillment, treasury spend, and authority transfer remain proof-gated.


## Purpose

This runbook is for public support, operators, and technically capable participants when a user says their VOID node is not working.

It is a first-response checklist. It does not authorize validator admission, treasury spend, Buy VOID fulfillment, authority transfer, or live mutation.

## First rule

Do not ask for secrets.

Never ask a user to share:

- private keys
- seed phrases
- mnemonic phrases
- passphrases
- keystore files
- wallet files
- .env files
- screenshots containing secret material

## First question

Ask the user what they are trying to do:

- run a node
- open the participant page
- check readiness
- use the wallet
- use Buy VOID
- register as validator candidate/waiting
- use DataNet
- read docs
- install on Windows WSL2

## Basic node check

Ask the user to run:

    curl -fsS http://127.0.0.1:4100/__void/ready.json

Healthy output should show:

    ready=true
    gap=0
    txroot_live=1

If ready is false, collect the full JSON response.

## Participant page check

Ask the user to open:

    http://127.0.0.1:4100/participant

If the page does not open:

- confirm the node process is running
- confirm port 4100 is not blocked
- confirm they are using the same machine where the node is running
- on WSL2, try the same URL from the Windows browser and from inside WSL2

## Git/version check

Ask the user to run:

    git status --short
    git rev-parse --short HEAD
    git describe --tags --always --dirty

For public docs/support, compare their state against the latest public checkpoint.

## Build check

Ask the user to run:

    npm install
    npm run build

If build fails, collect:

- command used
- first error line
- last 80 lines of output
- operating system
- Node.js version
- npm version

## Windows WSL2 checks

For Windows users, confirm:

- WSL2 is installed
- Ubuntu is installed
- they are inside Ubuntu / WSL2
- Git, curl, build-essential, Node.js, and npm are installed
- they cloned the repo inside the WSL2 filesystem, not a fragile Windows-mounted path

Useful commands:

    wsl --status
    lsb_release -a
    node --version
    npm --version
    git --version
    curl --version

## Buy VOID support boundary

Buy VOID is guarded.

Payment confirmation does not mean VOID has been sent.

VOID fulfillment requires explicit payment verification and a recorded VOID transaction reference.

Do not tell users to send blind deposits.

Do not tell users that exchange/custodial sends are safe where the participant flow warns against them.

For Buy VOID issues, collect:

- watch id if visible
- request id if visible
- payment reference if already recorded
- delivery wallet shown by the participant flow
- status shown by the participant page

Do not ask for wallet secrets.

## Validator support boundary

Public active validator admission remains disabled.

Public validator registration remains candidate/waiting only.

Public registration does not instantly make a validator active.

Vault126 onboarding has not been executed.

For validator questions, direct users to the current public status and FAQ.

## Treasury support boundary

Future treasury spend remains separately guarded.

Public launch status does not authorize additional treasury spend.

Do not make treasury claims without a committed proof artifact, transaction hash, balance proof, and closeout artifact.

## DataNet support boundary

For DataNet issues, collect:

- action attempted
- receipt id if visible
- file/data size
- whether the data was intended to be public or encrypted
- exact error text

Do not ask for encryption passwords in public support.

## Useful public docs

Start with:

    docs/public/quick-start.md
    docs/public/windows-wsl2-quick-start.md
    docs/public/mainnet0-current-public-status.md
    docs/public/mainnet0-faq.md
    docs/public/void-network-whitepaper.md
    docs/public/run-a-node.md
    docs/public/participant-onboarding.md

## What to collect before escalating

Collect:

- OS and version
- WSL2 or native Linux
- Node.js version
- npm version
- git checkpoint
- readiness JSON
- command that failed
- last 80 lines of the failure log
- whether the repo is dirty
- whether the user is on the documented public path

Do not collect secrets.

## Current public truth

VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0.

Public onboarding is open.

Still guarded:

- Public active validator admission remains disabled.
- Public validator registration remains candidate/waiting only.
- Vault126 onboarding has not been executed.
- Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.
- Future treasury spend remains separately guarded.
