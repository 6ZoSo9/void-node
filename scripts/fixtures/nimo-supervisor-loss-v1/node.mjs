// Disposable HTTP/P2P/data model, not the VOID node.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import net from "node:net";
import crypto from "node:crypto";
const root = process.env.VOID_LOSS_FIXTURE_DATA, generation = process.env.VOID_LOSS_FIXTURE_GENERATION;
if (!root || !/^g[12]-[0-9a-f]{32}$/.test(generation || "")) process.exit(65);
let secret = null, authority = null;
process.on("disconnect", () => { secret = null; authority = null; });
process.on("message", message => {
  if (message?.schema === "void_public_bootstrap_adapter_authority_message_v1" && message.type === "authority") {
    secret = Buffer.from(message.secret_hex, "hex"); authority = message.generation;
    process.send?.({ fixture: "authority-delivered" });
  }
});
process.send?.({ fixture: "entry-started" });
await new Promise(resolve => {
  const release = message => { if (message === "fixture-continue") { process.removeListener("message", release); resolve(); } };
  process.on("message", release);
});
try {
  fs.mkdirSync(path.join(root, "live"));
  fs.openSync(path.join(root, "live"), "r");
  const journal = fs.openSync(path.join(root, "live", "journal"), "ax", 0o600);
  fs.writeSync(journal, `${generation}\n`);
  process.send?.({ fixture: "acquired-data" });
} catch { process.exit(73); }
const id = "a".repeat(32), head = 1951058;
const server = http.createServer((request, response) => {
  let value;
  if (request.url?.startsWith("/fixture/challenge/")) {
    const nonce = request.url.slice("/fixture/challenge/".length);
    value = secret && /^[0-9a-f]{32}$/.test(nonce)
      ? { generation: authority, mac: crypto.createHmac("sha256", secret).update(nonce).digest("hex") }
      : { unavailable: true };
  } else value = {
    "/health": { ok: true },
    "/__void/ready.json": { ready: true, gap: 0, txroot_live: 1, reasons: [], head },
    "/blocks/latest/number2.json": { number: head },
    "/p2p/peers": { ok: true, connected: [{ id, addr: "peer.example:4700", listens: [], outbound: true }],
      verifiedPeers: [{ node_id: id, addresses: ["peer.example:4700"], last_authenticated_at_ms: Date.now() }] },
  }[request.url];
  const bytes = Buffer.from(JSON.stringify(value || { missing: true }));
  response.writeHead(200, { "Content-Type": "application/json", "Content-Length": bytes.length, Connection: "keep-alive" });
  response.end(bytes);
});
const p2p = net.createServer(socket => socket.end(`fixture ${generation}\n`));
server.on("error", () => process.exit(74)); p2p.on("error", () => process.exit(74));
await Promise.all([new Promise(resolve => server.listen(4100, "127.0.0.1", resolve)),
  new Promise(resolve => p2p.listen(4700, "127.0.0.1", resolve))]);
process.send?.({ fixture: "acquired-listeners" });
process.send?.({ schema: "void_public_bootstrap_adapter_authority_child_v1", type: "ready" });
