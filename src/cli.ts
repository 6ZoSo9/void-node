// src/cli.ts
// Tiny but complete CLI for void-node.
//
// Quick examples (BASE defaults to http://127.0.0.1:4100):
//   BASE=http://127.0.0.1:4100 npm run cli -- health
//   npm run cli -- head
//   npm run cli -- peers
//   npm run cli -- p2p-peers
//   npm run cli -- mempool
//   npm run cli -- mempool-count
//   npm run cli -- tx '{"body":{"note":"hi"}}'            # hash auto-computed
//   npm run cli -- tx @./file.json                        # @file to load
//   echo '{"body":{"x":1}}' | npm run cli -- tx -         # stdin as body
//   npm run cli -- put-blob ./README.md
//   npm run cli -- blob-stat <cid>
//   npm run cli -- blob-stats
//   npm run cli -- blob-get <cid> ./out.bin               # raw download
//   npm run cli -- start-proposer 3000
//   npm run cli -- stop-proposer
//   npm run cli -- once --empty
//   npm run cli -- blocks-get 12345
//   npm run cli -- blocks-range 100 120
//   npm run cli -- tx-lookup <64hex>
//   npm run cli -- tx-receipt <64hex>
//   npm run cli -- tx-status <64hex>
//   npm run cli -- index-stats
//   npm run cli -- index-build
//   npm run cli -- index-gc 2
//   npm run cli -- kidx-rebuild-shard --block 17290
//   npm run cli -- kidx-rebuild-shard --hash <64hex>
//   npm run cli -- receipts-stats
//   npm run cli -- receipts-gc 2
//   npm run cli -- follow-once http://127.0.0.1:4100
//   npm run cli -- follow-start http://127.0.0.1:4100 1000
//   npm run cli -- sync-status
//   npm run cli -- peers-registry
//   npm run cli -- peers-registry-upsert '{"id":"X","http":"http://...","p2p":"127.0.0.1:4701"}'
//   npm run cli -- peers-registry-purge 600
//   npm run cli -- peers-registry-announce-self
//   npm run cli -- maintenance-verify
//   npm run cli -- maintenance-auto-repair [--dry]
//   npm run cli -- metrics
//   npm run cli -- hello-now

import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as readline from "node:readline";

const base = (process.env.BASE || "http://127.0.0.1:4100").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.CLI_TIMEOUT_MS || 15000);

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd) return usage();

  // ------------ simple GETs ------------
  if (cmd === "health")            return j(await fetchJSON("/api/health"));
  if (cmd === "head")              return j(await fetchJSON("/api/head"));
  if (cmd === "peers")             return j(await fetchJSON("/peers"));
  if (cmd === "p2p-peers")         return j(await fetchJSON("/p2p/peers"));
  if (cmd === "mempool")           return j(await fetchJSON("/mempool"));
  if (cmd === "mempool-count")     return j(await fetchJSON("/mempool/count"));
  if (cmd === "index-stats")       return j(await fetchJSON("/index/stats"));
  if (cmd === "receipts-stats")    return j(await fetchJSON("/receipts/stats"));
  if (cmd === "metrics")           return raw(await fetchText("/metrics"));
  if (cmd === "sync-status")       return j(await fetchJSON("/sync/status"));
  if (cmd === "hello-now")         return j(await fetchJSON("/p2p/hello-now"));
  if (cmd === "peers-registry")    return j(await fetchJSON("/peers/registry"));
  if (cmd === "peers-registry-ids")return j(await fetchJSON("/peers/registry/ids"));

  // ------------ blocks ------------
  if (cmd === "blocks-get") {
    const n = num(rest[0], "blocks-get <number>");
    return raw(await fetchText(`/blocks/get/${n}`)); // block is already JSON
  }
  if (cmd === "blocks-range") {
    const from = num(rest[0], "blocks-range <from> <to>");
    const to   = num(rest[1], "blocks-range <from> <to>");
    return raw(await fetchText(`/blocks/range?from=${from}&to=${to}`));
  }
  if (cmd === "start-proposer") {
    const intervalMs = Number(rest[0] || 5000);
    return j(await postJSON(`/blocks/start?intervalMs=${encodeURIComponent(String(intervalMs))}`, {}));
  }
  if (cmd === "stop-proposer") {
    return j(await postJSON("/blocks/stop", {}));
  }
  if (cmd === "once") {
    const allowEmpty = rest.includes("--empty") || rest.includes("--allow-empty");
    const qs = allowEmpty ? "?allowEmpty=1" : "";
    return j(await postJSON(`/blocks/once${qs}`, {}));
  }

  // ------------ follower ------------
  if (cmd === "follow-once") {
    const peer = rest[0] || "http://127.0.0.1:4100";
    return j(await postJSON(`/follower/once?peer=${encodeURIComponent(peer)}`, {}));
  }
  if (cmd === "follow-start") {
    const peer = rest[0] || "http://127.0.0.1:4100";
    const intervalMs = Number(rest[1] || 2000);
    return j(await postJSON(`/follower/start?peer=${encodeURIComponent(peer)}&intervalMs=${intervalMs}`, {}));
  }

  // ------------ tx / receipts ------------
  if (cmd === "tx") {
    // Accept: inline JSON, @file, or '-' for stdin
    const arg = rest[0];
    let rawTx: any;
    if (!arg || arg === "-") rawTx = await readStdinJSON({ fallback: { body: { note: "demo", ts: Date.now() } } });
    else rawTx = await loadJSONArg(arg);
    const tx = normalizeTx(rawTx);
    return j(await postJSON("/tx", tx));
  }
  if (cmd === "tx-lookup") {
    const h = hex64(rest[0], "tx-lookup <64hex>");
    return j(await fetchJSON(`/tx/lookup?hash=${h}`));
  }
  if (cmd === "tx-receipt") {
    const h = hex64(rest[0], "tx-receipt <64hex>");
    return j(await fetchJSON(`/tx/receipt?hash=${h}`));
  }
  if (cmd === "tx-status") {
    const h = hex64(rest[0], "tx-status <64hex>");
    return j(await fetchJSON(`/tx/status?hash=${h}`));
  }

  // ------------ index / kidx ------------
  if (cmd === "index-build") {
    return j(await postJSON("/index/kidx/build", {})); // convenience: builds all kidx
  }
  if (cmd === "index-rebuild") {
    return j(await postJSON("/index/rebuild", {}));    // full rebuild from blocks
  }
  if (cmd === "index-gc") {
    const keepLast = Number(rest[0] || 1);
    return j(await postJSON(`/index/gc?keepLast=${keepLast}`, {}));
  }
  if (cmd === "kidx-rebuild-shard") {
    const blockIx = rest.indexOf("--block");
    const hashIx  = rest.indexOf("--hash");
    if (blockIx !== -1 && rest[blockIx + 1]) {
      const b = num(rest[blockIx + 1], "kidx-rebuild-shard --block <n>");
      return j(await postJSON(`/index/kidx/rebuild-shard?block=${b}`, {}));
    }
    if (hashIx !== -1 && rest[hashIx + 1]) {
      const h = hex64(rest[hashIx + 1], "kidx-rebuild-shard --hash <64hex>");
      return j(await postJSON(`/index/kidx/rebuild-shard?hash=${h}`, {}));
    }
    return panic("kidx-rebuild-shard requires --block <n> or --hash <64hex>");
  }

  // ------------ blobs ------------
  if (cmd === "put-blob") {
    const file = rest[0];
    if (!file) return panic("put-blob <path>");
    const data = await readFile(file);
    const base64 = Buffer.from(data).toString("base64");
    return j(await postJSON("/blob/put", { base64 }));
  }
  if (cmd === "blob-stat") {
    const cid = expect(rest[0], "blob-stat <cid>");
    return j(await fetchJSON(`/blob/stat/${encodeURIComponent(cid)}`));
  }
  if (cmd === "blob-stats") {
    return j(await fetchJSON("/blob/stats"));
  }
  if (cmd === "blob-get") {
    const cid = expect(rest[0], "blob-get <cid> <outPath>");
    const out = expect(rest[1], "blob-get <cid> <outPath>");
    // Try raw endpoint first (added by index.ts suggestion), else fall back to /blob/stat gate
    const r = await fetchWithTimeout(`${base}/blob/${encodeURIComponent(cid)}`, { timeoutMs: TIMEOUT_MS }).catch(() => null);
    if (r && r.ok) {
      const buf = Buffer.from(await r.arrayBuffer());
      await writeFile(out, buf);
      return j({ ok: true, cid, bytes: buf.length, out });
    }
    // If raw not available, at least tell user it's present/size
    const stat = await fetchJSON(`/blob/stat/${encodeURIComponent(cid)}`);
    return j({ ok: false, note: "raw blob endpoint not available; saved nothing", stat });
  }

  // ------------ peer registry QoL ------------
  if (cmd === "peers-registry-upsert") {
    const arg = expect(rest[0], "peers-registry-upsert '<json>'|@file|-");
    const body = await loadJSONArg(arg);
    return j(await postJSON("/peers/registry/upsert", body));
  }
  if (cmd === "peers-registry-purge") {
    const maxAgeSec = Number(rest[0] || 600);
    return j(await fetchJSON(`/peers/registry/purge?maxAgeSec=${maxAgeSec}`));
  }
  if (cmd === "peers-registry-announce-self") {
    return j(await postJSON("/peers/registry/announce-self", {}));
  }

  // ------------ maintenance ------------
  if (cmd === "maintenance-verify") {
    return j(await fetchJSON("/maintenance/verify"));
  }
  if (cmd === "maintenance-auto-repair") {
    const dry = rest.includes("--dry") ? "1" : "0";
    return j(await postJSON(`/maintenance/auto-repair?dryRun=${dry}`, {}));
  }

  return usage();
}

/* -------------------------- helpers -------------------------- */

function usage() {
  console.log(`Usage (BASE=${base}):
  npm run cli -- health
  npm run cli -- head
  npm run cli -- peers
  npm run cli -- p2p-peers
  npm run cli -- mempool
  npm run cli -- mempool-count
  npm run cli -- index-stats
  npm run cli -- receipts-stats
  npm run cli -- tx '<json>' | @file | - (stdin)     # or path with @
  npm run cli -- put-blob <path>
  npm run cli -- blob-stat <cid>
  npm run cli -- blob-stats
  npm run cli -- blob-get <cid> <outPath>
  npm run cli -- start-proposer [ms]
  npm run cli -- stop-proposer
  npm run cli -- once [--empty]
  npm run cli -- blocks-get <n>
  npm run cli -- blocks-range <from> <to>
  npm run cli -- tx-lookup <64hex>
  npm run cli -- tx-receipt <64hex>
  npm run cli -- tx-status <64hex>
  npm run cli -- index-build
  npm run cli -- index-rebuild
  npm run cli -- index-gc [keepLast]
  npm run cli -- kidx-rebuild-shard --block <n> | --hash <64hex>
  npm run cli -- receipts-gc [keepLast]
  npm run cli -- follow-once [peerBase]
  npm run cli -- follow-start [peerBase] [ms]
  npm run cli -- sync-status
  npm run cli -- peers-registry
  npm run cli -- peers-registry-ids
  npm run cli -- peers-registry-upsert '<json>'|@file|-
  npm run cli -- peers-registry-purge [maxAgeSec]
  npm run cli -- peers-registry-announce-self
  npm run cli -- maintenance-verify
  npm run cli -- maintenance-auto-repair [--dry]
  npm run cli -- metrics
  npm run cli -- hello-now
`);
}

async function fetchJSON(p: string): Promise<any> {
  const r = await fetchWithTimeout(base + p, { timeoutMs: TIMEOUT_MS });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${await safeText(r)}`);
  return r.json() as any;
}
async function fetchText(p: string): Promise<string> {
  const r = await fetchWithTimeout(base + p, { timeoutMs: TIMEOUT_MS });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${await safeText(r)}`);
  return r.text();
}
async function postJSON(p: string, body: any): Promise<any> {
  const r = await fetchWithTimeout(base + p, {
    timeoutMs: TIMEOUT_MS,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${await safeText(r)}`);
  return r.json() as any;
}

async function loadJSONArg(s: string): Promise<any> {
  // @path to load a file; '-' to read stdin; otherwise parse literal JSON
  if (s === "-") return readStdinJSON();
  if (s.startsWith("@")) return JSON.parse((await readFile(s.slice(1))).toString("utf8"));
  try {
    const buf = await readFile(s);
    return JSON.parse(buf.toString("utf8"));
  } catch {
    return JSON.parse(s);
  }
}

async function readStdinJSON(opts?: { fallback?: any }): Promise<any> {
  const chunks: string[] = [];
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  for await (const line of rl) chunks.push(line);
  const text = chunks.join("\n").trim();
  if (!text) return opts?.fallback ?? {};
  return JSON.parse(text);
}

function normalizeTx(input: any): { hash: string; body: any } {
  const body = isObject(input?.body) ? input.body : (isObject(input) ? input : { raw: String(input) });
  const hash = is64Hex(input?.hash) ? String(input.hash).toLowerCase() : sha256Hex(body);
  return { hash, body };
}

function sha256Hex(obj: any): string {
  const b = Buffer.from(JSON.stringify(obj));
  return createHash("sha256").update(b).digest("hex");
}

function is64Hex(x: any): x is string {
  return typeof x === "string" && /^[0-9a-fA-F]{64}$/.test(x);
}
function isObject(x: any): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}
function hex64(x: any, msgIfMissing: string): string {
  const v = expect(x, msgIfMissing);
  if (!is64Hex(v)) panic(`Expected 64-hex, got: ${v}`);
  return v.toLowerCase();
}
function num(x: any, msgIfMissing: string): number {
  const v = Number(expect(x, msgIfMissing));
  if (!Number.isFinite(v)) panic(`Expected number, got: ${x}`);
  return v;
}
function expect<T>(x: T | undefined, msg: string): T {
  if (x === undefined) panic(msg);
  return x;
}

async function safeText(r: Response): Promise<string> {
  try { return await r.text(); } catch { return ""; }
}

function j(x: any) { console.log(JSON.stringify(x, null, 2)); }
function raw(s: string) { process.stdout.write(s.endsWith("\n") ? s : s + "\n"); }
function panic(msg: string): never { console.error(msg); process.exit(1); }

async function fetchWithTimeout(url: string, opts?: { timeoutMs?: number } & RequestInit): Promise<Response> {
  const timeoutMs = Math.max(1000, Number(opts?.timeoutMs ?? TIMEOUT_MS));
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const { timeoutMs: _omit, signal, ...rest } = opts || {};
    return await fetch(url, { ...rest, signal: signal ?? ctrl.signal } as any);
  } finally {
    clearTimeout(t);
  }
}

main().catch((e) => { console.error(e?.stack || String(e)); process.exit(1); });

