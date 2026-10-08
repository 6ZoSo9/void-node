# V6 candidate source trust review checklist

- [ ] Parent #2625 is exactly `5cc9022571269bd08176aec8c96cc20884bd4021`,
  with verifier blob `32133e441ccb02bb4786d29e36932fb31399ec87`.
- [ ] Four V5 historical source records remain byte-identical in V6.
  V5's historical module Git blob stays
  `0804a50b87c089e2d03bbca716641d7211e6a8bc`.
- [ ] Historical V5 itself returns `source_files_git_blob_mismatch` on
  the changed V2 verifier; no predecessor pin or prior artifact is waived.
- [ ] Five V6 module-derived sources are bounded, single-link, regular,
  nonsymlink, stable across descriptor reads and Git-blob matched.
- [ ] The recorded V6 commit-to-blob mapping is checked against real Git
  history; missing objects in a shallow checkout are called incomplete.
- [ ] Mutated byte adversaries and caller-injected source assertions fail.
- [ ] Monotonic total deadline begins before V6 source verification.
- [ ] Node 22/24/26 focused, TypeScript, compiled module and packaged
  source-resolution tests pass on the *exact* stacked head.
- [ ] Both V2 security semantics and new V6 trust lineage receive
  independent review, not only CI GREEN.
- [ ] V6 flags remain false for source-generation verification, deployed
  artifact identity, source provider identity/quorum/ancestry, and production
  source-finality readiness.
- [ ] A new compiled, enforcement, packaged and separately deployed
  successor is reviewed; historical V5/previous manifests remain unchanged.
- [ ] Historical original request, native payment, protected high-water and
  exactly-once allocation custody remain HOLD until separately proven.
- [ ] No signing, wallet, transaction, Chain-2050/WC, public intake,
  presale/market, treasury/liquidity or funds actions have been authorized.
