# Buy VOID final V7/V2 enforcement census v4

This census supersedes the accepted V3 census only because the final Ethereum
pre-attempt bridge had one stale live-process receipt-generation check.

Semantic parent: `16563121f8d6c2a1fa7cd2f99ca4be2f88aa3cca`.

Previous integration head: `d1e72d53dfb6b6a9b47ffbbc67b8c4c279c2ac86`.

The exact semantic delta is two files:
- production Ethereum pre-attempt classifier requires `voidbsflp2_`;
- focused proof uses V2 evidence and rejects `voidbsflp1_`.

Only one member of the protected 49-path source inventory changes:
`src/economic/buy_void_ethereum_public_checkout_finality_gate_v1.ts`.

The census rebuilds the 28-member economic dist/source closure on Node
22/24/26 and requires byte-identical evidence across all three versions. It
derives a fresh protected inventory digest from exact HEAD Git blobs and modes.

This is census evidence only. Candidate acceptance, deployment/runtime
authority, public presale activation and funds movement remain false.
