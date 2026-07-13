# VOID Public Gateway Foundation v1

This directory is an additive, non-runtime foundation for the future VOID public gateway.

It intentionally does not:

- mount or replace `/`
- change `/participant`
- change `/public-node`
- add proxy routes
- expose wallet, ledger, fulfillment, validator, signer, or secret authority
- modify `src/index.ts` or `src/node_core.ts`

Included:

- design tokens
- versioned public content
- future upgrade-slot declarations
- public release checklist
- migration manifest

The first integration PR should remain documentation/data-only. Runtime mounting belongs in a later PR after the foundation is reviewed and the existing public route proofs are mapped.
