/**
 * Minimal VOID ping agent: posts receipts to /agent/v0/receipt/:id
 * Env:
 *   VOID_NODE_URL (default http://127.0.0.1:4100)
 *   VOID_AGENT_ID (required) e.g., agent:pinger:v0
 *   VOID_AGENT_TOKEN_FILE (required) path to file with line: VOID_AGENT_TOKEN=...
 *   VOID_AGENT_INTERVAL_MS (default 5000)
 */

const NODE_URL = process.env.VOID_NODE_URL || "http://127.0.0.1:4100";
const ID = process.env.VOID_AGENT_ID || "";
const INTERVAL = Number(process.env.VOID_AGENT_INTERVAL_MS || "5000");
const TOKEN_FILE = process.env.VOID_AGENT_TOKEN_FILE || "";

import { readFileSync } from "node:fs";

function readToken(): string {
  if (!TOKEN_FILE) throw new Error("VOID_AGENT_TOKEN_FILE missing");
  const txt = readFileSync(TOKEN_FILE, "utf8");
  const m = txt.match(/^\s*VOID_AGENT_TOKEN\s*=\s*(.+)\s*$/m);
  if (!m) throw new Error("VOID_AGENT_TOKEN not found in token file");
  return m[1].trim();
}

async function postReceipt(id: string, token: string) {
  const url = new URL(`/agent/v0/receipt/${encodeURIComponent(id)}`, NODE_URL).toString();
  const body = {
    ts: Date.now(),
    ok: true,
    note: "ping",
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`receipt ${res.status}: ${text}`);
  }
}

async function main() {
  if (!ID) throw new Error("VOID_AGENT_ID missing");
  const token = readToken();
  // eslint-disable-next-line no-console
  console.log(`[ping-agent] start → ${NODE_URL} every ${INTERVAL}ms as ${ID}`);
  while (true) {
    const t0 = Date.now();
    try {
      await postReceipt(ID, token);
      // eslint-disable-next-line no-console
      console.log(`[ping-agent] ok @${Date.now()}`);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error(`[ping-agent] fail @${Date.now()}: ${e?.message || e}`);
      // let systemd restart us if it’s really bad
    }
    const dt = Date.now() - t0;
    const wait = Math.max(0, INTERVAL - dt);
    await new Promise(r => setTimeout(r, wait));
  }
}

main().catch(err => { console.error(err); process.exit(1); });
