import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  testOnlyReadStrictCapacityLedgerFileV1,
} from "../src/economic/buy_void_verified_payment_capacity_admission_v1.js";

// Current-main source-only repair. Never touch Precision ledger/custody roots.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = "src/economic/buy_void_verified_payment_capacity_admission_v1.ts";
const SOURCE_BLOB = "ddbe5410ea657b831b79e3ae883e1482ab4a1465";
const OLD_SOURCE_BLOB = "ac8bf352979e0e24d2cab45c3b23949e1bd2b026";
const code = fs.readFileSync(path.join(ROOT,...SOURCE.split("/")), "utf8");
const gitBlob = (bytes:Buffer):string =>
  crypto.createHash("sha1")
    .update(Buffer.from("blob "+bytes.length+"\0","utf8"))
    .update(bytes).digest("hex");
assert.equal(gitBlob(Buffer.from(code,"utf8")),SOURCE_BLOB,
  "exact_reviewed_capacity_writer_source_required");

// Derive the historic source by reversing ONLY the four reviewed insertions.
// Unexpected changes cannot be hidden by a text assertion or old SHA echo.
function revertOnce(text:string,from:string,to:string,label:string):string {
  const pos=text.indexOf(from);
  assert.ok(pos>=0&&text.indexOf(from,pos+from.length)===-1,
    "source_delta_reversal_not_unique:"+label);
  return text.slice(0,pos)+to+text.slice(pos+from.length);
}
let historic=code;
historic=revertOnce(historic,
  "const O_NONBLOCK = fs.constants.O_NONBLOCK;\n","","nonblock_constant");
historic=revertOnce(historic,
  '    typeof O_NONBLOCK !== "number" ||\n',"","capability_guard");
historic=revertOnce(historic,
  "    // A request/history leaf can race to FIFO. Never block before fstat.\n"+
  "    fd = fs.openSync(pinnedPath, access | O_NOFOLLOW | O_NONBLOCK);\n",
  "    fd = fs.openSync(pinnedPath, access | O_NOFOLLOW);\n",
  "ledger_open");
historic=revertOnce(historic,
  "    // The same fail-closed nonblocking boundary applies to private sidecars.\n"+
  "    fd = fs.openSync(pinnedPath, fs.constants.O_RDONLY | O_NOFOLLOW | O_NONBLOCK);\n",
  "    fd = fs.openSync(pinnedPath, fs.constants.O_RDONLY | O_NOFOLLOW);\n",
  "sidecar_open");
assert.equal(gitBlob(Buffer.from(historic,"utf8")),OLD_SOURCE_BLOB,
  "historical_capacity_writer_bytes_must_match");

const capRegion=code.slice(
  code.indexOf("function requireCapacityDescriptorSafetyV1()"),
  code.indexOf("type PinnedRequestDirectoryV1"),
);
assert.ok(capRegion.includes('typeof O_NONBLOCK !== "number"'),
  "nonblocking_capability_missing");
const ledgerRegion=code.slice(
  code.indexOf("function openPinnedLedgerV1("),
  code.indexOf("function openPinnedPrivateSidecarV1("),
);
assert.ok(ledgerRegion.includes(
  "fd = fs.openSync(pinnedPath, access | O_NOFOLLOW | O_NONBLOCK);"),
  "retained_ledger_open_requires_nonblock");
const sidecarRegion=code.slice(
  code.indexOf("function openPinnedPrivateSidecarV1("),
  code.indexOf("function assertPinnedLedgerVisibleV1("),
);
assert.ok(sidecarRegion.includes(
  "fd = fs.openSync(pinnedPath, fs.constants.O_RDONLY | O_NOFOLLOW | O_NONBLOCK);"),
  "retained_private_sidecar_open_requires_nonblock");
assert.ok(typeof fs.constants.O_NONBLOCK==="number" &&
          typeof fs.constants.O_NOFOLLOW==="number",
  "linux_nonblocking_nofollow_required");

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-capacity-fifo-negative-"));
try {
  fs.chmodSync(tmp,0o700);
  const request=path.join(tmp,"requests.jsonl");
  const displaced=request+".regular";
  const codeLabel="buy_void_verified_payment_capacity_requests";
  const record=Object.freeze({
    request_id:"synthetic_noncustomer_fifonegative",
    quoted_void:2,
    source_chain:"base",
  });
  fs.writeFileSync(request,JSON.stringify(record)+"\n",{mode:0o600});
  const normal=testOnlyReadStrictCapacityLedgerFileV1(request,codeLabel,()=>{});
  assert.equal(normal.length,1,"ordinary_regular_jsonl_read_must_succeed");
  assert.equal(normal[0].request_id,record.request_id);

  // The hook runs at the production open boundary. Check flags *before*
  // substituting a real FIFO; a future regression to blocking open fails
  // immediately rather than hanging CI.
  const openOriginal=fs.openSync;
  let fifoSwapObserved=0;
  try {
    (fs as any).openSync=function(...args:any[]):number {
      const candidate=String(args[0]);
      if (candidate.endsWith("/requests.jsonl")) {
        const flags=Number(args[1]);
        assert.ok((flags&fs.constants.O_NONBLOCK)!==0,
          "fifo_open_must_be_nonblocking_before_substitution");
        assert.ok((flags&fs.constants.O_NOFOLLOW)!==0,
          "fifo_open_must_remain_nofollow");
        fifoSwapObserved++;
        assert.equal(fifoSwapObserved,1,"one_exact_request_open");
        fs.renameSync(request,displaced);
        const mkfifo=spawnSync("/usr/bin/mkfifo",["-m","600",request],{
          timeout:3000,encoding:"utf8",
          env:{PATH:"/usr/bin:/bin",LANG:"C",LC_ALL:"C"},
        });
        assert.equal(mkfifo.error,undefined,"bounded_fifo_creation");
        assert.equal(mkfifo.status,0,"synthetic_fifo_create_failed");
        assert.equal(fs.lstatSync(request).isFIFO(),true,
          "fifo_swap_fixture_not_created");
      }
      return (openOriginal as any).apply(fs,args);
    };
    assert.throws(
      ()=>testOnlyReadStrictCapacityLedgerFileV1(request,codeLabel,()=>{}),
      /buy_void_verified_payment_capacity_requests_file_invalid/u,
      "open_regular_to_fifo_must_fail_closed_without_blocking",
    );
  } finally {
    (fs as any).openSync=openOriginal;
  }
  assert.equal(fifoSwapObserved,1,"actual_production_open_must_be_exercised");
  assert.equal(fs.lstatSync(displaced).isFile(),true,
    "unrelated_regular_file_preserved");
  assert.equal(fs.lstatSync(request).isFIFO(),true,
    "adversarial_fifo_must_not_be_replaced_by_reader");
} finally {
  fs.rmSync(tmp,{recursive:true,force:true});
}

console.log("VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_FIFO_NONBLOCKING_V2_GREEN");
console.log("historical_capacity_source_reconstructed=true");
console.log("two_retained_regular_file_opens_nonblocking=true");
console.log("fifo_swap_at_real_production_open_rejected=true");
console.log("descriptor_type_and_generation_checks_preserved=true");
console.log("test_only_temp_filesystem_mutation=true");
console.log("protected_host_read=false");
console.log("production_gate_ready=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
