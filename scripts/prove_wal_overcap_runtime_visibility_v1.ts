import fs from "node:fs";

const target = "src/index.ts";
const src = fs.readFileSync(target, "utf8");

const unsafe = [...src.matchAll(/wal\.overCap\s*\(/g)].map((m) => {
  const upto = src.slice(0, m.index ?? 0);
  const line = upto.split("\n").length;
  return { line, text: src.split("\n")[line - 1]?.trim() ?? "" };
});

if (!src.includes("function __voidWoV1")) {
  throw new Error("missing compact WAL overCap adapter __voidWoV1");
}

if (!src.includes("__voidWoV1(wal)")) {
  throw new Error("compact WAL overCap adapter is not used");
}

if (unsafe.length) {
  throw new Error("unsafe direct wal.overCap() calls remain: " + JSON.stringify(unsafe));
}

console.log("VOID_WAL_OVERCAP_RUNTIME_VISIBILITY_V1_GREEN", JSON.stringify({
  target,
  unsafe_direct_wal_overcap_calls: unsafe.length,
  helper: "__voidWoV1",
}));
