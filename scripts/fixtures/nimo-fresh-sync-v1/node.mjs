// Explicit disposable data/HTTP boundary. Never imports the VOID node.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import net from "node:net";
const root = process.env.DATA_DIR;
const packet = JSON.parse(fs.readFileSync(".runtime/fresh-fixture.json", "utf8"));
process.send?.({ fixture: "entry" });
await new Promise(resolve => process.on("message", m => { if (m === "fixture-start") resolve(); }));
fs.openSync(root, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY);
fs.writeFileSync(path.join(root, "canonical-block.fixture"), JSON.stringify({ head: packet.target, generation: packet.generation }));
const id = "a".repeat(32), head = packet.target;
const server = http.createServer((request, response) => {
  const body = {
    "/health": { ok: true },
    "/__void/ready.json": { ready: true, gap: 0, txroot_live: 1, reasons: [], head },
    "/blocks/latest/number2.json": { number: head },
    "/p2p/peers": { ok: true, connected: [{ id, addr: "peer.example:4700", listens: [], outbound: true }],
      verifiedPeers: [{ node_id: id, addresses: ["peer.example:4700"], last_authenticated_at_ms: Date.now() }] },
  }[request.url];
  const bytes = Buffer.from(JSON.stringify(body || { missing: true }));
  response.writeHead(200, { "Content-Type": "application/json", "Content-Length": bytes.length, Connection: "keep-alive" }); response.end(bytes);
});
const p2p = net.createServer(socket => socket.end());
await Promise.all([new Promise(resolve => server.listen(4100, "127.0.0.1", resolve)), new Promise(resolve => p2p.listen(4700, "127.0.0.1", resolve))]);
process.send?.({ fixture: "serving" });
