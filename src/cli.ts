// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/cli.ts
/* Minimal CLI for local ops. Designed to be resilient even if some HTTP routes
 * are not present. BASE defaults to http://127.0.0.1:4100
 *
 * Examples:
 *   tsx src/cli.ts health
 *   tsx src/cli.ts head
 *   BASE=http://127.0.0.1:4101 tsx src/cli.ts peers
 *   tsx src/cli.ts once --empty
 *   tsx src/cli.ts start-proposer 5000
 *   tsx src/cli.ts follow-start http://127.0.0.1:4100 1000
 */
const BASE = process.env.BASE || "http://127.0.0.1:4100";

async function jget(path: string) {
  const r = await fetch(new URL(path, BASE));
  const t = await r.text();
  try { return JSON.parse(t); } catch { return t; }
}
async function jpost(path: string, body?: any) {
  const r = await fetch(new URL(path, BASE), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return t; }
}

async function main() {
  const [, , cmd, ...args] = process.argv;

  switch (cmd) {
    case "health": {
      const out = await jget("/health").catch(() => jget("/api/health"));
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    case "head": {
      const out = await jget("/head").catch(() => jget("/api/head"));
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    case "peers": {
      // try richer peers snapshot, else fall back to registry ids, else /metrics
      const try1 = await jget("/peers").catch(() => null);
      if (try1) return void console.log(JSON.stringify(try1, null, 2));
      const try2 = await jget("/peers/registry/ids").catch(() => null);
      if (try2) return void console.log(JSON.stringify(try2, null, 2));
      const try3 = await (await fetch(new URL("/metrics", BASE))).text().catch(() => "");
      console.log(try3 || JSON.stringify({ ok: false, error: "no peers endpoints available" }, null, 2));
      return;
    }
    case "mempool": {
      const out = await jget("/mempool").catch(() => jget("/mempool/count"));
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    case "once": {
      const allowEmpty = args.includes("--empty");
      // Prefer /blocks/once (exposed by index.ts baseline). Fallback to /dev/propose.
      const out = await jpost(`/blocks/once?allowEmpty=${allowEmpty ? 1 : 0}`).catch(
        async () => jpost("/dev/propose", { body: { cli: true, allowEmpty } })
      );
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    case "start-proposer": {
      const ms = Number(args[0] || "5000");
      const out = await jpost(`/proposer/start?intervalMs=${ms}`).catch(() => ({ ok: false, error: "endpoint missing" }));
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    case "follow-start": {
      const peer = String(args[0] || "");
      const intervalMs = Number(args[1] || "1000");
      const out = await jpost(`/follower/start?peer=${encodeURIComponent(peer)}&intervalMs=${intervalMs}`).catch(
        () => ({ ok: false, error: "endpoint missing" })
      );
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    case "index-rebuild": {
      const out = await jpost("/index/rebuild").catch(() => ({ ok: false, error: "endpoint missing" }));
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    case "index-build": {
      const out = await jpost("/index/build").catch(() => ({ ok: false, error: "endpoint missing" }));
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    case "index-gc": {
      const keepLast = Number(args[0] || "1");
      const out = await jpost(`/index/gc?keepLast=${keepLast}`).catch(() => ({ ok: false, error: "endpoint missing" }));
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    case "receipts-stats": {
      const out = await jget("/receipts/stats").catch(() => ({ ok: false, error: "endpoint missing" }));
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    case "receipts-gc": {
      const keepLast = Number(args[0] || "1");
      const out = await jpost(`/receipts/gc?keepLast=${keepLast}`).catch(() => ({ ok: false, error: "endpoint missing" }));
      console.log(JSON.stringify(out, null, 2));
      return;
    }
    case "sync-status": {
      // Try a friendly summary if follower route exists; else give head only
      const head = await jget("/head").catch(() => ({ ok: false }));
      const peers = await jget("/peers").catch(() => null);
      console.log(JSON.stringify({ head, peers }, null, 2));
      return;
    }
    case "metrics": {
      const txt = await (await fetch(new URL("/metrics", BASE))).text().catch(() => "");
      process.stdout.write(txt || "# no metrics\n");
      return;
    }
    default: {
      console.error(
        "Usage: cli <health|head|peers|mempool|once|start-proposer <ms>|follow-start <peer> <ms>|index-rebuild|index-build|index-gc <keep>|receipts-stats|receipts-gc <keep>|sync-status|metrics>"
      );
      process.exit(2);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

