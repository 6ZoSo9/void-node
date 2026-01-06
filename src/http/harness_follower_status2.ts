// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// ---------------- Follower drift status v2 (additive, no deps) --------------------
(function followerStatusRouteV2(){
  let tries = 0, attached = false;

  function getApp(): any {
    // Your invariant: global hook exists right after `const app = express();`
    return (globalThis as any).__void_http_app || (globalThis as any).app || undefined;
  }

  function trimSlash(u: string){ return String(u || "").replace(/\/+$/, ""); }

  async function fetchHeadFromMetrics(base: string){
    const url = trimSlash(base) + "/metrics";
    const r = await fetch(url);
    if (!r.ok) throw new Error(`metrics_http_${r.status}`);
    const text = await r.text();
    // Expect: void_head_number <n>
    const m = text.match(/(^|\n)\s*void_head_number\s+([0-9]+)(\s|$)/);
    if (!m) throw new Error("head_metric_missing");
    return Number(m[2]);
  }

  async function attach(){
    const app: any = getApp();
    if (!app || typeof app.get !== "function") {
      if (++tries < 60) return setTimeout(attach, 500);
      return;
    }
    if (attached) return; attached = true;

    // GET /follower/status2?peer=http://localhost:4100
    // -> { ok, peer, head_local, head_peer, drift }
    app.get("/follower/status2", async (req: any, res: any) => {
      try {
        const peer = String(req.query.peer || "").trim();
        if (!peer) return res.status(400).json({ ok:false, error:"missing_peer_param" });

        const myPort = Number(process.env.HTTP_PORT || 4100);
        const myBase = `http://127.0.0.1:${myPort}`;

        const [localHead, peerHead] = await Promise.all([
          fetchHeadFromMetrics(myBase),
          fetchHeadFromMetrics(peer)
        ]);

        const drift = peerHead - localHead;
        return res.json({ ok:true, peer:trimSlash(peer), head_local:localHead, head_peer:peerHead, drift });
      } catch (err: any) {
        const msg = (err && err.message) ? String(err.message) : String(err);
        return res.status(502).json({ ok:false, error: msg });
      }
    });
  }

  attach();
})();
