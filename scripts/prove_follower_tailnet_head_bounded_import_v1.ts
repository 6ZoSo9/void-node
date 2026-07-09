import fs from "node:fs";

const index = fs.readFileSync("src/index.ts", "utf8");
const ts = fs.readFileSync("src/node_core.ts", "utf8");
const js = fs.readFileSync("src/node_core.js", "utf8");

for (const [name, src, needles] of [
  ["index follower status fallback", index, [
    '"/blocks/latest/number2.json","/blocks/latest/number.json","/head","/__void/ready.json"',
    "const n = Number(pj?.number ?? pj?.head)",
  ]],
  ["node_core ts bounded import", ts, [
    "VOID_FOLLOWER_PULL_LIMIT || 250",
    "const to = Math.min(theirHead, myHead + maxPull)",
  ]],
  ["node_core js active override", js, [
    "VOID_FOLLOWER_TAILNET_HEAD_BOUNDED_IMPORT_V1_JS_OVERRIDE",
    '"/blocks/latest/number2.json", "/blocks/latest/number.json", "/head", "/__void/ready.json", "/api/health"',
    "const to = Math.min(theirHead, myHead + maxPull)",
    "bounded: to < theirHead",
  ]],
] as const) {
  for (const needle of needles) {
    if (!src.includes(needle)) throw new Error(`missing ${name}: ${needle}`);
  }
}

console.log("VOID_FOLLOWER_TAILNET_HEAD_BOUNDED_IMPORT_V1_GREEN", JSON.stringify({
  active_js_override: true,
  follower_status_peer_head_fallbacks: true,
  bounded_import_default: 250,
}));
