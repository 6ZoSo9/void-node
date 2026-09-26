import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { Wallet, JsonRpcProvider, formatEther, parseUnits } from "ethers";

function recordSmallEmptyCatchVisibilityFailure_src_http_participant_wallet_native_v1_ts(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_SMALL_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE", {
    file: "src/http/participant_wallet_native_v1.ts",
    scope,
    message,
  });
}


const G: any = globalThis as any;
const MARK = "__void_participant_wallet_native_v1";
const CANONICAL_VOID_TOKEN_V1 =
  "0x470075b85352eb86f7d089fb9ba88945f12aad94";
const WALLET_MUTATION_ENABLED_V1 = false;
const UNLOCKED = new Map<string, { address: string; privateKey: string; unlockedAt: number }>();

function dataDir(): string {
  return String(process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data");
}
function walletDir(): string {
  return path.join(dataDir(), "participant_wallets_v1");
}
function ensureDir() {
  fs.mkdirSync(walletDir(), { recursive: true });
}
function safeAccount(account: string): string {
  const s = String(account || "").trim();
  if (!s) throw new Error("missing_account");
  return s.replace(/[^a-zA-Z0-9._:-]/g, "_");
}
function walletPath(account: string): string {
  return path.join(walletDir(), safeAccount(account) + ".json");
}
function isAddr(v: any): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(String(v || "").trim());
}
function isLoopbackRequest(req: any): boolean {
  const candidates = [
    req?.ip,
    req?.socket?.remoteAddress,
    req?.connection?.remoteAddress,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  return candidates.some(
    (value) =>
      value === "127.0.0.1" ||
      value === "::1" ||
      value === "::ffff:127.0.0.1" ||
      value === "localhost",
  );
}
function loopbackOnly(req: any, res: any): boolean {
  if (isLoopbackRequest(req)) return true;
  json(res, 404, { ok: false, error: "not_found" });
  return false;
}
function mutationDisabled(res: any): void {
  json(res, 503, {
    ok: false,
    error: "participant_wallet_mutation_disabled",
    mutation_enabled: WALLET_MUTATION_ENABLED_V1,
    legacy_wc_void_route_retired: true,
  });
}
function json(res: any, code: number, obj: any) {
  const body = Buffer.from(JSON.stringify(obj, null, 2));
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(body.length),
    "cache-control": "no-store",
  });
  res.end(body);
}
async function readJson(req: any): Promise<any> {
  try {
    if (req && req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      return req.body;
    }
  } catch (err) { recordSmallEmptyCatchVisibilityFailure_src_http_participant_wallet_native_v1_ts("empty-catch-1", err); }

  const chunks: Buffer[] = [];
  for await (const ch of req) chunks.push(Buffer.isBuffer(ch) ? ch : Buffer.from(ch));
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}
function encryptPrivateKey(privateKey: string, passphrase: string) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(String(passphrase), salt, 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(String(privateKey), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    version: 1,
    kind: "void_participant_wallet",
    cipher: "aes-256-gcm",
    kdf: "scrypt",
    salt: salt.toString("hex"),
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    ciphertext: ct.toString("hex"),
  };
}
function decryptPrivateKey(rec: any, passphrase: string): string {
  const salt = Buffer.from(String(rec.salt || ""), "hex");
  const iv = Buffer.from(String(rec.iv || ""), "hex");
  const tag = Buffer.from(String(rec.tag || ""), "hex");
  const ct = Buffer.from(String(rec.ciphertext || ""), "hex");
  const key = crypto.scryptSync(String(passphrase), salt, 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8").trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(pt)) throw new Error("invalid_private_key");
  return pt;
}
function readRecord(account: string): any | null {
  const p = walletPath(account);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function writeRecord(account: string, rec: any) {
  ensureDir();
  fs.writeFileSync(walletPath(account), JSON.stringify(rec, null, 2));
}
async function statusFor(account: string) {
  const rec = readRecord(account);
  const unlocked = UNLOCKED.get(account) || null;
  const address = rec ? String(rec.address || "") : "";
  let native_gas_wei: string | null = null;
  let native_gas: string | null = null;
  let native_gas_error: string | null = null;

  if (isAddr(address)) {
    try {
      const provider = new JsonRpcProvider("http://127.0.0.1:8545");
      const bal = await provider.getBalance(address);
      native_gas_wei = bal.toString();
      native_gas = formatEther(bal);
    } catch (e: any) {
      native_gas_error = String(e?.message || e || "native_gas_unavailable");
    }
  }

  return {
    ok: true,
    account,
    has_wallet: !!rec,
    address,
    unlocked: !!(unlocked && isAddr(unlocked.address)),
    unlocked_address: unlocked ? String(unlocked.address || "") : "",
    native_gas_wei,
    native_gas,
    native_gas_error,
    native_gas_rpc_url: "http://127.0.0.1:8545",
    created_at: rec ? Number(rec.created_at || 0) : 0,
    exported_at: rec ? Number(rec.exported_at || 0) : 0,
    source: "participant_wallet_native_v1",
    mutation_routes_enabled: WALLET_MUTATION_ENABLED_V1,
    legacy_wc_void_route_retired: true,
    canonical_void_token: CANONICAL_VOID_TOKEN_V1,
  };
}
async function nativeSendVoid(account: string, to: string, amount: string) {
  const unlocked = UNLOCKED.get(account);
  if (!unlocked) throw new Error("wallet_locked");
  if (!isAddr(to)) throw new Error("invalid_recipient_wallet");

  const provider = new JsonRpcProvider("http://127.0.0.1:8545");
  const signer = new Wallet(unlocked.privateKey, provider);

  const voidToken = CANONICAL_VOID_TOKEN_V1;

  let units: bigint;
  try {
    units = parseUnits(amount, 18);
  } catch {
    throw new Error("invalid_amount");
  }
  if (!(units > 0n)) throw new Error("invalid_amount");

  const erc20 = [
    "function transfer(address to, uint256 value) returns (bool)"
  ];
  const token = new Wallet(unlocked.privateKey, provider);
  const iface = (await import("ethers")).Interface;
  const data = new iface(erc20).encodeFunctionData("transfer", [to, units]);

  const txResp = await signer.sendTransaction({
    to: voidToken,
    data,
    value: 0n,
  });
  await txResp.wait();

  return {
    ok: true,
    sent: true,
    mode: "participant_wallet_native_send_void",
    account,
    from: unlocked.address,
    to,
    amount,
    void_token: voidToken,
    tx_hash: String(txResp.hash || ""),
  };
}

function install(app: any) {
  if (!app || typeof app.get !== "function" || typeof app.post !== "function") return false;
  if (G[MARK]) return true;
  G[MARK] = true;

  app.options("/__void/participant/wallet/:rest(*)", (req: any, res: any) => {
    if (!loopbackOnly(req, res)) return;
    res.writeHead(204, {
      "cache-control": "no-store",
    });
    res.end();
  });

  app.get("/__void/participant/wallet/status", async (req: any, res: any) => {
    if (!loopbackOnly(req, res)) return;
    try {
      const account = safeAccount(String(req?.query?.account || "").trim());
      json(res, 200, await statusFor(account));
    } catch (e: any) {
      json(res, 400, { ok: false, error: String(e?.message || e || "status_failed") });
    }
  });

  app.post("/__void/participant/wallet/create", async (req: any, res: any) => {
    if (!loopbackOnly(req, res)) return;
    if (!WALLET_MUTATION_ENABLED_V1) return mutationDisabled(res);
    try {
      const body = await readJson(req);
      const account = safeAccount(body.account);
      const passphrase = String(body.passphrase || "");
      if (passphrase.length < 8) return json(res, 400, { ok: false, error: "passphrase_too_short" });
      const w = Wallet.createRandom();
      const enc = encryptPrivateKey(String(w.privateKey), passphrase);
      writeRecord(account, {
        ...enc,
        address: w.address,
        created_at: Date.now(),
        exported_at: 0,
      });
      UNLOCKED.set(account, { address: w.address, privateKey: String(w.privateKey), unlockedAt: Date.now() });
      json(res, 200, { ok: true, created: true, account, address: w.address, unlocked: true });
    } catch (e: any) {
      json(res, 500, { ok: false, error: String(e?.message || e || "create_failed") });
    }
  });

  app.post("/__void/participant/wallet/import", async (req: any, res: any) => {
    if (!loopbackOnly(req, res)) return;
    if (!WALLET_MUTATION_ENABLED_V1) return mutationDisabled(res);
    try {
      const body = await readJson(req);
      const account = safeAccount(body.account);
      const passphrase = String(body.passphrase || "");
      const privateKey = String(body.private_key || "").trim();
      if (passphrase.length < 8) return json(res, 400, { ok: false, error: "passphrase_too_short" });
      if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) return json(res, 400, { ok: false, error: "invalid_private_key" });
      const w = new Wallet(privateKey);
      const enc = encryptPrivateKey(privateKey, passphrase);
      writeRecord(account, {
        ...enc,
        address: w.address,
        created_at: Date.now(),
        exported_at: 0,
      });
      UNLOCKED.set(account, { address: w.address, privateKey, unlockedAt: Date.now() });
      json(res, 200, { ok: true, imported: true, account, address: w.address, unlocked: true });
    } catch (e: any) {
      json(res, 500, { ok: false, error: String(e?.message || e || "import_failed") });
    }
  });

  app.post("/__void/participant/wallet/unlock", async (req: any, res: any) => {
    if (!loopbackOnly(req, res)) return;
    if (!WALLET_MUTATION_ENABLED_V1) return mutationDisabled(res);
    try {
      const body = await readJson(req);
      const account = safeAccount(body.account);
      const passphrase = String(body.passphrase || "");
      const rec = readRecord(account);
      if (!rec) return json(res, 404, { ok: false, error: "wallet_not_found" });
      const privateKey = decryptPrivateKey(rec, passphrase);
      const w = new Wallet(privateKey);
      UNLOCKED.set(account, { address: w.address, privateKey, unlockedAt: Date.now() });
      json(res, 200, { ok: true, unlocked: true, account, address: w.address });
    } catch (e: any) {
      json(res, 500, { ok: false, error: String(e?.message || e || "unlock_failed") });
    }
  });

  app.post("/__void/participant/wallet/lock", async (req: any, res: any) => {
    if (!loopbackOnly(req, res)) return;
    if (!WALLET_MUTATION_ENABLED_V1) return mutationDisabled(res);
    try {
      const body = await readJson(req);
      const account = safeAccount(body.account);
      UNLOCKED.delete(account);
      json(res, 200, { ok: true, locked: true, account });
    } catch (e: any) {
      json(res, 500, { ok: false, error: String(e?.message || e || "lock_failed") });
    }
  });

  app.get("/__void/participant/wallet/export", (req: any, res: any) => {
    if (!loopbackOnly(req, res)) return;
    if (!WALLET_MUTATION_ENABLED_V1) return mutationDisabled(res);
    try {
      const account = safeAccount(String(req?.query?.account || "").trim());
      const rec = readRecord(account);
      if (!rec) return json(res, 404, { ok: false, error: "wallet_not_found" });
      rec.exported_at = Date.now();
      writeRecord(account, rec);
      json(res, 200, { ok: true, account, keystore: rec });
    } catch (e: any) {
      json(res, 500, { ok: false, error: String(e?.message || e || "export_failed") });
    }
  });

  app.post("/__void/participant/wallet/trade/wc-to-void", (req: any, res: any) => {
    if (!loopbackOnly(req, res)) return;
    json(res, 410, {
      ok: false,
      error: "legacy_wc_void_route_retired",
      production_wc_void_market_active: false,
      fixed_rate_fallback_allowed: false,
      relayer_trade_allowed: false,
    });
  });

  app.post("/__void/participant/wallet/send-void", async (req: any, res: any) => {
    if (!loopbackOnly(req, res)) return;
    if (!WALLET_MUTATION_ENABLED_V1) return mutationDisabled(res);
    try {
      const body = await readJson(req);
      const account = safeAccount(body.account);
      const to = String(body.to || "").trim();
      const amount = String(body.amount || "").trim();
      if (!amount) return json(res, 400, { ok: false, error: "invalid_amount" });
      const out = await nativeSendVoid(account, to, amount);
      json(res, 200, out);
    } catch (e: any) {
      json(res, 500, { ok: false, error: String(e?.message || e || "native_send_void_failed") });
    }
  });

  return true;
}

(function mountParticipantWalletNative() {
  const tryInstall = () => {
    try {
      const app = (globalThis as any).__void_http_app;
      if (!app) return setTimeout(tryInstall, 250);
      install(app);
    } catch {
      setTimeout(tryInstall, 500);
    }
  };
  tryInstall();
})();
