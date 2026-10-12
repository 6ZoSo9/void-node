# VOID UI Wave 4 — Earn Read-only

**Base:** `373eaa3fff2d8f3a164561e9dcf3ea5684aad5fa`
**Branch:** `feat/void-ui-wave4-earn-readonly-v1`
**Route:** `/app/#/earn`

Wave 4 replaces the Earn placeholder with an explicit participant-account
lookup and one sanitized, loopback-only adapter.

## Product behavior

The page presents four read-only areas:

1. current earning posture and useful-work policy,
2. separated Work Credit accounting,
3. five recent account jobs, and
4. five recent verification receipts.

The browser calls one same-origin Wave 4 adapter. Raw source bodies, local paths,
wallet addresses, job inputs, job metadata, receipt roots, receipt leaves, and
receipt payloads are not returned.

## Authority boundary

Wave 4 does not execute or submit work. It does not activate or tick a runner,
change runner configuration, award Work Credits, redeem or send Work Credits,
perform WC-to-VOID conversion, connect a browser wallet, write a ledger, or move
money.
