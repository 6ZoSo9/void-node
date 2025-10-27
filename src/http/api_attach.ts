// src/http/api_attach.ts
import { IncomingMessage, ServerResponse } from "node:http";
import * as url from "node:url";
import * as fs from "node:fs";
import * as path from "node:path";
import { SegStore } from "../chain/seg_store.js";
import type { Node } from "../node_core.js";
import { registerFollowRoutes } from "./routes/follow.js"; // ← add

export function attachApi(
  server: any,
  store: SegStore,
  dataDir: string,
  opts?: { node?: Node }            // ← add
) {
  if (!server || typeof server.on !== "function") return;

  // If caller passes a Node, mount the /follow routes
  if (opts?.node) {
    registerFollowRoutes(server, opts.node); // ← add
  }

  server.on("request", async (req: IncomingMessage, res: ServerResponse) => {
    const write = (code:number, payload:any, type="application/json") => {
      try { res.writeHead(code, { "content-type": type }) } catch {}
      res.end(type.startsWith("application/json") ? JSON.stringify(payload) : payload);
    };

    try {
      const u = url.parse(req.url || "", true);
      const p = (u.pathname || "/").replace(/\/+$/,"") || "/";

      if (req.method === "GET" && (p === "/health" || p === "/api/health")) {
        return write(200, { ok:true, dataDir, head: store.loadHeadNumber() });
      }

      if (req.method === "GET" && (p === "/head" || p === "/api/head")) {
        return write(200, { ok:true, head: store.loadHeadNumber() });
      }

      if (req.method === "GET" && p === "/blocks/range") {
        const from = Number(u.query?.from ?? 0);
        const to   = Number(u.query?.to   ?? store.loadHeadNumber());
        if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to < from) {
          return write(400, { ok:false, error:"bad range" });
        }
        const out:any[] = [];
        for (let i = from; i <= to; i++) {
          const b = store.loadBlock(i);
          if (b) out.push(b);
        }
        return write(200, out);
      }

      if (req.method === "GET" && p === "/metrics") {
        let blocks = 0, bytes = 0;
        try {
          const segDir = path.join(dataDir, "segments");
          if (fs.existsSync(segDir)) {
            const segs = fs.readdirSync(segDir).filter(d => /^\d{8}$/.test(d)).sort();
            for (const s of segs) {
              const mPath = path.join(segDir, s, "meta.json");
              if (fs.existsSync(mPath)) {
                const m = JSON.parse(fs.readFileSync(mPath, "utf8"));
                blocks += (m.to ?? -1) - (m.from ?? 0) + 1;
                bytes  += m.bytes ?? 0;
              }
            }
          }
        } catch {}
        const text =
`# HELP void_helper_head Current head number (helper store)
# TYPE void_helper_head gauge
void_helper_head ${store.loadHeadNumber()}
# HELP void_helper_blocks Total blocks across segments
# TYPE void_helper_blocks gauge
void_helper_blocks ${blocks}
# HELP void_helper_bytes Total segment bytes
# TYPE void_helper_bytes gauge
void_helper_bytes ${bytes}
`;
        return write(200, text, "text/plain; version=0.0.4; charset=utf-8");
      }

      return write(404, { ok:false, error:"not found" });
    } catch (e:any) {
      return write(500, { ok:false, error:String(e?.message||e) });
    }
  });
}


