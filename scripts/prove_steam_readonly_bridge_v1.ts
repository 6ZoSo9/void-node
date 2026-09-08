import fs from "node:fs";
import path from "node:path";
import {
  VOID_STEAM_READONLY_BRIDGE_V1,
  executeSteamReadonlyRequest,
  prepareSteamReadonlyRequest,
  steamReadonlyBridgeStatus,
  SteamReadonlyBridgeError,
} from "../src/integrations/steam_readonly_bridge_v1.js";

function need(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`VOID_STEAM_READONLY_BRIDGE_V1_FAIL: ${message}`);
  }
}

async function needReject(
  fn: () => Promise<unknown> | unknown,
  code: string,
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    need(error instanceof SteamReadonlyBridgeError, "wrong error type");
    need(error.code === code, `expected ${code}, got ${error.code}`);
    return;
  }
  throw new Error(
    `VOID_STEAM_READONLY_BRIDGE_V1_FAIL: expected rejection ${code}`,
  );
}

function responseAt(url: string, body: string, init: ResponseInit): Response {
  const response = new Response(body, init);
  Object.defineProperties(response, {
    url: { value: url },
    redirected: { value: false },
  });
  return response;
}

const root = process.cwd();
const moduleText = fs.readFileSync(
  path.join(root, "src", "integrations", "steam_readonly_bridge_v1.ts"),
  "utf8",
);
const cliText = fs.readFileSync(
  path.join(root, "scripts", "steam_readonly_bridge_probe_v1.ts"),
  "utf8",
);
const indexText = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");

for (const marker of [
  "VOID_STEAM_READONLY_BRIDGE_V1",
  "VOID_STEAM_READONLY_BRIDGE_ENABLED",
  "VOID_STEAM_WEB_API_KEY",
  "x-webapi-key",
  "partner.steam-api.com",
  "automatic_background_loop: false",
  "writes_to_steam: false",
  "steam_client_scrape: false",
  "password_access: false",
  "cookie_access: false",
  "wallet_access: false",
  "money_movement: false",
  "response_persistence: false",
  'redirect: "error"',
  "new AbortController()",
  "steam_readonly_request_timeout",
  "upstream_response_provenance_invalid",
  "response_content_length_invalid",
  "response_too_large",
]) {
  need(moduleText.includes(marker), `missing marker: ${marker}`);
}

need(
  !moduleText.includes('url.searchParams.set("key"'),
  "API key must not be placed in the URL",
);
need(
  !indexText.includes("steam_readonly_bridge_v1"),
  "source-only v1 must not attach itself to node bootstrap",
);
need(
  moduleText.includes('"steamReadonlyBridgeFetch"'),
  "manual fetch confirmation constant missing",
);
need(
  cliText.includes("VOID_STEAM_READONLY_FETCH_CONFIRMATION"),
  "CLI confirmation gate missing",
);

const disabled = steamReadonlyBridgeStatus({});
need(disabled.marker === VOID_STEAM_READONLY_BRIDGE_V1, "marker mismatch");
need(disabled.enabled === false, "bridge must default disabled");
need(disabled.ready === false, "disabled bridge cannot be ready");
need(disabled.credential_present === false, "credential must default absent");
need(disabled.automatic_background_loop === false, "background loop enabled");
need(disabled.writes_to_steam === false, "write capability enabled");
need(disabled.response_persistence === false, "response persistence enabled");

await needReject(
  () =>
    executeSteamReadonlyRequest(
      {
        operation: "player_summaries",
        steamids: ["76561198000000000"],
      },
      {
        env: {},
        fetch_impl: async () => {
          throw new Error("network must not be reached");
        },
      },
    ),
  "bridge_disabled",
);

await needReject(
  () =>
    executeSteamReadonlyRequest(
      {
        operation: "player_summaries",
        steamids: ["76561198000000000"],
      },
      {
        env: {
          VOID_STEAM_READONLY_BRIDGE_ENABLED: "1",
        },
      },
    ),
  "credential_missing",
);

const env = {
  VOID_STEAM_READONLY_BRIDGE_ENABLED: "1",
  VOID_STEAM_WEB_API_KEY: "proof-only-secret",
  VOID_STEAM_READONLY_MAX_RESPONSE_BYTES: "16384",
};

const prepared = prepareSteamReadonlyRequest(
  {
    operation: "player_summaries",
    steamids: ["76561198000000000"],
  },
  env,
);
need(prepared.url.protocol === "https:", "TLS is not enforced");
need(
  prepared.url.hostname === "partner.steam-api.com",
  "host allowlist mismatch",
);
need(
  prepared.url.pathname === "/ISteamUser/GetPlayerSummaries/v2/",
  "player summaries path mismatch",
);
need(!prepared.url.toString().includes("proof-only-secret"), "key leaked in URL");
need(
  prepared.headers["x-webapi-key"] === "proof-only-secret",
  "key header missing",
);

await needReject(
  () =>
    executeSteamReadonlyRequest(
      {
        operation: "owned_games",
        steamid: "not-a-steamid",
      },
      { env },
    ),
  "invalid_steam_id",
);

let observedUrl = "";
let observedHeaders: Record<string, string> = {};
const body = JSON.stringify({
  response: {
    players: [
      {
        steamid: "76561198000000000",
        personaname: "proof",
      },
    ],
  },
});

const result = await executeSteamReadonlyRequest(
  {
    operation: "player_summaries",
    steamids: ["76561198000000000"],
  },
  {
    env,
    fetch_impl: async (input, init) => {
      observedUrl = String(input);
      observedHeaders = Object.fromEntries(
        new Headers(init?.headers).entries(),
      );
      return responseAt(observedUrl, body, {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-length": String(Buffer.byteLength(body)),
        },
      });
    },
  },
);

need(result.ok === true, "mock request did not succeed");
need(result.operation === "player_summaries", "operation mismatch");
need(result.upstream.status === 200, "status mismatch");
need(result.received_bytes === Buffer.byteLength(body), "byte count mismatch");
need(/^[0-9a-f]{64}$/.test(result.response_sha256), "receipt hash invalid");
need(!observedUrl.includes("proof-only-secret"), "key leaked in fetch URL");
need(
  observedHeaders["x-webapi-key"] === "proof-only-secret",
  "fetch key header missing",
);
need(
  !JSON.stringify(steamReadonlyBridgeStatus(env)).includes(
    "proof-only-secret",
  ),
  "status leaked credential",
);

await needReject(
  () =>
    executeSteamReadonlyRequest(
      {
        operation: "player_summaries",
        steamids: ["76561198000000000"],
      },
      {
        env,
        fetch_impl: async (requestInput) =>
          responseAt(String(requestInput), "x".repeat(17000), {
            status: 200,
            headers: {
              "content-type": "application/json",
              "content-length": "17000",
            },
          }),
      },
    ),
  "response_too_large",
);

console.log("VOID_STEAM_READONLY_BRIDGE_V1_GREEN");
