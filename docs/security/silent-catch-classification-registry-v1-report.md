# silent catch classification registry v1

- generated_at: 1970-01-01T00:00:00.000Z
- marker: VOID_SILENT_CATCH_CLASSIFICATION_REGISTRY_V1_GREEN
- node_core_sha256: 2435c260eb28d03f36ddb55dd98e782ebf9231a303dcf57f706f1581012bed9b
- silent_catch_count: 3
- side_effect_silent_catch_count: 0
- import_side_effect_silent_catch_count: 0

## Classification counts

- cataloged-remaining-non-side-effect-silent-catch: 1
- optional-mempool-best-effort: 1
- optional-network-or-notification-path: 1

## Findings

- [PASS] literal-silent-catch-baseline: actual=3, expected=3
- [PASS] silent-catch-lines-match-baseline: actual=266,481,1063; expected=266,481,1063
- [PASS] side-effect-silent-catches-remain-closed: sideEffectSilentCatchCount=0
- [PASS] import-side-effect-silent-catches-remain-closed: importSideEffectSilentCatchCount=0
- [PASS] no-blocked-classifications: blockedCount=0

## Entries

### silent-catch-01

- file: src/node_core.ts
- line: 266
- text: `} catch {}`
- classification: cataloged-remaining-non-side-effect-silent-catch
- sideEffectSilentCatch: false
- importSideEffectSilentCatch: false

```ts
259:             for (const info of (arr || [])) {
260:               if (!info) continue;
261:               if (info.family === "IPv4" && !info.internal && info.address && !String(info.address).startsWith("127.")) {
262:                 return String(info.address);
263:               }
264:             }
265:           }
266:         } catch {}
267:         return "127.0.0.1";
268:       })();
269: 
270:     await new Promise<void>((resolve) => this.server.listen(this.tcpPort, bindHost, resolve));
271:     const addr = `${advertHost}:${(this.server.address() as net.AddressInfo).port}`;
272:     this.listenAddrs.push(addr);
273:     this.knownAddrs.add(addr);
```

### silent-catch-02

- file: src/node_core.ts
- line: 481
- text: `} catch {}`
- classification: optional-mempool-best-effort
- sideEffectSilentCatch: false
- importSideEffectSilentCatch: false

```ts
474:     try { (this.mempool as any).push?.(tx); } catch (err) { recordMempoolBestEffortFailure("accept-tx-mempool-push", err, { txHash: h }); }
475:     return true;
476:   }
477: 
478:   private sendRaw(peer: Peer, msg: Msg) {
479:     try {
480:       peer.socket.write(encode(msg));
481:     } catch {}
482:   }
483:   private isKnownPeer(id: string): boolean {
484:     return this.peers.has(id) && !id.startsWith("?-");
485:   }
486:   private isSelfAddress(addr: string): boolean {
487:     return this.listenAddrs.includes(addr);
488:   }
```

### silent-catch-03

- file: src/node_core.ts
- line: 1063
- text: `} catch {}`
- classification: optional-network-or-notification-path
- sideEffectSilentCatch: false
- importSideEffectSilentCatch: false

```ts
1056:   startFollower(peerHttp = "http://localhost:4100", intervalMs = 2000, opts?: { onImportBlock?: (b: Block) => void }) {
1057:     let running = false;
1058:     const tick = async () => {
1059:       if (running) return;
1060:       running = true;
1061:       try {
1062:         await this.pullOnce(peerHttp, opts);
1063:       } catch {}
1064:       running = false;
1065:     };
1066:     void tick();
1067:     setInterval(tick, intervalMs).unref?.();
1068:     return { ok: true, peerHttp, intervalMs };
1069:   }
1070: 
```

