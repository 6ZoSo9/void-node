# VOID Public Node First Tester Request Closeout v1

Marker: `VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_CLOSEOUT_V1`

This closes the first outside-tester request lane for the VOID public node.

The tester path is:

1. Open `/public-node/tester-share`
2. Run the standalone curl/bash smoke command
3. Verify Demo 003 folder/site public read-only routes
4. Receive `VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN`
5. Send back `tester-receipt.json`
6. Operator imports the receipt locally through the tester-result intake path

Public surfaces:

- `/public-node/tester-share`
- `/public-node/tester-bundle.json`
- `/public-node/share-link.json`
- `/public-node/external-tester-copy-pack.json`
- `/public-node/first-tester-request-copy-pack.json`
- `/public-node/tester-result-receipt.json`
- `/public-node/tester-result-intake.json`
- `/public-node/tester-lane-summary.json`
- `/public-node/standalone-outside-tester-smoke.sh`
- `/.well-known/void-public-node.json`
- `/public-node/route-manifest.json`
- `/public-node/self-check-snapshot.json`
- `/proofs`

Safety boundary:

- Public read-only routes only
- No private API
- No public POST endpoint
- No wallet send
- No WC to VOID swap
- No Buy VOID fulfillment
- No validator mutation
- Tester receipt is external evidence only, not network truth

This is the first practical human loop: share a VOID public node, let an outside tester verify it, receive a local receipt, and expose intake status without trusting that receipt as consensus truth.
