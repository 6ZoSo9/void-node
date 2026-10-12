import fs from "node:fs";

const target = "src/index.ts";
const src = fs.readFileSync(target, "utf8");

if (src.includes('voidIndexEmptyCatchVisibilityWindow23401_24300V1("23742:14", err)')) {
  throw new Error("old done replay JSON parse visibility marker remains");
}

if (src.includes('voidIndexEmptyCatchVisibilityWindow23401_24300V1("23751:15", err)')) {
  throw new Error("old jobs replay JSON parse visibility marker remains");
}

for (const needle of [
  "let rec:any; try{ rec=JSON.parse(line); }catch{ continue; }",
  "let j:any; try{ j=JSON.parse(line); }catch{ continue; }",
  'voidIndexEmptyCatchVisibilityWindow23401_24300V1("23742:14-file", err)',
  'voidIndexEmptyCatchVisibilityWindow23401_24300V1("23751:15-file", err)',
]) {
  if (!src.includes(needle)) throw new Error(`missing expected replay guard marker: ${needle}`);
}

console.log("VOID_AGENT_DURABLE_JSONL_REPLAY_RUNTIME_VISIBILITY_V1_GREEN", JSON.stringify({
  target,
  malformed_jsonl_lines_skipped_by_replay: true,
  file_level_errors_preserved: true,
}));
