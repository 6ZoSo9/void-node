import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";
import vm from "node:vm";
import ts from "typescript";

// Read source only. Execute the actual projection/admission functions with an
// in-memory filesystem and lock/custody/duplicate seams. Never load index.ts,
// start a runtime, or append a real payment/accounting ledger.
function declarations(file: string, names: string[]): string {
  const source = fs.readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const found = new Map<string, string[]>();
  function visit(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const name = node.name.text;
      if (names.includes(name)) {
        found.set(name, [...(found.get(name) || []), node.getText(ast)]);
      }
    }
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && names.includes(declaration.name.text)) {
          const name = declaration.name.text;
          found.set(name, [...(found.get(name) || []), node.getText(ast)]);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return names.map((name) => {
    assert.equal(found.get(name)?.length, 1, `one canonical declaration: ${name}`);
    return found.get(name)![0];
  }).join("\n");
}

function evaluate(source: string, context: vm.Context): void {
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
  });
  const errors = (compiled.diagnostics || []).filter(
    (entry) => entry.category === ts.DiagnosticCategory.Error,
  );
  assert.equal(errors.length, 0, errors.map((entry) => String(entry.messageText)).join("\n"));
  vm.runInContext(compiled.outputText, context, { timeout: 10_000 });
}

const admissionPath = "src/economic/buy_void_verified_payment_capacity_admission_v1.ts";
const rows: any[] = [];
const events: any[] = [];
const trace: string[] = [];
const requestDir = "/synthetic-buy-capacity";
const requestLedger = { name: "requests.jsonl", fd: 1 };
const operatorLedger = { name: "operator-events.jsonl", fd: 2 };
let pool = "10000000";
// Mirror the admitted append writer's exact JSON.stringify(row) + LF bytes.
// A complete final object without LF is NOT committed capacity evidence.
const bytes = (name: string) => {
  const ledgerRows = name === "requests.jsonl" ? rows : events;
  return ledgerRows.map((row) => JSON.stringify(row)).join("\n") +
    (ledgerRows.length > 0 ? "\n" : "");
};
const ledgerStat = (ledger: any) => Object.freeze({
  dev: 1n, ino: BigInt(ledger.fd), uid: 1n, gid: 1n,
  mode: 0o100600n, nlink: 1n,
  size: BigInt(Buffer.byteLength(bytes(ledger.name))),
  mtimeNs: BigInt(ledger.name === "requests.jsonl" ? rows.length : events.length),
  ctimeNs: BigInt(ledger.name === "requests.jsonl" ? rows.length : events.length),
});

// Only sidecar bytes/inodes live in this Map. Unlike the historical mock,
// retained read descriptors must continue to reference the opened inode even
// if a pathname changes; link counts and numeric/BigInt stat modes are real
// behavior under test, not caller-declared custody or durability.
type SyntheticSidecarFileV1 = {
  bytes: Buffer;
  ino: number;
  mtimeNs: bigint;
  ctimeNs: bigint;
};
type SyntheticSidecarDescriptorV1 = {
  path: string;
  file: SyntheticSidecarFileV1 | null;
};
const sidecars = new Map<string, SyntheticSidecarFileV1>();
const descriptors = new Map<number, SyntheticSidecarDescriptorV1>();
let nextDescriptor = 10;
let fakeTime = 1n;
let failSidecarPublication = false;
const syntheticFileStat = (
  entry: SyntheticSidecarFileV1,
  options?: { bigint?: boolean },
) => {
  const asBigInt = options?.bigint === true;
  const value = (n: bigint): bigint | number =>
    asBigInt ? n : Number(n);
  return {
    dev: value(1n),
    ino: value(BigInt(entry.ino)),
    uid: value(1n),
    gid: value(1n),
    mode: value(0o100600n),
    nlink: value(BigInt(
      [...sidecars.values()].filter((candidate) => candidate === entry).length,
    )),
    size: value(BigInt(entry.bytes.length)),
    mtimeNs: entry.mtimeNs,
    ctimeNs: entry.ctimeNs,
    isFile: () => true,
    isSymbolicLink: () => false,
  };
};
const syntheticFs = {
  constants: {
    O_RDONLY: 1, O_DIRECTORY: 2, O_WRONLY: 4, O_CREAT: 8,
    O_EXCL: 16, O_NOFOLLOW: 32, O_NONBLOCK: 64,
  },
  mkdirSync: (directory: string) => { assert.equal(directory, requestDir); },
  existsSync: (file: string) => sidecars.has(file),
  openSync: (file: string, flags = 0) => {
    const descriptor = nextDescriptor++;
    if (file === requestDir) {
      assert.ok((flags & syntheticFs.constants.O_DIRECTORY) !== 0);
      descriptors.set(descriptor, { path: file, file: null });
      return descriptor;
    }
    assert.equal(path.dirname(file), requestDir);
    if ((flags & syntheticFs.constants.O_CREAT) !== 0) {
      assert.equal(sidecars.has(file), false, "exclusive sidecar creation");
      sidecars.set(file, {
        bytes: Buffer.alloc(0), ino: descriptor,
        mtimeNs: fakeTime++, ctimeNs: fakeTime++,
      });
    } else {
      assert.equal(sidecars.has(file), true, "open existing sidecar");
    }
    descriptors.set(descriptor, { path: file, file: sidecars.get(file)! });
    return descriptor;
  },
  writeSync: (descriptor: number, input: Buffer, offset: number, length: number) => {
    const entry = descriptors.get(descriptor)?.file;
    assert.ok(entry, "write requires pinned sidecar descriptor");
    entry.bytes = Buffer.from(input.subarray(offset, offset + length));
    entry.mtimeNs = fakeTime++;
    entry.ctimeNs = fakeTime++;
    return length;
  },
  readSync: (
    descriptor: number, output: Buffer, offset: number,
    length: number, position: number | null,
  ) => {
    const entry = descriptors.get(descriptor)?.file;
    assert.ok(entry, "read requires pinned sidecar descriptor");
    const start = position === null ? 0 : position;
    const count = Math.max(0, Math.min(length, entry.bytes.length - start));
    entry.bytes.copy(output, offset, start, start + count);
    return count;
  },
  fsyncSync() {},
  closeSync: (descriptor: number) => { descriptors.delete(descriptor); },
  fstatSync: (descriptor: number, options?: { bigint?: boolean }) => {
    const entry = descriptors.get(descriptor)?.file;
    assert.ok(entry, "fstat requires held sidecar inode");
    return syntheticFileStat(entry, options);
  },
  linkSync: (from: string, to: string) => {
    if (failSidecarPublication) throw new Error("synthetic_sidecar_publication_failed");
    assert.equal(sidecars.has(to), false);
    const entry = sidecars.get(from);
    assert.ok(entry, "hardlink source must exist");
    sidecars.set(to, entry);
    entry.ctimeNs = fakeTime++;
  },
  unlinkSync: (file: string) => {
    const entry = sidecars.get(file);
    assert.ok(entry, "unlink requires existing path");
    sidecars.delete(file);
    entry.ctimeNs = fakeTime++;
  },
  readdirSync: () => [...sidecars.keys()].map((file) => path.basename(file)),
  lstatSync: (file: string, options?: { bigint?: boolean }) => {
    const entry = sidecars.get(file);
    assert.ok(entry, "lstat requires visible sidecar path");
    return syntheticFileStat(entry, options);
  },
  readFileSync: (file: string) => {
    const entry = sidecars.get(file);
    assert.ok(entry, "legacy pathname read requires sidecar");
    return Buffer.from(entry.bytes);
  },
};
const context = vm.createContext({
  exports: {},
  process: { pid: 1, getuid: () => 1, env: { VOID_BUY_REQUEST_DIR: requestDir, get VOID_BUY_POOL_VOID_TOTAL() { return pool; } } },
  path,
  Buffer,
  TextDecoder,
  utilTypes,
  fs: syntheticFs,
  randomBytes: (length: number) => Buffer.alloc(length, 7),
  withBuyVoidTerminalCloseoutRequestLockV1: (_input: any, operation: () => any) => operation(),
  buyVoidTerminalCloseoutRequestLockPathV1: (input: any) => {
    assert.equal(input?.request_dir, requestDir);
    assert.match(
      String(input?.request_id || ""),
      /^buyvoid_[a-z0-9]+_[0-9a-f]{8}$/u,
    );
    return path.join(
      requestDir,
      ".terminal-closeout-locks-v1",
      "synthetic-" + String(input.request_id),
    );
  },
  appendPaymentVerifiedEventDurableV1: (
    _ledger: any,
    _stat: any,
    value: Buffer,
  ) => {
    assert.equal(Buffer.isBuffer(value), true);
    trace.push("synthetic_append");
    operations += 1;
    events.push(JSON.parse(value.toString("utf8").trimEnd()));
  },
  withBuyVoidFilesystemBakeryLockAsyncV1: async (_lock: string, operation: () => any) => operation(),
  openPinnedRequestDirectoryV1: () => ({ fd: 3 }),
  openPinnedLedgerV1: (_directory: any, name: string) =>
    name === "requests.jsonl" ? requestLedger : operatorLedger,
  readPinnedLedgerBytesV1: (ledger: any) => ({
    bytes: Buffer.from(bytes(ledger.name), "utf8"),
    stat: ledgerStat(ledger),
  }),
  assertPinnedLedgerVisibleV1: (ledger: any) => ledgerStat(ledger),
  classifyBuyVoidVerifiedPaymentDuplicateGuardV1: (input: any) => ({
    ok: true,
    idempotent: input.existing_events.some((event: any) => event.request_id === input.candidate_event.request_id),
  }),
  voidIndexEmptyCatchVisibilityWindow17101_18000V1: (_id: string, error: unknown) => { throw error; },
  require: (name: string) => {
    if (name === "node:path") return path;
    if (name === "node:fs") return {
      existsSync: (file: string) => ["requests.jsonl", "operator-events.jsonl"].some((name) => file === path.join(requestDir, name)),
      readFileSync: (file: string) => {
        assert.equal(path.dirname(file), requestDir);
        assert.ok(["requests.jsonl", "operator-events.jsonl"].includes(path.basename(file)));
        return bytes(path.basename(file));
      },
    };
    if (name === "./economic/buy_void_verified_payment_capacity_admission_v1.js") {
      return { projectBuyVoidVerifiedPaymentCapacityV1: context.projectBuyVoidVerifiedPaymentCapacityV1 };
    }
    throw new Error(`unexpected module load: ${name}`);
  },
});
evaluate(declarations(admissionPath, [
  "VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_V1",
  "VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_AUTHORITY_V1",
  "MICRO", "REQUEST_ID", "TX_HASH", "fail", "microVoid",
  "microVoidAsNumberV1", "quoteBuyVoidFromUsdcV1",
  "projectBuyVoidVerifiedPaymentCapacityV1", "freezeDecision",
  "classifyBuyVoidVerifiedPaymentCapacityAdmissionV1",
  "canonicalRequestSourceChainV1", "canonicalRequestTxHashV1",
  "LEDGER_MAX_BYTES", "CAPACITY_HISTORY_UTF8", "parseStrictJsonLinesV1", "readStrictCapacityLedgerV1", "assertProjectionMatchesStrictLedgerV1",
  "O_NOFOLLOW", "sameFileIdentityV1", "sameFileInodeCustodyV1", "readStrictJsonLinesFromDirectoryV1", "readStrictJsonLinesV1",
  "fsyncDirectoryV1", "paymentVerifiedSidecarPathV1", "ensurePaymentVerifiedSidecarExactV1",
  "CANONICAL_EVENT_MAX_DEPTH_V1", "CANONICAL_EVENT_MAX_NODES_V1",
  "CANONICAL_EVENT_MAX_KEYS_V1", "CANONICAL_EVENT_MAX_ARRAY_ITEMS_V1",
  "CANONICAL_EVENT_MAX_TEXT_CODE_UNITS_V1", "CANONICAL_EVENT_MAX_JSON_BYTES_V1",
  "canonicalJsonStringByteLengthV1", "addCanonicalEventBytesV1",
  "detachedCanonicalJsonValueV1", "deepFreezeJsonValueV1",
  "canonicalVerifiedPaymentEventV1",
  "recoverPaymentVerifiedSidecarsV1", "writeBuyVoidOperatorEventWithCapacityAdmissionV1",
  "withBuyVoidVerifiedPaymentCapacityAdmissionV1",
]), context);
evaluate(declarations("src/index.ts", ["__voidBuyVoidSaleStateV1"]), context);
const project = context.projectBuyVoidVerifiedPaymentCapacityV1;
const quote = context.quoteBuyVoidFromUsdcV1;
const classify = context.classifyBuyVoidVerifiedPaymentCapacityAdmissionV1;
const indexSource = fs.readFileSync("src/index.ts", "utf8");
const amountGuardLine = indexSource
  .split("\n")
  .find(
    (line) =>
      line.includes(".test(rawAmount)") &&
      line.includes('errors.push("invalid_usdc_amount")'),
  );
assert.ok(amountGuardLine, "exact raw-amount regex guard present");
const amountGuardSource = amountGuardLine.match(
  /if \(!\/(.+)\/\.test\(rawAmount\)\)/u,
)?.[1];
assert.ok(amountGuardSource, "extract raw-amount regex source");
const amountGuard = new RegExp(amountGuardSource);
assert.equal(amountGuard.test("1.000001"), true);
assert.equal(amountGuard.test("1\\000001"), false);

assert.equal(quote("1.000001", "2"), 2.000002);
assert.equal(quote("1.000004", "2"), 2.000008);
assert.throws(
  () => quote("0.000001", "0.5"),
  /buy_void_quote_exact_units_invalid/u,
);
assert.equal(
  indexSource.includes(
    "Math.floor(usdc_amount * cfg.rate_void_per_usdc * 1e6)",
  ),
  false,
);
assert.match(
  indexSource,
  /quoteBuyVoidFromUsdcV1\(rawAmount, cfg\.rate_void_per_usdc\)/u,
);
const sale = async () => {
  trace.push("projection");
  return context.__voidBuyVoidSaleStateV1();
};
const request = (id: string, quote: number) => ({
  request_id: `buyvoid_${id}_${id.repeat(8)}`,
  quoted_void: quote,
  usdc_amount: quote / 2,
  source_chain: "base",
  tx_hash: "0x" + id.repeat(64),
});
const event = (row: any) => ({
  request_id: row.request_id,
  quoted_void: row.quoted_void,
  tx_hash: row.tx_hash,
  operator_status: "payment_verified",
  marked_at_ms: 1,
  payment_verifier: { chain: row.source_chain },
});
const a = request("a", 10.1);
const b = request("b", 10.2);
rows.push(a, b, request("c", 8));
events.push(event(a), event(b));
let actual = await sale();
assert.equal(actual.allocation_reserved_void, 20.3);
assert.equal(actual.verified_void_total, 20.3);
assert.equal(actual.submitted_void_total, 20.3);
assert.equal(actual.remaining_void, 9999979.7);
assert.equal(actual.submitted_tx_count, 2);
assert.equal(classify({ sale_state: actual, quoted_void: 0.000001 }).ready, true);

// Duplicate request/event rows do not reserve twice; unpaid rows reserve zero.
rows.push({ ...a });
events.push(event(a));
actual = await sale();
assert.equal(actual.verified_void_total, 20.3);
assert.equal(actual.submitted_tx_count, 2);
rows.pop();
events.pop();

// Sale-state sold-out semantics are literal capacity truth: one microVOID
// remaining is still open, and exact zero is sold out.
const dustPaid = request("d", 0.000002);
rows.splice(0, rows.length, dustPaid);
events.splice(0, events.length, event(dustPaid));
pool = "0.000003";
actual = await sale();
assert.equal(actual.remaining_void, 0.000001);
assert.equal(actual.sold_out, false);
assert.equal(
  classify({ sale_state: actual, quoted_void: 0.000001 }).ready,
  true,
);

for (const quotes of [[10.1, 10.2], [0.000001, 0.000002], Array(1000).fill(0.000001), [0.1, 0.2, 0.3]]) {
  const expected = quotes.reduce((sum: bigint, quote: number) => sum + BigInt(Math.round(quote * 1e6)), 0n);
  const projected = project("10000000", quotes);
  const decision = classify({ sale_state: { pool_void_total: 10000000, ...projected }, quoted_void: 0.000001 });
  assert.equal(decision.ready, true);
  assert.equal(decision.verified_void_micro, expected.toString());
  assert.equal(decision.reserved_void_micro, expected.toString());
  assert.equal(BigInt(decision.remaining_void_micro) + expected, 10_000_000_000_000n);
}
const full = project(20.3, [10.1, 10.2]);
assert.equal(full.remaining_void, 0);
assert.equal(classify({ sale_state: { pool_void_total: 20.3, ...full }, quoted_void: 10.2, already_verified: true }).ready, true);
assert.equal(classify({ sale_state: { pool_void_total: 20.3, ...full }, quoted_void: 0.000001 }).reason, "buy_void_verified_payment_capacity_exceeded");
const over = project(20, [10.1, 10.2]);
assert.equal(over.verified_void_total, 20.3);
assert.equal(over.allocation_reserved_void, 20);
assert.equal(classify({ sale_state: { pool_void_total: 20, ...over }, quoted_void: 1 }).reason, "buy_void_verified_payment_capacity_state_invalid");
for (const invalid of [0.0000001, "10.1000001", "1e-6", -1, NaN, Infinity]) {
  assert.throws(() => project(100, [invalid]), /capacity_state_invalid/u);
}
assert.throws(() => project("9007199254740994", [1]), /capacity_state_invalid/u);
assert.throws(() => project("100000000000000000000", ["9007199254740992.000001"]), /capacity_state_invalid/u);

// Run the actual admission control flow and actual strict recount against the
// actual sale projection. The only append is events.push into synthetic memory.
rows.splice(0, rows.length, a, b);
events.splice(0, events.length, event(a));
pool = "20.3";
let operations = 0;
const admit = () => context.withBuyVoidVerifiedPaymentCapacityAdmissionV1({
  request_dir: requestDir,
  request_id: b.request_id,
  request: b,
  quoted_void: b.quoted_void,
  verified_payment_event: event(b),
  read_sale_state: sale,
  operation: () => {
    trace.push("synthetic_append");
    operations += 1;
    events.push(event(b));
    return { synthetic: true };
  },
});
trace.length = 0;
const first = await admit();
assert.equal(first.idempotent, false);
assert.equal(first.operation_performed, true);
assert.deepEqual(trace, ["projection", "synthetic_append", "projection"]);
assert.equal(operations, 1);
actual = await sale();
assert.equal(actual.verified_void_total, 20.3);
assert.equal(actual.remaining_void, 0);
assert.equal(actual.sold_out, true);
trace.length = 0;
const retry = await admit();
assert.equal(retry.idempotent, true);
assert.equal(retry.operation_performed, false);
assert.deepEqual(trace, ["projection"]);
assert.equal(operations, 1);
assert.equal(events.length, 2);

// Corrupt projection still fails before retry's idempotent fast path.
await assert.rejects(context.withBuyVoidVerifiedPaymentCapacityAdmissionV1({
  request_dir: requestDir, request_id: b.request_id, request: b,
  quoted_void: b.quoted_void, verified_payment_event: event(b),
  read_sale_state: async () => ({ ...await sale(), allocation_reserved_void: 10.1 + 10.2 }),
  operation: () => { throw new Error("must_not_execute"); },
}), /capacity_state_invalid/u);
assert.equal(operations, 1);
// Exercise the actual writer and sidecar recovery after one synthetic append.
// Inject failure only at the in-memory link step, leaving the verified event
// visible but no final sidecar. Exact retry must recover without another append.
events.splice(0, events.length, event(a));
operations = 0;
let launchCalls = 0;
const write = () => context.writeBuyVoidOperatorEventWithCapacityAdmissionV1({
  event: event(b), request: b, request_dir: requestDir, read_sale_state: sale,
  with_launch_authority_mutation: (
    _request: any,
    operation: (assert_current_authority: () => any) => any,
  ) => {
    launchCalls += 1;
    return operation(() => ({ ready: true }));
  },
});
failSidecarPublication = true;
await assert.rejects(write(), /synthetic_sidecar_publication_failed/u);
assert.equal(events.length, 2);
assert.equal(operations, 1);
assert.equal(sidecars.size, 0);
failSidecarPublication = false;
const recovered = await write();
assert.equal(recovered.idempotent, true);
assert.equal(recovered.sidecar_recovered, true);
assert.equal(recovered.recovered_sidecar_count, 1);
assert.equal(operations, 1);
assert.equal(launchCalls, 1);
assert.equal(sidecars.size, 1);
const finalSidecar = path.join(requestDir, `operator-event-${b.request_id}-1.json`);
assert.equal(sidecars.get(finalSidecar)!.bytes.toString("utf8"), JSON.stringify(event(b), null, 2));
const existing = await write();
assert.equal(existing.sidecar_recovered, false);
assert.equal(existing.recovered_sidecar_count, 0);
assert.equal(operations, 1);
assert.equal(events.length, 2);
assert.equal(launchCalls, 1);
assert.equal((await sale()).verified_void_total, 20.3);
assert.equal((await sale()).remaining_void, 0);
// Existing large-pool numeric representation limits remain fail-closed.
assert.throws(() => project(1e10, [1.000001]), /capacity_state_invalid/u);
console.log("VOID_BUY_VOID_SALE_CAPACITY_PROJECTION_V1_GREEN");
console.log("raw_decimal_request_guard_accepts_decimal_point=true");
console.log("exact_request_quote_from_raw_decimal=true");
console.log("ieee754_underquote_examples_rejected=true");
console.log("non_microvoid_quote_product_holds=true");
console.log("actual_sale_projection=true; exact_microvoid=true; synthetic_admission_retry=true; synthetic_sidecar_recovery=true");
console.log("filesystem_custody_lock_append_fsync_link_duplicate_guard_mocked=true; real_ledger_write=false; runtime_started=false");
