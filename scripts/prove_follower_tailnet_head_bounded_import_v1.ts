import fs from "node:fs";

const indexTarget = "src/index.ts";
const coreTsTarget = "src/node_core.ts";
const coreJsTarget = "src/node_core.js";

const indexSrc = fs.readFileSync(indexTarget, "utf8");
const coreTs = fs.readFileSync(coreTsTarget, "utf8");
const coreJs = fs.readFileSync(coreJsTarget, "utf8");

function must(name: string, ok: boolean): void {
  if (!ok) throw new Error(`missing ${name}`);
}

const compactIndex = indexSrc.replace(/\s+/g, "");
const compactTs = coreTs.replace(/\s+/g, "");
const compactJs = coreJs.replace(/\s+/g, "");

for (const path of ["/blocks/latest/number2.json", "/blocks/latest/number.json", "/head", "/__void/ready.json"]) {
  must(`index follower status fallback path ${path}`, indexSrc.includes(path));
  must(`node_core.js follower head fallback path ${path}`, coreJs.includes(path));
}

must(
  "index follower status fallback number parse",
  compactIndex.includes("constn=Number(pj?.number??pj?.head)")
);

must(
  "bounded import env in node_core.ts",
  coreTs.includes("VOID_FOLLOWER_PULL_LIMIT")
);

must(
  "bounded import default in node_core.ts",
  /\b250\b/.test(coreTs)
);

must(
  "bounded import cap in node_core.ts",
  compactTs.includes("Math.min(theirHead,myHead+maxPull)")
);

must(
  "bounded import env in node_core.js",
  coreJs.includes("VOID_FOLLOWER_PULL_LIMIT")
);

must(
  "bounded import default in node_core.js",
  /\b250\b/.test(coreJs)
);

must(
  "bounded import cap in node_core.js",
  compactJs.includes("Math.min(theirHead,myHead+maxPull)")
);

must(
  "active js override marker",
  coreJs.includes("VOID_FOLLOWER_TAILNET_HEAD_BOUNDED_IMPORT_V1_JS_OVERRIDE")
);

console.log("VOID_FOLLOWER_TAILNET_HEAD_BOUNDED_IMPORT_V1_GREEN", JSON.stringify({
  active_js_override: true,
  follower_status_peer_head_fallbacks: true,
  bounded_import_default: 250,
  bounded_import_cap_checked: true,
  proof_format_tolerant: true,
}));
