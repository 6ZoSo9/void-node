# validateBlockForAppend import persistence closure v1

This audit closes the specific ambiguity raised by the blocked preflight and saveBlock context discovery:

- `src/node_core.ts` contains three literal `this.store.saveBlock(...)` call sites.
- One unguarded call is local block production: the node builds a block with local signer material (`signBytes(this.priv, ...)`, `proposer: this.id`, `proposerPubkey: this.pubPEM`) and then saves its own block.
- The peer-import persistence paths are the later direct import and fill import call sites, and both are preceded by `validateBlockForAppend(...)` plus explicit invalid imported-block failure returns.

The claim is intentionally narrow: imported peer blocks are validation-gated before persistence. This does not claim fork choice, consensus finality, wallet authority, ledger writes, validator admission, signer rotation, or autonomous mutation closure.
