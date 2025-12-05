import { Wallet } from "ethers";
import {
  loadWorkCreditsConfig,
  createDummyRelayedCall,
  signRelayedCall,
  submitRelayedCall,
  WorkCreditsConfig,
} from "./workcredits_relayer_client.ts";

type QuoteRequest = {
  user: string;
  to: string;
  data: string;
  value: string;
  intent: string;
  gasLimitHint?: string | null;
  maxSlippageBps?: string | number | null;
};

type QuoteResponse = {
  ok: boolean;
  intent: string;
  params: {
    user: string;
    to: string;
    value: string;
    gasLimitHint: string | null;
    maxSlippageBps: string;
  };
  quote: {
    voidNeeded: string;
    wcFee: string;
  };
  debug?: any;
};

function requireEnvPrivateKey(): string {
  const pk = process.env.WC_RELAYER_DEMO_PK ?? "";
  if (!/^0x[0-9a-fA-F]{64}$/.test(pk.trim())) {
    console.error(
      "WC_RELAYER_DEMO_PK must be a 32-byte hex private key (0x + 64 hex chars)"
    );
    process.exit(1);
  }
  return pk.trim();
}

async function getQuote(baseUrl: string, req: QuoteRequest): Promise<QuoteResponse> {
  const url = baseUrl.replace(/\/+$/, "") + "/quote";

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`quote HTTP ${res.status} ${res.statusText}: ${text}`);
  }

  return (await res.json()) as QuoteResponse;
}

async function main() {
  const pk = requireEnvPrivateKey();
  console.log("WC_RELAYER_DEMO_PK set (length=%d)", pk.length);

  const cfg: WorkCreditsConfig = await loadWorkCreditsConfig();

  console.log("\n=== [config] obelisk-workcredits-dev.json ===");
  console.log(JSON.stringify(cfg, null, 2));

  const wallet = new Wallet(pk);
  console.log("\n=== [signer] ===");
  console.log(" address:", wallet.address);

  // 1) Call /quote on the dev relayer
  const quoteReq: QuoteRequest = {
    user: wallet.address,
    to: "0x0000000000000000000000000000000000000002",
    data: "0x",
    value: "0",
    intent: "SEND_VOID",
    gasLimitHint: null,
    maxSlippageBps: cfg.relayer.maxSlippageBpsDefault ?? 50,
  };

  console.log("\n=== [quote request] ===");
  console.log(JSON.stringify(quoteReq, null, 2));

  const quote = await getQuote(cfg.relayer.baseUrl, quoteReq);

  console.log("\n=== [quote response] ===");
  console.log(JSON.stringify(quote, null, 2));

  // 2) Build a dummy RelayedCall for this signer
  const call = createDummyRelayedCall(wallet.address);

  // 3) Sign via shared helper
  const signed = await signRelayedCall(pk, call, cfg);

  console.log("\n=== [typed data] domain ===");
  console.log(JSON.stringify(signed.domain, null, 2));

  console.log("\n=== [typed data] message (RelayedCall) ===");
  console.log(JSON.stringify(signed.relayedCall, null, 2));

  console.log("\n=== [digest] ===");
  console.log(signed.digest);

  console.log("\n=== [signature] ===");
  console.log(signed.signature);

  const payload = {
    relayedCall: signed.relayedCall,
    signature: signed.signature,
  };

  console.log("\n=== [/submit payload] ===");
  console.log(JSON.stringify(payload, null, 2));

  const submitUrl = cfg.relayer.baseUrl.replace(/\/+$/, "") + "/submit";
  console.log(`\n=== [POST] ${submitUrl} ===`);

  const res = await submitRelayedCall(cfg, payload);

  console.log("\n=== [submit response] ===");
  console.log(JSON.stringify(res, null, 2));

  console.log("\n=== [done] wc-relayer client smoke ===");
}

main().catch((err) => {
  console.error("[fatal] wc-relayer client smoke failed:", err);
  process.exit(1);
});
