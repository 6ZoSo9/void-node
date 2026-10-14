#!/usr/bin/env node
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const repositoryRoot = path.resolve(__dirname, "..");
const target = path.join(repositoryRoot, "src/diag/datanet_receipts_persist_v1.cjs");
const source = fs.readFileSync(target, "utf8");
const MAX_SCAN_WINDOW_BYTES = 256 * 1024;
const receiptBytes = Buffer.from(
  [
    JSON.stringify({ ts_ms: 100, ok: true, bytes: 10, wc: 2 }),
    JSON.stringify({ ts_ms: 200, ok: false, bytes: 20, wc_award: 3 }),
  ].join("\n") + "\n",
);

const replacementBytes = Buffer.from(
  JSON.stringify({ ts_ms: 300, ok: true, bytes: 7, wc: 1 }) + "\n",
);
const generationA = { dev: 1, ino: 7, bytes: receiptBytes };
const generationB = { dev: 1, ino: 8, bytes: replacementBytes };
const generationOversize = {
  dev: 1,
  ino: 9,
  bytes: Buffer.alloc((1024 * 1024) + 1, 0x61),
};
const recoveryBytes = Buffer.from(
  JSON.stringify({ ts_ms: 400, ok: true, bytes: 11, wc: 4 }) + "\n",
);
const generationRecovery = { dev: 1, ino: 10, bytes: recoveryBytes };
const windowedHeader =
  '{"ts_ms":500,"ok":true,"bytes":13,"wc":6,"note":"';
const windowedPrefix = "a".repeat(
  MAX_SCAN_WINDOW_BYTES - 1 - Buffer.byteLength(windowedHeader),
);
const windowedBytes = Buffer.from(
  windowedHeader +
  windowedPrefix +
  "雪" +
  "b".repeat(MAX_SCAN_WINDOW_BYTES + 32) +
  '"}\n',
);
assert.equal(
  windowedBytes[MAX_SCAN_WINDOW_BYTES - 1],
  Buffer.from("雪")[0],
  "first window must split one UTF-8 sequence",
);
assert.ok(
  windowedBytes.length > MAX_SCAN_WINDOW_BYTES * 2 &&
    windowedBytes.length < 1024 * 1024,
  "windowed valid line must require multiple scans within carry bound",
);
const generationWindowed = { dev: 1, ino: 11, bytes: windowedBytes };
let visibleGeneration = generationA;
let streamCalls = 0;
let openCalls = 0;
let destroyCalls = 0;
let nextTimer = 1;
const timers = new Map();
function mockSetTimeout(callback, delay) {
  assert.equal(delay, 5_000);
  const id = nextTimer++;
  timers.set(id, callback);
  return id;
}
function mockClearTimeout(id) {
  timers.delete(id);
}
function fireSingleTimer() {
  assert.equal(timers.size, 1, "exactly one scan deadline expected");
  const [[id, callback]] = [...timers.entries()];
  timers.delete(id);
  callback();
}
let nextFd = 100;
const descriptors = new Map();
const mockFs = {
  constants: {
    O_RDONLY: 0,
    O_NOFOLLOW: 0x20000,
    O_NONBLOCK: 0x800,
  },
  openSync(file, flags) {
    assert.equal(file, "/synthetic/receipts.jsonl");
    assert.notEqual(flags & mockFs.constants.O_NOFOLLOW, 0);
    assert.notEqual(flags & mockFs.constants.O_NONBLOCK, 0);
    const fd = nextFd++;
    openCalls += 1;
    descriptors.set(fd, visibleGeneration);
    return fd;
  },
  fstatSync(fd) {
    const generation = descriptors.get(fd);
    assert.ok(generation, "fstat requires an open descriptor");
    return {
      dev: generation.dev,
      ino: generation.ino,
      size: generation.bytes.length,
      isFile() { return true; },
    };
  },
  closeSync(fd) {
    assert.equal(descriptors.delete(fd), true, "descriptor closed exactly once");
  },
  createReadStream(_file, options) {
    streamCalls += 1;
    const call = streamCalls;
    assert.equal(options.autoClose, false);
    const generation = descriptors.get(options.fd);
    assert.ok(generation, "stream must use retained open descriptor");
    const stream = new EventEmitter();
    stream.bytesRead = 0;
    stream.destroy = () => {
      destroyCalls += 1;
      stream.emit("close");
      return stream;
    };
    const emitData = (bytes) => {
      stream.bytesRead += bytes.length;
      stream.emit("data", bytes);
    };
    setImmediate(() => {
      const firstLineEnd = generation.bytes.indexOf(0x0a) + 1;
      if (call === 1) {
        emitData(generation.bytes.subarray(0, firstLineEnd));
        stream.emit("error", new Error("synthetic_read_failure"));
        stream.emit("data", "late-data-must-be-ignored\n");
        stream.emit("end");
        return;
      }
      if (call === 2) {
        emitData(generation.bytes.subarray(0, firstLineEnd));
        stream.emit("end");
        return;
      }
      if (call === 3) {
        emitData(generation.bytes.subarray(0, firstLineEnd));
        stream.emit("close");
        return;
      }
      if (call === 4) return;
      if (call === 5) visibleGeneration = generationB;
      const chunk = generation.bytes.subarray(options.start, options.end + 1);
      emitData(chunk);
      stream.emit("end");
      stream.emit("close");
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
  setTimeout: mockSetTimeout,
  clearTimeout: mockClearTimeout,
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

  const shortRead = await invokeRoute();
  assert.match(shortRead, /^# err=1$/m);
  assert.equal(metric(shortRead, "void_datanet_receipts_persist_lines_total"), 0);
  assert.equal(streamCalls, 2, "short read must consume one failed scan");

  const prematureClose = await invokeRoute();
  assert.match(prematureClose, /^# err=1$/m);
  assert.match(prematureClose, /^# err_reason=scan_failed$/m);
  assert.equal(metric(prematureClose, "void_datanet_receipts_persist_lines_total"), 0);
  assert.equal(streamCalls, 3, "premature close must consume one failed scan");

  const timedOutPromise = invokeRoute();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(streamCalls, 4, "silent stream must start one scan");
  fireSingleTimer();
  const timedOut = await timedOutPromise;
  assert.match(timedOut, /^# err=1$/m);
  assert.match(timedOut, /^# err_reason=timeout$/m);
  assert.equal(metric(timedOut, "void_datanet_receipts_persist_lines_total"), 0);
  assert.equal(destroyCalls, 1, "timed-out stream must be destroyed");
  assert.equal(timers.size, 0, "timed-out scan timer must be released");

  const [retryA, retryB] = await Promise.all([invokeRoute(), invokeRoute()]);
  assert.equal(streamCalls, 5, "concurrent retry must share one scanner");
  for (const body of [retryA, retryB]) {
    assert.doesNotMatch(body, /^# err=1$/m);
    assert.equal(metric(body, "void_datanet_receipts_persist_lines_total"), 2);
    assert.equal(metric(body, "void_datanet_receipts_persist_ok_total"), 1);
    assert.equal(metric(body, "void_datanet_receipts_persist_bad_total"), 1);
    assert.equal(metric(body, "void_datanet_receipts_persist_bytes_total"), 30);
    assert.equal(metric(body, "void_datanet_receipts_persist_wc_total"), 5);
  }

  const replacement = await invokeRoute();
  assert.equal(streamCalls, 6, "replacement generation must be scanned once");
  assert.equal(metric(replacement, "void_datanet_receipts_persist_lines_total"), 1);
  assert.equal(metric(replacement, "void_datanet_receipts_persist_ok_total"), 1);
  assert.equal(metric(replacement, "void_datanet_receipts_persist_bad_total"), 0);
  assert.equal(metric(replacement, "void_datanet_receipts_persist_bytes_total"), 7);
  assert.equal(metric(replacement, "void_datanet_receipts_persist_wc_total"), 1);

  const stable = await invokeRoute();
  assert.equal(streamCalls, 6, "unchanged replacement must not be rescanned");
  assert.equal(metric(stable, "void_datanet_receipts_persist_lines_total"), 1);

  visibleGeneration = generationOversize;
  const beforeOversizedStreams = streamCalls;
  const oversizeAttempts = Math.ceil(
    generationOversize.bytes.length / MAX_SCAN_WINDOW_BYTES,
  );
  let oversized;
  for (let attempt = 0; attempt < oversizeAttempts; attempt += 1) {
    oversized = await invokeRoute();
    if (attempt + 1 < oversizeAttempts) {
      assert.doesNotMatch(oversized, /^# err=1$/m);
      assert.equal(
        metric(oversized, "void_datanet_receipts_persist_lines_total"),
        0,
      );
    }
  }
  assert.equal(
    streamCalls - beforeOversizedStreams,
    oversizeAttempts,
    "over-limit line must be bounded across windows before rejection",
  );
  assert.match(oversized, /^# err=1$/m);
  assert.match(oversized, /^# err_reason=line_too_large$/m);
  assert.equal(metric(oversized, "void_datanet_receipts_persist_lines_total"), 0);
  assert.equal(destroyCalls, 2, "over-limit stream must be destroyed");
  assert.equal(timers.size, 0, "over-limit timer must be released");

  visibleGeneration = generationRecovery;
  const beforeRecoveryStreams = streamCalls;
  const recovered = await invokeRoute();
  assert.equal(
    streamCalls,
    beforeRecoveryStreams + 1,
    "valid generation after over-limit must retry",
  );
  assert.doesNotMatch(recovered, /^# err=1$/m);
  assert.equal(metric(recovered, "void_datanet_receipts_persist_lines_total"), 1);
  assert.equal(metric(recovered, "void_datanet_receipts_persist_ok_total"), 1);
  assert.equal(metric(recovered, "void_datanet_receipts_persist_bad_total"), 0);
  assert.equal(metric(recovered, "void_datanet_receipts_persist_bytes_total"), 11);
  assert.equal(metric(recovered, "void_datanet_receipts_persist_wc_total"), 4);

  const recoveryStable = await invokeRoute();
  assert.equal(
    streamCalls,
    beforeRecoveryStreams + 1,
    "unchanged recovery generation must not be rescanned",
  );

  visibleGeneration = generationWindowed;
  const windowCount = Math.ceil(
    generationWindowed.bytes.length / MAX_SCAN_WINDOW_BYTES,
  );
  assert.ok(windowCount >= 3, "valid backlog must span at least three windows");
  const beforeWindowedStreams = streamCalls;
  let windowed;
  for (let window = 0; window < windowCount; window += 1) {
    windowed = await invokeRoute();
    assert.doesNotMatch(windowed, /^# err=1$/m);
    if (window + 1 < windowCount) {
      assert.equal(
        metric(windowed, "void_datanet_receipts_persist_lines_total"),
        0,
        "incomplete line must remain buffered until its final window",
      );
    }
  }
  assert.equal(
    streamCalls - beforeWindowedStreams,
    windowCount,
    "one bounded stream must commit per route scan",
  );
  assert.equal(metric(windowed, "void_datanet_receipts_persist_lines_total"), 1);
  assert.equal(metric(windowed, "void_datanet_receipts_persist_ok_total"), 1);
  assert.equal(metric(windowed, "void_datanet_receipts_persist_bad_total"), 0);
  assert.equal(metric(windowed, "void_datanet_receipts_persist_bytes_total"), 13);
  assert.equal(metric(windowed, "void_datanet_receipts_persist_wc_total"), 6);

  const windowedStable = await invokeRoute();
  assert.equal(
    streamCalls,
    beforeWindowedStreams + windowCount,
    "completed valid backlog must not be rescanned",
  );
  assert.equal(
    metric(windowedStable, "void_datanet_receipts_persist_lines_total"),
    1,
  );
  assert.equal(descriptors.size, 0, "every scanner descriptor must be closed");
  assert.ok(openCalls >= 10 + windowCount, "every route scan must bind a descriptor generation");

  assert.doesNotMatch(source, /fs\.statSync\(file\)/u);
  assert.match(source, /fs\.constants\.O_NOFOLLOW/u);
  assert.match(source, /fs\.constants\.O_NONBLOCK/u);
  assert.match(source, /autoClose:\s*false/u);

  assert.match(source, /const SCAN_DEADLINE_MS = 5_000;/u);
  assert.match(source, /const MAX_SCAN_WINDOW_BYTES = 256 \* 1024;/u);
  assert.match(source, /const MAX_CARRY_BYTES = 1024 \* 1024;/u);
  assert.match(source, /rejectAndDestroy\("scan_timeout"\)/u);
  assert.match(source, /rejectAndDestroy\("line_too_large"\)/u);

  console.log("VOID_DATANET_RECEIPTS_PERSIST_RETRY_V1_GREEN");
  console.log("failed_read_rollback=true");
  console.log("short_read_rollback=true");
  console.log("premature_close_rollback=true");
  console.log("close_after_end_preserved=true");
  console.log("concurrent_scan_coalesced=true");
  console.log("same_bytes_counted_once=true");
  console.log("descriptor_generation_bound=true");
  console.log("path_replacement_next_scan_resets=true");
  console.log("descriptor_close_verified=true");
  console.log("scan_deadline_ms=5000");
  console.log("max_scan_window_bytes=262144");
  console.log("bounded_window_progress=true");
  console.log("utf8_boundary_carry_preserved=true");
  console.log("multi_window_valid_backlog_completed=true");
  console.log("scan_timeout_rollback=true");
  console.log("single_flight_released_after_timeout=true");
  console.log("timed_out_stream_destroyed=true");
  console.log("max_carry_bytes=1048576");
  console.log("line_too_large_rollback=true");
  console.log("overlimit_stream_destroyed=true");
  console.log("valid_generation_recovery_after_line_too_large=true");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

