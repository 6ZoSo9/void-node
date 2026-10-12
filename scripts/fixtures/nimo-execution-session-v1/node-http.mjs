// Disposable HTTP process for the real supervisor-observer proof. No VOID node,
// data directory, identity key, bootstrap adapter or public network is opened.
import http from "node:http";
const fault = process.argv[2] || "none";
const head = 1951058, id = "a".repeat(32);
let count = 0;
const server = http.createServer((request, response) => {
  count++;
  process.send?.({ type: "request", count, route: request.url });
  if (fault === "exit" && count === 5) process.exit(0);
  if (fault === "stall" && count === 1) return;
  const payload = {
    "/health": { ok: true },
    "/__void/ready.json": { ready: true, gap: 0, txroot_live: 1, reasons: [], head },
    "/blocks/latest/number2.json": { number: head },
    "/p2p/peers": { ok: true, connected: [{ id, addr: "peer.example:4700", listens: [], outbound: true }],
      verifiedPeers: [{ node_id: id, addresses: ["peer.example:4700"], last_authenticated_at_ms: Date.now() }] },
  }[request.url];
  let body = JSON.stringify(payload);
  if (fault === "bad-json") body = "{";
  if (fault === "oversize") body = "x".repeat(2097153);
  if (fault === "peer-mismatch" && request.url === "/p2p/peers") {
    payload.verifiedPeers[0].node_id = "b".repeat(32); body = JSON.stringify(payload);
  }
  response.writeHead(fault === "redirect" ? 302 : 200,
    { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), Connection: "keep-alive" });
  response.end(body);
  if (fault === "rebind" && count === 5) setTimeout(() => {
    server.closeAllConnections();
    server.close(() => server.listen(4100, "127.0.0.1"));
  }, 100);
});
server.listen(4100, "127.0.0.1", () => process.send?.({ type: "listening" }));
process.on("message", message => {
  if (message === "close-listener") {
    server.closeAllConnections(); server.close(() => process.send?.({ type: "closed" }));
  }
});
