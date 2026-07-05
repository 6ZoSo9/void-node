#!/usr/bin/env node
import http from "node:http";
import https from "node:https";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const diagnoseOnly = args.includes("--diagnose-only");
const raw = args.find((arg) => arg !== "--diagnose-only");
const networkHint = process.env.VOID_NETWORK_HINT || "operator-specified";

function usage(exitCode = 2) {
  console.error("Usage: npm run datanet:pull -- [--diagnose-only] http://HOST:PORT/path");
  console.error("Do not paste the placeholder. Replace it with a real Precision/public-node URL.");
  process.exit(exitCode);
}

if (!raw || raw.includes("<") || raw.includes(">")) {
  usage(2);
}

let url;
try {
  url = new URL(raw);
} catch {
  console.error(`Invalid URL: ${raw}`);
  process.exit(2);
}

if (!["http:", "https:"].includes(url.protocol)) {
  console.error(`Unsupported protocol: ${url.protocol}`);
  process.exit(2);
}

function classifyHost(host) {
  const h = String(host || "").toLowerCase();

  if (h === "localhost" || h === "::1" || h.startsWith("127.")) {
    return {
      target_class: "loopback",
      private_or_local: true,
      hint: "Loopback targets only work from the same machine.",
    };
  }

  if (h.endsWith(".local")) {
    return {
      target_class: "local_mdns",
      private_or_local: true,
      hint: ".local/mDNS targets usually only work on the same LAN.",
    };
  }

  const ipv4 = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const o1 = Number(ipv4[1]);
    const o2 = Number(ipv4[2]);

    if (o1 === 100 && o2 >= 64 && o2 <= 127) {
      const tailscaleHint = /tailscale|tailnet/i.test(networkHint);
      return {
        target_class: tailscaleHint ? "tailscale_tailnet" : "cgnat_or_tailnet",
        private_or_local: true,
        hint: tailscaleHint
          ? "100.64.0.0/10 is being treated as Tailscale/tailnet space because network_hint includes tailscale."
          : "100.64.0.0/10 is CGNAT space, commonly used by Tailscale tailnets; it is not normal public internet.",
      };
    }
  }

  if (h.startsWith("10.")) {
    return {
      target_class: "private_lan",
      private_or_local: true,
      hint: "10.x.x.x is private LAN/VPN address space.",
    };
  }

  if (h.startsWith("192.168.")) {
    return {
      target_class: "private_lan",
      private_or_local: true,
      hint: "192.168.x.x is private LAN address space.",
    };
  }

  const m172 = h.match(/^172\.(\d+)\./);
  if (m172) {
    const n = Number(m172[1]);
    if (n >= 16 && n <= 31) {
      return {
        target_class: "private_lan",
        private_or_local: true,
        hint: "172.16.x.x through 172.31.x.x is private LAN/VPN address space.",
      };
    }
  }

  if (h.startsWith("fc") || h.startsWith("fd")) {
    return {
      target_class: "private_ipv6",
      private_or_local: true,
      hint: "fc00::/7 and fd00::/8 are private IPv6 address ranges.",
    };
  }

  return {
    target_class: "public_or_dns",
    private_or_local: false,
    hint: "Target looks public/DNS-routable, assuming firewall/DNS are correct.",
  };
}

function classifyFailure(result, targetInfo) {
  const cellLike = /cell|hotspot|mobile/i.test(networkHint);

  if (!result.ok && cellLike && targetInfo.target_class === "private_lan") {
    return {
      reason: "private_lan_target_unreachable_from_cellphone_data",
      next_action: "Use a public IP with router port-forwarding, a tunnel URL, VPN, or a relay. Do not use 192.168.x.x from cellphone data.",
    };
  }

  const code = result.code || "";
  const err = result.error || "";

  if (/ENOTFOUND/i.test(code) || /ENOTFOUND/i.test(err)) {
    return { reason: "dns_not_found", next_action: "Check the domain name or DNS route." };
  }

  if (/ECONNREFUSED/i.test(code) || /ECONNREFUSED/i.test(err)) {
    return { reason: "connection_refused", next_action: "Host was reached but no service accepted the connection on that port." };
  }

  if (/ETIMEDOUT|timeout/i.test(code) || /timeout/i.test(err)) {
    return { reason: "network_timeout", next_action: "Check firewall, router forwarding, tunnel health, service bind address, and target reachability." };
  }

  if (/EHOSTUNREACH|ENETUNREACH/i.test(code) || /unreachable/i.test(err)) {
    return { reason: "network_unreachable", next_action: "Target network is not routable from this machine." };
  }

  if (result.status && (result.status < 200 || result.status >= 300)) {
    return { reason: `http_status_${result.status}`, next_action: "HTTP responded but not with a 2xx success code." };
  }

  if (!result.ok) {
    return { reason: "pull_failed_unknown_network_error", next_action: "Inspect receipt error/status and retry with a known public URL." };
  }

  return { reason: "ok", next_action: "No action needed." };
}

const targetInfo = classifyHost(url.hostname);

console.log(`target_host=${url.hostname}`);
console.log(`target_class=${targetInfo.target_class}`);
console.log(`network_hint=${networkHint}`);
console.log(`diagnostic_hint=${targetInfo.hint}`);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = join(".void-field-trial", diagnoseOnly ? "datanet-pull-diagnostic" : "datanet-pull", stamp);
mkdirSync(dir, { recursive: true });

if (diagnoseOnly) {
  const diagnostic = {
    marker: "VOID_DATANET_PULL_DIAGNOSTIC_V1_READY",
    created_at: new Date().toISOString(),
    host: hostname(),
    network_hint: networkHint,
    url: raw,
    target_host: url.hostname,
    target_class: targetInfo.target_class,
    private_or_local: targetInfo.private_or_local,
    diagnostic_hint: targetInfo.hint,
    dangerous_paths_touched: false,
  };

  const receiptPath = join(dir, "receipt.json");
  writeFileSync(receiptPath, JSON.stringify(diagnostic, null, 2) + "\n");

  console.log("VOID_DATANET_PULL_DIAGNOSTIC_V1_READY");
  console.log(`receipt=${receiptPath}`);
  process.exit(0);
}

const client = url.protocol === "https:" ? https : http;
const timeoutMs = Number(process.env.VOID_PULL_TIMEOUT_MS || "10000");

const result = await new Promise((resolve) => {
  const req = client.get(url, { timeout: timeoutMs }, (res) => {
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    res.on("end", () => {
      const body = Buffer.concat(chunks);
      resolve({
        ok: res.statusCode >= 200 && res.statusCode < 300,
        status: res.statusCode,
        headers: res.headers,
        body,
      });
    });
  });

  req.on("timeout", () => {
    req.destroy(Object.assign(new Error(`timeout after ${timeoutMs}ms`), { code: "ETIMEDOUT" }));
  });

  req.on("error", (err) => {
    resolve({
      ok: false,
      code: err.code || null,
      error: err.message,
      body: Buffer.alloc(0),
    });
  });
});

const bodyPath = join(dir, "pulled.bin");
writeFileSync(bodyPath, result.body || Buffer.alloc(0));

const sha256 = createHash("sha256").update(result.body || Buffer.alloc(0)).digest("hex");
const failure = classifyFailure(result, targetInfo);

const receipt = {
  marker: result.ok ? "VOID_DATANET_PULL_V1_GREEN" : "VOID_DATANET_PULL_V1_FAIL",
  created_at: new Date().toISOString(),
  host: hostname(),
  network_hint: networkHint,
  url: raw,
  target_host: url.hostname,
  target_class: targetInfo.target_class,
  private_or_local: targetInfo.private_or_local,
  diagnostic_hint: targetInfo.hint,
  ok: result.ok,
  status: result.status || null,
  code: result.code || null,
  error: result.error || null,
  reason: failure.reason,
  next_action: failure.next_action,
  bytes: result.body?.length || 0,
  sha256,
  body_path: bodyPath,
  dangerous_paths_touched: false,
};

const receiptPath = join(dir, "receipt.json");
writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n");

console.log(receipt.marker);
console.log(`url=${raw}`);
console.log(`ok=${receipt.ok}`);
console.log(`status=${receipt.status}`);
console.log(`code=${receipt.code}`);
console.log(`reason=${receipt.reason}`);
console.log(`next_action=${receipt.next_action}`);
console.log(`bytes=${receipt.bytes}`);
console.log(`sha256=${sha256}`);
console.log(`receipt=${receiptPath}`);

process.exit(result.ok ? 0 : 1);
