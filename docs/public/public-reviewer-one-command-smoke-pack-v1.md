# Public Reviewer One-Command Smoke Pack v1

Marker: `VOID_PUBLIC_REVIEWER_ONE_COMMAND_SMOKE_PACK_DOC_V1`

## Purpose

This pack gives a human reviewer one copy/paste smoke command for checking the live VOID public surface.

This is docs/proof-only.

It does not open public intake.

It does not open public mutation.

It does not add a runtime route.

It does not modify `src/index.ts`.

## Base state

- base head: `19deddb9`
- reviewer handoff closeout marker: `VOID_PUBLIC_REVIEWER_HANDOFF_RUNTIME_CARD_CLOSEOUT_SEAL_V1_GREEN`
- reviewer handoff runtime marker: `VOID_PUBLIC_REVIEWER_HANDOFF_RUNTIME_CARD_V1_GREEN`
- public safety index marker: `VOID_PUBLIC_SURFACE_SAFETY_INDEX_V1_GREEN`
- public mutation boundary marker: `VOID_PUBLIC_MUTATION_METHOD_BOUNDARY_AUDIT_V1_GREEN`
- funding gateway marker: `VOID_FUNDING_GATEWAY_CARD_V1_GREEN`

## Reviewer smoke command

Set `VOID_BASE_URL` to the public node URL, then run:

```bash
VOID_BASE_URL="${VOID_BASE_URL:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"

set -e

curl -fsS "$VOID_BASE_URL/version" | grep -F '"ok":true'
curl -fsS "$VOID_BASE_URL/" | grep -F 'href="/public-node/reviewer-handoff-v1">Reviewer handoff'
curl -fsS "$VOID_BASE_URL/public-node/reviewer-handoff-v1.json" | grep -F 'VOID_PUBLIC_REVIEWER_HANDOFF_RUNTIME_CARD_V1'
curl -fsS "$VOID_BASE_URL/public-node/reviewer-handoff-v1" | grep -F 'VOID_PUBLIC_REVIEWER_HANDOFF_RUNTIME_CARD_V1'
curl -fsS "$VOID_BASE_URL/public-node/funding" | grep -E 'funding|Funding|VOID'
curl -fsS "$VOID_BASE_URL/buy-void" | grep -E 'guarded|VOID|USDC'
curl -fsS "$VOID_BASE_URL/public-node/datanet/explorer-v1" | grep -E 'DataNet|VOID'
curl -fsS "$VOID_BASE_URL/public-node/route-index.json" | grep -F '/public-node/reviewer-handoff-v1'

echo "VOID_PUBLIC_REVIEWER_ONE_COMMAND_SMOKE_PACK_V1_REVIEWER_GREEN"
Expected result

A reviewer should see:

/version returns ok
home page links to Reviewer handoff
reviewer handoff JSON contains VOID_PUBLIC_REVIEWER_HANDOFF_RUNTIME_CARD_V1
reviewer handoff HTML contains VOID_PUBLIC_REVIEWER_HANDOFF_RUNTIME_CARD_V1
funding surface is reachable
Buy VOID surface is reachable
DataNet Explorer is reachable
route index references the reviewer handoff route
final marker: VOID_PUBLIC_REVIEWER_ONE_COMMAND_SMOKE_PACK_V1_REVIEWER_GREEN
Closed boundaries
docs_proof_only=true
modifies_src_index=false
runtime_route_added=false
public_intake_open_now=false
public_mutation_open_now=false
ledger_write_closed=true
wallet_send_closed=true
money_movement_closed=true
wc_award_mutation_closed=true
validator_admission_mutation_closed=true
datanet_public_ingest_mutation_closed=true
