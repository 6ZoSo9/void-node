# Public Node Operator Trial Packet v1

Status: trial packet ready.

Marker:

```text
VOID_PUBLIC_NODE_OPERATOR_TRIAL_PACKET_V1

Expected proof marker:

VOID_PUBLIC_NODE_OPERATOR_TRIAL_PACKET_V1_GREEN
Purpose

This packet gives an outside operator or tester a single public-safe path for checking the VOID public node operator surfaces and returning evidence for manual review.

Boundary

This packet is read-only and public-safe.

It does not enable:

wallet sends
money movement
Buy VOID fulfillment
WC issuance
WC to VOID swap
validator admission
validator mutation
runtime truth claims
tester receipts as network truth

Operator review is required before any returned receipt is treated as accepted evidence.

Public operator path
Read the public operator quickstart.
Open the connect pack.
Use the receipt template.
Compare against the receipt example.
Package the handoff evidence.
Review against the checklist.
Record a review decision.
Evidence requested
tester handle or operator alias
UTC timestamp
public node route tested
local environment summary safe to disclose
commands run, excluding secrets and private paths
observed result
errors or mismatch notes
receipt template filled with public-safe evidence only
Do not submit
wallet private keys
mnemonics
env files
node keys
API tokens
RPC credentials
private IPs unless intentionally disclosed by the tester
funds transfer claims
validator admission claims
claims that tester receipts are network truth
