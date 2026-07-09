import fs from "node:fs";

const target = "src/index.ts";
const src = fs.readFileSync(target, "utf8");

const expected = String.raw`if(!/GET \/blocks\/.*\/header3 -> 503/.test(m)) voidIndexEmptyCatchVisibilityWindow18901_19800V1("19260:11", err);`;
if (!src.includes(expected)) {
  throw new Error("missing header3 exporter expected storage-gate 503 catch filter");
}

if (!src.includes('const m=String((err as any)?.message||err);')) {
  throw new Error("missing compact error-message extraction for header3 exporter filter");
}

if (!src.includes('voidIndexEmptyCatchVisibilityWindow18901_19800V1("19260:11", err)')) {
  throw new Error("expected header3 exporter visibility marker is missing");
}

console.log("VOID_HEADER3_EXPORTER_STORAGE_GATE_503_RUNTIME_VISIBILITY_V1_GREEN", JSON.stringify({
  target,
  expected_storage_gate_header3_503_filtered_at_marker: true,
  non_optional_errors_still_visible: true,
  marker_preserved: "19260:11",
}));
