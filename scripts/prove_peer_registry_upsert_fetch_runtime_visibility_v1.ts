import fs from "node:fs";

const target = "src/index.ts";
const src = fs.readFileSync(target, "utf8");

const expected = 'if(!/fetch failed/.test(String((err as any)?.message||err))) __voidIxCatch9000("8346:9", err);';
if (!src.includes(expected)) {
  throw new Error("missing peer registry optional fetch-failed visibility filter");
}

if (!src.includes('String((err as any)?.message||err)')) {
  throw new Error("missing compact error-message extraction");
}

if (!src.includes('__voidIxCatch9000("8346:9", err)')) {
  throw new Error("expected 8346:9 marker is missing");
}

console.log("VOID_PEER_REGISTRY_UPSERT_FETCH_RUNTIME_VISIBILITY_V1_GREEN", JSON.stringify({
  target,
  optional_peer_registry_fetch_failed_filtered: true,
  non_fetch_failed_errors_still_visible: true,
  marker_preserved: "8346:9",
}));
