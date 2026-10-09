# Buy VOID source composition — current V2 payment and original frozen V1 Nimo witness

## Goal: combine two reviewed source fixes without rewriting history

This source-only Draft composes two **disjoint** child branches of the current
Buy VOID integration [#2675](https://github.com/6ZoSo9/void-node/pull/2675).
The integration parent is `8384105508a96ff84ffe9143422191764f750ad7`, still unmerged against main.

- [#2733](https://github.com/6ZoSo9/void-node/pull/2733), exact `a09ce920d172aaafbc1dd2fa6c563c6b6dd34d0a`,
  repairs current V2 payment-proof expectations and the V5 enforcement AST
  allowlist's **exact `node:util` builtin**. It keeps arbitrary external imports
  rejected, and changes no production payment verifier bytes.
- [#2731](https://github.com/6ZoSo9/void-node/pull/2731), exact `b9a4c030fc665c3ca1e127751bc6dddbb82e3ff9`,
  restores the original Nimo witness V1 source classifier byte-for-byte
  to original Git blob `d2e84643c9f4d76c642c7e07d4ea2bf1634035e4`.
  It preserves original manifest ID/hash and does NOT claim the current V2
  auto-fulfillment module was installed or is equivalent.

The eight changed source/proof/workflow/docs paths from those children do not
overlap. One combined branch includes exact reviewed bytes and both source
histories; no closed predecessor V1/V4/V5 manifest or live service is edited.

## Focused source proof

A new workflow checks out the exact combined head, verifies the ancestry of
the integration and both reviewed child commits, and requires the original V1
witness source Git blob. Node 22/24/26 each execute:

- the current native-USDC V2 checkout/provenance matrix, including separate
  strict plain-data versus truly absent payment-instructions HOLDs;
- the archived original V1 witness's seven tampered-manifest adversaries and
  exact historical Git-object/census proof;
- the current, explicitly UNACCEPTED V5 static enforcement candidate and its
  AST/import/source/reader adversaries.

A downstream job requires all three deterministic JSON receipts to have
**exactly matching bytes**. The receipts never assert current Nimo witness V2
or deployed payment authority.

## Production HOLD unchanged

This preserves an important incompatible-generation truth: the original frozen
V1 witness installed on Nimo reportedly matches 8/8 **original V1** hashes,
while hardened current auto-fulfillment emits different **V2** compiled bytes.
The latter requires distinct accepted V2 source/compiled witness identity and
independent host/principal/transport qualification. Existing historical V1
runtime checks which compare it against new V2 compiled output are therefore
**expected to HOLD**, even if this combined source proof is green. Those
checks must NOT be muted or their historical identities repinned for CI optics.

This composition also does **not** mount the verified→allocation dispatcher,
establish the Nimo protected high-water custody proof, authenticate original
payment/source finality, qualify the dynamic saga execution graph, perform
operator/principal access or open WC/VOID coupled presale. The old payment-only
writer remains the mounted operator producer and must not be represented as a
durable allocation custody handoff.

All authority remains false: current V2 witness acceptance, actual installed
Nimo witness authentication, complete execution closure, payment verified,
custody allocation mutation, deployment and market/presale opening.

No Ready, merge, host/SSH/service, customer/ledger, signer/wallet/key,
transaction, Chain2050/Work Credit, inventory/treasury/liquidity or funds action.
**PROTECT THE CORE.**
