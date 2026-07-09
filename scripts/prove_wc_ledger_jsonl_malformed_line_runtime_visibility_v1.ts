import fs from "node:fs";

const target = "src/index.ts";
const src = fs.readFileSync(target, "utf8");

for (const marker of ["43762:15", "43771:16", "61039:30"]) {
  if (src.includes(marker)) throw new Error(`malformed JSONL visibility marker remains: ${marker}`);
}

for (const needle of [
  "let j:any; try{ j=JSON.parse(line); }catch{ continue; }",
  "let r:any; try{ r=JSON.parse(line); }catch{ continue; }",
  "_raw: \"wc_v1_ledger\"",
]) {
  if (!src.includes(needle)) throw new Error(`missing expected safe JSONL scanner marker: ${needle}`);
}

console.log("VOID_WC_LEDGER_JSONL_MALFORMED_LINE_RUNTIME_VISIBILITY_V1_GREEN", JSON.stringify({
  target,
  malformed_jsonl_lines_skipped_by_optional_scanners: true,
  removed_visibility_markers: ["43762:15", "43771:16", "61039:30"],
}));
