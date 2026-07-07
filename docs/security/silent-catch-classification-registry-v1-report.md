# silent catch classification registry v1

- generated_at: 1970-01-01T00:00:00.000Z
- marker: VOID_SILENT_CATCH_CLASSIFICATION_REGISTRY_V1_GREEN
- node_core_sha256: 3e6dc07cf9100106f6e8be5d62dc3aebc7429126c1d41138dc452c5f4170644a
- silent_catch_count: 7
- side_effect_silent_catch_count: 0
- import_side_effect_silent_catch_count: 0

## Classification counts

- cataloged-remaining-non-side-effect-silent-catch: 2
- optional-block-load-probe: 3
- optional-mempool-best-effort: 1
- optional-network-or-notification-path: 1

## Findings

- [PASS] literal-silent-catch-baseline: actual=7, expected=7
- [PASS] silent-catch-lines-match-baseline: actual=257,472,867,878,889,899,1048; expected=257,472,867,878,889,899,1048
- [PASS] side-effect-silent-catches-remain-closed: sideEffectSilentCatchCount=0
- [PASS] import-side-effect-silent-catches-remain-closed: importSideEffectSilentCatchCount=0
- [PASS] no-blocked-classifications: blockedCount=0

## Entries

### silent-catch-01

- file: src/node_core.ts
- line: 257
- text: `} catch {}`
- classification: cataloged-remaining-non-side-effect-silent-catch
- sideEffectSilentCatch: false
- importSideEffectSilentCatch: false

```ts
250:             for (const info of (arr || [])) {
251:               if (!info) continue;
252:               if (info.family === "IPv4" && !info.internal && info.address && !String(info.address).startsWith("127.")) {
253:                 return String(info.address);
254:               }
255:             }
256:           }
257:         } catch {}
258:         return "127.0.0.1";
259:       })();
260: 
261:     await new Promise<void>((resolve) => this.server.listen(this.tcpPort, bindHost, resolve));
262:     const addr = `${advertHost}:${(this.server.address() as net.AddressInfo).port}`;
263:     this.listenAddrs.push(addr);
264:     this.knownAddrs.add(addr);
```

### silent-catch-02

- file: src/node_core.ts
- line: 472
- text: `} catch {}`
- classification: optional-mempool-best-effort
- sideEffectSilentCatch: false
- importSideEffectSilentCatch: false

```ts
465:     try { (this.mempool as any).push?.(tx); } catch (err) { recordMempoolBestEffortFailure("accept-tx-mempool-push", err, { txHash: h }); }
466:     return true;
467:   }
468: 
469:   private sendRaw(peer: Peer, msg: Msg) {
470:     try {
471:       peer.socket.write(encode(msg));
472:     } catch {}
473:   }
474:   private isKnownPeer(id: string): boolean {
475:     return this.peers.has(id) && !id.startsWith("?-");
476:   }
477:   private isSelfAddress(addr: string): boolean {
478:     return this.listenAddrs.includes(addr);
479:   }
```

### silent-catch-03

- file: src/node_core.ts
- line: 867
- text: `} catch {}`
- classification: cataloged-remaining-non-side-effect-silent-catch
- sideEffectSilentCatch: false
- importSideEffectSilentCatch: false

```ts
860:       try {
861:         const st: any = this.store as any;
862:         if (!Number.isFinite(n) || n < 0) return;
863:         if (typeof st?.persistHeadAtomic === "function") {
864:           st.persistHeadAtomic(n);
865:           return;
866:         }
867:       } catch {}
868:       try {
869:         const fs = require("node:fs");
870:         const path = require("node:path");
871:         const base = String(process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data");
872:         const hj = path.join(base, "heads.json");
873:         const ht = path.join(base, "head.txt");
874:         fs.writeFileSync(hj + ".tmp", JSON.stringify({ head: n, hash: "0x0" }) + "\n");
```

### silent-catch-04

- file: src/node_core.ts
- line: 878
- text: `} catch {}`
- classification: optional-block-load-probe
- sideEffectSilentCatch: false
- importSideEffectSilentCatch: false

```ts
871:         const base = String(process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data");
872:         const hj = path.join(base, "heads.json");
873:         const ht = path.join(base, "head.txt");
874:         fs.writeFileSync(hj + ".tmp", JSON.stringify({ head: n, hash: "0x0" }) + "\n");
875:         fs.renameSync(hj + ".tmp", hj);
876:         fs.writeFileSync(ht + ".tmp", String(n) + "\n");
877:         fs.renameSync(ht + ".tmp", ht);
878:       } catch {}
879:     };
880: 
881:     const advanceContiguousHead = (startHead: number, maxSeen: number): number => {
882:       let h = Number(startHead);
883:       const maxN = Number(maxSeen);
884:       if (!(Number.isFinite(h) && h >= -1)) h = -1;
885:       if (!(Number.isFinite(maxN) && maxN >= 0)) return h;
```

### silent-catch-05

- file: src/node_core.ts
- line: 889
- text: `try { blk = this.store.loadBlock(nxt); } catch {}`
- classification: optional-block-load-probe
- sideEffectSilentCatch: false
- importSideEffectSilentCatch: false

```ts
882:       let h = Number(startHead);
883:       const maxN = Number(maxSeen);
884:       if (!(Number.isFinite(h) && h >= -1)) h = -1;
885:       if (!(Number.isFinite(maxN) && maxN >= 0)) return h;
886:       while (h < maxN) {
887:         const nxt = h + 1;
888:         let blk: any = null;
889:         try { blk = this.store.loadBlock(nxt); } catch {}
890:         if (!blk || Number(blk?.number) !== nxt) break;
891:         h = nxt;
892:       }
893:       if (h > startHead) {
894:         persistHeadIfPossible(h);
895:         try {
896:           const st: any = this.store as any;
```

### silent-catch-06

- file: src/node_core.ts
- line: 899
- text: `} catch {}`
- classification: optional-block-load-probe
- sideEffectSilentCatch: false
- importSideEffectSilentCatch: false

```ts
892:       }
893:       if (h > startHead) {
894:         persistHeadIfPossible(h);
895:         try {
896:           const st: any = this.store as any;
897:           if (typeof st.headNumber === "number" || st.headNumber == null) st.headNumber = h;
898:           if (typeof st.latestNumber === "number" || st.latestNumber == null) st.latestNumber = h;
899:         } catch {}
900:       }
901:       return h;
902:     };
903: 
904:     for (const b of arr) {
905:       const n = Number(b?.number);
906:       if (!Number.isFinite(n)) continue;
```

### silent-catch-07

- file: src/node_core.ts
- line: 1048
- text: `} catch {}`
- classification: optional-network-or-notification-path
- sideEffectSilentCatch: false
- importSideEffectSilentCatch: false

```ts
1041:   startFollower(peerHttp = "http://localhost:4100", intervalMs = 2000, opts?: { onImportBlock?: (b: Block) => void }) {
1042:     let running = false;
1043:     const tick = async () => {
1044:       if (running) return;
1045:       running = true;
1046:       try {
1047:         await this.pullOnce(peerHttp, opts);
1048:       } catch {}
1049:       running = false;
1050:     };
1051:     void tick();
1052:     setInterval(tick, intervalMs).unref?.();
1053:     return { ok: true, peerHttp, intervalMs };
1054:   }
1055: 
```

