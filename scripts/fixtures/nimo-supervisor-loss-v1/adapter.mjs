import http from "node:http";
export async function createPublicSeedClientAdapterV1() {
  const server = http.createServer((_, response) => { response.writeHead(503); response.end(); });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  process.send?.({ fixture: "adapter", port });
  return { server, base: `http://127.0.0.1:${port}`, peers: ["https://seed.example"] };
}
