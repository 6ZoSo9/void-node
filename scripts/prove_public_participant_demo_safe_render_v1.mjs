import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync("public/demo/participant/index.html", "utf8");
assert.doesNotMatch(html, /\.innerHTML\b/u, "summary data must not enter an HTML parsing sink");
assert.match(html, /<div id="latestDataset" class="list"><\/div>/u);
assert.match(html, /<div id="latestAgent" class="list"><\/div>/u);
assert.match(
  html,
  /<div id="latestDatasetStatus" class="sr-only" role="status" aria-live="polite" aria-atomic="true">Dataset summary not loaded\.<\/div>/u,
  "dataset status must be a dedicated bounded live region",
);
assert.match(
  html,
  /<div id="latestAgentStatus" class="sr-only" role="status" aria-live="polite" aria-atomic="true">Agent summary not loaded\.<\/div>/u,
  "agent status must be a dedicated bounded live region",
);
assert.match(html, /\.sr-only\s*\{[\s\S]*?position:absolute/u);
assert.match(html, /container\.replaceChildren\(item\)/u);
assert.match(html, /row\.textContent = String\(line\.text \?\? ""\)/u);

const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/u);
assert.ok(match, "participant inline script missing");
const script = match[1].replace(/\n\s*refreshAll\(\);\s*$/u, "");

class FakeElement {
  constructor(id = "", tagName = "div") {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.className = "";
    this.children = [];
    this.style = {};
    this.listeners = new Map();
    this._textContent = "";
  }
  set textContent(value) { this._textContent = String(value ?? ""); this.children = []; }
  get textContent() { return this._textContent + this.children.map((child) => child.textContent).join(""); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this._textContent = ""; this.children = [...children]; }
  addEventListener(name, listener) { this.listeners.set(name, listener); }
}

const elements = new Map();
const document = {
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, new FakeElement(id));
    return elements.get(id);
  },
  createElement(tagName) { return new FakeElement("", tagName); },
};
const probes = {
  datasetId: '<img src=x onerror="globalThis.datasetOwned=true">',
  datasetMime: "m".repeat(200000) + "</div><script>globalThis.mimeOwned=true</script>",
  datasetSha: "<svg onload=globalThis.shaOwned=true>",
  jobId: "</div><script>globalThis.jobOwned=true</script>",
  jobType: "t".repeat(200000) + '<img src=x onerror="globalThis.typeOwned=true">',
  jobHash: "<svg onload=globalThis.hashOwned=true>",
};
const payloads = new Map([
  ["/__void/demo/summary.json", {
    health: { node_id: "node", http_port: 4110, p2p_port: 4710 },
    chain: { head: 1, mempool_count: 0 },
    update: { version: "v", protocol_version: "p", channel: "c" },
    datanet: {
      loopproof_ok: true,
      receipts_count: 1,
      latest_dataset: {
        id: probes.datasetId,
        mime: probes.datasetMime,
        plaintext_len: 10,
        ciphertext_len: 12,
        sha256: probes.datasetSha,
      },
    },
  }],
  ["/__void/agent/summary.json", {
    latest_job: {
      id: probes.jobId,
      type: probes.jobType,
      status: "complete",
      priority: 1,
      result_hash: probes.jobHash,
    },
  }],
  ["/upgrade/check", {
    signature_present: true,
    signature_valid: true,
    compatible: true,
    update_available: false,
    verification_reason: "fixture",
  }],
  ["/__void/update/plan-status.json", {
    plan_present: false,
    parse_ok: true,
    service_match: null,
    plan_file: "none",
    plan: null,
  }],
]);
async function fetch(url) {
  assert.ok(payloads.has(url), "unexpected request: " + url);
  return { ok: true, async text() { return JSON.stringify(payloads.get(url)); } };
}
const context = vm.createContext({
  document,
  fetch,
  navigator: { clipboard: { async writeText() {} } },
  console,
  Error,
  JSON,
  Map,
  RegExp,
  String,
});
vm.runInContext(script, context, { filename: "participant-inline-script.js" });
await vm.runInContext("refreshAll()", context);

for (const [id, expected] of [
  ["latestDataset", [probes.datasetId, probes.datasetMime, probes.datasetSha]],
  ["latestAgent", [probes.jobId, probes.jobType, probes.jobHash]],
]) {
  const container = elements.get(id);
  assert.equal(container.children.length, 1, id + " must expose one bounded result card");
  const text = container.textContent;
  for (const probe of expected) assert.ok(text.includes(probe), id + " must preserve text");
  const visit = (node) => {
    assert.ok(!["SCRIPT", "IMG", "SVG"].includes(node.tagName));
    for (const child of node.children) visit(child);
  };
  visit(container);
}
for (const flag of ["datasetOwned", "mimeOwned", "shaOwned", "jobOwned", "typeOwned", "hashOwned"]) {
  assert.equal(context[flag], undefined, flag + " must not execute");
}

for (const [id, expected] of [
  ["latestDatasetStatus", "Latest dataset updated."],
  ["latestAgentStatus", "Latest agent job updated."],
]) {
  const status = elements.get(id);
  assert.ok(status, id + " status element must exist");
  assert.equal(status.textContent, expected);
  assert.ok(status.textContent.length < 64, id + " announcement must stay bounded");
  for (const probe of Object.values(probes)) {
    assert.equal(status.textContent.includes(probe), false,
      id + " announcement must not echo API-controlled fields");
  }
}

console.log("public_participant_demo_safe_render_v1=PASS");
console.log("untrusted_summary_fields_rendered_as_text=true");
console.log("full_record_text_outside_live_region=true");
console.log("bounded_async_status_regions=true");
console.log("large_untrusted_fields_not_announced=true");
