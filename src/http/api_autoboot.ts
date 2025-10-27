// src/http/api_autoboot.ts
import * as http from "node:http";
import { SegStore } from "../chain/seg_store.js";
import { attachApi } from "./api_attach.js";
import { registerHelloRoute } from "./routes/hello.js";

const DATA_DIR    = process.env.DATA_DIR ?? "data_a";
const HELPER_PORT = Number(process.env.HELPER_PORT ?? 4315);

const store  = new SegStore(DATA_DIR, { segmentMaxBytes: 8 * 1024 * 1024, sparseEvery: 16 });
const server = http.createServer();

// Core APIs (no Node here → no /follow)
attachApi(server, store, DATA_DIR);

// /hello handshake
registerHelloRoute(server, {
  // resolvePeerPubKey?: (nodeId: string) => string | undefined
});

server.on("error", (e: any) => {
  console.error("[helper] server error:", e?.code || e);
  process.exit(1);
});

server.listen(HELPER_PORT, "127.0.0.1", () => {
  console.log(`[helper] listening on http://127.0.0.1:${HELPER_PORT} (DATA_DIR=${DATA_DIR})`);
});

