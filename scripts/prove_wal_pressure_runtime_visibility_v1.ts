import fs from "node:fs";

const target = "src/index.ts";
const src = fs.readFileSync(target, "utf8");

const unsafe = [...src.matchAll(/wal\.pressure\s*\(/g)].map((m) => {
  const upto = src.slice(0, m.index ?? 0);
  const line = upto.split("\n").length;
  return { line, text: src.split("\n")[line - 1]?.trim() ?? "" };
});

if (!src.includes("function __voidWpV1")) {
  throw new Error("missing compact WAL pressure adapter __voidWpV1");
}

if (!src.includes("__voidWpV1(wal)")) {
  throw new Error("compact WAL pressure adapter is not used");
}

if (unsafe.length) {
  throw new Error("unsafe direct wal.pressure() calls remain: " + JSON.stringify(unsafe));
}

console.log("VOID_WAL_PRESSURE_RUNTIME_VISIBILITY_V1_GREEN", JSON.stringify({
  target,
  unsafe_direct_wal_pressure_calls: unsafe.length,
  helper: "__voidWpV1",
}));
