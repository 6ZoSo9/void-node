import http from "node:http";

const HOST = "127.0.0.1";
const PORT = Number(process.env.AGENT_HTTP_PORT || 4112);
const DN_BASE = process.env.DATANET_BASE || "http://127.0.0.1:4100";

function send(res, code, obj){
  const s = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type":"application/json", "Content-Length": Buffer.byteLength(s) });
  res.end(s);
}

async function readJson(req){
  return await new Promise((resolve, reject) => {
    let buf = "";
    req.setEncoding("utf8");
    req.on("data", (c)=>{ buf += c; if (buf.length > 12*1024*1024) reject(new Error("body_too_large")); });
    req.on("end", ()=> {
      try { resolve(buf ? JSON.parse(buf) : {}); }
      catch(e){ reject(new Error("invalid_json")); }
    });
    req.on("error", reject);
  });
}

const srv = http.createServer(async (req,res) => {
  try{
    if (req.method === "GET" && req.url === "/health") {
      return send(res, 200, { ok:true, service:"void-agent-bridge", dn: DN_BASE });
    }

    if (req.method === "POST" && req.url === "/agent/job") {
      const body = await readJson(req);
      const who = String(body?.who || "").trim();
      const payload_b64 = String(body?.payload_b64 || "");

      if(!who) return send(res, 400, { ok:false, error:"missing_who" });
      if(!payload_b64) return send(res, 400, { ok:false, error:"missing_payload_b64" });

      const r = await fetch(`${DN_BASE}/datanet/v1/publish?who=${encodeURIComponent(who)}`, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ plaintext_b64: payload_b64, name: "agent-job" })
      });

      const j = await r.json().catch(()=> ({}));
      if (!r.ok || !j?.ok) {
        return send(res, 502, { ok:false, error:"datanet_publish_failed", status:r.status, detail:j });
      }

      return send(res, 200, { ok:true, agent: who, dataset: j.id, merkleRootHex: j.merkleRootHex, chunks: j.chunks });
    }

    return send(res, 404, { ok:false, error:"not_found" });
  }catch(e){
    return send(res, 500, { ok:false, error: String(e?.message || e) });
  }
});

srv.listen(PORT, HOST, () => {
  console.log(`[void-agent-bridge] listening http://${HOST}:${PORT} -> ${DN_BASE}`);
});
