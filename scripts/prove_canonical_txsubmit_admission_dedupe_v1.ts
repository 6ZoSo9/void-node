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
const start = indexSource.indexOf("/* VOID_CANONICAL_TX_HOTPATH_V1");
const end = indexSource.indexOf("/* VOID_CANONICAL_TX_HOTPATH_V1_LATE_PRUNE_AND_COUNT_V1", start + 1);
assert(start >= 0 && end > start, "canonical tx hotpath source block not found");
const hotpath = indexSource.slice(start, end);

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

const h1 = "a".repeat(64);
const h2 = "b".repeat(64);
const h3 = "c".repeat(64);
const h4 = "d".repeat(64);

// Exact direct-array path preferred by the current canonical hotpath.
const compat: any = new Mempool();
assert(Array.isArray(compat.txs), "compat txs must remain Array.isArray-compatible");
let r = appendLikeCanonicalHotpath(compat, { hash: h1, body: { n: 1 } });
assert(r.ok === true && compat.txs.length === 1, "first canonical direct-array admission failed");
const beforeDuplicate = compat.txs.slice();
r = appendLikeCanonicalHotpath(compat, { hash: h1.toUpperCase(), body: { n: 2 } });
assert(r.ok === false, "duplicate direct-array admission returned success");
assert(r.error === "duplicate_transaction" && r.code === VOID_DUPLICATE_TRANSACTION_CODE, "duplicate direct-array rejection identity mismatch");
assert(compat.txs.length === beforeDuplicate.length, "duplicate direct-array admission mutated length");
assert(compat.txs[0]?.hash === beforeDuplicate[0]?.hash, "duplicate direct-array admission mutated existing entry");

r = appendLikeCanonicalHotpath(compat, { hash: h2, body: { n: 3 } });
assert(r.ok === true && compat.txs.length === 2, "distinct canonical direct-array admission failed");

// Batch insertion must be atomic when the incoming batch contains a duplicate.
const batchBefore = compat.txs.length;
expectDuplicate(() => compat.txs.push({ hash: h3 }, { hash: h3 }), "compat batch duplicate");
assert(compat.txs.length === batchBefore, "duplicate batch partially mutated compat queue");

// Legacy noncanonical entries preserve pre-existing compatibility behavior.
compat.txs.push({ kind: "legacy_raw_compat_v1", nonce: "raw-no-hash" });
assert(compat.txs.length === batchBefore + 1, "legacy raw compatibility entry was newly rejected");

// Replacement is create-first: duplicate replacement fails without changing the old queue.
const stableCompat = compat.txs;
const stableLength = stableCompat.length;
expectDuplicate(() => { compat.txs = [{ hash: h3 }, { hash: `0x${h3.toUpperCase()}` }]; }, "compat replacement duplicate");
assert(compat.txs === stableCompat && compat.txs.length === stableLength, "failed replacement changed compat authority");

// A unique replacement remains guarded afterwards.
compat.txs = [{ hash: h4, body: { replacement: true } }];
assert(Array.isArray(compat.txs) && compat.txs.length === 1, "unique replacement failed");
expectDuplicate(() => compat.txs.unshift({ hash: h4.toUpperCase() }), "compat unshift duplicate");
assert(compat.txs.length === 1, "duplicate unshift mutated compat queue");

// Pending-only semantics: once producer-visible entry is actually drained, same identity may be admitted again.
compat.txs.splice(0, 1);
assert(compat.txs.length === 0, "compat drain fixture failed");
compat.txs.push({ hash: h4, body: { readmit: true } });
assert(compat.txs.length === 1, "post-drain re-admission should remain allowed");

// Internal q path used by Node.acceptTx and other non-compat consumers gets the same pending duplicate guard.
const internal: any = new Mempool();
internal.push({ hash: h1, body: { q: 1 } });
assert(internal.peekAll().length === 1, "internal first admission failed");
expectDuplicate(() => internal.push({ hash: h1.toUpperCase(), body: { q: 2 } }), "internal duplicate");
assert(internal.peekAll().length === 1, "internal duplicate mutated queue");
internal.push({ hash: "not-a-hash", body: { invalid: true } });
assert(internal.peekAll().length === 1, "invalid internal hash changed legacy no-op behavior");
internal.drain();
internal.push({ hash: h1, body: { q: 3 } });
assert(internal.peekAll().length === 1, "internal post-drain re-admission failed");

// The current handler maps append exceptions to a non-success 503. This PR intentionally
// hardens truth/no-second-mutation without claiming a new 409 response contract.
assert(appendRejectStatus >= 0, "canonical append-error status mapping missing");

console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_DIRECT_ARRAY_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_INTERNAL_QUEUE_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_DUPLICATE_HTTP_STATUS=503");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_PENDING_ONLY=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_LEGACY_RAW_COMPAT_PRESERVED=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_PROOF_GREEN");
