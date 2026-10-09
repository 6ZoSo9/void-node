# VOID Nimo witness V2 — reproducible proposed compiled hash lock

**Status: HOLD / unaccepted source-only proposal.**
Parent: [V2 derive-only Draft #2718](https://github.com/6ZoSo9/void-node/pull/2718)
at exact `d68058d8513b79b98788b7fd3334b377df0fc25b` (23/23 checks green).
Current source generation remains `884edc6e82bd505a83e51a44b38f7e318431f314`.
No host installation, service action, customer file, account, signer, wallet,
transaction, network RPC, inventory or funds operation is in scope.

## Correct two-generation interpretation

An October 9 operator-supplied *read-only* Nimo census reported eight root-owned
`0444` files under `/usr/local/libexec`, seven unchanged and one mismatch
**against the integration Draft's modified V1 contract**. A second census against
the **original** V1 contract at Git ref `f627cad6bc07a6ad3ebe7cbd946723316fcd0567`
reported **8/8 original byte hashes matching**. The operator's terminal text
is an observation, NOT a cryptographic fresh host/principal authentication or
a claim the installed V1 is safe for the new source generation.

Independent repo review confirms the genuine original V1 contract Git blob
`d2e84643c9f4d76c642c7e07d4ea2bf1634035e4` (its own census source
commit is `e390424c1d31cd87dcf3551cc0d2d610a24e12f8`).
The current integration Draft contains variant blob
`d0f80d3b50e3dcc46c1f58dc4bd0a73b7875db56` with **exactly two changes**:
its census source commit is changed to `f627...` and its auto-fulfillment
compiled hash changes from `ae15c56f1aa70099...` to `119a08db651cb850...`.
Yet the V1 manifest ID `voidwfb1_2a729229...` and V1 manifest SHA
`sha256:2190e7ab9444...` are unchanged in both versions.

**That variant is not an authenticated revision of frozen V1.** Do not "repair"
Nimo by overwriting the original root-owned V1 file or quietly amending the
historical V1 manifest. Original V1 and new V2 must stay separate.

## Exact next-generation evidence

The already green derive-only V2 tool compiled the same **eight static
relative-import-closed files** using TypeScript 5.9.3 independently under
Node 22, 24 and 26. All three emitted byte-identical 13,672-byte candidate
records and agreed on content-derived
`voidwfb2_b1cf93ea36879332d2745294b8aab1b261d5e7c13522af681db8d390254df73d`.
The raw candidate's SHA-256 is
`sha256:84be9d7a3e8ac9b5426dacd324f0d6e1b45eac5ae0fe797b2a072de57180ccf3`.

The proposed lock JSON enumerates exact *current* compiled paths, byte counts
and SHA-256 for all eight files. Seven compiled byte identities are the
original V1 values. The eighth, `dist/economic/buy_void_auto_fulfillment_v1.js`,
is explicitly V2 with hash `119a08db...`, **not** the installed original
V1 `ae15c56f...`. The new V2 source adds strict plain-data/Proxy boundaries,
including a reviewed new `node:util` builtin edge; the old mutable V1 record
is not current source-finality authority.

## Qualification / adversaries

`scripts/prove_buy_void_nimo_witness_v2_proposed_lock_v1.mjs --prove`
re-derives the actual compiled candidate, verifies the historical and
integration contract blobs from frozen Git refs and their exact two-line
difference, requires the V1 manifest untouched, checks the 8-path,
11-import-edge V2 closure, compiler identity, full canonical V2 ID and
exact raw candidate SHA and size. Five pure malicious candidate mutations
must be rejected. Node 22/24/26 repeat the full proof and compare immutable
source-only receipts byte-for-byte.

This is an **unaccepted proposed lock**, not a signed new V2 manifest,
installation bundle, operator approval, host witness or permission to apply.
A separate human review must authorize any V2 lock/installation *after*
independently verifying the compiled bytes on the designated custodian and
its protected filesystem/UID/SSH forced command. An authenticated
host+principal source witness, rollback-safe custody and durable
`payment_verified → allocation_reserved` are separately necessary.

`v2_runtime_bundle_identity_accepted=false`
`v2_host_installed=false`
`v2_host_principal_verified=false`
`v2_authenticated_transport_qualified=false`
`verified_payment_to_allocation_mounted=false`
`presale_activation=false`
`funds_moved=false`

**Keep this Draft. PROTECT THE CORE.**
