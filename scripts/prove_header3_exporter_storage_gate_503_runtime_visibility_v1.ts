import fs from "node:fs";

const target = "src/index.ts";
const src = fs.readFileSync(target, "utf8");

const transientCodePattern =
  '/^(ECONNRESET|ECONNREFUSED|UND_ERR_SOCKET)$/.test(code)';

const expectedPersistedCatch = String.raw`} catch (err) { const code=String((err as any)?.cause?.code||(err as any)?.code||""); if(!/^(ECONNRESET|ECONNREFUSED|UND_ERR_SOCKET)$/.test(code)) voidIndexEmptyCatchVisibilityWindow18901_19800V1("19194:9", err); }`;
const expectedTxrootCatch = String.raw`} catch (err) { const code=String((err as any)?.cause?.code||(err as any)?.code||""); if(!/^(ECONNRESET|ECONNREFUSED|UND_ERR_SOCKET)$/.test(code)) voidIndexEmptyCatchVisibilityWindow18901_19800V1("19201:10", err); }`;
const expectedExporterCatch = String.raw`} catch (err) { const m=String((err as any)?.message||err); const code=String((err as any)?.cause?.code||(err as any)?.code||""); if(!/^(ECONNRESET|ECONNREFUSED|UND_ERR_SOCKET)$/.test(code)&&!/GET \/blocks\/.*\/header3 -> 503/.test(m)) voidIndexEmptyCatchVisibilityWindow18901_19800V1("19260:11", err); }`;

if (!src.includes(expectedPersistedCatch)) {
  throw new Error("missing Header3 persisted-view transient loopback catch filter");
}
if (!src.includes(expectedTxrootCatch)) {
  throw new Error("missing Header3 txroot-view transient loopback catch filter");
}
if (!src.includes(expectedExporterCatch)) {
  throw new Error("missing Header3 exporter transient loopback + storage-gate filter");
}

if ((src.split(transientCodePattern).length - 1) < 3) {
  throw new Error("expected transient loopback code filter at all three Header3 catch sites");
}

for (const marker of ["19194:9", "19201:10", "19260:11"]) {
  if (!src.includes(`voidIndexEmptyCatchVisibilityWindow18901_19800V1("${marker}", err)`)) {
    throw new Error(`expected Header3 visibility marker missing: ${marker}`);
  }
}

if (!src.includes('const m=String((err as any)?.message||err);')) {
  throw new Error("missing compact error-message extraction for Header3 exporter filter");
}
if (!src.includes('/GET \\/blocks\\/.*\\/header3 -> 503/.test(m)')) {
  throw new Error("missing Header3 exporter expected storage-gate 503 filter");
}

console.log("VOID_HEADER3_EXPORTER_STORAGE_GATE_503_RUNTIME_VISIBILITY_V1_GREEN", JSON.stringify({
  target,
  transient_loopback_codes_filtered: [
    "ECONNRESET",
    "ECONNREFUSED",
    "UND_ERR_SOCKET",
  ],
  persisted_view_marker_preserved: "19194:9",
  txroot_view_marker_preserved: "19201:10",
  exporter_marker_preserved: "19260:11",
  expected_storage_gate_header3_503_filtered_at_exporter: true,
  non_optional_errors_still_visible: true,
}));
