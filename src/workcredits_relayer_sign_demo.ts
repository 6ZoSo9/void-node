import { readFile } from "node:fs/promises";
import path from "node:path";
import { Wallet, TypedDataEncoder } from "ethers";

type ObeliskWcConfig = {
  network: {
    name: string;
    chainId: number;
    rpcUrl: string;
  };
  contracts: {
    VoidToken: string;
    WorkCreditsToken: string;
    UptimeVaultLLP: string;
    WorkCreditsRelayerV1: string;
    WorkCreditsRelayerQuoteHelper: string;
  };
  relayer: {
    baseUrl: string;
    maxSlippageBpsDefault: number;
    timeoutMs: number;
  };
};

type RelayedCall = {
  user: string;
  to: string;
  data: string;
  value: bigint;
  nonce: bigint;
  maxWCFee: bigint;
  deadline: bigint;
};

function getEnvPk(): string {
  const pk = process.env.WC_RELAYER_DEMO_PK;
  if (!pk || !/^0x[0-9a-fA-F]{64}$/.test(pk)) {
    throw new Error(
      "WC_RELAYER_DEMO_PK must be a 32-byte hex private key (0x + 64 hex chars)"
    );
  }
  return pk;
}

async function loadConfig(): Promise<ObeliskWcConfig> {
  const cfgPath = path.join(process.cwd(), "config", "obelisk-workcredits-dev.json");
  const raw = await readFile(cfgPath, "utf8");
  return JSON.parse(raw) as ObeliskWcConfig;
}

function isStubAddress(addr: string | undefined): boolean {
  if (!addr) return true;
  if (addr === "0x...") return true;
  if (/^0x0{40}$/i.test(addr)) return true;
  return false;
}

function buildRelayedCall(user: string): RelayedCall {
  // Demo payload – in real Obelisk we’ll fill this from an actual user action.
  return {
    user,
    to: "0x0000000000000000000000000000000000000002",
    data: "0x",
    value: 0n,
    nonce: 0n,
    maxWCFee: 1000000000000000000n, // 1 WC (assuming 18 decimals)
    deadline: 2000000000n, // far in the future
  };
}

function buildDomain(chainId: number, verifyingContract: string) {
  return {
    name: "VoidWorkCreditsRelayer",
    version: "1",
    chainId,
    verifyingContract,
  };
}

const relayedCallTypes = {
  RelayedCall: [
    { name: "user", type: "address" },
    { name: "to", type: "address" },
    { name: "data", type: "bytes" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "maxWCFee", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

function serializeRelayedCall(c: RelayedCall) {
  return {
    user: c.user,
    to: c.to,
    data: c.data,
    value: c.value.toString(),
    nonce: c.nonce.toString(),
    maxWCFee: c.maxWCFee.toString(),
    deadline: c.deadline.toString(),
  };
}

async function main() {
  try {
    const pk = getEnvPk();
    const cfg = await loadConfig();

    const relayerAddr = cfg.contracts?.WorkCreditsRelayerV1;
    const chainId = cfg.network?.chainId ?? 2050;

    const devConfig = isStubAddress(relayerAddr);
    const verifyingContract = devConfig
      ? "0x0000000000000000000000000000000000000000"
      : relayerAddr!;

    if (devConfig) {
      console.warn(
        "[warn] WorkCreditsRelayerV1 address in config looks like a stub (0x... or zero)."
      );
      console.warn(
        "[warn] Proceeding in DEV_CONFIG mode. Signatures are ONLY for local testing."
      );
      console.warn(
        "[warn] Once you deploy a real WorkCreditsRelayerV1, update config/obelisk-workcredits-dev.json."
      );
    }

    console.log("=== [config] obelisk-workcredits-dev.json ===");
    console.log(JSON.stringify(cfg, null, 2));

    const wallet = new Wallet(pk);
    console.log();
    console.log("=== [signer] ===");
    console.log(" address:", wallet.address);

    const relayedCall = buildRelayedCall(wallet.address);

    const domain = buildDomain(chainId, verifyingContract);
    const types = relayedCallTypes;

    console.log();
    console.log("=== [typed data] domain ===");
    console.log(JSON.stringify(domain, null, 2));

    console.log();
    console.log("=== [typed data] message (RelayedCall) ===");
    console.log(JSON.stringify(serializeRelayedCall(relayedCall), null, 2));

    const digest = TypedDataEncoder.hash(domain as any, types as any, {
      user: relayedCall.user,
      to: relayedCall.to,
      data: relayedCall.data,
      value: relayedCall.value,
      nonce: relayedCall.nonce,
      maxWCFee: relayedCall.maxWCFee,
      deadline: relayedCall.deadline,
    });

    console.log();
    console.log("=== [digest] ===");
    console.log(digest);

    const signature = await wallet.signTypedData(
      domain as any,
      types as any,
      {
        user: relayedCall.user,
        to: relayedCall.to,
        data: relayedCall.data,
        value: relayedCall.value,
        nonce: relayedCall.nonce,
        maxWCFee: relayedCall.maxWCFee,
        deadline: relayedCall.deadline,
      } as any
    );

    console.log();
    console.log("=== [signature] ===");
    console.log(signature);

    const submitPayload = {
      relayedCall: serializeRelayedCall(relayedCall),
      signature,
    };

    console.log();
    console.log("=== [/submit payload] ===");
    console.log(JSON.stringify(submitPayload, null, 2));

    const baseUrl = cfg.relayer?.baseUrl;
    if (!baseUrl) {
      console.warn(
        "[warn] relayer.baseUrl is missing in config; skipping HTTP /submit call."
      );
      return;
    }

    const url = baseUrl.replace(/\/+$/, "") + "/submit";
    console.log();
    console.log("=== [POST] " + url + " ===");

    const fetchFn: any = (globalThis as any).fetch;
    if (!fetchFn) {
      console.warn(
        "[warn] global fetch not available in this Node runtime; skipping HTTP call."
      );
      return;
    }

    const resp = await fetchFn(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(submitPayload),
    });

    const text = await resp.text();
    console.log("[status]", resp.status);
    try {
      const json = JSON.parse(text);
      console.log(JSON.stringify(json, null, 2));
    } catch {
      console.log(text);
    }

    console.log();
    console.log("=== [done] wc-relayer sign demo ===");
  } catch (err: any) {
    console.error(String(err?.message ?? err));
    process.exit(1);
  }
}

main();
