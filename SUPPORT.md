# VOID Network Support

VOID Mainnet-0 is public-live, but it is still early infrastructure.

Use this page to decide where to start when you need help.

## Start here

Read the public docs first:

- `docs/public/start-here.md`
- `docs/public/quick-start.md`
- `docs/public/windows-wsl2-quick-start.md`
- `docs/public/run-a-node.md`
- `docs/public/participant-onboarding.md`
- `docs/public/support-runbook.md`
- `docs/public/mainnet0-current-public-status.md`

## Before opening an issue

Please collect:

- operating system
- node version
- VOID commit or tag
- command you ran
- whether you used console, WSL2, desktop launcher, or another path
- relevant non-secret logs
- output of the readiness endpoint if available

Readiness endpoint:

    http://127.0.0.1:4100/__void/ready.json

Healthy readiness usually includes:

    ready=true
    gap=0
    txroot_live=1

## Never share secrets

Do not post:

- private keys
- seed phrases
- mnemonic phrases
- wallet files
- keystore files
- API tokens
- RPC credentials
- `.env` contents
- screenshots containing secret material

If a report is security-sensitive, follow `SECURITY.md`.

## What is currently guarded

Public Mainnet-0 is live, but dangerous actions remain guarded.

The following are not open public actions:

- public active validator admission
- treasury spend
- Buy VOID fulfillment
- authority transfer
- user private-key generation
- collection of user secrets

Public validator registration remains candidate/waiting only for Mainnet-0.

## Where to report

Use GitHub issues for:

- reproducible node startup problems
- public docs issues
- participant UI bugs
- quick-start problems
- WSL2 setup problems
- non-sensitive logs and proof failures

Use private security reporting for:

- live credential exposure
- spend bypass
- validator admission bypass
- Buy VOID fulfillment bypass
- authority bypass
- exploitable public endpoint behavior

## Maintainer note

This project is operated carefully with proof-backed changes.

For minor docs or public GitHub polish, targeted local proofs are enough.

For runtime, protocol, validator, wallet, Buy VOID, Work Credits, DataNet, relayer, or security-sensitive changes, use feature branches and stronger proof lanes.
