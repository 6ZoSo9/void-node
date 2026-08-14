import * as http from "node:http";
import type {
  BuyVoidNativeChain2050JsonRpcCallResultV1,
  BuyVoidNativeChain2050JsonRpcCallHeldV1,
  BuyVoidNativeChain2050JsonRpcCallV1,
  BuyVoidNativeChain2050JsonRpcTransportV1,
} from "./buy_void_native_chain2050_broadcaster_v1.js";

export const VOID_BUY_VOID_ERC20_CHAIN2050_TOTAL_DEADLINE_TRANSPORT_V1 =
  "VOID_BUY_VOID_ERC20_CHAIN2050_TOTAL_DEADLINE_TRANSPORT_V1";

const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_BYTES = 65_536;
const MAX_BYTES = 1_048_576;
const MAX_REQUEST_BYTES = 600_000;

type RpcPolicy = {
  hostname: "127.0.0.1" | "::1";
  port: number;
  path: string;
  timeout_ms: number;
  max_bytes: number;
};

function bounded(value: unknown, fallback: number, maximum: number): number | null {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : null;
}

function policy(input: Readonly<BuyVoidNativeChain2050JsonRpcCallV1>): RpcPolicy | null {
  let url: URL;
  try {
    url = new URL(String(input.rpc_url || "").trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  const hostname = host === "127.0.0.1" ? "127.0.0.1" : host === "::1" ? "::1" : null;
  const port = Number(url.port || 0);
  const timeout = bounded(input.request_timeout_ms, DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS);
  const maxBytes = bounded(input.max_response_bytes, DEFAULT_MAX_BYTES, MAX_BYTES);
  if (
    url.protocol !== "http:" || !hostname || !Number.isInteger(port) || port <= 0 || port > 65_535 ||
    url.username || url.password || url.search || url.hash || !url.pathname.startsWith("/") ||
    url.pathname.length > 256 || timeout === null || maxBytes === null
  ) return null;
  return { hostname, port, path: url.pathname, timeout_ms: timeout, max_bytes: maxBytes };
}

function held(
  input: Readonly<BuyVoidNativeChain2050JsonRpcCallV1>,
  error_code: string,
  request_sent = false,
  response_received = false,
  http_status: number | null = null,
): BuyVoidNativeChain2050JsonRpcCallHeldV1 {
  return {
    ok: false,
    request_sent,
    response_received,
    http_status,
    request_id: Number(input?.request_id || 0),
    error_code,
    json_rpc_error_code: "",
    provider_submission_id: `erc20-chain2050:${Number(input?.request_id || 0)}:held`.slice(0, 200),
  };
}

export function createBuyVoidErc20Chain2050TotalDeadlineHttpTransportV1():
  BuyVoidNativeChain2050JsonRpcTransportV1 {
  return {
    async call(input) {
      if (!input || !["eth_chainId", "eth_sendRawTransaction"].includes(input.method) ||
          !Number.isSafeInteger(input.request_id) || input.request_id <= 0) {
        return held(input, "erc20_chain2050_transport_input_invalid");
      }
      const rpc = policy(input);
      if (!rpc) return held(input, "erc20_chain2050_transport_rpc_policy_invalid");
      const body = JSON.stringify({ jsonrpc: "2.0", id: input.request_id, method: input.method, params: input.params });
      if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BYTES) {
        return held(input, "erc20_chain2050_transport_request_too_large");
      }

      return await new Promise<BuyVoidNativeChain2050JsonRpcCallResultV1>((resolve) => {
        let settled = false;
        let sent = false;
        let deadlineExpired = false;
        let tooLarge = false;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const finish = (result: BuyVoidNativeChain2050JsonRpcCallResultV1) => {
          if (settled) return;
          settled = true;
          if (timer !== null) clearTimeout(timer);
          resolve(result);
        };
        const failCode = () => deadlineExpired
          ? "erc20_chain2050_transport_total_deadline_exceeded"
          : tooLarge
            ? "erc20_chain2050_transport_response_too_large"
            : "erc20_chain2050_transport_request_error";

        const req = http.request({
          protocol: "http:", hostname: rpc.hostname, port: rpc.port, path: rpc.path, method: "POST",
          headers: { "content-type": "application/json", "content-length": String(Buffer.byteLength(body, "utf8")) },
        }, (res) => {
          const status = Number(res.statusCode || 0);
          if (status !== 200) { res.resume(); finish(held(input, "erc20_chain2050_transport_http_status_not_ok", sent, true, status || null)); return; }
          if (!String(res.headers["content-type"] || "").toLowerCase().includes("application/json")) {
            res.resume(); finish(held(input, "erc20_chain2050_transport_response_not_json", sent, true, 200)); return;
          }
          const chunks: Buffer[] = [];
          let total = 0;
          res.on("data", (chunk: Buffer) => {
            total += chunk.length;
            if (total > rpc.max_bytes) { tooLarge = true; req.destroy(new Error("response_too_large")); return; }
            chunks.push(chunk);
          });
          res.on("error", () => finish(held(input, failCode(), sent, true, 200)));
          res.on("end", () => {
            if (settled) return;
            let payload: any;
            try { payload = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
            catch { finish(held(input, "erc20_chain2050_transport_response_json_invalid", sent, true, 200)); return; }
            if (!payload || payload.jsonrpc !== "2.0" || payload.id !== input.request_id) {
              finish(held(input, "erc20_chain2050_transport_rpc_envelope_invalid", sent, true, 200)); return;
            }
            if (payload.error) {
              finish({ ...held(input, "rpc_json_error", true, true, 200),
                json_rpc_error_code: String(payload.error?.code ?? "").replace(/[^0-9-]/g, "").slice(0, 12) });
              return;
            }
            if (!Object.prototype.hasOwnProperty.call(payload, "result")) {
              finish(held(input, "erc20_chain2050_transport_rpc_result_missing", true, true, 200)); return;
            }
            finish({ ok: true, request_sent: true, response_received: true, http_status: 200,
              request_id: input.request_id, result: payload.result,
              provider_submission_id: `erc20-chain2050:${input.request_id}:result`.slice(0, 200) });
          });
        });
        req.on("finish", () => { sent = true; });
        req.on("error", () => finish(held(input, failCode(), sent)));
        req.setTimeout(rpc.timeout_ms, () => req.destroy(new Error("request_inactivity_timeout")));
        timer = setTimeout(() => { deadlineExpired = true; req.destroy(new Error("total_deadline_exceeded")); }, rpc.timeout_ms);
        req.end(body);
      });
    },
  };
}
