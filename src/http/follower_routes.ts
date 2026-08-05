// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/http/follower_routes.ts
import type { Express } from "express";

function positiveInteger(raw: unknown, fallback: number, minimum: number, maximum: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

function publicFollowerOrigins(): string[] {
  const raw = String(
    process.env.VOID_FOLLOWER_AUTOSTART_PEERS ||
      process.env.VOID_FOLLOWER_AUTOSTART_PEER ||
      "",
  );
  const origins: string[] = [];
  for (const candidate of raw.split(",").map((value) => value.trim()).filter(Boolean)) {
    try {
      const parsed = new URL(candidate);
      if (!["http:", "https:"].includes(parsed.protocol)) continue;
      if (parsed.username || parsed.password || parsed.search || parsed.hash) continue;
      if (parsed.pathname !== "/" && parsed.pathname !== "") continue;
      if (!origins.includes(parsed.origin)) origins.push(parsed.origin);
    } catch {
      console.error("VOID_PUBLIC_BOOTSTRAP_AUTOSTART_REJECTED", {
        reason: "invalid_peer_url",
      });
    }
  }
  return origins;
}

export function registerFollowerRoutes(app: Express, node: any, metrics?: any) {
  const autoPeers = publicFollowerOrigins();
  const steadyIntervalMs = positiveInteger(
    process.env.VOID_FOLLOWER_AUTOSTART_INTERVAL_MS,
    1000,
    500,
    60_000,
  );
  const catchupIntervalMs = positiveInteger(
    process.env.VOID_FOLLOWER_CATCHUP_INTERVAL_MS,
    250,
    50,
    10_000,
  );
  const catchupPullLimit = positiveInteger(
    process.env.VOID_FOLLOWER_CATCHUP_PULL_LIMIT,
    999,
    64,
    999,
  );
  const maximumFailureBackoffMs = positiveInteger(
    process.env.VOID_FOLLOWER_FAILURE_BACKOFF_MAX_MS,
    30_000,
    1000,
    120_000,
  );

  if (autoPeers.length > 0) {
    process.env.VOID_FOLLOWER_PULL_LIMIT = String(catchupPullLimit);

    let peerIndex = 0;
    let consecutiveFailures = 0;
    let running = false;

    const schedule = (delayMs: number) => {
      setTimeout(() => void tick(), delayMs).unref?.();
    };

    const tick = async () => {
      if (running) {
        schedule(steadyIntervalMs);
        return;
      }
      running = true;
      const peer = autoPeers[peerIndex % autoPeers.length];
      let nextDelay = steadyIntervalMs;

      try {
        const result = await node.pullOnce?.(peer);
        if (!result || result.ok === false) {
          throw new Error(String(result?.reason || result?.error || "follower pull failed"));
        }

        if (metrics && result?.imported) metrics.inc?.("follower_imported", result.imported);
        if (metrics && result?.filled) metrics.inc?.("follower_filled", result.filled);

        consecutiveFailures = 0;
        const localHead = Number(result?.advancedHead ?? result?.myHead);
        const remoteHead = Number(result?.theirHead);
        const behind =
          Number.isFinite(localHead) &&
          Number.isFinite(remoteHead) &&
          remoteHead > localHead;
        nextDelay = behind ? catchupIntervalMs : steadyIntervalMs;

        if (behind && (Number(result?.imported) > 0 || Number(result?.filled) > 0)) {
          console.log("VOID_PUBLIC_BOOTSTRAP_CATCHUP_PROGRESS", {
            peer,
            localHead,
            remoteHead,
            imported: Number(result?.imported || 0),
            filled: Number(result?.filled || 0),
            nextDelayMs: nextDelay,
          });
        }
      } catch (error: any) {
        consecutiveFailures += 1;
        peerIndex = (peerIndex + 1) % autoPeers.length;
        nextDelay = Math.min(
          maximumFailureBackoffMs,
          steadyIntervalMs * 2 ** Math.min(consecutiveFailures - 1, 6),
        );
        console.error("VOID_PUBLIC_BOOTSTRAP_PEER_FAILOVER", {
          failedPeer: peer,
          nextPeer: autoPeers[peerIndex],
          consecutiveFailures,
          retryInMs: nextDelay,
          message: String(error?.message || error),
        });
      } finally {
        running = false;
        schedule(nextDelay);
      }
    };

    setTimeout(() => void tick(), 750).unref?.();
    console.log("VOID_PUBLIC_BOOTSTRAP_AUTOSTART_ACTIVE", {
      peers: autoPeers,
      steadyIntervalMs,
      catchupIntervalMs,
      catchupPullLimit,
      failoverEnabled: autoPeers.length > 1,
    });
  }

  // One-shot pull
  app.post("/follower/once", async (req, res) => {
    const peer = String(req.query.peer || req.body?.peer || "http://localhost:4100");
    try {
      const r = await node.pullOnce?.(peer);
      if (metrics && r?.imported) metrics.inc?.("follower_imported", r.imported);
      if (metrics && r?.filled) metrics.inc?.("follower_filled", r.filled);
      res.json(r ?? { ok: false, error: "no pullOnce()" });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  // Continuous follow loop
  app.post("/follower/start", (req, res) => {
    const peer = String(req.query.peer || req.body?.peer || "http://localhost:4100");
    const intervalMs = Number(req.query.intervalMs || req.body?.intervalMs || 2000);
    try {
      const r = node.startFollower?.(peer, intervalMs);
      return res.json(r ?? { ok: false, error: "no startFollower()" });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  // Info
  app.get("/follower/peers", (_req, res) => {
    try { res.json({ ok: true, ...(node.peersSnapshot?.() ?? {}) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: String(e?.message || e) }); }
  });
}

