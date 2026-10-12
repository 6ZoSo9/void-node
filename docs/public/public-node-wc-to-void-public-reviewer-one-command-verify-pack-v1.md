# WC → VOID Public Reviewer One-Command Verify Pack v1

Marker: `VOID_WC_TO_VOID_PUBLIC_REVIEWER_ONE_COMMAND_VERIFY_PACK_V1`

Status: `ready`

Scope: first WC → native VOID settlement public reviewer verification pack.

This pack gives an outside reviewer a single copy/paste command that checks the live public evidence chain without exposing private settlement ledger contents or plaintext party addresses.

## What it verifies

- Public node dashboard exposes the WC → VOID closeout seal link.
- Route index exposes the closeout seal routes.
- Closeout seal JSON and HTML are live.
- Evidence pack JSON is live.
- Redacted receipt JSON is live.
- Transaction hash matches the first WC → VOID settlement.
- Settlement record key matches the sealed public record key.
- Privacy and closed-boundary flags remain true.
- Public JSON payloads do not contain 42-character address-shaped values.

## Default public base URL

`https://zoso-alienware-aurora-r7.taila47fd.ts.net`

Override with:

```bash
VOID_PUBLIC_BASE="https://example-public-node" bash reviewer-verify.sh
Boundary

This is read-only.

It does not send VOID, call RPC, broadcast a transaction, execute a settlement command, expose private keys, expose seed phrases, replace the private ledger, or create public mutation paths.
