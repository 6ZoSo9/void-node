# V6 integrated source trust review checklist

- [ ] Integrated source anchor is exactly
  `3533626d7167c98ba8d65d2c423b460b1a3199fc` and retains #2687 lineage.
- [ ] Three historical reviewed records remain byte-identical:
  authenticated composition V3 `a3dbe4d...`, authority V2 `64953050...`,
  and source-chain RPC adapter V1 `419054e0...`.
- [ ] Payment observer record is exact source commit
  `9df9648f546eb9320259eae1d3930a7c132a6511`, blob
  `0073818ad6f6418e895bf794024c9d678b3bef86`.
- [ ] Verified-payment V2 record is exact source commit
  `52deccca51077d457177e738135dbb0e0536d2f3`, blob
  `c77bb6144b27eb8fdaff168200cea24d9c0ee9ac`.
- [ ] Canonical five-record digest is
  `ecdcb0f86b2fb18fd035828c1cf7cbc5025b1014703a2307c10fc6722c7424f1`.
- [ ] Historical V5 returns source-file mismatch on the changed generation; no
  predecessor pin or historical compiled/enforcement/package identity is waived.
- [ ] All five V6 module-derived files are bounded, single-link, regular,
  nonsymlink, retained-descriptor stable and Git-blob matched.
- [ ] Recorded commit-to-blob mappings are checked against real Git history.
- [ ] Same-size mutation, path replacement, descriptor drift, concurrent growth
  and caller-injected source assertions fail closed.
- [ ] The payment observer enforces both transport timer teardown and monotonic
  success-deadline admission; delayed timer delivery cannot authorize success.
- [ ] JSONP/prefix media types, mixed result+error envelopes, mismatched
  JSON-RPC IDs, non-2xx, oversize and premature close all fail closed.
- [ ] Node 22/24/26 V6 source proof and payment-RPC deadline proof pass on the
  exact integration generation.
- [ ] Cross-Node compiled V4 candidate treats V6, payment observer and V2
  compiled artifacts as intentional changed artifacts.
- [ ] A new locked compiled V4, enforcement, package and deployed runtime
  successor is reviewed; old identities remain immutable.
- [ ] V6 production-source-finality flags remain false until later gates.
- [ ] Original-request provenance, real payment finality, protected high-water,
  duplicate/capacity serialization and exactly-once allocation remain HOLD.
- [ ] No service deployment, live customer/payment read, credential, wallet,
  signer, transaction, Chain-2050/WC, presale/market or funds action is implied.

**PROTECT THE CORE.**
