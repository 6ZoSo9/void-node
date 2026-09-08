import { readFileSync } from "node:fs";
import {
  Mempool,
  VOID_DUPLICATE_TRANSACTION_CODE,
  VOID_MEMPOOL_RAW_INDEX_MUTATION_FORBIDDEN,
  VOID_MEMPOOL_RAW_HASH_MUTATION_FORBIDDEN,
  VOID_MEMPOOL_RAW_PAYLOAD_MUTATION_FORBIDDEN,
  VOID_MEMPOOL_LENGTH_GROWTH_FORBIDDEN,
  VOID_MEMPOOL_REENTRANT_MUTATION_FORBIDDEN,
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
assert(!queueReader.includes("node?.txQueue"), "V2FS legacy txQueue candidate fallback remains");
assert(!queueReader.includes("q.splice(0, takeQ)"), "V2FS legacy txQueue destructive candidate drain remains");

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
assert(mempoolSource.includes("ownCanonicalCompatItem"), "owned queue-entry identity snapshot missing");
assert(mempoolSource.includes("canonicalHashObservationOf"), "single hash observation helper missing");
const ownItemSourceStart = mempoolSource.indexOf("function ownCanonicalCompatItem");
const ownItemSourceEnd = mempoolSource.indexOf("function numericArrayIndex", ownItemSourceStart);
assert(ownItemSourceStart >= 0 && ownItemSourceEnd > ownItemSourceStart, "owned queue-entry source block missing");
const ownItemSource = mempoolSource.slice(ownItemSourceStart, ownItemSourceEnd);
assert(!ownItemSource.includes("tx?.hash"), "owned item directly rereads caller hash");
assert(!ownItemSource.includes("String(rawHash)"), "owned item re-stringifies caller hash");
assert(mempoolSource.includes("VOID_MEMPOOL_RAW_HASH_MUTATION_FORBIDDEN"), "queued hash mutation guard missing");
assert(mempoolSource.includes("VOID_MEMPOOL_RAW_PAYLOAD_MUTATION_FORBIDDEN"), "queued payload mutation guard missing");
assert(mempoolSource.includes("VOID_MEMPOOL_LENGTH_GROWTH_FORBIDDEN"), "queue length growth guard missing");
assert(mempoolSource.includes("snapshotCanonicalPayload"), "canonical payload ownership snapshot missing");
assert(mempoolSource.includes("if (next > this.queueTarget.length)"), "queue length growth rejection missing");
assert(mempoolSource.includes("private mutationLocked = false;"), "native sort reentrancy lock missing");
assert(mempoolSource.includes("private withMutationEpoch<T>"), "general mutation epoch guard missing");
assert(mempoolSource.includes("private compatSpliceLocked"), "locked splice authority missing");
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
assert(newReads === 1, `new admission must observe caller hash exactly once, got ${newReads}`);
assert(canonical.txs.length === 2, "O(1) admission setup failed");

const morphGetterProbe: any = new Mempool();
let morphGetterReads = 0;
const morphGetterBody: any = { nested: { n: 1 } };
const morphGetterTx: any = {
  get hash() {
    morphGetterReads++;
    return morphGetterReads === 1 ? undefined : h1;
  },
  body: morphGetterBody,
};
morphGetterProbe.txs.push(morphGetterTx);
assert(morphGetterReads === 1, `stateful hash getter observed ${morphGetterReads} times`);
assert(morphGetterProbe.txs.length === 1, "stateful getter admission changed cardinality");
assert(morphGetterProbe.txs[0]?.hash === undefined, "noncanonical first hash observation morphed into canonical identity");
morphGetterBody.nested.n = 2;
assert(morphGetterProbe.txs[0]?.body?.nested?.n === 2, "noncanonical compatibility entry unexpectedly became canonical-frozen");
morphGetterProbe.txs.push({ hash: h1, body: { canonicalAfterLegacySnapshot: true } });
assert(morphGetterProbe.txs.filter((tx: any) => tx?.hash === h1).length === 1, "single-read getter snapshot blocked valid later canonical H");
expectDuplicate(() => morphGetterProbe.txs.push({ hash: h1 }), "post-stateful-getter canonical duplicate");

const morphStringProbe: any = new Mempool();
let morphStringCalls = 0;
const morphStringHash: any = {
  toString() {
    morphStringCalls++;
    return morphStringCalls === 1 ? "not-a-canonical-hash" : h2;
  },
};
morphStringProbe.txs.push({ hash: morphStringHash, body: { legacy: true } });
assert(morphStringCalls === 1, `stateful hash string coercion observed ${morphStringCalls} times`);
assert(morphStringProbe.txs[0]?.hash === "not-a-canonical-hash", "noncanonical first string snapshot morphed into canonical identity");
morphStringProbe.txs.push({ hash: h2, body: { canonicalAfterStringSnapshot: true } });
assert(morphStringProbe.txs.filter((tx: any) => tx?.hash === h2).length === 1, "single-read string snapshot blocked valid later canonical H");
expectDuplicate(() => morphStringProbe.txs.push({ hash: h2 }), "post-stateful-string canonical duplicate");

function assertSingleReserved(mp: any, hash: string, label: string): void {
  assert(mp.txs.length === 1 && mp.txs[0]?.hash === hash, `${label}: queue changed`);
  expectDuplicate(() => mp.txs.push({ hash }), `${label}: identity reservation changed`);
  assert(mp.txs.length === 1 && mp.txs[0]?.hash === hash, `${label}: duplicate probe mutated queue`);
}

const pushGetterProbe: any = new Mempool();
pushGetterProbe.txs.push({ hash: h1 });
const pushGetterTx: any = {
  get hash() {
    pushGetterProbe.txs.pop();
    return h2;
  },
};
expectMessage(
  () => pushGetterProbe.txs.push(pushGetterTx),
  VOID_MEMPOOL_REENTRANT_MUTATION_FORBIDDEN,
  "direct push hash getter reentrancy",
);
assertSingleReserved(pushGetterProbe, h1, "direct push hash getter");

const unshiftGetterProbe: any = new Mempool();
unshiftGetterProbe.txs.push({ hash: h1 });
const unshiftGetterTx: any = {
  get hash() {
    unshiftGetterProbe.txs.shift();
    return h2;
  },
};
expectMessage(
  () => unshiftGetterProbe.txs.unshift(unshiftGetterTx),
  VOID_MEMPOOL_REENTRANT_MUTATION_FORBIDDEN,
  "direct unshift hash getter reentrancy",
);
assertSingleReserved(unshiftGetterProbe, h1, "direct unshift hash getter");

const strictPushProbe: any = new Mempool();
strictPushProbe.txs.push({ hash: h1 });
const strictGetterTx: any = {
  get hash() {
    strictPushProbe.clear();
    return h2;
  },
  body: { strict: true },
};
expectMessage(
  () => strictPushProbe.push(strictGetterTx),
  VOID_MEMPOOL_REENTRANT_MUTATION_FORBIDDEN,
  "strict Mempool.push hash getter reentrancy",
);
assertSingleReserved(strictPushProbe, h1, "strict Mempool.push hash getter");

const hashCoercionProbe: any = new Mempool();
hashCoercionProbe.txs.push({ hash: h1 });
const coercibleHash: any = {
  toString() {
    hashCoercionProbe.txs.pop();
    return h2;
  },
};
expectMessage(
  () => hashCoercionProbe.txs.push({ hash: coercibleHash }),
  VOID_MEMPOOL_REENTRANT_MUTATION_FORBIDDEN,
  "hash string coercion reentrancy",
);
assertSingleReserved(hashCoercionProbe, h1, "hash string coercion");

const spliceStartProbe: any = new Mempool();
spliceStartProbe.txs.push({ hash: h1 });
const spliceStart: any = {
  valueOf() {
    spliceStartProbe.txs.pop();
    return 0;
  },
};
expectMessage(
  () => spliceStartProbe.txs.splice(spliceStart, 0, { hash: h2 }),
  VOID_MEMPOOL_REENTRANT_MUTATION_FORBIDDEN,
  "splice start coercion reentrancy",
);
assertSingleReserved(spliceStartProbe, h1, "splice start coercion");

const spliceDeleteProbe: any = new Mempool();
spliceDeleteProbe.txs.push({ hash: h1 });
const spliceDelete: any = {
  valueOf() {
    spliceDeleteProbe.txs.pop();
    return 0;
  },
};
expectMessage(
  () => spliceDeleteProbe.txs.splice(0, spliceDelete, { hash: h2 }),
  VOID_MEMPOOL_REENTRANT_MUTATION_FORBIDDEN,
  "splice deleteCount coercion reentrancy",
);
assertSingleReserved(spliceDeleteProbe, h1, "splice deleteCount coercion");

const lengthCoercionProbe: any = new Mempool();
lengthCoercionProbe.txs.push({ hash: h1 });
const coercedLength: any = {
  valueOf() {
    lengthCoercionProbe.txs.pop();
    return 0;
  },
};
expectMessage(
  () => { lengthCoercionProbe.txs.length = coercedLength; },
  VOID_MEMPOOL_REENTRANT_MUTATION_FORBIDDEN,
  "length coercion reentrancy",
);
assertSingleReserved(lengthCoercionProbe, h1, "length coercion");

const replacementIteratorProbe: any = new Mempool();
replacementIteratorProbe.txs.push({ hash: h1 });
const replacementIterator: any = new Proxy([{ hash: h2 }], {
  get(target, prop, receiver) {
    if (prop === Symbol.iterator) replacementIteratorProbe.txs.pop();
    return Reflect.get(target, prop, receiver);
  },
});
expectMessage(
  () => { replacementIteratorProbe.txs = replacementIterator; },
  VOID_MEMPOOL_REENTRANT_MUTATION_FORBIDDEN,
  "replacement iterator reentrancy",
);
assertSingleReserved(replacementIteratorProbe, h1, "replacement iterator");

const descriptorProbe: any = new Mempool();
descriptorProbe.txs.push({ hash: h1 });
const descriptorEntry: any = new Proxy({ hash: h2 }, {
  ownKeys(target) {
    descriptorProbe.txs.pop();
    return Reflect.ownKeys(target);
  },
});
expectMessage(
  () => descriptorProbe.txs.push(descriptorEntry),
  VOID_MEMPOOL_REENTRANT_MUTATION_FORBIDDEN,
  "entry descriptor reentrancy",
);
assertSingleReserved(descriptorProbe, h1, "entry descriptor");

const beginCoercionProbe: any = new Mempool();
beginCoercionProbe.txs.push({ hash: h1 });
const beginMax: any = {
  valueOf() {
    beginCoercionProbe.txs.pop();
    return 1;
  },
};
expectMessage(
  () => beginCoercionProbe.beginSelection(beginMax),
  VOID_MEMPOOL_REENTRANT_MUTATION_FORBIDDEN,
  "beginSelection max coercion reentrancy",
);
assertSingleReserved(beginCoercionProbe, h1, "beginSelection max coercion");

const drainCoercionProbe: any = new Mempool();
drainCoercionProbe.txs.push({ hash: h1 });
const drainMax: any = {
  valueOf() {
    drainCoercionProbe.txs.pop();
    return 1;
  },
};
expectMessage(
  () => drainCoercionProbe.drain(drainMax),
  VOID_MEMPOOL_REENTRANT_MUTATION_FORBIDDEN,
  "drain max coercion reentrancy",
);
assertSingleReserved(drainCoercionProbe, h1, "drain max coercion");

expectDuplicate(() => canonical.txs.push({ hash: h1.toUpperCase() }), "direct duplicate");
assert(canonical.txs.length === 2, "duplicate mutated queue");
expectMessage(() => { canonical.txs[0] = { hash: h3 }; }, VOID_MEMPOOL_RAW_INDEX_MUTATION_FORBIDDEN, "raw index assignment");
assert(canonical.txs[0] !== oldTx && canonical.txs[0]?.hash === h1, "canonical admission did not take an owned identity snapshot");

const growthProbe: any = new Mempool();
expectMessage(() => { growthProbe.txs.length = 1; }, VOID_MEMPOOL_LENGTH_GROWTH_FORBIDDEN, "raw queue length growth");
assert(growthProbe.txs.length === 0, "length growth created a phantom pending slot");
assert(growthProbe.beginSelection(1).length === 0, "phantom queue slot became producer-visible selection");

const mutableAlias: any = {
  hash: h3,
  body: {
    retainedAlias: true,
    nested: { phase: "admitted" },
    list: [{ n: 1 }],
  },
};
canonical.txs.push(mutableAlias);
mutableAlias.hash = h4;
mutableAlias.body.nested.phase = "caller-mutated";
mutableAlias.body.list[0].n = 9;
assert(canonical.txs.filter((tx: any) => tx?.hash === h4).length === 0, "retained caller alias mutated queued canonical identity");
assert(canonical.txs[2]?.body?.nested?.phase === "admitted", "retained nested body alias mutated queued canonical payload");
assert(canonical.txs[2]?.body?.list?.[0]?.n === 1, "retained array body alias mutated queued canonical payload");
canonical.txs.push({ hash: h4, body: { uniqueAfterAliasMutation: true } });
assert(canonical.txs.filter((tx: any) => tx?.hash === h4).length === 1, "caller alias mutation bypassed canonical duplicate exclusion");
expectMessage(() => { canonical.txs[2].hash = h1; }, VOID_MEMPOOL_RAW_HASH_MUTATION_FORBIDDEN, "queued canonical hash mutation");
expectMessage(() => { canonical.txs[2].body = { replaced: true }; }, VOID_MEMPOOL_RAW_PAYLOAD_MUTATION_FORBIDDEN, "queued canonical payload replacement");
let nestedPayloadWriteRejected = false;
try { canonical.txs[2].body.nested.phase = "queue-mutated"; } catch { nestedPayloadWriteRejected = true; }
assert(nestedPayloadWriteRejected, "deep queued canonical payload mutation did not fail closed");
assert(canonical.txs[2]?.hash === h3, "queued canonical hash mutation changed identity");
assert(canonical.txs[2]?.body?.nested?.phase === "admitted", "queued canonical payload mutation changed producer bytes");
assert(Reflect.preventExtensions(canonical.txs) === false && Object.isExtensible(canonical.txs), "queue proxy extensibility guard failed");

canonical.clear();
canonical.txs.push({ hash: h2 }, { hash: h1 });
expectMessage(
  () => canonical.txs.sort(() => { canonical.txs.pop(); return 0; }),
  VOID_MEMPOOL_REENTRANT_MUTATION_FORBIDDEN,
  "sort comparator reentrant membership mutation",
);
assert(canonical.txs.length === 2, "failed reentrant sort changed queue cardinality");
expectDuplicate(() => canonical.txs.push({ hash: h1 }), "post-sort-reentrancy h1 duplicate");
expectDuplicate(() => canonical.txs.push({ hash: h2 }), "post-sort-reentrancy h2 duplicate");
canonical.txs.sort((a: any, b: any) => String(a?.hash || "").localeCompare(String(b?.hash || "")));
assert(canonical.txs[0]?.hash === h1 && canonical.txs[1]?.hash === h2, "non-reentrant sort failed");
expectDuplicate(() => canonical.txs.push({ hash: h1 }), "post-safe-sort duplicate");

canonical.clear();
const coercionReentrant: any = {
  kind: "legacy-sort-reentrant",
  toString() { canonical.txs.pop(); return "reentrant"; },
};
canonical.txs.push({ hash: h3 }, coercionReentrant);
expectMessage(
  () => canonical.txs.sort(),
  VOID_MEMPOOL_REENTRANT_MUTATION_FORBIDDEN,
  "default sort coercion reentrant membership mutation",
);
assert(canonical.txs.length === 2, "failed default reentrant sort changed queue cardinality");
expectDuplicate(() => canonical.txs.push({ hash: h3 }), "post-default-sort-reentrancy h3 duplicate");
canonical.txs.push({ hash: h4 });
expectDuplicate(() => canonical.txs.push({ hash: h4 }), "post-default-sort-reentrancy h4 duplicate");

canonical.clear();
assert(canonical.txs === sharedQueue && canonical.txs.length === 0, "clear detached or failed shared queue");
const replacementEntry: any = { hash: h3, body: { replacement: true } };
const replacement: any[] = [replacementEntry];
canonical.txs = replacement;
assert(canonical.txs === sharedQueue, "replacement changed guarded queue identity");
assert(canonical.txs !== replacement, "caller-owned replacement became mutation authority");
replacementEntry.hash = h4;
replacement.push({ hash: h4 });
assert(canonical.txs.length === 1 && canonical.txs[0]?.hash === h3, "caller-owned replacement entry mutation leaked into mempool");
expectDuplicate(() => canonical.txs.push({ hash: `0x${h3.toUpperCase()}` }), "replacement duplicate");
const duplicateReplacement: any[] = [{ hash: h1 }, { hash: `0x${h1.toUpperCase()}` }];
expectDuplicate(() => { canonical.txs = duplicateReplacement; }, "duplicate replacement");
assert(canonical.txs.length === 1 && canonical.txs[0]?.hash === h3, "failed replacement changed queue");

canonical.clear();
const inFlightBodyAlias: any = { via: "http", nested: { phase: "admitted" } };
let r = appendLikeCanonicalHotpath(canonical, { hash: h1, body: inFlightBodyAlias });
assert(r.ok === true && canonical.txs.length === 1, "HTTP-like admission failed");
canonical.txs.push({ hash: h2, body: { second: true } });
const selected = canonical.beginSelection(1);
assert(selected.length === 1 && selected[0]?.hash === h1, "selection did not pick first pending tx");
assert(canonical.selectionSize() === 1 && canonical.txs.length === 2, "selection must remain non-destructive/reserved");
inFlightBodyAlias.nested.phase = "caller-after-selection";
assert(selected[0]?.body?.nested?.phase === "admitted", "retained body alias mutated selected producer payload");
expectMessage(() => { selected[0].body = { replacedWhileSelected: true }; }, VOID_MEMPOOL_RAW_PAYLOAD_MUTATION_FORBIDDEN, "selected payload replacement");
let selectedNestedWriteRejected = false;
try { selected[0].body.nested.phase = "queue-after-selection"; } catch { selectedNestedWriteRejected = true; }
assert(selectedNestedWriteRejected, "selected deep payload mutation did not fail closed");
assert(selected[0]?.body?.nested?.phase === "admitted", "selected producer payload changed after admission");
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
const legacyRaw: any = { kind: "legacy_raw_compat_v1", nonce: "raw-no-hash" };
canonical.txs.push(legacyRaw);
assert(canonical.txs.length === 1, "legacy noncanonical compatibility entry was rejected");
legacyRaw.hash = h1;
assert(canonical.txs[0]?.hash === undefined, "retained legacy alias acquired canonical identity inside queue");
expectMessage(() => { canonical.txs[0].hash = h1; }, VOID_MEMPOOL_RAW_HASH_MUTATION_FORBIDDEN, "queued legacy hash mutation");
canonical.txs.push({ hash: h1 });
assert(canonical.txs.filter((tx: any) => tx?.hash === h1).length === 1, "legacy hash mutation bypassed duplicate exclusion");

assert(appendRejectStatus >= 0, "canonical append-error status mapping missing");
assert(!indexSource.includes("VOID_V2FS_COMMIT_LIFECYCLE_INSPECT_BEGIN"), "temporary V2FS source diagnostic remains");

console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_O1_IDENTITY_INDEX_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_RAW_MUTATION_GUARD_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_LENGTH_GROWTH_GUARD_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_ENTRY_IDENTITY_IMMUTABLE_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_PAYLOAD_SNAPSHOT_IMMUTABLE_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_SORT_REENTRANCY_GUARD_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_MUTATION_EPOCH_REENTRANCY_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_SINGLE_HASH_OBSERVATION_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_SINGLE_CANONICAL_PRODUCER_AUTHORITY_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_INFLIGHT_RESERVATION_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_DURABLE_RELEASE_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_ROLLBACK_RETAINED_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_ROUTE_TO_V2FS_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_STRICT_INTERNAL_HASH_ADMISSION_GREEN=true");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_DUPLICATE_HTTP_STATUS=503");
console.log("VOID_CANONICAL_TXSUBMIT_ADMISSION_DEDUPE_V1_PROOF_GREEN");
