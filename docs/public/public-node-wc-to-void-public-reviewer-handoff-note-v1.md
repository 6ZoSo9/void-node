# WC → VOID Public Reviewer Handoff Note v1

Marker: `VOID_WC_TO_VOID_PUBLIC_REVIEWER_HANDOFF_NOTE_V1`

Status: `ready`

Audience: outside public reviewer.

This handoff tells a reviewer how to verify the first WC → native VOID settlement using the public node only.

## Start here

Default public base:

`https://zoso-alienware-aurora-r7.taila47fd.ts.net`

Open:

`/public-node`

Find the WC → VOID evidence card, then open:

`/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1`

For machine-readable review, open:

`/public-node/wc-to-void/public-reviewer-one-command-verify-pack-v1.json`

Copy the `copy_paste_verify_command` from that JSON or from the HTML page and run it in a terminal.

## Success marker

A successful outside review prints:

`VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1_REVIEWER_GREEN`

## What green means

Green means the public reviewer command confirmed:

- The public dashboard exposes the reviewer verify pack link.
- The route index exposes the reviewer pack and settlement evidence routes.
- The closeout seal, evidence pack, and redacted receipt are live.
- The tx hash, chain id, VOID amount, and settlement record key match the sealed public evidence.
- The reviewed public JSON payloads do not expose plaintext party addresses.
- The reviewer flow is read-only and does not send VOID, broadcast a transaction, call RPC, or create a public mutation path.

## Boundary

This handoff note is read-only.

It does not execute a settlement command, broadcast a transaction, send VOID, call RPC, expose the private settlement ledger, expose plaintext party addresses, or create public mutation paths.
