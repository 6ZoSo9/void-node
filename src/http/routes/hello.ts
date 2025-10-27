// Registers a POST /hello route directly on a node:http server.
// Validates a signed handshake with replay+skew protection.
// Signature covers the canonical "nodeId|nonce|ts" string.

import { IncomingMessage, ServerResponse } from "node:http";
import * as url from 'node:url';
import { sha256Utf8, verifyEd25519 } from "../../util/crypto_helpers";

type HelloBody = {
  nodeId: string;      // peer logical id
  nonce: string;       // unique per message
  ts: number;          // unix ms
  pub?: string;        // optional PEM public key (if peer isn't pre-known)
  sig: string;         // base64 Ed25519 signature over canonical string
};

const MAX_SKEW_MS = 5 * 60 * 1000; // 5 minutes

// Simple in-memory nonce cache for replay protection.
const seen = new Map<string, number>(); // key: `${nodeId}:${nonce}` -> ts
const SEEN_TTL_MS = 10 * 60 * 1000;     // keep nonces 10 minutes

function sweepSeen(now: number) {
  for (const [k, t] of seen.entries()) {
    if (now - t > SEEN_TTL_MS) seen.delete(k);
  }
}

function readJson(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function writeJson(res: ServerResponse, status: number, payload: any) {
  try { res.writeHead(status, { "content-type": "application/json" }); } catch {}
  res.end(JSON.stringify(payload));
}

export function registerHelloRoute(server: any, opts?: {
  // If you pre-know peers, you can resolve nodeId -> publicKeyPem here.
  resolvePeerPubKey?: (nodeId: string) => string | undefined;
}) {
  if (!server || typeof server.on !== "function") return;

  server.on("request", async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const u = url.parse(req.url || "", true);
      if (req.method !== "POST" || u.pathname !== "/hello") return;

      const body = (await readJson(req)) as Partial<HelloBody>;

      // Basic shape checks
      if (
        typeof body?.nodeId !== "string" || body.nodeId.length < 3 ||
        typeof body?.nonce !== "string" || body.nonce.length < 8 ||
        typeof body?.ts !== "number"   ||
        typeof body?.sig !== "string"  || body.sig.length < 32
      ) {
        return writeJson(res, 400, { ok:false, error:"bad hello payload" });
      }

      // Skew + replay
      const now = Date.now();
      if (Math.abs(now - body.ts) > MAX_SKEW_MS) {
        return writeJson(res, 400, { ok:false, error:"clock skew too large" });
      }
      const replayKey = `${body.nodeId}:${body.nonce}`;
      if (seen.has(replayKey)) {
        return writeJson(res, 409, { ok:false, error:"replay detected" });
      }

      // Resolve peer public key
      const pub = opts?.resolvePeerPubKey?.(body.nodeId) || body.pub;
      if (typeof pub !== "string" || !/-----BEGIN PUBLIC KEY-----/.test(pub)) {
        return writeJson(res, 400, { ok:false, error:"missing peer public key" });
      }

      // Canonical message
      const canonical = `${body.nodeId}|${body.nonce}|${body.ts}`;

      // (Optional) include a digest for your logs/metrics (not part of signature)
      const digestHex = sha256Utf8(canonical).toString("hex").slice(0, 16);

      // Verify signature
      const ok = verifyEd25519({ message: canonical, signatureB64: body.sig, publicKeyPem: pub });
      if (!ok) {
        return writeJson(res, 401, { ok:false, error:"bad signature" });
      }

      // Mark nonce as seen and sweep old ones
      seen.set(replayKey, now);
      if (seen.size % 128 === 0) sweepSeen(now);

      // Success — return minimal peer view (no secrets)
      return writeJson(res, 200, {
        ok: true,
        peer: { nodeId: body.nodeId },
        digest: digestHex,
        ts: now,
      });
    } catch (e:any) {
      return writeJson(res, 500, { ok:false, error:String(e?.message||e) });
    }
  });
}

