import fs from "node:fs";

const target = "src/index.ts";
const src = fs.readFileSync(target, "utf8");

if (!src.includes("const m=await import(\"./chain/seg_store.js\"),G:any=globalThis as any;")) {
  throw new Error("missing global marker import binding");
}

if (!src.includes("G.__void_txroot_import_seen=true")) {
  throw new Error("missing global txroot import marker assignment");
}

if (src.includes("(m as any).__void_txroot_import_seen")) {
  throw new Error("unsafe module namespace marker assignment remains");
}

console.log("VOID_TXROOT_SECOND_CHANCE_IMPORT_MARKER_RUNTIME_VISIBILITY_V1_GREEN", JSON.stringify({
  target,
  module_namespace_marker_assignments: 0,
  marker_owner: "globalThis",
}));
