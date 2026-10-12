# USDC/VOID Buy Pool Evidence Link + Automatic Readiness Notice v1

Marker: VOID_USDC_VOID_BUY_POOL_EVIDENCE_LINK_AUTOMATIC_READINESS_NOTICE_V1

Purpose: expose a public link to the USDC external receipt observation evidence bundle and state the automatic fulfillment target posture without activating automatic fulfillment.

Public meaning:

- Buyers/reviewers can open the USDC receipt observation evidence bundle.
- The evidence bundle is proof/explanation only.
- Automatic fulfillment is a target end-state after all activation gates are green.
- Automatic fulfillment is not enabled now.
- public mutation remains disabled.
- No payment approval, finality verification, allocation ledger write, inventory reserve, automatic fulfillment, or VOID transfer occurs from this notice.

Automatic target posture:

Automatic fulfillment may become appropriate only after separate proof gates exist for:

- live receipt fetch / observation scheduling
- chain allowlist and RPC endpoint policy
- receiver allowlist
- USDC token address allowlist
- amount/rate policy
- buyer identity binding
- duplicate payment guard
- finality/confirmation policy
- private allocation ledger write gate
- inventory reserve gate
- fulfillment signer / transfer gate
- operator kill switch
- rollback / audit evidence pack
- public mutation boundary audit

Current status: automatic fulfillment target acknowledged, activation disabled.
