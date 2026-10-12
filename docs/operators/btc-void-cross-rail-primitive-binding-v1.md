# BTC/VOID cross-rail primitive identity binding V1

Marker:

\`VOID_BTC_VOID_CROSS_RAIL_PRIMITIVE_BINDING_V1\`

Status: source-only primitive identity binding. **Not execution evidence.**

## Purpose

This closes #2332 Phase-0 ordering step 3 after the separately merged Bitcoin
HTLC and Chain-2050 hashlock primitives.

The binding proves that one reviewed source object names both primitive
identities coherently before #2330 attempts any Bitcoin regtest + isolated
Chain-2050 execution.

It does not deploy, fund, execute, sign, broadcast, or activate either rail.

## Exact reviewed primitive source pins

V1 fails closed unless the primitive identities retain these Git blobs:

- Bitcoin HTLC tool:
  \`c0179654221b9fee789dbfe9933c8d3bd6ba0de4\`
- Chain-2050 settlement contract:
  \`0824583b0519048290e84be8e79e4877756adcfa\`
- canonical Epoch-2 VoidToken:
  \`7c4297aadbc17b6214b4dde1f1766523cb499923\`
- Chain-2050 dual-compiler identity tool:
  \`1175b71e4e7c37788db9ab909eaa4e5a6039fe3c\`

A later primitive source change requires a reviewed V1 repin or successor
contract. Source drift must not silently inherit an old binding.

## Binding inputs

The caller supplies one exact source-only swap-intent shape:

- direction: \`btc_to_void\` or \`void_to_btc\`;
- hash algorithm: exactly \`SHA256\`;
- required preimage size: exactly 32 bytes;
- Bitcoin:
  - exact 32-byte hashlock;
  - exact redeem/refund HASH160 identities;
  - exact refund locktime;
  - explicit redeem/refund party labels;
- Chain-2050:
  - the same exact 32-byte hashlock;
  - exact beneficiary/refund-authority addresses;
  - exact Unix refund deadline;
  - explicit beneficiary/refund party labels; and
- the exact content-addressed output of
  \`VOID_BTC_VOID_CHAIN2050_HASHLOCK_COMPILER_IDENTITY_V1\`.

Party labels are restricted to \`initiator\` and \`counterparty\`. V1 requires
the atomic cross-role relation explicitly:

\`\`\`text
Bitcoin redeem party  == Chain-2050 refund party
Bitcoin refund party  == Chain-2050 beneficiary party
\`\`\`

The binding never attempts to normalize a Bitcoin HASH160 identity into an EVM
address or infer that two different address formats belong to the same person.

## Bitcoin identity

V1 calls the canonical Bitcoin HTLC builder itself and reparses the generated
witness script through the canonical parser.

The binding includes:

- content-addressed \`htlc_id\`;
- SHA-256 hashlock and exact 32-byte preimage domain;
- redeem/refund HASH160 roles;
- refund locktime, locktime class, and finality clock;
- exact witness-script SHA-256;
- exact SegWit-v0 P2WSH witness program; and
- exact P2WSH scriptPubKey.

Caller-supplied witness/script bytes are not accepted.

## Chain-2050 identity

The Chain-2050 compiler identity must be internally content-addressed and must
retain the reviewed contract/token Git blobs, compiler profile, compiler
artifact identities, dual-compiler cross-check, ABI/method/storage metadata,
fixed canonical VoidToken, and V1 settlement semantics.

The cross-rail binding records at minimum:

- exact compiler identity ID;
- contract source Git blob and SHA-256;
- compiler-tool Git blob;
- canonical VoidToken and token-source Git blob;
- repository head/tree carried by the compiler identity;
- creation/runtime bytecode SHA-256;
- ABI and method-identifier SHA-256;
- exact beneficiary/refund-authority addresses;
- exact hashlock and refund deadline;
- fixed single-contract runtime; and
- \`per_swap_deployment_required=false\`.

A changed runtime/compiler identity produces a different cross-rail binding ID.
A noncanonical contract/token source or changed deadline semantics fails closed.

## Timeout boundary

V1 binds both timeout values but deliberately does **not** prove their relative
safety:

\`\`\`text
timeout_safety_observed=false
asymmetric_cross_chain_timeout_margin_verified=false
\`\`\`

This is essential because Bitcoin timestamp-form CLTV is finalized against
BIP113 Median Time Past, while height-form CLTV uses block height and
Chain-2050 uses its own block timestamp/deadline semantics.

The later #2330 planner/harness must prove the asymmetric safety margin against
observed chain contexts. Source identity alone cannot do that.

## Permanent adversaries

The focused proof requires:

- one-bit cross-rail hashlock mismatch -> HOLD;
- SHA-256 -> KECCAK substitution -> HOLD;
- preimage-size mismatch -> HOLD;
- invalid party mapping -> HOLD;
- Bitcoin redeem/refund identity swap -> different binding ID;
- Chain beneficiary/refund identity swap -> different binding ID;
- Chain runtime identity drift -> different binding ID;
- contract-source drift -> HOLD;
- noncanonical VoidToken -> HOLD;
- changed claim/refund deadline semantics -> HOLD;
- caller attempt to assert timeout safety -> closed-schema HOLD; and
- authority remains source-only with zero RPC/deployment/transaction/funds
  authority.

One dedicated CI job rederives the real Chain-2050 dual-compiler identity and
feeds it through this same binding verifier. The portable Node 22/24/26 matrix
uses a structurally valid content-addressed identity fixture only to exercise
the pure binding and adversarial logic.

## Authority

The binding grants no authority for:

- Bitcoin or Chain-2050 RPC;
- Bitcoin mainnet contact;
- production Chain-2050 writes;
- wallet, signer, credential, or private-key access;
- transaction construction, signing, submission, or broadcast;
- Chain-2050 contract deployment;
- BTC/VOID inventory reservation or funding;
- treasury or liquidity movement;
- BTC/VOID market or presale activation; or
- funds movement.

After this source gate is green/merged, #2330 remains the separate Phase-1
regtest + isolated-2050 execution-evidence gate.
