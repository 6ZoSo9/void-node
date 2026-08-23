import { readFileSync } from "node:fs";
import {
  Mempool,
  VOID_DUPLICATE_TRANSACTION_CODE,
  VOID_MEMPOOL_RAW_INDEX_MUTATION_FORBIDDEN,
  VOID_MEMPOOL_SELECTED_MUTATION_FORBIDDEN,
} from "../src/chain/mempool.js";

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

function expectMessage(fn: () => unknown, message: string, label: string): void {
  let caught: any = null;
  try { fn(); } catch (err) { caught = err; }
  assert(caught, `${label}: expected rejection`);
  assert(String(caught?.message || "") === message, `${label}: expected ${message}, got ${String(caught?.message || "")}`);
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
const mempoolSource = readFileSync("src/chain/mempool.ts", "utf8");
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
assert(nodeCoreSource.includes('import { Mempool } from "./chain/mempool.js"'), "Node no longer imports canonical Mempool");
assert(nodeCoreSource.includes("readonly mempool = new Mempool();"), "live Node no longer constructs canonical Mempool");

const queueReaderStart = indexSource.indexOf("function takeFromQueues(node:any, cap:number)");
const queueReaderEnd = indexSource.indexOf("function takeFromMempoolJsonl", queueReaderStart + 1);
assert(queueReaderStart >= 0 && queueReaderEnd > queueReaderStart, "V2FS takeFromQueues source block not found");
const queueReader = indexSource.slice(queueReaderStart, queueReaderEnd);
assert(queueReader.includes("node.mempool.beginSelection(takeMp)"), "V2FS must select through Mempool.beginSelection");
assert(!queueReader.includes("pushPicked(mp.splice(0, takeMp));"), "V2FS raw mempool splice bypass remains");

const commitStart = indexSource.indexOf("async function commitOnce(max:number, allowEmpty:boolean)", queueReaderEnd);
const commitEnd = indexSource.indexOf("function mount(){", commitStart + 1);
assert(commitStart >= 0 && commitEnd > commitStart, "V2FS commitOnce source block not found");
const commitBlock = indexSource.slice(commitStart, commitEnd);
const durableSave = commitBlock.indexOf("await fn.call(store, blk);");
const advancedCheck = commitBlock.indexOf("const advanced = (to >= next);", durableSave);
const commitSelection = commitBlock.indexOf("node.mempool.commitSelection();", advancedCheck);
const finalCatch = commitBlock.indexOf("} catch (e:any){", commitSelection);
const rollbackSelection = commitBlock.indexOf("node.mempool.rollbackSelection();", finalCatch);
assert(durableSave >= 0 && advancedCheck > durableSave, "durable save/head verification ordering missing");
assert(commitSelection > advancedCheck, "identity release must occur only after durable head verification");
assert(finalCatch > commitSelection && rollbackSelection > finalCatch, "failure path must rollback selection marker");

assert(mempoolSource.includes("private readonly canonicalIdentities = new Set<string>();"), "persistent canonical identity Set missing");
assert(!mempoolSource.includes("for (const current of this)"), "admission still rescans queue");
assert(mempoolSource.includes("new Proxy(this.queueTarget, handler)"), "raw queue mutation guard Proxy missing");
assert(!mempoolSource.includes("Object.setPrototypeOf(value"), "caller-owned Array adoption remains");

const h1 = "a".repeat(64);
const h2 = "b".repeat(64);
const h3 = "c".repeat(64);
const h4 = "d".repeat(64);

const canonical: any = new Mempool();
assert(Array.isArray(canonical.txs), "live Mempool must remain Array-compatible");
const sharedQueue = canonical.txs;
assert(canonical.peekAll().length === 0, "fresh queue must be empty");

let oldReads = 0;
const oldTx: any = { get hash() { oldReads++; return h1; }, body: { tracked: 1 } };
canonical.txs.push(oldTx);
const oldReadsAfterAdmission = oldReads;
let newReads = 0;
const newTx: any = { get hash() { newReads++; return h2; }, body: { tracked: 2 } };
canonical.txs.push(newTx);
assert(oldReads === oldReadsAfterAdmission, "new admission reread existing queue identity; admission is not O(1)");
assert(newReads > 0, "new admission did not read incoming canonical identity");
assert(canonical.txs.length === 2, "O(1) admission setup failed");

expectDuplicate(() => canonical.txs.push({ hash: h1.toUpperCase() }), "direct duplicate");
assert(canonical.txs.length === 2, "duplicate mutated queue");
expectMessage(() => { canonical.txs[0] = { hash: h3 }; }, VOID_MEMPOOL_RAW_INDEX_MUTATION_FORBIDDEN, "raw index assignment");
assert(canonical.txs[0] === oldTx, "raw index rejection changed queue");

canonical.clear();
assert(canonical.txs === sharedQueue && canonical.txs.length === 0, "clear detached or failed shared queue");
const replacement: any[] = [{ hash: h3, body: { replacement: true } }];
canonical.txs = replacement;
assert(canonical.txs === sharedQueue, "replacement changed guarded queue identity");
assert(canonical.txs !== replacement, "caller-owned replacement became mutation authority");
replacement.push({ hash: h4 });
assert(canonical.txs.length === 1 && canonical.txs[0]?.hash === h3, "caller-owned replacement mutation leaked into mempool");
expectDuplicate(() => canonical.txs.push({ hash: `0x${h3.toUpperCase()}` }), "replacement duplicate");
const duplicateReplacement: any[] = [{ hash: h1 }, { hash: `0x${h1.toUpperCase()}` }];
expectDuplicate(() => { canonical.txs = duplicateReplacement; }, "duplicate replacement");
assert(canonical.txs.length === 1 && canonical.txs[0]?.hash === h3, "failed replacement changed queue");

canonical.clear();
let r = appendLikeCanonicalHotpath(canonical, { hash: h1, body: { via: "http" } });
assert(r.ok === true && canonical.txs.length === 1, "HTTP-like admission failed");
canonical.txs.push({ hash: h2, body: { second: true } });
const selected = canonical.beginSelection(1);
assert(selected.length === 1 && selected[0]?.hash === h1, "selection did not pick first pending tx");
assert(canonical.selectionSize() === 1 && canonical.txs.length === 2, "selection must remain non-destructive/reserved");
expectDuplicate(() => canonical.txs.push({ hash: h1.toUpperCase() }), "in-flight duplicate");
expectMessage(() => canonical.txs.splice(0, 1), VOID_MEMPOOL_SELECTED_MUTATION_FORBIDDEN, "selected raw splice");
assert(canonical.txs.length === 2, "selected raw splice mutated pending queue");
const rolledBack = canonical.rollbackSelection();
assert(rolledBack.length === 1 && canonical.selectionSize() === 0 && canonical.txs.length === 2, "rollback must retain pending tx");
expectDuplicate(() => canonical.txs.push({ hash: h1 }), "post-rollback duplicate");

canonical.beginSelection(1);
const committed = canonical.commitSelection();
assert(committed.length === 1 && committed[0]?.hash === h1, "commitSelection returned wrong tx");
assert(canonical.txs.length === 1 && canonical.txs[0]?.hash === h2, "commitSelection did not release exactly selected pending tx");
canonical.txs.push({ hash: h1, body: { readmitAfterDurableCommit: true } });
assert(canonical.txs.length === 2, "identity was not released after commitSelection");

canonical.clear();
expectDuplicate(() => canonical.txs.push({ hash: h1 }, { hash: h1 }), "batch duplicate");
assert(canonical.txs.length === 0, "duplicate batch partially mutated queue");
canonical.txs.push({ hash: h1 });
const removed = canonical.txs.splice(0, 1);
assert(removed.length === 1 && canonical.txs.length === 0, "tracked raw splice failed");
canonical.txs.push({ hash: h1 });
assert(canonical.txs.length === 1, "tracked raw splice did not release removed identity");

canonical.clear();
canonical.push({ hash: `0x${h1}`, body: { invalid: true } });
canonical.push({ hash: "not-a-hash", body: { invalid: true } });
assert(canonical.txs.length === 0, "strict internal hash admission regressed");
canonical.push({ hash: h1, body: { valid: true } });
expectDuplicate(() => canonical.push({ hash: h1.toUpperCase(), body: { duplicate: true } }), "internal duplicate");
canonical.clear();
canonical.txs.push({ kind: "legacy_raw_compat_v1", nonce: "raw-no-hash" });
assert(canonical.txs.length === 1, "legacy noncanonical compatibility entry was rejected");

assert(appendRejectStatus >= 0, "canonical append-error status mapping missing");
assert(!indexSource.includes("VOID_V2FS_COMMIT_LIFECYCLE_INSPECT_BEGIN"), "temporary V2FS source diagnostic remains");

console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_O1_IDENTITY_INDEX_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_RAW_MUTATION_GUARD_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_INFLIGHT_RESERVATION_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_DURABLE_RELEASE_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_ROLLBACK_RETAINED_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_ROUTE_TO_V2FS_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_STRICT_INTERNAL_HASH_ADMISSION_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_DUPLICATE_HTTP_STATUS=503");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_PROOF_GREEN");
