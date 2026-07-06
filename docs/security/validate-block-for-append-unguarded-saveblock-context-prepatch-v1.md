# validateBlockForAppend unguarded saveBlock context prepatch v1

This audit lane intentionally captures the exact `src/node_core.ts` `saveBlock` contexts before attempting another patch. The previous closure patch was too brittle. This lane records the blocked source context so the next workflow can patch the real call site rather than guessing.

Boundary: static/source context only. No fork-choice, consensus-finality, wallet-authority, ledger-write, validator-admission, signer-rotation, or autonomous-mutation claim.
