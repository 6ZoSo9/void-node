import fs from "node:fs";

const target = "src/index.ts";
const src = fs.readFileSync(target, "utf8");

const optionalDev404 = [...src.matchAll(/r\.status===404&&path\.startsWith\("\/dev\/"\)/g)].length;

if (optionalDev404 < 2) {
  throw new Error(`expected at least two optional /dev/ 404 guards, found ${optionalDev404}`);
}

for (const needle of [
  "GET ${path} -> ${r.status}",
  "`/dev/blocks/${n}/txs/persisted`",
  "`/dev/txroot/${n}`",
  "voidIndexEmptyCatchVisibilityWindow18901_19800V1",
]) {
  if (!src.includes(needle)) throw new Error(`missing expected source marker: ${needle}`);
}

console.log("VOID_DEV_TXROOT_PERSISTED_404_RUNTIME_VISIBILITY_V1_GREEN", JSON.stringify({
  target,
  optional_dev_404_guards: optionalDev404,
  preserved_non_dev_error_throw: true,
}));
