import { readFileSync } from "node:fs";
import { Mempool, VOID_DUPLICATE_TRANSACTION_CODE } from "../src/chain/mempool.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectDuplicate(fn: () => unknown, label: string): void {
  let caught: any = null;
  try { fn(); } catch (err) { caught = err; }
  assert(caught, `${label}: expected duplicate rejection`);
  assert(String(caught?.message || "") === "duplicate_transaction", `${label}: wrong duplicate message`);
  assert(String(caught?.code || "") === VOID_DUPLICATE_TRANSACTION_CODE, `${label}: wrong duplicate code`);
}

function appendLikeCanonicalHotpath(mp: any, tx: any) {
  try {
    if (Array.isArray(mp?.txs)) {
      const before = mp.txs.length;
      mp.txs.push(tx);
      const after = mp.txs.length;
      if (after !== before + 1) {
        return { ok: false, error: "append_postcondition_failed", src: "node.mempool.txs", count: after };
      }
      return { ok: true, src: "node.mempool.txs", count: after };
    }
    if (typeof mp?.push === "function") {
      const before = Array.isArray(mp?.peekAll?.()) ? mp.peekAll().length : -1;
      mp.push(tx);
      const after = Array.isArray(mp?.peekAll?.()) ? mp.peekAll().length : -1;
      if (before >= 0 && after !== before + 1) {
        return { ok: false, error: "append_postcondition_failed", src: "node.mempool.push", count: after };
      }
      return { ok: true, src: "node.mempool.push", count: after };
    }
    return { ok: false, error: "unsupported_mempool_shape", src: "unknown", count: -1 };
  } catch (err: any) {
    return { ok: false, error: String(err?.message || err), code: String(err?.code || ""), src: "throw", count: -1 };
  }
}

const indexSource = readFileSync("src/index.ts", "utf8");
const nodeCoreSource = readFileSync("src/node_core.ts", "utf8");
const hotpathStart = indexSource.indexOf("/* VOID_CANONICAL_TX_HOTPATH_V1");
const hotpathEnd = indexSource.indexOf("/* VOID_CANONICAL_TX_HOTPATH_V1_LATE_PRUNE_AND_COUNT_V1", hotpathStart + 1);
assert(hotpathStart >= 0 && hotpathEnd > hotpathStart, "canonical tx hotpath source block not found");
const hotpath = indexSource.slice(hotpathStart, hotpathEnd);

const directArrayBranch = hotpath.indexOf("if (Array.isArray(mp.txs))");
const directArrayPush = hotpath.indexOf("mp.txs.push(tx)", directArrayBranch);
const methodBranch = hotpath.indexOf('if (typeof mp.push === "function")');
const methodPush = hotpath.indexOf("mp.push(tx)", methodBranch);
const objectReject = hotpath.indexOf('error: "body_must_be_json_object"');
const normalize = hotpath.indexOf("const tx = normalizeTx(body)");
const append = hotpath.indexOf("const appended = appendCanonical(tx)");
const appendReject = hotpath.indexOf("if (!appended.ok)");
const appendRejectStatus = hotpath.indexOf("return res.status(503).json", appendReject);
const acceptedCounter = hotpath.indexOf("S.accepted_total =", appendReject);
const successResponse = hotpath.indexOf("return res.status(200).json", acceptedCounter);

assert(directArrayBranch >= 0 && directArrayPush > directArrayBranch, "hotpath direct mempool.txs push contract missing");
assert(methodBranch >= 0 && methodPush > methodBranch, "hotpath mempool.push fallback contract missing");
assert(objectReject >= 0 && normalize > objectReject, "object-shape rejection must precede normalization");
assert(append > normalize && appendReject > append, "append result gate missing");
assert(appendRejectStatus > appendReject && acceptedCounter > appendRejectStatus, "accepted counter must remain after append rejection gate");
assert(successResponse > acceptedCounter, "success response must remain after accepted counter");
assert(hotpath.includes('handled: "txsubmit_canonical_v1"'), "canonical handled marker missing");
assert(hotpath.includes('appends_to: "live node.mempool only"'), "canonical mempool policy marker missing");
assert(hotpath.includes("calls_globalEnqueueTx: false"), "global enqueue negative policy missing");

assert(nodeCoreSource.includes('import { Mempool } from "./chain/mempool.js"'), "Node no longer imports canonical Mempool");
assert(nodeCoreSource.includes("readonly mempool = new Mempool();"), "live Node no longer constructs canonical Mempool");

const queueReaderStart = indexSource.indexOf("function takeFromQueues(node:any, cap:number)");
const queueReaderEnd = indexSource.indexOf("function takeFromMempoolJsonl", queueReaderStart + 1);
assert(queueReaderStart >= 0 && queueReaderEnd > queueReaderStart, "V2FS takeFromQueues source block not found");
const queueReader = indexSource.slice(queueReaderStart, queueReaderEnd);
assert(queueReader.includes("const mp = node?.mempool?.txs;"), "V2FS no longer selects node.mempool.txs");
assert(queueReader.includes("pushPicked(mp.splice(0, takeMp));"), "V2FS no longer consumes node.mempool.txs by splice");
const v2fsTakeCall = indexSource.indexOf("const txsA = takeFromQueues(node, max);", queueReaderEnd);
assert(v2fsTakeCall > queueReaderEnd, "V2FS commit path no longer consumes takeFromQueues before file fallback");

const h1 = "a".repeat(64);
const h2 = "b".repeat(64);
const h3 = "c".repeat(64);
const h4 = "d".repeat(64);

const canonical: any = new Mempool();
assert(Array.isArray(canonical.txs), "live Mempool must expose producer-visible txs at construction");
const sharedQueue = canonical.txs;
assert(canonical.peekAll().length === 0, "fresh shared queue must be empty");

let r = appendLikeCanonicalHotpath(canonical, { hash: h1, body: { n: 1 } });
assert(r.ok === true && canonical.txs.length === 1, "first canonical HTTP admission failed");
assert(canonical.txs === sharedQueue, "HTTP admission changed producer queue identity");
assert(canonical.peekAll().length === 1 && canonical.peekAll()[0]?.hash === h1,
  "HTTP admission is not visible through canonical Mempool view");

const v2fsTaken = canonical.txs.splice(0, 1);
assert(v2fsTaken.length === 1 && v2fsTaken[0]?.hash === h1, "V2FS model did not consume admitted tx");
assert(canonical.txs === sharedQueue && canonical.txs.length === 0, "V2FS model changed queue identity or failed to drain");
assert(canonical.peekAll().length === 0, "V2FS drain not reflected in canonical Mempool view");

canonical.push({ hash: h2, body: { via: "push" } });
assert(canonical.txs === sharedQueue && canonical.txs.length === 1, "Mempool.push wrote a second queue");
assert(canonical.peekAll()[0]?.hash === h2, "push result missing from canonical view");
const nodeTaken = canonical.take(1);
assert(nodeTaken.length === 1 && nodeTaken[0]?.hash === h2, "Mempool.take did not consume shared queue");
assert(canonical.txs === sharedQueue && canonical.txs.length === 0, "Mempool.take detached or failed to drain shared queue");

r = appendLikeCanonicalHotpath(canonical, { hash: h3, body: { n: 3 } });
assert(r.ok === true && canonical.txs.length === 1, "unique pending admission failed");
const beforeDuplicate = canonical.peekAll();
r = appendLikeCanonicalHotpath(canonical, { hash: h3.toUpperCase(), body: { n: 4 } });
assert(r.ok === false, "duplicate direct-array admission returned success");
assert(r.error === "duplicate_transaction" && r.code === VOID_DUPLICATE_TRANSACTION_CODE, "duplicate direct-array rejection identity mismatch");
assert(canonical.txs.length === beforeDuplicate.length, "duplicate admission mutated producer queue length");
assert(canonical.peekAll()[0]?.hash === beforeDuplicate[0]?.hash, "duplicate admission mutated producer queue content");
expectDuplicate(() => sharedQueue.push({ hash: `0x${h3.toUpperCase()}` }), "external shared-array duplicate");
assert(canonical.txs.length === beforeDuplicate.length, "external duplicate mutated producer queue");

const batchBefore = canonical.txs.length;
expectDuplicate(() => canonical.txs.push({ hash: h4 }, { hash: h4 }), "shared-queue batch duplicate");
assert(canonical.txs.length === batchBefore, "duplicate batch partially mutated producer queue");

canonical.txs.push({ kind: "legacy_raw_compat_v1", nonce: "raw-no-hash" });
assert(canonical.txs.length === batchBefore + 1, "legacy raw compatibility entry was newly rejected");
canonical.clear();
assert(canonical.txs === sharedQueue && canonical.txs.length === 0, "clear did not preserve and empty shared queue");

const rawReplacement: any[] = [{ hash: h4, body: { replacement: true } }];
const replacementAssignmentValue = (canonical.txs = rawReplacement);
assert(replacementAssignmentValue === rawReplacement, "replacement assignment expression identity changed");
assert(canonical.txs === rawReplacement, "replacement did not adopt exact assigned array");
assert(canonical.peekAll()[0]?.hash === h4, "replacement not visible through canonical view");
expectDuplicate(() => rawReplacement.unshift({ hash: h4.toUpperCase() }), "replacement duplicate");
assert(canonical.txs.length === 1, "duplicate replacement insertion mutated queue");

const duplicateReplacement: any[] = [{ hash: h1 }, { hash: `0x${h1.toUpperCase()}` }];
expectDuplicate(() => { canonical.txs = duplicateReplacement; }, "duplicate queue replacement");
assert(canonical.txs === rawReplacement, "failed replacement changed queue authority");
assert(Object.getPrototypeOf(duplicateReplacement) === Array.prototype, "failed replacement mutated candidate prototype");

canonical.clear();
canonical.push({ hash: `0x${h1}`, body: { prefixedInvalid: true } });
canonical.push({ hash: "not-a-hash", body: { invalid: true } });
assert(canonical.txs.length === 0, "invalid internal hash changed historical no-op behavior");
canonical.push({ hash: h1, body: { valid: true } });
expectDuplicate(() => canonical.push({ hash: h1.toUpperCase(), body: { duplicate: true } }), "internal duplicate");
assert(canonical.txs.length === 1, "internal duplicate mutated producer queue");
const drained = canonical.drain();
assert(drained.length === 1 && canonical.txs.length === 0, "drain failed shared pending queue");
canonical.push({ hash: h1, body: { readmit: true } });
assert(canonical.txs.length === 1, "post-drain re-admission should remain allowed");

assert(appendRejectStatus >= 0, "canonical append-error status mapping missing");

console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_SINGLE_QUEUE_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_ROUTE_TO_V2FS_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_NODE_PUSH_SHARED_QUEUE_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_ASSIGNMENT_IDENTITY_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_STRICT_INTERNAL_HASH_ADMISSION_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_DUPLICATE_HTTP_STATUS=503");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_PENDING_ONLY=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_LEGACY_RAW_COMPAT_PRESERVED=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_PROOF_GREEN");

// Temporary source-inspection output for the exact V2FS selection -> durable-commit lifecycle.
// This prints repository source only; it performs no runtime mutation.
const inspectStart = Math.max(queueReaderStart, v2fsTakeCall - 5000);
const inspectEnd = Math.min(indexSource.length, v2fsTakeCall + 14000);
console.log("VOID_V2FS_COMMIT_LIFECYCLE_INSPECT_BEGIN");
console.log(indexSource.slice(inspectStart, inspectEnd));
console.log("VOID_V2FS_COMMIT_LIFECYCLE_INSPECT_END");
