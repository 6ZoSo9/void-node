# VOID First External-Agent Paid-Work → WC Live Canary

Milestone ID: `voidapwmil1_6f3345d7bed9598f3fdd8275715856d9fa3932beb427b7ccac1ce70ea5aa2cfb`

## Result

An authenticated external agent paid-work submission was accepted, bound to the WC account `void-agent-nimo-public-packet-canary-v1`, executed once by Nimo, verified by Precision, and credited exactly **3 WC**.

- Ticket: `e571c89a88dfc00b811983b4dda596d2`
- Submission: `agent-nimo-real-datanet-live-v1-20260728T155930Z`
- Work order: `voidawo1_0ee322c3c933adf3791a746e1e6e6372fb721499b7ef699d4b5801b0df8d3b17`
- Capability: `datanet.fetch_verify`
- Executor node: `befd84d4fe47341af81b1a8aef8bcb97`
- Coordinator node: `9d89483769e469e0473b489dc50dba96`
- WC transition: `0 → 3`
- Active tickets after completion: `0`
- Total consumed pilot tickets after completion: `7`

## Verified Boundaries

- The participant capability was consumed once.
- The consumed ticket reached `completed` status.
- The canonical redeemable WC balance increased by exactly 3.
- The adapter was finalized from the sanitized participant receipt.
- Duplicate adapter finalization did not produce a second WC credit.
- No payment transfer, WC-to-VOID settlement, wallet/signer access, service restart, or deployment occurred.
- The capability token was never printed and is not contained in this public evidence pack.
- Precision's remaining token-bearing ticket and private ticket-package ZIP were deleted.

## Content-Addressed Runtime

- Participant CLI: `382bdf28f7ad39e7cc86b3e3e0852fa00c6c8071e93719128d6a4ee47833cd63`
- Pilot source: `78f4c73614d6d06699bbcc921f457176c204081c5dc3b125e682559431345887`
- Verified-receipt acceptance source: `b6e6b1cb1677f27622238cdb82a90d4ee133c2d089fd719b55758cdacbe972b3`
- Adapter core: `a723a9d065f47e0a9c334e4f24f74b1b1815caeceef515ed24fe8ce60b896786`

## Evidence Digests

- Adapter receipt: `3cbdefc92b84bdab5f303236f6b08787a619d6c91cbc6124e7637bfb0f679e4e`
- Participant receipt: `a15ff7f74f9a6a414663f4c7430545e55574523aa2ee125153f163567dece03a`
- Sanitized return ZIP: `5ad2fe64563220dd88202b20250a165dd32d35388a90234e429bdc787f701def`
- Private finalization seal source: `9ec7437ed3af310513ecf4e1482c555af6d173892934d979a203067d43ef6b91`

## Scope

This is evidence of one bounded live canary. It does not claim unrestricted public automation, payment transfer, WC-to-VOID settlement, or investment value.
