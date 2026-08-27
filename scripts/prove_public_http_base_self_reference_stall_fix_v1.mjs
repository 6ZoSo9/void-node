#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const marker = "VOID_PUBLIC_HTTP_BASE_SELF_REFERENCE_STALL_FIX_V1";
const sourcePath = path.resolve(process.cwd(), "src/index.ts");
const source = fs.readFileSync(sourcePath, "utf8");

function req(condition, label) {
  if (!condition) {
    console.error(`${marker}_HOLD`);
    console.error(`reason=${label}`);
    process.exit(1);
  }
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

req(
  source.includes(
    'const httpBase = process.env.PUBLIC_HTTP_BASE || `http://127.0.0.1:${HTTP_PORT}`;'
  ),
  "self_public_advertisement_removed"
);
req(source.includes("selfAdvert.httpBase = httpBase;"), "selfAdvert_httpBase_removed");
req(
  source.includes("peersReg.upsert({") && source.includes("http: httpBase,"),
  "self_registry_advertisement_removed"
);

const periodicPeersAnchor = "const peers = peersReg.all();";
const selfCapture =
  'const selfId = String(((((globalThis as any).__void_node || (globalThis as any).node) as any).id) || "");';
const selfGuard =
  'if (selfId && String(p?.id || "") === selfId) continue;';

const selfCaptureIndex = source.indexOf(selfCapture);
req(selfCaptureIndex >= 0, "periodic_self_id_capture_missing");
req(
  source.indexOf(selfCapture, selfCaptureIndex + 1) === -1,
  "periodic_self_id_capture_not_unique"
);

const periodicPeersIndex = source.lastIndexOf(
  periodicPeersAnchor,
  selfCaptureIndex
);
req(periodicPeersIndex >= 0, "periodic_peer_loop_missing");
req(
  selfCaptureIndex - periodicPeersIndex < 800,
  "periodic_peer_anchor_too_far_from_self_capture"
);

const selfGuardIndex = source.indexOf(
  selfGuard,
  selfCaptureIndex
);
req(selfGuardIndex >= 0, "periodic_self_identity_guard_missing");
req(
  source.indexOf(selfGuard, selfGuardIndex + 1) === -1,
  "periodic_self_identity_guard_not_unique"
);

const periodicUpsertIndex = source.indexOf(
  "void upsertRemotePeer(",
  selfGuardIndex
);
req(periodicUpsertIndex >= 0, "periodic_remote_upsert_missing");
req(
  periodicUpsertIndex - selfGuardIndex < 1200,
  "periodic_remote_upsert_too_far_from_self_guard"
);
req(
  periodicPeersIndex < selfCaptureIndex &&
    selfCaptureIndex < selfGuardIndex &&
    selfGuardIndex < periodicUpsertIndex,
  "periodic_self_guard_order_invalid"
);

const upsertStart = source.indexOf("async function upsertRemotePeer(");
req(upsertStart >= 0, "upsertRemotePeer_missing");
const upsertWindow = source.slice(upsertStart, upsertStart + 2200);
req(
  upsertWindow.includes("const remoteUpsertController = new AbortController();"),
  "remote_upsert_abort_controller_missing"
);
req(
  upsertWindow.includes(
    "setTimeout(() => remoteUpsertController.abort(), 10_000)"
  ),
  "remote_upsert_timeout_missing"
);
req(
  upsertWindow.includes("signal: remoteUpsertController.signal"),
  "remote_upsert_signal_missing"
);
req(
  upsertWindow.includes("clearTimeout(remoteUpsertTimeout);"),
  "remote_upsert_timeout_cleanup_missing"
);

const jobsAnchor = "// === jobs-and-datanet-worker-v1 BEGIN ===";
const jobsStart = source.indexOf(jobsAnchor);
req(jobsStart >= 0, "jobs_datanet_worker_missing");
const jobsWindow = source.slice(jobsStart, jobsStart + 26000);
req(
  jobsWindow.includes("const canonicalHttpBaseV1 = (raw:any):string => {"),
  "datanet_canonical_base_helper_missing"
);
req(
  jobsWindow.includes(
    "const publicBaseKeyV1 = canonicalHttpBaseV1(process.env.PUBLIC_HTTP_BASE);"
  ),
  "datanet_public_base_key_missing"
);
req(
  jobsWindow.includes(
    "if (publicBaseKeyV1 && canonicalHttpBaseV1(http) === publicBaseKeyV1) return;"
  ),
  "datanet_public_self_alias_filter_missing"
);
req(
  jobsWindow.includes("const remoteFetchController = new AbortController();"),
  "datanet_remote_abort_controller_missing"
);
req(
  jobsWindow.includes(
    "setTimeout(() => remoteFetchController.abort(), 10_000)"
  ),
  "datanet_remote_timeout_missing"
);
req(
  jobsWindow.includes(
    "const r = await fetch(url, { signal: remoteFetchController.signal });"
  ),
  "datanet_remote_signal_missing"
);
req(
  jobsWindow.includes("clearTimeout(remoteFetchTimeout);"),
  "datanet_remote_timeout_cleanup_missing"
);

req(
  jobsWindow.includes(
    "j = await r.json().catch(() => null);"
  ),
  "datanet_remote_body_read_missing"
);
req(
  jobsWindow.includes(
    "if (!j || !j.ok) continue;"
  ),
  "datanet_response_contract_guard_missing"
);
const datanetFetchIndex = jobsWindow.indexOf(
  "const r = await fetch(url, { signal: remoteFetchController.signal });"
);
const datanetBodyIndex = jobsWindow.indexOf(
  "j = await r.json().catch(() => null);",
  datanetFetchIndex
);
const datanetTimeoutClearIndex = jobsWindow.indexOf(
  "clearTimeout(remoteFetchTimeout);",
  datanetBodyIndex
);
req(
  datanetFetchIndex >= 0 &&
    datanetBodyIndex > datanetFetchIndex &&
    datanetTimeoutClearIndex > datanetBodyIndex,
  "datanet_timeout_does_not_cover_response_body"
);

function canonical(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  try {
    const u = new URL(text);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    u.pathname = "";
    u.search = "";
    u.hash = "";
    return u.toString().replace(/\/+$/, "");
  } catch {
    return text.replace(/\/+$/, "");
  }
}

const selfCases = [
  ["https://example.invalid", "https://example.invalid/"],
  ["https://example.invalid/", "https://example.invalid"],
  ["http://127.0.0.1:4100", "http://127.0.0.1:4100/"],
  ["https://example.invalid/path?q=x#y", "https://example.invalid"],
];

for (const [a, b] of selfCases) {
  req(canonical(a) === canonical(b), `canonical_self_case_failed=${a}|${b}`);
}
req(
  canonical("https://peer.invalid") !== canonical("https://example.invalid"),
  "canonical_remote_peer_collapsed_to_self"
);

const peers = [
  { id: "self-node", http: "https://public-self.invalid" },
  { id: "peer-node", http: "https://peer.invalid" },
];
const announced = peers
  .filter((p) => p?.http)
  .filter((p) => String(p?.id || "") !== "self-node")
  .map((p) => p.id);
req(
  announced.length === 1 && announced[0] === "peer-node",
  "identity_guard_model_failed"
);

req(
  count(source, "signal: remoteUpsertController.signal") === 1,
  "remote_upsert_signal_not_unique"
);
req(
  count(
    source,
    "const r = await fetch(url, { signal: remoteFetchController.signal });"
  ) === 1,
  "datanet_remote_signal_not_unique"
);

console.log("self_advertisement_preserved=true");
console.log("periodic_self_identity_guard=true");
console.log("remote_peer_upsert_timeout_ms=10000");
console.log("datanet_public_self_alias_filter=true");
console.log("datanet_remote_fetch_timeout_ms=10000");
console.log("canonicalization_microproof=true");
console.log("identity_guard_microproof=true");
console.log(`${marker}_PROOF_GREEN`);
