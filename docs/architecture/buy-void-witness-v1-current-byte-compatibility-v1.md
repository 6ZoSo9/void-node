# Nimo witness original V1 versus unaccepted current V2 — exact lineage correction

## Why this correction is required

An earlier read-only GitHub Draft [#2728](https://github.com/6ZoSo9/void-node/pull/2728)
incorrectly reported **8/8 source and 8/8 compiled compatibility with original frozen
V1**. Its green proof read the **modified integration V1 alias** Git blob
`d0f80d3b50e3dcc46c1f58dc4bd0a73b7875db56` and treated that file as the
original V1 manifest. The two contracts carry the **same historical**
`voidwfb1_2a729229f63c10a1562050924ddc279d8255a35603542967431a584977f1f6b7`
manifest ID and digest, but **not the same source-generation identity or
auto-fulfillment compiled bytes**.

The actual original frozen V1 contract is Git blob
`d2e84643c9f4d76c642c7e07d4ea2bf1634035e4`, at repository commit
`f627cad6bc07a6ad3ebe7cbd946723316fcd0567`. **That file explicitly
names `e390424c1d31cd87dcf3551cc0d2d610a24e12f8` as its reviewed
witness runtime SOURCE generation** and pins the original installed
auto-fulfillment SHA256
`ae15c56f1aa7009955058ca1d454da5e0d55a3e6c2011c54e7316374e33a5cf6`.

The integration V1 alias, Git blob `d0f80d3c...`, changed **exactly two
source lines** under the same manifest ID: the census source commit became
`f627cad6...` and the compiled auto-fulfillment hash became
`119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c`.
The alias is **not a valid reissue of immutable original V1 evidence**.

## Correct source and binary truth

The latest reviewed integration runtime generation
`884edc6e82bd505a83e51a44b38f7e318431f314` has:

- **7/8 identical source Git blobs** against genuine original V1 SOURCE
  commit `e390424c...`; the changed source is
  `src/economic/buy_void_auto_fulfillment_v1.ts`, old Git blob
  `1ac1ad6213be83f1aa8261a554caa91544fe5e09` versus current
  `b7c963b1d55f000d82ad82289b31107b432503de`.
- **7/7 identical pinned build inputs**, verified by Git commit and actual
  compiled candidate source.
- **7/8 identical compiled file SHA256 identities** against the original
  frozen V1 manifest. Its installed auto-fulfillment file was 14,860 bytes
  with SHA256 `ae15c56f...`; current proposed V2 is 26,226 bytes with
  SHA256 `119a08db...`.
- **8/8 compiled file hashes matching the invalidly reused INTEGRATION V1
  alias**. This last result explains the old green check, but does **not**
  establish original V1 binary compatibility.

The source-only [#2718](https://github.com/6ZoSo9/void-node/pull/2718)
V2 candidate, [#2732](https://github.com/6ZoSo9/void-node/pull/2732)
proposed V2 lock, and [#2736](https://github.com/6ZoSo9/void-node/pull/2736)
inactive TAR package distinguish these actual versions. The operator-provided
read-only Nimo census reports **installed original V1 8/8**, **proposed V2 7/8**.
The verified offline TAR SHA256 is
`656357f5ed98da324e205ca85085fa4b72d9289f8e2c2b7d5d43eb8e082c87c6`
and its **eight payload files are all reviewed V2 bytes**; the TAR remains
inert and **unaccepted**.

## Corrected executable proof

This Draft keeps the same file names and exact-head Node 22/24/26 workflow
but corrects the semantic assertions. The revised proof:

1. Independently reads the **original V1 contract from historical Git commit**
   `f627cad6...`, requiring exact Git blob `d2e84643...`, without trusting
   the changed working-branch V1 alias.
2. Separately pins the working integrated V1 alias `d0f80d3...`, checks
   that **only historical source lines 13 and 57** differ, and rejects any
   further alias rewrite.
3. Verifies both original and alias source-commit constants, both original
   and current auto-fulfillment hashes, and exact seven source/build matches
   plus one explicitly identified source+binary mismatch.
4. Independently derives the unaccepted current V2 candidate and requires
   7/8 hashes against **real V1**, 8/8 against **integration alias**.
5. Rejects malicious source generation, runtime SHA, installed path,
   false-green runtime identity and an attempted old-auto hash substitution.
6. Emits all-false runtime/install/payment/market/funds authority and
   byte-identical cross-Node receipts.

A green source-compatibility **difference proof** never authorizes a
witness-generation migration. There is no acceptance receipt, root-owned
V2 installed binary, authenticated Nimo principal, V2 service approval,
cross-UID custody IPC, durable verified-payment→allocation line, or public
WC/VOID activation. Historical V1 bytes and the user's installed Nimo
bundle remain **untouched**. No host-side action, install, extraction,
service restart, buyer record, signer, wallet, blockchain transaction,
market inventory, treasury, or funds movement.

**PROTECT THE CORE.**
