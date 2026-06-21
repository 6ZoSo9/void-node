# WC → VOID Settlement Evidence Final Public Index v1

Marker: `VOID_WC_TO_VOID_SETTLEMENT_EVIDENCE_FINAL_PUBLIC_INDEX_V1`

Status: `sealed_index_ready`

This is the final public index for the first WC → native VOID settlement proof trail.

## Core settlement facts

- Chain ID: `2050`
- Transaction hash: `0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717`
- VOID value: `1.000000`
- Settlement record key: `710e514643aa0e77c52ea07b24986f0cfcf23ab5426be352b7e52265fb46cec1`

## Public reviewer path

Start at:

`/public-node`

Then open:

`/public-node/wc-to-void/public-reviewer-handoff-note-v1`

Then open the verifier:

`/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1`

A successful public reviewer run prints:

`VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1_REVIEWER_GREEN`

## Sealed public chain

1. Private post-execution settlement record proof.
2. Public redacted settlement receipt.
3. Public settlement evidence pack.
4. Public settlement evidence closeout seal.
5. Public reviewer one-command verify pack.
6. Public reviewer handoff note.
7. Public dashboard links to the handoff note and verifier.

## Public routes

- `/public-node`
- `/public-node/wc-to-void/redacted-settlement-receipt-v1.json`
- `/public-node/wc-to-void/settlement-evidence-pack-v1`
- `/public-node/wc-to-void/settlement-evidence-pack-v1.json`
- `/public-node/wc-to-void/settlement-evidence-closeout-seal-v1`
- `/public-node/wc-to-void/settlement-evidence-closeout-seal-v1.json`
- `/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1`
- `/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1.json`
- `/public-node/wc-to-void/public-reviewer-handoff-note-v1`
- `/public-node/wc-to-void/public-reviewer-handoff-note-v1.json`

## Boundary

This index is static and read-only.

It does not add runtime routes, change the safety count, call RPC, broadcast a transaction, send VOID, create public mutation paths, expose the private ledger, or expose plaintext party addresses.

Public safety count remains `169`.

Public node mutation handler count remains `0`.
