#!/usr/bin/env node
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repositoryRoot = path.resolve(__dirname, "..");
const target = path.join(repositoryRoot, "src/diag/datanet_receipts_persist_v1.cjs");
const source = fs.readFileSync(target, "utf8");
const receiptBytes = Buffer.from(
  [
    JSON.stringify({ ts_ms: 100, ok: true, bytes: 10, wc: 2 }),
    JSON.stringify({ ts_ms: 200, ok: false, bytes: 20, wc_award: 3 }),
  ].join("\n") + "\n",
);

let streamCalls = 0;
const mockFs = {
  statSync() {
    return { ino: 7, size: receiptBytes.length };
  },
  createReadStream(_file, options) {
    streamCalls += 1;
    const call = streamCalls;
    const stream = new EventEmitter();
    setImmediate(() => {
      if (call === 1) {
        const firstLineEnd = receiptBytes.indexOf(0x0a) + 1;
        stream.emit("data", receiptBytes.subarray(0, firstLineEnd).toString("utf8"));
        stream.emit("error", new Error("synthetic_read_failure"));
        stream.emit("data", "late-data-must-be-ignored\n");
        stream.emit("end");
        return;
      }
      const chunk = receiptBytes.subarray(options.start, options.end + 1);
      stream.emit("data", chunk.toString("utf8"));
      stream.emit("end");
    });
    return stream;
  },
};

let route;
const app = {
  get(name, handler) {
    assert.equal(name, "/datanet/v1/metrics/receipts.persist.prom");
    route = handler;
  },
};
const context = vm.createContext({
  __void_http_app: app,
  Buffer,
  Date,
  console: { error() {} },
  process: {
    env: { DATANET_RECEIPTS_FILE: "/synthetic/receipts.jsonl" },
    exit(code) { throw new Error(`unexpected process.exit(${code})`); },
  },
  require(name) {
    if (name === "fs") return mockFs;
    if (name === "path") return path;
    throw new Error(`unexpected require: ${name}`);
  },
  setInterval(callback) {
    setImmediate(callback);
    return 1;
  },
  clearInterval() {},
});
new vm.Script(source, { filename: target }).runInContext(context);

function invokeRoute() {
  return new Promise((resolve, reject) => {
    const response = {
      status(code) {
        assert.equal(code, 200);
        return response;
      },
      type(value) {
        assert.equal(value, "text/plain; version=0.0.4");
        return response;
      },
      send(body) {
        resolve(String(body));
        return response;
      },
    };
    Promise.resolve(route({}, response)).catch(reject);
  });
}

function metric(body, name) {
  const match = body.match(new RegExp(`^${name} (\\d+)$`, "m"));
  assert.ok(match, `missing metric ${name}`);
  return Number(match[1]);
}

(async () => {
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(typeof route, "function");

  const failed = await invokeRoute();
  assert.match(failed, /^# err=1$/m);
  assert.equal(metric(failed, "void_datanet_receipts_persist_lines_total"), 0);

  const [retryA, retryB] = await Promise.all([invokeRoute(), invokeRoute()]);
  assert.equal(streamCalls, 2, "concurrent retry must share one scanner");
  for (const body of [retryA, retryB]) {
    assert.doesNotMatch(body, /^# err=1$/m);
    assert.equal(metric(body, "void_datanet_receipts_persist_lines_total"), 2);
    assert.equal(metric(body, "void_datanet_receipts_persist_ok_total"), 1);
    assert.equal(metric(body, "void_datanet_receipts_persist_bad_total"), 1);
    assert.equal(metric(body, "void_datanet_receipts_persist_bytes_total"), 30);
    assert.equal(metric(body, "void_datanet_receipts_persist_wc_total"), 5);
  }

  const stable = await invokeRoute();
  assert.equal(streamCalls, 2, "unchanged file must not be rescanned");
  assert.equal(metric(stable, "void_datanet_receipts_persist_lines_total"), 2);

  console.log("VOID_DATANET_RECEIPTS_PERSIST_RETRY_V1_GREEN");
  console.log("failed_read_rollback=true");
  console.log("concurrent_scan_coalesced=true");
  console.log("same_bytes_counted_once=true");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
