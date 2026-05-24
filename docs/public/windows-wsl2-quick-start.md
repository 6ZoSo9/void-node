# VOID Mainnet-0 Windows WSL2 Quick Start

status: public_mainnet0_live
decision: GO_PUBLIC_MAINNET0
updated_at_utc: 20260524-112500

quick_start_checkpoint: 0635c606 / ckpt-mainnet0-quick-start-green-20260524-111319

## Purpose

This guide is for Windows users who want to run a VOID Mainnet-0 node through WSL2.

Native Windows packaging is not required for Mainnet-0. Serious node operators should eventually use Linux, but WSL2 is the recommended Windows path for now.

## Requirements

Use:

- Windows 10 or Windows 11
- WSL2
- Ubuntu inside WSL2
- Git
- Node.js / npm
- Terminal access

## Install WSL2

From Windows PowerShell as Administrator:

    wsl --install

Then reboot if Windows asks.

Install Ubuntu if it was not installed automatically:

    wsl --install -d Ubuntu

Open Ubuntu from the Start Menu.

## Update Ubuntu

Inside Ubuntu / WSL2:

    sudo apt update
    sudo apt upgrade -y
    sudo apt install -y git curl build-essential

## Install Node.js

Use the current Node.js path already preferred by your environment.

A simple Ubuntu package path may be enough for basic testing:

    sudo apt install -y nodejs npm

If the distro package is too old, install a newer Node.js LTS using a trusted Node.js setup method before running VOID.

Verify:

    node --version
    npm --version

## Clone VOID

Inside Ubuntu / WSL2:

    git clone https://github.com/6ZoSo9/void-node.git
    cd void-node
    npm install
    npm run build

## Start the node

Use the repo's documented runtime path for Mainnet-0.

After the node is running, verify readiness:

    curl -fsS http://127.0.0.1:4100/__void/ready.json

A healthy node should report:

    ready=true
    gap=0
    txroot_live=1

## Open the participant page from Windows

In a Windows browser, open:

    http://127.0.0.1:4100/participant

If that does not work, open the same URL from inside WSL2 with a Linux browser or check Windows firewall / WSL networking.

## Read next

- Quick start: docs/public/quick-start.md
- Current public status: docs/public/mainnet0-current-public-status.md
- FAQ: docs/public/mainnet0-faq.md
- Whitepaper: docs/public/void-network-whitepaper.md
- Full run-a-node guide: docs/public/run-a-node.md
- Participant onboarding: docs/public/participant-onboarding.md

## Mainnet-0 guardrails

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

Do not run a public-facing node from a poorly secured Windows machine.

## Recommendation

WSL2 is acceptable for early public users and technically curious Windows users.

For serious long-running node operation, use a dedicated Linux machine.
