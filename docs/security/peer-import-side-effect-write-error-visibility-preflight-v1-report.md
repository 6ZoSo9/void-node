# peer import side-effect write error visibility preflight v1

- generated_at: 1970-01-01T00:00:00.000Z
- status: STATIC_PREFLIGHT_WARNINGS
- blocker_failures: none
- warning_failures: none
- node_core_sha256: d49db904a2c92f0fbe6f9cb6be65029fd1dbef44c9d2ecb759098da2b4e9fbb8
- block_source_sha256: ba2c4bfd1f0fc16e2ca3fc11a788a78cd8f70882e5fe9c926e978c0f7c3fdc9f
- silent_catch_count: 21
- side_effect_silent_catch_count: 7
- import_side_effect_silent_catch_count: 4
- local_production_side_effect_silent_catch_count: 2

## Findings

- [PASS] node-core-present (blocker): src/node_core.ts readable
- [PASS] block-source-present (blocker): src/chain/block.ts readable
- [PASS] validateBlockForAppend-exported (blocker): validateBlockForAppend export visible in src/chain/block.ts
- [PASS] node-core-references-validateBlockForAppend (blocker): src/node_core.ts references validateBlockForAppend
- [PASS] silent-catch-sites-discovered (info): catch {} matches=21
- [PASS] side-effect-silent-catch-sites-discovered (warn): txIndex/receipts/kidx catch contexts=7
- [PASS] import-side-effect-silent-catch-sites-discovered (warn): import side-effect catch contexts=4
- [PASS] local-production-side-effect-silent-catch-sites-discovered (info): local production side-effect catch contexts=2

## Side-effect silent catch contexts

### Context 6: catch {} at src/node_core.ts:699

- hasTxIndexNearby: true
- hasReceiptsNearby: true
- hasKidxNearby: true
- hasImportPersistenceNearby: false
- hasLocalProductionNearby: true
- hasExplicitFailureReturnNearby: false

```ts
681:       number,
682:       parentHash,
683:       timestamp: now,
684:       txRoot: roots.txRoot,
685:       blobRoot: roots.blobRoot,
686:       txs,
687:       blobs,
688:       proposer: this.id,
689:       proposerPubkey: this.pubPEM,
690:       sig,
691:     };
692: 
693:     this.store.saveBlock(b);
694: 
695:     if (b.txs?.length) {
696:       try {
697:         const refs = b.txs.map((tx, i) => ({ h: tx.hash.toLowerCase(), n: b.number, o: i }));
698:         this.txIndex.putMany(refs);
699:       } catch {}
700:       try {
701:         const shard = this.txIndex.shardForBlock(b.number);
702:         await buildKidxForJsonl(shard.path);
703:       } catch {}
704:       try {
705:         const anyReceipts: any = this.receipts as any;
706:         const recs = b.txs.map((tx, i) => ({
707:           h: tx.hash.toLowerCase(),
708:           n: b.number,
709:           o: i,
710:           ts: b.timestamp ?? now,
711:         }));
712:         if (typeof anyReceipts.appendMany === "function") {
713:           await anyReceipts.appendMany(recs);
714:         } else if (typeof anyReceipts.append === "function") {
715:           for (const r of recs) await anyReceipts.append(r);
716:         }
717:       } catch {}
```

### Context 7: catch {} at src/node_core.ts:703

- hasTxIndexNearby: true
- hasReceiptsNearby: true
- hasKidxNearby: true
- hasImportPersistenceNearby: false
- hasLocalProductionNearby: true
- hasExplicitFailureReturnNearby: false

```ts
685:       blobRoot: roots.blobRoot,
686:       txs,
687:       blobs,
688:       proposer: this.id,
689:       proposerPubkey: this.pubPEM,
690:       sig,
691:     };
692: 
693:     this.store.saveBlock(b);
694: 
695:     if (b.txs?.length) {
696:       try {
697:         const refs = b.txs.map((tx, i) => ({ h: tx.hash.toLowerCase(), n: b.number, o: i }));
698:         this.txIndex.putMany(refs);
699:       } catch {}
700:       try {
701:         const shard = this.txIndex.shardForBlock(b.number);
702:         await buildKidxForJsonl(shard.path);
703:       } catch {}
704:       try {
705:         const anyReceipts: any = this.receipts as any;
706:         const recs = b.txs.map((tx, i) => ({
707:           h: tx.hash.toLowerCase(),
708:           n: b.number,
709:           o: i,
710:           ts: b.timestamp ?? now,
711:         }));
712:         if (typeof anyReceipts.appendMany === "function") {
713:           await anyReceipts.appendMany(recs);
714:         } else if (typeof anyReceipts.append === "function") {
715:           for (const r of recs) await anyReceipts.append(r);
716:         }
717:       } catch {}
718:     }
719: 
720:     this.publishJson("void/block", {
721:       number: b.number,
```

### Context 8: catch {} at src/node_core.ts:717

- hasTxIndexNearby: true
- hasReceiptsNearby: true
- hasKidxNearby: true
- hasImportPersistenceNearby: false
- hasLocalProductionNearby: false
- hasExplicitFailureReturnNearby: false

```ts
699:       } catch {}
700:       try {
701:         const shard = this.txIndex.shardForBlock(b.number);
702:         await buildKidxForJsonl(shard.path);
703:       } catch {}
704:       try {
705:         const anyReceipts: any = this.receipts as any;
706:         const recs = b.txs.map((tx, i) => ({
707:           h: tx.hash.toLowerCase(),
708:           n: b.number,
709:           o: i,
710:           ts: b.timestamp ?? now,
711:         }));
712:         if (typeof anyReceipts.appendMany === "function") {
713:           await anyReceipts.appendMany(recs);
714:         } else if (typeof anyReceipts.append === "function") {
715:           for (const r of recs) await anyReceipts.append(r);
716:         }
717:       } catch {}
718:     }
719: 
720:     this.publishJson("void/block", {
721:       number: b.number,
722:       hash: blockHash(b),
723:       txRoot: b.txRoot,
724:       blobRoot: b.blobRoot,
725:       timestamp: b.timestamp,
726:     });
727: 
728:     const dt = Date.now() - t0;
729:     this.onSealed?.(b, dt);
730: 
731:     return { ok: true, number: b.number, txs: b.txs?.length ?? 0 };
732:   }
733: 
734:   /** follower: one-shot */
735:   async pullOnce(peerHttp: string, hooks?: { onImportBlock?: (b: any) => void }) {
```

### Context 17: catch {} at src/node_core.ts:898

- hasTxIndexNearby: true
- hasReceiptsNearby: true
- hasKidxNearby: false
- hasImportPersistenceNearby: true
- hasLocalProductionNearby: false
- hasExplicitFailureReturnNearby: false

```ts
880:             myHead,
881:             theirHead,
882:             from,
883:             to,
884:             got: Array.isArray(arr) ? arr.length : 0,
885:             retried,
886:             importedNums,
887:           };
888:         }
889: 
890:         this.store.saveBlock(b);
891:         imported++;
892:         importedNums.push(n);
893: 
894:         if (incomingHasTxs) {
895:           try {
896:             const refs = b.txs.map((tx: any, i: number) => ({ h: String(tx.hash).toLowerCase(), n, o: i }));
897:             this.txIndex.putMany(refs);
898:           } catch {}
899:           try {
900:             const anyReceipts: any = this.receipts as any;
901:             const recs = b.txs.map((tx: any, i: number) => ({
902:               h: String(tx.hash).toLowerCase(),
903:               n,
904:               o: i,
905:               ts: b.timestamp ?? Date.now(),
906:             }));
907:             if (typeof anyReceipts.appendMany === "function") await anyReceipts.appendMany(recs);
908:             else if (typeof anyReceipts.append === "function") for (const r of recs) await anyReceipts.append(r);
909:           } catch {}
910:         }
911: 
912:         hooks?.onImportBlock?.(b);
913:         continue;
914:       }
915: 
916:       if (!existingHasTxs && incomingHasTxs) {
```

### Context 18: catch {} at src/node_core.ts:909

- hasTxIndexNearby: true
- hasReceiptsNearby: true
- hasKidxNearby: false
- hasImportPersistenceNearby: true
- hasLocalProductionNearby: false
- hasExplicitFailureReturnNearby: true

```ts
891:         imported++;
892:         importedNums.push(n);
893: 
894:         if (incomingHasTxs) {
895:           try {
896:             const refs = b.txs.map((tx: any, i: number) => ({ h: String(tx.hash).toLowerCase(), n, o: i }));
897:             this.txIndex.putMany(refs);
898:           } catch {}
899:           try {
900:             const anyReceipts: any = this.receipts as any;
901:             const recs = b.txs.map((tx: any, i: number) => ({
902:               h: String(tx.hash).toLowerCase(),
903:               n,
904:               o: i,
905:               ts: b.timestamp ?? Date.now(),
906:             }));
907:             if (typeof anyReceipts.appendMany === "function") await anyReceipts.appendMany(recs);
908:             else if (typeof anyReceipts.append === "function") for (const r of recs) await anyReceipts.append(r);
909:           } catch {}
910:         }
911: 
912:         hooks?.onImportBlock?.(b);
913:         continue;
914:       }
915: 
916:       if (!existingHasTxs && incomingHasTxs) {
917:         const parentBlock = n === 0 ? null : this.store.loadBlock(n - 1);
918:         const valid = validateBlockForAppend(b, parentBlock as any);
919:         if (!valid.ok) {
920:           return {
921:             ok: false,
922:             imported,
923:             alreadyHad,
924:             filled,
925:             reason: "invalid imported fill block",
926:             invalidBlock: n,
927:             invalidReason: (valid as any).reason || "unknown",
```

### Context 19: catch {} at src/node_core.ts:946

- hasTxIndexNearby: true
- hasReceiptsNearby: true
- hasKidxNearby: false
- hasImportPersistenceNearby: true
- hasLocalProductionNearby: false
- hasExplicitFailureReturnNearby: false

```ts
928:             myHead,
929:             theirHead,
930:             from,
931:             to,
932:             got: Array.isArray(arr) ? arr.length : 0,
933:             retried,
934:             importedNums,
935:           };
936:         }
937: 
938:         const merged = { ...existing, ...b, txs: b.txs };
939:         this.store.saveBlock(merged);
940:         filled++;
941:         importedNums.push(n);
942: 
943:         try {
944:           const refs = b.txs.map((tx: any, i: number) => ({ h: String(tx.hash).toLowerCase(), n, o: i }));
945:           this.txIndex.putMany(refs);
946:         } catch {}
947:         try {
948:           const anyReceipts: any = this.receipts as any;
949:           const recs = b.txs.map((tx: any, i: number) => ({
950:             h: String(tx.hash).toLowerCase(),
951:             n,
952:             o: i,
953:             ts: b.timestamp ?? Date.now(),
954:           }));
955:           if (typeof anyReceipts.appendMany === "function") await anyReceipts.appendMany(recs);
956:           else if (typeof anyReceipts.append === "function") for (const r of recs) await anyReceipts.append(r);
957:         } catch {}
958: 
959:         hooks?.onImportBlock?.(b);
960:         continue;
961:       }
962: 
963:       alreadyHad++;
964:     }
```

### Context 20: catch {} at src/node_core.ts:957

- hasTxIndexNearby: true
- hasReceiptsNearby: true
- hasKidxNearby: false
- hasImportPersistenceNearby: true
- hasLocalProductionNearby: false
- hasExplicitFailureReturnNearby: false

```ts
939:         this.store.saveBlock(merged);
940:         filled++;
941:         importedNums.push(n);
942: 
943:         try {
944:           const refs = b.txs.map((tx: any, i: number) => ({ h: String(tx.hash).toLowerCase(), n, o: i }));
945:           this.txIndex.putMany(refs);
946:         } catch {}
947:         try {
948:           const anyReceipts: any = this.receipts as any;
949:           const recs = b.txs.map((tx: any, i: number) => ({
950:             h: String(tx.hash).toLowerCase(),
951:             n,
952:             o: i,
953:             ts: b.timestamp ?? Date.now(),
954:           }));
955:           if (typeof anyReceipts.appendMany === "function") await anyReceipts.appendMany(recs);
956:           else if (typeof anyReceipts.append === "function") for (const r of recs) await anyReceipts.append(r);
957:         } catch {}
958: 
959:         hooks?.onImportBlock?.(b);
960:         continue;
961:       }
962: 
963:       alreadyHad++;
964:     }
965: 
966:     const maxSeen = Math.max(
967:       Number.isFinite(theirHead) ? theirHead : -1,
968:       ...((Array.isArray(arr) ? arr : []).map((x:any) => Number(x?.number)).filter((n:any) => Number.isFinite(n)))
969:     );
970:     const advancedHead = advanceContiguousHead(myHead, maxSeen);
971: 
972:     return {
973:       ok: true,
974:       imported,
975:       alreadyHad,
```

## Boundary

Static/source preflight only. This workflow records silent side-effect write catches and does not patch runtime behavior or claim fork-choice, consensus-finality, wallet-authority, ledger-write, validator-admission, signer-rotation, or autonomous-mutation closure.
