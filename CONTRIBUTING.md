# Contributing to VOID Network

VOID Network is public-facing Mainnet-0 infrastructure. Contributions should keep the repository safe, reproducible, and proof-backed.

## Ground rules

Do not commit secrets.

Do not include:

- private keys
- seed phrases
- mnemonic phrases
- passphrases
- keystore JSON
- wallet files
- .env files
- API tokens
- RPC credentials
- SSH private keys
- screenshots or logs containing secret material

If a change requires local credentials, use environment variables and document placeholders only.

## Mainnet-0 guardrails

Do not open public active validator admission unless there is a specific guarded proof lane.

Do not add code that directly enables treasury spend, Buy VOID fulfillment, authority transfer, validator admission mutation, wallet secret collection, or private-key generation for users without explicit proof scripts, operator intent gates, and public status updates.

## Preferred development flow

Before submitting changes, run the relevant proof target for the lane you touched.

For public-facing docs or release surface changes, run:

    make mainnet0-current-public-status-proof
    make mainnet0-public-live-announcement-proof
    make mainnet0-public-live-closeout-proof
    make mainnet0-public-docs-stack-proof
    make mainnet0-public-surface-proof
    make mainnet0-status-smoke

For release hygiene changes, run:

    make mainnet0-public-release-hygiene-proof
    make mainnet0-public-release-bundle-closeout-proof

For cross-box operator closeout, the maintainer may run:

    make mainnet0-crossbox-status-smoke

## Pull request expectations

A good pull request should include:

- what changed
- why it changed
- which proof target passed
- whether the change touches public docs, participant UI, validator lifecycle, Buy VOID, Work Credits, DataNet, or operator scripts
- whether the change can mutate live state

If a change is read-only, say so.

If a change can mutate state, it must be explicitly gated and proof-backed.

## Public communication

Do not overstate Mainnet-0.

Safe wording:

VOID Mainnet-0 is public-live. The participant surface, docs stack, quick-start guides, developer reference, support runbook, readiness endpoint, and validator-truth status endpoint are live and cross-box proven. Public active validator admission, treasury spend, Buy VOID fulfillment, and authority transfer remain guarded.
