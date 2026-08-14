import crypto from "node:crypto";
import * as http from "node:http";
import {
  Interface,
  Transaction,
  getAddress,
} from "ethers";
import {
  createBuyVoidNativeChain2050BroadcasterV1,
  type BuyVoidNativeChain2050JsonRpcCallResultV1,
  type BuyVoidNativeChain2050JsonRpcCallV1,
  type BuyVoidNativeChain2050JsonRpcTransportV1,
} from "./buy_void_native_chain2050_broadcaster_v1.js";
import type {
  BuyVoidDeliveryBroadcasterV1,
  BuyVoidDeliveryBroadcastResultV1,
} from "./buy_void_delivery_sign_broadcast_adapter_v1.js";

export const VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_V1 =
  "VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_V1";

export const VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_AUTHORITY_V1 = {
  source_only_contract: true,
  canonical_chain_id: "2050",
  canonical_asset: "void_token_erc20",
  exact_transfer_calldata_required: true,
  transaction_value_wei: "0",
  loopback_http_only: true,
  socket_inactivity_timeout: true,
  total_wall_clock_deadline: true,
  bounded_response_bytes: true,
  existing_chain2050_broadcaster_core_reused: true,
  factory_rpc_probe: false,
  chain_identity_probe_when_broadcast_called: true,
  per_broadcast_chain_identity_probe: true,
  credential_access: false,
  wallet_access: false,
  transaction_signing: false,
  runtime_route_mount: false,
  background_loop: false,
  automatic_retry: false,
  transaction_broadcast_when_broadcaster_called: true,
  money_movement_when_broadcaster_called: true,
} as const;

export type BuyVoidErc20Chain2050BroadcasterPolicyV1 = {
  rpc_url: string;
  void_token_address: string;
  request_timeout_ms?: string | number;
  max_response_bytes?: string | number;
};

export type BuyVoidErc20Chain2050BroadcasterReadyV1 = {
  ok: true;
  status: "ready";
  marker: typeof VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_V1;
  version: 1;
  chain_id: "2050";
  void_token_address: string;
  rpc_url_fingerprint_sha256: string;
  broadcaster: BuyVoidDeliveryBroadcasterV1;
  factory_rpc_probe_performed: false;
  transaction_broadcast_performed_by_factory: false;
  money_movement_performed_by_factory: false;
  authority: typeof VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_AUTHORITY_V1;
};

export type BuyVoidErc20Chain2050BroadcasterHeldV1 = {
  ok: false;
  status: "held";
  marker: typeof VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_V1;
  version: 1;
  reason: string;
  void_token_address: string | null;
  rpc_url_fingerprint_sha256: string | null;
  factory_rpc_probe_performed: boolean;
  transaction_broadcast_performed_by_factory: false;
  money_movement_performed_by_factory: false;
  authority: typeof VOID_BUY_VOID_ERC20_CHAIN2050_BROADCASTER_AUTHORITY_V1;
};

export type BuyVoidErc20Chain2050BroadcasterDecisionV1 =
  | BuyVoidErc20Chain2050BroadcasterReadyV1
  | BuyVoidErc20Chain2050BroadcasterHeldV1;

const TRANSFER_INTERFACE = new Interface([
  "function transfer(address to, uint256 value) returns (bool)",
]);
const RAW = /^0x(?:[0-9a-fA-F]{2})+$/;
const MAX_RAW_BYTES = 256 * 1024;
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 65_536;
const MAX_RESPONSE_BYTES = 1_048_576;
const MAX_REQUEST_BYTES = 600_000;

type NormalizedRpcV1 = {
  rpc_url: string;
  hostname: "127.0.0.1" | "::1";
  port: number;
  path: string;
  request_timeout_ms: number;
  max_response_bytes: number;
  rpc_url_fingerprint_sha256: string;
};

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeAddress(value: unknown): string {
  const raw = String(value || "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return "";
  try {
    return getAddress(raw).toLowerCase();
  } catch {
    return "";
  }
}

function positiveBounded(
  value: unknown,
  fallback: number,
  maximum: number,
): number | null {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum
    ? parsed
    : null;
}

function normalizeRpc(
  rpcUrl: unknown,
  requestTimeoutMs: unknown,
  maxResponseBytes: unknown,
): NormalizedRpcV1 | null {
  let url: URL;
  try {
    url = new URL(String(rpcUrl || "").trim());
  } catch {
    return null;
  }
  const host = url.hostname
    .trim()
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "");
  const hostname =
    host === "127.0.0.1" ? "127.0.0.1" :
    host === "::1" ? "::1" :
    null;
  const port = Number(url.port || 0);
  const timeout = positiveBounded(
    requestTimeoutMs,
    DEFAULT_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
  );
  const maxBytes = positiveBounded(
    maxResponseBytes,
    DEFAULT_MAX_RESPONSE_BYTES,
    MAX_RESPONSE_BYTES,
  );
  if (
    url.protocol !== "http:" ||
    !hostname ||
    !Number.isInteger(port) ||
    port <= 0 ||
    port > 65_535 ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.startsWith("/") ||
    url.pathname.length > 256 ||
    timeout === null ||
    maxBytes === null
  ) {
    return null;
  }
  const renderedHost = hostname === "::1" ? "[::1]" : hostname;
  const normalizedUrl = `http://${renderedHost}:${port}${url.pathname}`;
  return {
    rpc_url: normalizedUrl,
    hostname,
    port,
    path: url.pathname,
    request_timeout_ms: timeout,
    max_response_bytes: maxBytes,
    rpc_url_fingerprint_sha256: sha256(normalizedUrl),
  };
}

function providerId(requestId: number, suffix: string): string {
  return `erc20-chain2050:${requestId}:${suffix}`
    .replace(/[^A-Za-z0-9._:@/-]/g, "_")
    .slice(0, 200);
}

function transportHeld(
  input: Readonly<BuyVoidNativeChain2050JsonRpcCallV1>,
  errorCode: string,
  options: {
    request_sent?: boolean;
    response_received?: boolean;
    http_status?: number | null;
    json_rpc_error_code?: string;
    suffix?: string;
  } = {},
): BuyVoidNativeChain2050JsonRpcCallResultV1 {
  return {
    ok: false,
    request_sent: options.request_sent === true,
    response_received: options.response_received === true,
    http_status: options.http_status ?? null,
    request_id: input.request_id,
    error_code: errorCode
      .replace(/[^A-Za-z0-9._:-]/g, "_")
      .slice(0, 160),
    json_rpc_error_code: String(options.json_rpc_error_code || "")
      .replace(/[^0-9-]/g, "")
      .slice(0, 12),
    provider_submission_id: providerId(
      input.request_id,
      options.suffix || "held",
    ),
  };
}

export function createBuyVoidErc20Chain2050TotalDeadlineHttpTransportV1():
  BuyVoidNativeChain2050JsonRpcTransportV1 {
  return {
    async call(input) {
      if (
        !input ||
        !["eth_chainId", "eth_sendRawTransaction"].includes(input.method) ||
        !Number.isSafeInteger(input.request_id) ||
        input.request_id <= 0
      ) {
        return transportHeld(
          input,
          "erc20_chain2050_transport_input_invalid",
        );
      }

      const rpc = normalizeRpc(
        input.rpc_url,
        input.request_timeout_ms,
        input.max_response_bytes,
      );
      if (!rpc) {
        return transportHeld(
          input,
          "erc20_chain2050_transport_rpc_policy_invalid",
        );
      }

      const body = JSON.stringify({
        jsonrpc: "2.0",
        id: input.request_id,
        method: input.method,
        params: input.params,
      });
      if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) {
        return transportHeld(
          input,
        ²È="25…±°¡Á…å±½…°€‰É•ÍÕ±Ðˆ¤¤ì(€€€€€€€€€€€€€€€€€™¥¹¥Í  (€€€€€€€€€€€€€€€€€€€ÑÉ…¹ÍÁ½ÉÑ!•± (€€€€€€€€€€€€€€€€€€€€€¥¹ÁÕÐ°(€€€€€€€€€€€€€€€€€€€€€€‰•ÉŒÈÁ}¡…¥¸ÈÀÔÁ}ÑÉ…¹ÍÁ½ÉÑ}ÉÁ}É•ÍÕ±Ñ}µ¥ÍÍ¥¹œˆ°(€€€€€€€€€€€€€€€€€€€€€ì(€€€€€€€€€€€€€€€€€€€€€€€É•ÅÕ•ÍÑ}Í•¹ÐèÉ•ÅÕ•ÍÑM•¹Ð°(€€€€€€€€€€€€€€€€€€€€€€€É•ÍÁ½¹Í•}É••¥Ù•èÑÉÕ”°(€€€€€€€€€€€€€€€€€€€€€€€¡ÑÑÁ}ÍÑ…ÑÕÌè€ÈÀÀ°(€€€€€€€€€€€€€€€€€€€€€€€ÍÕ™™¥àè€‰É•ÍÕ±Ðµµ¥ÍÍ¥¹œˆ°(€€€€€€€€€€€€€€€€€€€€€ô°(€€€€€€€€€€€€€€€€€€€€¤°(€€€€€€€€€€€€€€€€€€¤ì(€€€€€€€€€€€€€€€€€É•ÑÕÉ¸ì(€€€€€€€€€€€€€€€ô(€€€€€€€€€€€€€€€™¥¹¥Í ¡ì(€€€€€€€€€€€€€€€€€½¬èÑÉÕ”°(€€€€€€€€€€€€€€€€€É•ÅÕ•ÍÑ}Í•¹ÐèÑÉÕ”°(€€€€€€€€€€€€€€€€€É•ÍÁ½¹Í•}É••¥Ù•èÑÉÕ”°(€€€€€€€€€€€€€€€€€¡ÑÑÁ}ÍÑ…ÑÕÌè€ÈÀÀ°(€€€€€€€€€€€€€€€€€É•ÅÕ•ÍÑ}¥è¥¹ÁÕÐ¹É•ÅÕ•ÍÑ}¥°(€€€€€€€€€€€€€€€€€É•ÍÕ±ÐèÁ…å±½…¹É•ÍÕ±Ð°(€€€€€€€€€€€€€€€€€ÁÉ½Ù¥‘•É}ÍÕ‰µ¥ÍÍ¥½¹}¥èÁÉ½Ù¥‘•É% (€€€€€€€€€€€€€€€€€€€¥¹ÁÕÐ¹É•ÅÕ•ÍÑ}¥°(€€€€€€€€€€€€€€€€€€€€‰É•ÍÕ±Ðˆ°(€€€€€€€€€€€€€€€€€€¤°(€€€€€€€€€€€€€€€ô¤ì(€€€€€€€€€€€€€ô¤ì(€€€€€€€€€€€ô°(€€€€€€€€€€¤ì((€€€€€€€€€É•ÅÕ•ÍÐ¹½¸ ‰™¥¹¥Í ˆ°€ ¤€ôøì(€€€€€€€€€€€É•ÅÕ•ÍÑM•¹Ð€ôÑÉÕ”ì(€€€€€€€€€ô¤ì(€€€€€€€€€É•ÅÕ•ÍÐ¹½¸ ‰•ÉÉ½Èˆ°€ ¤€ôøì(€€€€€€€€€€€™¥¹¥Í  (€€€€€€€€€€€€€ÑÉ…¹ÍÁ½ÉÑ!•± (€€€€€€€€€€€€€€€¥¹ÁÕÐ°(€€€€€€€€€€€€€€€Ñ½Ñ…±•…‘±¥¹•áÁ¥É•(€€€€€€€€€€€€€€€€€€ü€‰•ÉŒÈÁ}¡…¥¸ÈÀÔÁ}ÑÉ…¹ÍÁ½ÉÑ}Ñ½Ñ…±}‘•…‘±¥¹•}•á••‘•ˆ(€€€€€€€€€€€€€€€€€€èÉ•ÍÁ½¹Í•Q½½1…É”(€€€€€€€€€€€€€€€€€€€€ü€‰•ÉŒÈÁ}¡…¥¸ÈÀÔÁ}ÑÉ…¹ÍÁ½ÉÑ}É•ÍÁ½¹Í•}Ñ½½}±…É”ˆ(€€€€€€€€€€€€€€€€€€€€è€‰•ÉŒÈÁ}¡…¥¸ÈÀÔÁ}ÑÉ…¹ÍÁ½ÉÑ}É•ÅÕ•ÍÑ}•ÉÉ½Èˆ°(€€€€€€€€€€€€€€€ì(€€€€€€€€€€€€€€€€€É•ÅÕ•ÍÑ}Í•¹ÐèÉ•ÅÕ•ÍÑM•¹Ð°(€€€€€€€€€€€€€€€€€É•ÍÁ½¹Í•}É••¥Ù•è™…±Í”°(€€€€€€€€€€€€€€€€€ÍÕ™™¥àèÑ½Ñ…±•…‘±¥¹•áÁ¥É•(€€€€€€€€€€€€€€€€€€€€ü€‰Ñ½Ñ…°µ‘•…‘±¥¹”ˆ(€€€€€€€€€€€€€€€€€€€€èÉ•ÍÁ½¹Í•Q½½1…É”(€€€€€€€€€€€€€€€€€€€€€€ü€‰É•ÍÁ½¹Í”µÑ½¼µ±…É”ˆ(€€€€€€€€€€€€€€€€€€€€€€è€‰É•ÅÕ•ÍÐµ•ÉÉ½Èˆ°(€€€€€€€€€€€€€€€ô°(€€€€€€€€€€€€€€¤°(€€€€€€€€€€€€¤ì(€€€€€€€€€ô¤ì(€€€€€€€€€É•ÅÕ•ÍÐ¹Í•ÑQ¥µ•½ÕÐ¡ÉÁŒ¹É•ÅÕ•ÍÑ}Ñ¥µ•½ÕÑ}µÌ°€ ¤€ôøì(€€€€€€€€€€€É•ÅÕ•ÍÐ¹‘•ÍÑÉ½ä (€€€€€€€€€€€€€=‰©•Ð¹…ÍÍ¥¸¡¹•ÜÉÉ½È ‰É•ÅÕ•ÍÑ}¥¹…Ñ¥Ù¥Ñå}Ñ¥µ•½ÕÐˆ¤°ì(€€€€€€€€€€€€€€€¹…µ”è€‰I•ÅÕ•ÍÑ%¹…Ñ¥Ù¥ÑåQ¥µ•½ÕÐˆ°(€€€€€€€€€€€€€ô¤°(€€€€€€€€€€€€¤ì(€€€€€€€€€ô¤ì(€€€€€€€€€Ñ½Ñ…±•…‘±¥¹”€ôÍ•ÑQ¥µ•½ÕÐ  ¤€ôøì(€€€€€€€€€€€Ñ½Ñ…±•…‘±¥¹•áÁ¥É•€ôÑÉÕ”ì(€€€€€€€€€€€É•ÅÕ•ÍÐ¹‘•ÍÑÉ½ä (€€€€€€€€€€€€€=‰©•Ð¹…ÍÍ¥¸¡¹•ÜÉÉ½È ‰Ñ½Ñ…±}‘•…‘±¥¹•}•á••‘•ˆ¤°ì(€€€€€€€€€€€€€€€¹…µ”è€‰Q½Ñ…±•…‘±¥¹•á••‘•ˆ°(€€€€€€€€€€€€€ô¤°(€€€€€€€€€€€€¤ì(€€€€€€€€€ô°ÉÁŒ¹É•ÅÕ•ÍÑ}Ñ¥µ•½ÕÑ}µÌ¤ì((€€€€€€€€€ÑÉäì(€€€€€€€€€€€É•ÅÕ•ÍÐ¹•¹¡‰½‘ä¤ì(€€€€€€€€€ô…Ñ ì(€€€€€€€€€€€™¥¹¥Í  (€€€€€€€€€€€€€ÑÉ…¹ÍÁ½ÉÑ!•± (€€€€€€€€€€€€€€€¥¹ÁÕÐ°(€€€€€€€€€€€€€€€€‰•ÉŒÈÁ}¡…¥¸ÈÀÔÁ}ÑÉ…¹ÍÁ½ÉÑ}É•ÅÕ•ÍÑ}•¹‘}™…¥±•ˆ°(€€€€€€€€€€€€€€€ì(€€€€€€€€€€€€€€€€€É•ÅÕ•ÍÑ}Í•¹Ðè™…±Í”°(€€€€€€€€€€€€€€€€€É•ÍÁ½¹Í•}É••¥Ù•è™…±Í”°(€€€€€€€€€€€€€€€€€ÍÕ™™¥àè€‰É•ÅÕ•ÍÐµ•¹ˆ°(€€€€€€€€€€€€€€€ô°(€€€€€€€€€€€€€€¤°(€€€€€€€€€€€€¤ì(€€€€€€€€€ô(€€€€€€€ô°(€€€€€€¤ì(€€€ô°(€ôì)ô()™Õ¹Ñ¥½¸¡•± (€É•…Í½¸èÍÑÉ¥¹œ°(€½ÁÑ¥½¹Ìèì(€€€Ù½¥‘}Ñ½­•¹}…‘‘É•ÍÌüèÍÑÉ¥¹œð¹Õ±°ì(€€€ÉÁ}ÕÉ±}™¥¹•ÉÁÉ¥¹Ñ}Í¡„ÈÔØüèÍÑÉ¥¹œð¹Õ±°ì(€€€™…Ñ½Éå}ÉÁ}ÁÉ½‰•}Á•É™½Éµ•üè‰½½±•…¸ì(€ô€ôíô°(¤è	ÕåY½¥‘ÉŒÈÁ¡…¥¸ÈÀÔÁ	É½…‘…ÍÑ•É!•±‘XÄì(€É•ÑÕÉ¸ì(€€€½¬è™…±Í”°(€€€ÍÑ…ÑÕÌè€‰¡•±ˆ°(€€€µ…É­•ÈèY=%}	Ue}Y=%}IÈÁ}!%8ÈÀÔÁ}	I=MQI}XÄ°(€€€Ù•ÉÍ¥½¸è€Ä°(€€€É•…Í½¸°(€€€Ù½¥‘}Ñ½­•¹}…‘‘É•ÍÌè½ÁÑ¥½¹Ì¹Ù½¥‘}Ñ½­•¹}…‘‘É•ÍÌñð¹Õ±°°(€€€ÉÁ}ÕÉ±}™¥¹•ÉÁÉ¥¹Ñ}Í¡„ÈÔØè(€€€€€½ÁÑ¥½¹Ì¹ÉÁ}ÕÉ±}™¥¹•ÉÁÉ¥¹Ñ}Í¡„ÈÔØñð¹Õ±°°(€€€™…Ñ½Éå}ÉÁ}ÁÉ½‰•}Á•É™½Éµ•è(€€€€€½ÁÑ¥½¹Ì¹™…Ñ½Éå}ÉÁ}ÁÉ½‰•}Á•É™½Éµ•€ôôôÑÉÕ”°(€€€ÑÉ…¹Í…Ñ¥½¹}‰É½…‘…ÍÑ}Á•É™½Éµ•‘}‰å}™…Ñ½Éäè™…±Í”°(€€€µ½¹•å}µ½Ù•µ•¹Ñ}Á•É™½Éµ•‘}‰å}™…Ñ½Éäè™…±Í”°(€€€…ÕÑ¡½É¥ÑäèY=%}	Ue}Y=%}IÈÁ}!%8ÈÀÔÁ}	I=MQI}UQ!=I%Qe}XÄ°(€ôì)ô()™Õ¹Ñ¥½¸Ù…±¥‘…Ñ•M¥¹•‘ÉŒÈÁQÉ…¹Í™•È (€É…ÝM¥¹•‘QÉ…¹Í…Ñ¥½¸èÍÑÉ¥¹œ°(€Ñ½­•¹‘‘É•ÍÌèÍÑÉ¥¹œ°(¤èÍÑÉ¥¹œì(€½¹ÍÐÉ…Ü€ôMÑÉ¥¹œ¡É…ÝM¥¹•‘QÉ…¹Í…Ñ¥½¸ñð€ˆˆ¤¹ÑÉ¥´ ¤ì(€¥˜€ (€€€€…I\¹Ñ•ÍÐ¡É…Ü¤ñð(€€€	Õ™™•È¹‰åÑ•1•¹Ñ ¡É…Ü°€‰ÕÑ˜àˆ¤€ø5a}I]}	eQL€¨€È€¬€È(€€¤ì(€€€É•ÑÕÉ¸€ˆˆì(€ô((€±•ÐÑÉ…¹Í…Ñ¥½¸èQÉ…¹Í…Ñ¥½¸ì(€ÑÉäì(€€€ÑÉ…¹Í…Ñ¥½¸€ôQÉ…¹Í…Ñ¥½¸¹™É½´¡É…Ü¤ì(€ô…Ñ ì(€€€É•ÑÕÉ¸€ˆˆì(€ô(€½¹ÍÐÑ¼€ô¹½Éµ…±¥é•‘‘É•ÍÌ¡ÑÉ…¹Í…Ñ¥½¸¹Ñ¼¤ì(€½¹ÍÐ‘…Ñ„€ôMÑÉ¥¹œ¡ÑÉ…¹Í…Ñ¥½¸¹‘…Ñ„ñð€ˆˆ¤¹Ñ½1½Ý•É…Í” ¤ì(€¥˜€ (€€€ÑÉ…¹Í…Ñ¥½¸¹ÑåÁ”€„ôô€Èñð(€€€ÑÉ…¹Í…Ñ¥½¸¹¡…¥¹%€„ôô€ÈÀÔÁ¸ñð(€€€Ñ¼€„ôôÑ½­•¹‘‘É•ÍÌñð(€€€ÑÉ…¹Í…Ñ¥½¸¹Ù…±Õ”€„ôô€Á¸ñð(€€€€…‘…Ñ„¹ÍÑ…ÉÑÍ]¥Ñ  ˆÁàˆ¤(€€¤ì(€€€É•ÑÕÉ¸€ˆˆì(€ô((€ÑÉäì(€€€½¹ÍÐ‘•½‘•€ôQI9MI}%9QI¹‘•½‘•Õ¹Ñ¥½¹…Ñ„ (€€€€€€‰ÑÉ…¹Í™•Èˆ°(€€€€€‘…Ñ„°(€€€€¤ì(€€€½¹ÍÐÉ•¥Á¥•¹Ð€ô¹½Éµ…±¥é•‘‘É•ÍÌ¡‘•½‘•‘lÁt¤ì(€€€½¹ÍÐ…µ½Õ¹Ð€ô	¥%¹Ð¡‘•½‘•‘lÅt¤ì(€€€½¹ÍÐÉ••¹½‘•€ôQI9MI}%9QI¹•¹½‘•Õ¹Ñ¥½¹…Ñ„ (€€€€€€‰ÑÉ…¹Í™•Èˆ°(€€€€€mÉ•¥Á¥•¹Ð°…µ½Õ¹Ñt°(€€€€¤¹Ñ½1½Ý•É…Í” ¤ì(€€€¥˜€ …É•¥Á¥•¹Ðñð…µ½Õ¹Ð€ðô€Á¸ñðÉ••¹½‘•€„ôô‘…Ñ„¤É•ÑÕÉ¸€ˆˆì(€ô…Ñ ì(€€€É•ÑÕÉ¸€ˆˆì(€ô((€É•ÑÕÉ¸MÑÉ¥¹œ¡ÑÉ…¹Í…Ñ¥½¸¹¡…Í ñð€ˆˆ¤¹Ñ½1½Ý•É…Í” ¤ì)ô()•áÁ½ÉÐ™Õ¹Ñ¥½¸É•…Ñ•	ÕåY½¥‘ÉŒÈÁ¡…¥¸ÈÀÔÁ	É½…‘…ÍÑ•ÉXÄ (€Á½±¥äèI•…‘½¹±äñ	ÕåY½¥‘ÉŒÈÁ¡…¥¸ÈÀÔÁ	É½…‘…ÍÑ•ÉA½±¥åXÄø°(¤è	ÕåY½¥‘ÉŒÈÁ¡…¥¸ÈÀÔÁ	É½…‘…ÍÑ•É•¥Í¥½¹XÄì(€½¹ÍÐÑ½­•¹‘‘É•ÍÌ€ô¹½Éµ…±¥é•‘‘É•ÍÌ¡Á½±¥äü¹Ù½¥‘}Ñ½­•¹}…‘‘É•ÍÌ¤ì(€½¹ÍÐÉÁŒ€ô¹½Éµ…±¥é•IÁŒ (€€€Á½±¥äü¹ÉÁ}ÕÉ°°(€€€Á½±¥äü¹É•ÅÕ•ÍÑ}Ñ¥µ•½ÕÑ}µÌ°(€€€Á½±¥äü¹µ…á}É•ÍÁ½¹Í•}‰åÑ•Ì°(€€¤ì(€¥˜€ …Ñ½­•¹‘‘É•ÍÌñð€…ÉÁŒ¤ì(€€€É•ÑÕÉ¸¡•± ‰•ÉŒÈÁ}¡…¥¸ÈÀÔÁ}‰É½…‘…ÍÑ•É}Á½±¥å}¥¹Ù…±¥ˆ°ì(€€€€€Ù½¥‘}Ñ½­•¹}…‘‘É•ÍÌèÑ½­•¹‘‘É•ÍÌñð¹Õ±°°(€€€€€ÉÁ}ÕÉ±}™¥¹•ÉÁÉ¥¹Ñ}Í¡„ÈÔØè(€€€€€€€ÉÁŒü¹ÉÁ}ÕÉ±}™¥¹•ÉÁÉ¥¹Ñ}Í¡„ÈÔØñð¹Õ±°°(€€€ô¤ì(€ô((€½¹ÍÐ‰É½…‘…ÍÑ•Èè	ÕåY½¥‘•±¥Ù•Éå	É½…‘…ÍÑ•ÉXÄ€ôì(€€€…Íå¹Œ‰É½…‘…ÍÑ}Í¥¹•‘}ÑÉ…¹Í…Ñ¥½¸ (€€€€€É…ÝM¥¹•‘QÉ…¹Í…Ñ¥½¸èÍÑÉ¥¹œ°(€€€€¤èAÉ½µ¥Í”ñ	ÕåY½¥‘•±¥Ù•Éå	É½…‘…ÍÑI•ÍÕ±ÑXÄøì(€€€€€½¹ÍÐÑÉ…¹Í…Ñ¥½¹!…Í €ôÙ…±¥‘…Ñ•M¥¹•‘ÉŒÈÁQÉ…¹Í™•È (€€€€€€€É…ÝM¥¹•‘QÉ…¹Í…Ñ¥½¸°(€€€€€€€Ñ½­•¹‘‘É•ÍÌ°(€€€€€€¤ì(€€€€€¥˜€ …ÑÉ…¹Í…Ñ¥½¹!…Í ¤ì(€€€€€€€É•ÑÕÉ¸ì(€€€€€€€€€…•ÁÑ•è™…±Í”°(€€€€€€€€€ÁÉ½Ù¥‘•É}ÍÕ‰µ¥ÍÍ¥½¹}¥è(€€€€€€€€€€€€‰•ÉŒÈÀµ¡…¥¸ÈÀÔÀµ±½…°µÑÉ…¹Í…Ñ¥½¸µ¥¹Ù…±¥ˆ°(€€€€€€€€€ÍÕ‰µ¥ÍÍ¥½¹}µ…å}¡…Ù•}½ÕÉÉ•è™…±Í”°(€€€€€€€ôì(€€€€€ô((€€€€€½¹ÍÐÑÉ…¹ÍÁ½ÉÐ€ô(€€€€€€€É•…Ñ•	ÕåY½¥‘ÉŒÈÁ¡…¥¸ÈÀÔÁQ½Ñ…±•…‘±¥¹•!ÑÑÁQÉ…¹ÍÁ½ÉÑXÄ ¤ì(€€€€€±•Ð‘•¥Í¥½¸ì(€€€€€ÑÉäì(€€€€€€€‘•¥Í¥½¸€ô…Ý…¥ÐÉ•…Ñ•	ÕåY½¥‘9…Ñ¥Ù•¡…¥¸ÈÀÔÁ	É½…‘…ÍÑ•ÉXÄ (€€€€€€€€€ì(€€€€€€€€€€€ÉÁ}ÕÉ°èÉÁŒ¹ÉÁ}ÕÉ°°(€€€€€€€€€€€•áÁ•Ñ•‘}¡…¥¹}¥è€ÈÀÔÀ°(€€€€€€€€€€€É•ÅÕ•ÍÑ}Ñ¥µ•½ÕÑ}µÌèÉÁŒ¹É•ÅÕ•ÍÑ}Ñ¥µ•½ÕÑ}µÌ°(€€€€€€€€€€€µ…á}É•ÍÁ½¹Í•}‰åÑ•ÌèÉÁŒ¹µ…á}É•ÍÁ½¹Í•}‰åÑ•Ì°(€€€€€€€€€ô°(€€€€€€€€€ÑÉ…¹ÍÁ½ÉÐ°(€€€€€€€€¤ì(€€€€€ô…Ñ ì(€€€€€€€É•ÑÕÉ¸ì(€€€€€€€€€…•ÁÑ•è™…±Í”°(€€€€€€€€€ÑÉ…¹Í…Ñ¥½¹}¡…Í èÑÉ…¹Í…Ñ¥½¹!…Í °(€€€€€€€€€ÁÉ½Ù¥‘•É}ÍÕ‰µ¥ÍÍ¥½¹}¥è(€€€€€€€€€€€€‰•ÉŒÈÀµ¡…¥¸ÈÀÔÀµ‰É½…‘…ÍÑ•Èµ™…Ñ½Éäµ™…¥±•ˆ°(€€€€€€€€€ÍÕ‰µ¥ÍÍ¥½¹}µ…å}¡…Ù•}½ÕÉÉ•è™…±Í”°(€€€€€€€ôì(€€€€€ô(€€€€€¥˜€ ‰É•…Í½¸ˆ¥¸‘•¥Í¥½¸¤ì(€€€€€€€É•ÑÕÉ¸ì(€€€€€€€€€…•ÁÑ•è™…±Í”°(€€€€€€€€€ÑÉ…¹Í…Ñ¥½¹}¡…Í èÑÉ…¹Í…Ñ¥½¹!…Í °(€€€€€€€€€ÁÉ½Ù¥‘•É}ÍÕ‰µ¥ÍÍ¥½¹}¥è(€€€€€€€€€€€€‰•ÉŒÈÀµ¡…¥¸ÈÀÔÀµ‰É½…‘…ÍÑ•Èµ¡…¥¸µÁÉ½‰”µ¡•±ˆ°(€€€€€€€€€ÍÕ‰µ¥ÍÍ¥½¹}µ…å}¡…Ù•}½ÕÉÉ•è™…±Í”°(€€€€€€€ôì(€€€€€ô((€€€€€É•ÑÕÉ¸…Ý…¥Ð‘•¥Í¥½¸¹‰É½…‘…ÍÑ•È¹‰É½…‘…ÍÑ}Í¥¹•‘}ÑÉ…¹Í…Ñ¥½¸ (€€€€€€€É…ÝM¥¹•‘QÉ…¹Í…Ñ¥½¸°(€€€€€€¤ì(€€€ô°(€ôì((€É•ÑÕÉ¸ì(€€€½¬èÑÉÕ”°(€€€ÍÑ…ÑÕÌè€‰É•…‘äˆ°(€€€µ…É­•ÈèY=%}	Ue}Y=%}IÈÁ}!%8ÈÀÔÁ}	I=MQI}XÄ°(€€€Ù•ÉÍ¥½¸è€Ä°(€€€¡…¥¹}¥è€ˆÈÀÔÀˆ°(€€€Ù½¥‘}Ñ½­•¹}…‘‘É•ÍÌèÑ½­•¹‘‘É•ÍÌ°(€€€ÉÁ}ÕÉ±}™¥¹•ÉÁÉ¥¹Ñ}Í¡„ÈÔØè(€€€€€ÉÁŒ¹ÉÁ}ÕÉ±}™¥¹•ÉÁÉ¥¹Ñ}Í¡„ÈÔØ°(€€€‰É½…‘…ÍÑ•È°(€€€™…Ñ½Éå}ÉÁ}ÁÉ½‰•}Á•É™½Éµ•è™…±Í”°(€€€ÑÉ…¹Í…Ñ¥½¹}‰É½…‘…ÍÑ}Á•É™½Éµ•‘}‰å}™…Ñ½Éäè™…±Í”°(€µ½¹•å}µ½Ù•µ•¹Ñ}Á•É™½Éµ•‘}‰å}™…Ñ½Éäè™…±Í”°(€€€…ÕÑ¡½É¥ÑäèY=%}	Ue}Y=%}IÈÁ}!%8ÈÀÔÁ}	I=MQI}UQ!=I%Qe}XÄ°(€ôì)ô(