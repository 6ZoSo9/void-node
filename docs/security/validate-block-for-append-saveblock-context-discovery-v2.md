# validateBlockForAppend saveBlock context discovery v2

Static/source context discovery for the peer-import persistence boundary.

This is intentionally not a closure proof and intentionally does not patch runtime code. It captures all literal `saveBlock` and adjacent persistence-like contexts in `src/node_core.ts` so the next patch can target exact source lines instead of guessing.

Boundary: no fork-choice, consensus-finality, wallet-authority, ledger-write, validator-admission, signer-rotation, or autonomous-mutation claim.
