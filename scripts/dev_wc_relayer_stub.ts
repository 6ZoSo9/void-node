/**
 * dev_wc_relayer_stub.ts
 *
 * Dev-only WC relayer stub.
 *
 * - In-memory pending WC per address.
 * - Uses config/void-work-credits-policy.dev.json for simple rates.
 * - Endpoints:
 *   - GET  /wc/pending/:address
 *   - POST /wc/claim/quote
 *
 * This is a sandbox to exercise the WC design without touching mainnet logic.
 */

import express from "express";
import fs from "fs";
import path from "path";

type RoleConfig = {
  wcPerEpoch: number;
};

type RelayerConfig = {
  defaultFeeBps: number;
  suggestedMinClaimWC: number;
  minRelayerClaimWC: number;
};

type WcPolicy = {
  version: string;
  epochLengthSeconds: number;
  roles: Record<string, RoleConfig>;
  relayer: RelayerConfig;
};

type PendingState = {
  pendingWC: number;   // human units (not wei)
  lastUpdate: number;  // unix seconds
};

const app = express();
app.use(express.json());

const PORT = Number(process.env.WC_RELAYER_PORT || "4510");

// Simple in-memory pending WC map
const pending: Map<string, PendingState> = new Map();

// Load policy once at startup (dev)
function loadPolicy(): WcPolicy {
  const cfgPath = path.join(process.cwd(), "config", "void-work-credits-policy.dev.json");
  const raw = fs.readFileSync(cfgPath, "utf8");
  return JSON.parse(raw) as WcPolicy;
}

const policy: WcPolicy = loadPolicy();

// For now, we don't know per-address roles, so default to "full_node" if present,
// otherwise fall back to validator.
function getDefaultRole(): string {
  if (policy.roles["full_node"]) return "full_node";
  if (policy.roles["validator"]) return "validator";
  const keys = Object.keys(policy.roles);
  if (keys.length === 0) {
    throw new Error("WC policy has no roles configured");
  }
  return keys[0];
}

// Accrue WC for an address based on time since lastUpdate.
function accrue(address: string): PendingState {
  const nowSec = Math.floor(Date.now() / 1000);
  let st = pending.get(address);
  if (!st) {
    st = { pendingWC: 0, lastUpdate: nowSec };
    pending.set(address, st);
    return st;
  }

  if (nowSec <= st.lastUpdate) {
    return st;
  }

  const delta = nowSec - st.lastUpdate;
  st.lastUpdate = nowSec;

  const roleKey = getDefaultRole();
  const roleCfg = policy.roles[roleKey];
  const wcPerEpoch = roleCfg.wcPerEpoch;
  const epochSeconds = policy.epochLengthSeconds;

  // naive accrual: linear rate over time
  const ratePerSec = wcPerEpoch / epochSeconds;
  const earned = ratePerSec * delta;

  st.pendingWC += earned;
  return st;
}

// GET /wc/pending/:address
app.get("/wc/pending/:address", (req, res) => {
  const address = String(req.params.address).toLowerCase();

  try {
    const st = accrue(address);
    res.json({
      address,
      pending_wc: st.pendingWC.toFixed(8),
      last_update: st.lastUpdate,
      roleHints: [getDefaultRole()],
      policy: {
        version: policy.version,
        epochLengthSeconds: policy.epochLengthSeconds
      }
    });
  } catch (err: any) {
    console.error("[wc] pending error:", err);
    res.status(500).json({ error: "internal_error", message: String(err?.message || err) });
  }
});

// POST /wc/claim/quote
// Body: { address: string, mode: "self" | "relayer" | "relayer_swap", requested_wc?: string | number | null }
app.post("/wc/claim/quote", (req, res) => {
  const body = req.body || {};
  const address = String(body.address || "").toLowerCase();
  const mode = String(body.mode || "self") as "self" | "relayer" | "relayer_swap";
  const requestedRaw = body.requested_wc;

  if (!address || !address.startsWith("0x") || address.length < 10) {
    return res.status(400).json({ error: "bad_address" });
  }

  if (mode !== "self" && mode !== "relayer" && mode !== "relayer_swap") {
    return res.status(400).json({ error: "bad_mode" });
  }

  try {
    const st = accrue(address);
    const pendingWC = st.pendingWC;

    let requestedWC: number;
    if (requestedRaw === null || requestedRaw === undefined) {
      // Let relayer suggest an amount: use all pending above min, otherwise 0.
      requestedWC = pendingWC;
    } else {
      requestedWC = Number(requestedRaw);
      if (!Number.isFinite(requestedWC) || requestedWC < 0) {
        return res.status(400).json({ error: "bad_requested_wc" });
      }
    }

    // Clamp requested to pending
    if (requestedWC > pendingWC) {
      requestedWC = pendingWC;
    }

    // For relayer modes, enforce minRelayerClaimWC
    const relCfg = policy.relayer;
    let relayerFeeWC = 0;
    let userReceiveWC = requestedWC;
    let expectedVoidOut: number | null = null;

    if (mode === "relayer" || mode === "relayer_swap") {
      if (requestedWC < relCfg.minRelayerClaimWC) {
        return res.status(400).json({
          error: "below_min_relayer_claim",
          minRelayerClaimWC: relCfg.minRelayerClaimWC
        });
      }

      // Simple fee: defaultFeeBps of requestedWC
      relayerFeeWC = (requestedWC * relCfg.defaultFeeBps) / 10_000;
      userReceiveWC = requestedWC - relayerFeeWC;

      if (userReceiveWC < 0) {
        userReceiveWC = 0;
      }

      if (mode === "relayer_swap") {
        // For now, fake a 1 WC -> 0.0035 VOID rate just to exercise the shape.
        // Real implementation will ask LLP/UptimeVault for a quote.
        const rateVoidPerWc = 0.0035;
        expectedVoidOut = userReceiveWC * rateVoidPerWc;
      }
    }

    res.json({
      address,
      mode,
      pending_wc: pendingWC.toFixed(8),
      claim_wc: requestedWC.toFixed(8),
      relayer_fee_wc: relayerFeeWC.toFixed(8),
      user_receive_wc: userReceiveWC.toFixed(8),
      expected_void_out: expectedVoidOut === null ? null : expectedVoidOut.toFixed(8),
      policy: {
        version: policy.version,
        epochLengthSeconds: policy.epochLengthSeconds,
        relayer: {
          defaultFeeBps: relCfg.defaultFeeBps,
          suggestedMinClaimWC: relCfg.suggestedMinClaimWC,
          minRelayerClaimWC: relCfg.minRelayerClaimWC
        }
      }
    });
  } catch (err: any) {
    console.error("[wc] claim/quote error:", err);
    res.status(500).json({ error: "internal_error", message: String(err?.message || err) });
  }
});

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, policyVersion: policy.version });
});

app.listen(PORT, () => {
  console.log(`[wc-relayer-stub] listening on http://127.0.0.1:${PORT}`);
});
