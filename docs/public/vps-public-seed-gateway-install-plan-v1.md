# VOID VPS public seed gateway install plan v1

Status: gated install plan.

This document defines the first install path for a VPS public seed gateway.

This is not a deployment record.

## Purpose

The VPS public seed gateway is the internet-facing bootstrap surface for VOID
Network.

Precision remains the canonical builder/prover/operator workstation.

The VPS serves only allowlisted public surfaces.

## Install mode

The install script must default to dry-run / refusal mode.

Remote mutation requires explicit operator confirmation.

Required confirmation variable:

- VOID_VPS_INSTALL_CONFIRM=INSTALL_VOID_PUBLIC_SEED_GATEWAY_V1

Without that exact value, the installer must exit before making changes.

## Allowed install actions after confirmation

The confirmed install may:

- inspect OS and resources
- create public gateway directories
- install public gateway dependencies
- configure an allowlisted reverse proxy or static public gateway
- configure firewall for SSH, HTTP, HTTPS, and optional public 4100
- install a systemd service for public gateway only
- write public-only config files
- run a post-install public-surface proof

## Blocked install actions

The installer must not:

- copy private keys
- copy mnemonics
- copy wallet files
- copy .env files
- copy auth tokens
- expose private JSON-RPC
- reverse-proxy 8545
- open 8545
- enable unrestricted filesystem browsing
- deploy validator mutation/admin endpoints
- move funds
- change chain authority
- perform validator admission
- alter token sale fulfillment

## Public allowlist

The VPS gateway may expose:

- /
- /participant
- /__void/ready.json
- /__void/public-bootstrap.json
- /datanet/materialized-status
- /download
- /site/voidchain
- public static docs

## Private blocklist

The VPS gateway must block:

- /rpc
- /admin
- /operator
- /validator/admin
- /debug
- /metrics unless explicitly public-sanitized
- /.env
- /keys
- /wallet
- /secrets
- any direct or proxied 8545 access

## Required proof outcomes

Before any checkpoint can be green:

- installer refusal mode must be proven
- confirmation gate must be present
- private surface blocklist must be recorded
- public surface allowlist must be recorded
- local 8545 private-bind invariant must pass
- no secret-copy pattern may appear in installer
- no authority/funds/validator mutation behavior may appear in installer

## Deployment sequence

1. Run VPS preflight.
2. Confirm VPS is suitable.
3. Run install in refusal mode.
4. Review generated plan/log.
5. Run install with explicit confirmation only when ready.
6. Run remote public gateway proof.
7. Record deployed checkpoint.
