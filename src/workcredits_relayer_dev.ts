import express from "express";
import fs from "fs";
import path from "path";

type ObeliskWcContracts = {
  VoidToken: string;
  WorkCreditsToken: string;
  UptimeVaultLLP: string;
  WorkCreditsRelayerV1: string;
  WorkCreditsRelayerQuoteHelper: string;
};

type ObeliskWcRelayerCfg = {
  baseUrl: string;
  maxSlippageBpsDefault: number;
  timeoutMs: number;
};

type ObeliskWcConfig = {
  network: {
    name: string;
    chainId: number;
    rpcUrl: string;
  };
  contracts: ObeliskWcContracts;
  relayer: ObeliskWcRelayerCfg;
  ui: {
    tabs: Record<string, boolean>;
    defaultGasMode: string;
    showAdvancedIntents: boolean;
  };
};

function loadConfig(): ObeliskWcConfig {
  const explicit = process.env.OBELISK_WC_CONFIG;

  // We assume we run from repo root (void-node)
  const repoRoot = process.cwd();
  const fallback = path.join(repoRoot, "config", "obelisk-workcredits-dev.json");
  const cfgPath = explicit && explicit.length > 0 ? explicit : fallback;

  if (!fs.existsSync(cfgPath)) {
    throw new Error(`[wc-relayer-dev] config not found: ${cfgPath}`);
  }

  const raw = fs.readFileSync(cfgPath, "utf8");
  const parsed = JSON.parse(raw);

  if (!parsed.network || typeof parsed.network.chainId !== "number") {
    throw new Error("[wc-relayer-dev] config.network.chainId missing or invalid");
  }
  if (!parsed.contracts || typeof parsed.contracts.WorkCreditsRelayerV1 !== "string") {
    throw new Error("[wc-relayer-dev] config.contracts.WorkCreditsRelayerV1 missing or invalid");
  }

  return parsed as ObeliskWcConfig;
}

const cfg = loadConfig();

const app = express();
app.use(express.json({ limit: "64kb" }));

app.get("/health", (_req: any, res: any) => {
  res.json({
    ok: true,
    service: "wc-relayer-dev",
    network: cfg.network,
    contracts: cfg.contracts,
    relayer: {
      baseUrl: cfg.relayer.baseUrl,
      maxSlippageBpsDefault: cfg.relayer.maxSlippageBpsDefault,
      timeoutMs: cfg.relayer.timeoutMs,
    },
  });
});

app.post("/api/wc-relayer/v1/quote", (req: any, res: any) => {
  const body = req.body || {};
  const { user, to, data, value, gasLimitHint, maxSlippageBps, intent } = body;

  if (typeof user !== "string" || !user.startsWith("0x")) {
    return res.status(400).json({ code: "BAD_USER", message: "user must be 0x-address" });
  }
  if (typeof to !== "string" || !to.startsWith("0x")) {
    return res.status(400).json({ code: "BAD_TO", message: "to must be 0x-address" });
  }
  if (typeof data !== "string" || !data.startsWith("0x")) {
    return res.status(400).json({ code: "BAD_DATA", message: "data must be 0x-prefixed calldata" });
  }
  if (typeof value !== "string") {
    return res.status(400).json({ code: "BAD_VALUE", message: "value must be decimal string" });
  }

  const baseVoid = "1000000000000000";      // 0.001 VOID (stub)
  const baseWc = "1000000000000000000";     // 1 WC (stub)
  const slippageBps =
    typeof maxSlippageBps === "string" && maxSlippageBps.length > 0
      ? maxSlippageBps
      : String(cfg.relayer.maxSlippageBpsDefault);

  const quoteIdSeed = `${user.toLowerCase()}|${to.toLowerCase()}|${intent || "UNKNOWN"}`;

  res.json({
    ok: true,
    intent: intent || "UNKNOWN",
    params: {
      user,
      to,
      value,
      gasLimitHint: gasLimitHint || null,
      maxSlippageBps: slippageBps,
    },
    quote: {
      voidNeeded: baseVoid,
      wcFee: baseWc,
    },
    debug: {
      devStub: true,
      quoteIdSeed,
    },
  });
});

app.post("/api/wc-relayer/v1/submit", (req: any, res: any) => {
  const body = req.body || {};
  const { relayedCall, signature } = body;

  if (typeof signature !== "string" || !signature.startsWith("0x")) {
    return res.status(400).json({ code: "BAD_SIGNATURE", message: "signature must be 0x-hex" });
  }
  if (!relayedCall || typeof relayedCall !== "object") {
    return res.status(400).json({ code: "BAD_RELAYED_CALL", message: "relayedCall payload missing" });
  }

  const { user, to, data, value, nonce, maxWCFee, deadline } = relayedCall;

  if (typeof user !== "string" || !user.startsWith("0x")) {
    return res.status(400).json({ code: "BAD_RELAYED_CALL_USER", message: "relayedCall.user must be 0x-address" });
  }
  if (typeof to !== "string" || !to.startsWith("0x")) {
    return res.status(400).json({ code: "BAD_RELAYED_CALL_TO", message: "relayedCall.to must be 0x-address" });
  }
  if (typeof data !== "string" || !data.startsWith("0x")) {
    return res.status(400).json({ code: "BAD_RELAYED_CALL_DATA", message: "relayedCall.data must be 0x calldata" });
  }
  if (typeof value !== "string") {
    return res.status(400).json({ code: "BAD_RELAYED_CALL_VALUE", message: "relayedCall.value must be decimal string" });
  }
  if (typeof nonce !== "string") {
    return res.status(400).json({ code: "BAD_RELAYED_CALL_NONCE", message: "relayedCall.nonce must be decimal string" });
  }
  if (typeof maxWCFee !== "string") {
    return res.status(400).json({ code: "BAD_RELAYED_CALL_MAXWCFEE", message: "relayedCall.maxWCFee must be decimal string" });
  }
  if (typeof deadline !== "string") {
    return res.status(400).json({ code: "BAD_RELAYED_CALL_DEADLINE", message: "relayedCall.deadline must be decimal string" });
  }

  const fakeTxHash = "0x" + "wc".padEnd(8, "0") + Date.now().toString(16).padStart(56, "0");

  res.json({
    ok: true,
    mode: "DEV_STUB",
    tx: {
      hash: fakeTxHash,
      status: "SIMULATED",
    },
    relayedCall,
    signature,
  });
});

const port = Number(process.env.PORT || "4311");
app.listen(port, () => {
  console.log(
    `[wc-relayer-dev] listening on http://127.0.0.1:${port} (network=${cfg.network.name}, chainId=${cfg.network.chainId})`,
  );
});
