// src/diag-identify.ts
// @ts-nocheck
/**
 * Minimal, resilient libp2p identity probe.
 *
 * Goals:
 * - If compatible libp2p deps are present, briefly start a node and print peer id.
 * - If not installed / mismatched, log a friendly note and exit 0 (never blocks builds).
 * - Always self-timeout and exit cleanly (even on odd event-loop hangs).
 *
 * Flags:
 *   --json               Print machine-readable JSON result
 *   --listen <ma>        Multiaddr to listen on (default: /ip4/127.0.0.1/tcp/0)
 *   --timeout <ms>       Hard stop timeout (default: 2500)
 *   --quiet              Reduce logs; prints only the essential line / JSON
 */

(async () => {
  const args = new Set(process.argv.slice(2));
  const getArg = (key: string, def?: string) => {
    const arr = process.argv.slice(2);
    const i = arr.indexOf(key);
    return i >= 0 && arr[i + 1] ? arr[i + 1] : def;
  };

  const asJson = args.has("--json");
  const quiet  = args.has("--quiet");
  const listen = getArg("--listen", "/ip4/127.0.0.1/tcp/0");
  const timeoutMs = Math.max(500, Number(getArg("--timeout", "2500")) || 2500);

  const log = (...xs: any[]) => { if (!quiet && !asJson) console.log(...xs); };
  const done = (ok: boolean, info: Record<string, any> = {}) => {
    const out = {
      ok,
      reason: info.reason || null,
      peerId: info.peerId || null,
      services: info.services || [],
      addrs: info.addrs || [],
    };
    if (asJson) {
      // single JSON object on stdout
      try { process.stdout.write(JSON.stringify(out) + "\n"); } catch {}
    } else {
      if (ok) {
        console.log(`[diag] peer id: ${out.peerId || "<unknown>"}`);
        if (!quiet) console.log(`[diag] addrs: ${out.addrs.join(", ") || "<none>"}`);
      } else {
        console.log(`[diag] libp2p not available; reason: ${out.reason || "unknown"}`);
      }
    }
    process.exit(0);
  };

  // Global hard stop no matter what.
  const hardTimer = setTimeout(() => {
    done(false, { reason: `timeout@${timeoutMs}ms` });
  }, timeoutMs).unref?.();

  // Robust dynamic import that tolerates missing / different export styles.
  async function optImport<T = any>(specifier: string): Promise<T | null> {
    try {
      // Quick existence probe to avoid noisy ESM loader errors in some setups.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require.resolve(specifier);
    } catch {
      return null;
    }
    try {
      const m: any = await import(specifier);
      return (m && (m.default ?? m)) as T;
    } catch {
      return null;
    }
  }

  try {
    // Try to import the pieces we need. If any core bit is missing, we bail gracefully.
    const libp2pMod = await optImport<any>("libp2p");
    const tcpMod    = await optImport<any>("@libp2p/tcp") || await optImport<any>("@libp2p/tcp/dist/src/index.js") || await optImport<any>("@libp2p/tcp/src/index.js");
    const noiseMod  = await optImport<any>("@chainsafe/libp2p-noise");
    const yamuxMod  = await optImport<any>("@chainsafe/libp2p-yamux");
    const identMod  = await optImport<any>("@libp2p/identify");

    if (!libp2pMod || !tcpMod || !noiseMod || !yamuxMod || !identMod) {
      const missing = [
        !libp2pMod && "libp2p",
        !tcpMod && "@libp2p/tcp",
        !noiseMod && "@chainsafe/libp2p-noise",
        !yamuxMod && "@chainsafe/libp2p-yamux",
        !identMod && "@libp2p/identify",
      ].filter(Boolean).join(", ");
      return done(false, { reason: `missing deps: ${missing}` });
    }

    const createLibp2p = libp2pMod.createLibp2p ?? libp2pMod;
    const tcp    = (typeof tcpMod.tcp === "function" ? tcpMod.tcp : tcpMod);
    const noise  = (typeof noiseMod.noise === "function" ? noiseMod.noise : noiseMod);
    const yamux  = (typeof yamuxMod.yamux === "function" ? yamuxMod.yamux : yamuxMod);
    const identify = (typeof identMod.identify === "function" ? identMod.identify : identMod);

    if (typeof createLibp2p !== "function") return done(false, { reason: "libp2p API not a function" });

    const node = await createLibp2p({
      addresses: { listen: [listen] },
      transports: [ tcp() ],
      streamMuxers: [ yamux() ],
      connectionEncryption: [ noise() ],
      services: { identify: identify() },
    } as any);

    const stopSafe = async () => { try { await node?.stop?.(); } catch {} };

    // Safety: also stop on SIGINT/SIGTERM
    const sig = async () => { await stopSafe(); done(true, info()); };
    process.once("SIGINT", sig);
    process.once("SIGTERM", sig);
    process.once("beforeExit", async () => { await stopSafe(); });

    await node.start();

    const info = () => ({
      peerId: node?.peerId?.toString?.() || null,
      services: Object.keys((node as any)?.services || {}),
      addrs: (node?.getMultiaddrs?.() || []).map((m: any) => m?.toString?.()).filter(Boolean),
    });

    if (!quiet && !asJson) {
      log("[diag] started libp2p probe");
      log("[diag] services:", Object.keys((node as any).services || {}));
      log("[diag] addrs:", (node.getMultiaddrs?.() || []).map((m: any) => m.toString()).join(", ") || "<none>");
    }

    // Brief graceful delay to let identify run; then stop.
    setTimeout(async () => {
      await stopSafe();
      if (!quiet && !asJson) log("[diag] stopped");
      done(true, info());
    }, Math.min(1000, Math.max(300, Math.floor(timeoutMs * 0.4)))).unref?.();

  } catch (e) {
    done(false, { reason: String(e?.message || e) });
  }
})();

