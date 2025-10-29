// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/diag-identify.ts
/* Prints local environment info + probes common endpoints for quick diagnostics. */
import * as os from "node:os";

const BASE = process.env.BASE || "http://127.0.0.1:4100";

async function safeJson(url: string) {
  try {
    const r = await fetch(url);
    const t = await r.text();
    try { return JSON.parse(t); } catch { return { text: t }; }
  } catch (e: any) {
    return { error: String(e?.message || e) };
  }
}

async function main() {
  const info = {
    node: process.version,
    platform: `${os.platform()} ${os.release()} ${os.arch()}`,
    base: BASE,
  };

  const health = await safeJson(new URL("/health", BASE).toString());
  const head = await safeJson(new URL("/head", BASE).toString());
  const metrics = await (await fetch(new URL("/metrics", BASE)).catch(() => null))?.text().catch(() => "");
  const peers = await safeJson(new URL("/peers", BASE).toString());

  console.log(JSON.stringify({ info, health, head, peers, metrics: metrics?.split("\n").slice(0, 10) }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

