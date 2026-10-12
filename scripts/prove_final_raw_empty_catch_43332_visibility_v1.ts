import fs from "node:fs";

const target = "src/index.ts";
const src = fs.readFileSync(target, "utf8");

const rawEmpty = [...src.matchAll(/catch\s*(?:\([^)]*\))?\s*\{\s*\}/g)];
if (rawEmpty.length !== 0) {
  const first = rawEmpty[0];
  const line = src.slice(0, first.index).split("\n").length;
  throw new Error(`raw empty catch still present at ${target}:${line}`);
}

const expected = 'if(typeof head_peer!=="number"&&he)voidIndexEmptyCatchVisibilityWindow43201_44100V1("43332:5",he);';
if (!src.includes(expected)) {
  throw new Error("missing final fallback visibility marker for 43332");
}

if (!src.includes('}catch(err){he=err;}')) {
  throw new Error("missing non-empty fallback catch body");
}

if (!src.includes('"/blocks/latest/number2.json","/blocks/latest/number.json","/head","/__void/ready.json"')) {
  throw new Error("peer-head fallback path list changed unexpectedly");
}

console.log("VOID_FINAL_RAW_EMPTY_CATCH_43332_VISIBILITY_V1_GREEN", JSON.stringify({
  target,
  raw_empty_catches: 0,
  marker_preserved: "43332:5",
  fallback_visibility: "only_after_all_peer_head_paths_fail",
}));
