// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const SHIM_PATH = "src/diag/patch_latest_number2_shim_v3.cjs";
const source = fs.readFileSync(SHIM_PATH, "utf8");

async function exercise({ fileText, httpText }) {
  let handler = null;

  const fakeFs = {
    readFileSync() {
      if (fileText instanceof Error) throw fileText;
      return fileText;
    },
  };

  const fakeHttp = {
    request(_options, callback) {
      const request = new EventEmitter();
      request.setTimeout = () => request;
      request.destroy = () => {};
      request.end = () => {
        const response = new EventEmitter();
        response.setEncoding = () => {};
        callback(response);
        queueMicrotask(() => {
          response.emit("data", httpText);
          response.emit("end");
        });
      };
      return request;
    },
  };

  const context = {
    console: { error() {} },
    process: { env: {}, cwd: () => "/tmp/void-number2-proof" },
    queueMicrotask,
    require(specifier) {
      if (specifier === "fs") return fakeFs;
      if (specifier === "path") return path;
      if (specifier === "http") return fakeHttp;
      throw new Error(`unexpected require: ${specifier}`);
    },
    setInterval(callback) {
      queueMicrotask(callback);
      return 1;
    },
    clearInterval() {},
  };
  context.globalThis = context;
  context.__void_http_app = {
    use(candidate) {
      handler = candidate;
    },
  };

  vm.runInNewContext(source, context, { filename: SHIM_PATH });
  await new Promise((resolve) => queueMicrotask(resolve));
  assert.equal(typeof handler, "function", "shim must install its handler");

  let body = "";
  const response = {
    statusCode: 0,
    setHeader() {},
    end(value) { body = String(value); },
  };
  let nextCalls = 0;
  await handler(
    { method: "GET", originalUrl: "/blocks/latest/number2.json" },
    response,
    () => { nextCalls += 1; },
  );

  assert.equal(nextCalls, 0);
  return { statusCode: response.statusCode, body: JSON.parse(body) };
}

assert.deepEqual(
  await exercise({ fileText: "42\n", httpText: "999" }),
  { statusCode: 200, body: { ok: true, number: 42 } },
);
assert.deepEqual(
  await exercise({ fileText: "00042\n", httpText: "999" }),
  { statusCode: 200, body: { ok: true, number: 42 } },
);
assert.deepEqual(
  await exercise({ fileText: "42junk", httpText: "17" }),
  { statusCode: 200, body: { ok: true, number: 17 } },
);
assert.deepEqual(
  await exercise({ fileText: "9007199254740992", httpText: "18" }),
  { statusCode: 200, body: { ok: true, number: 18 } },
);

for (const httpText of ["21junk", "-1", "1.5", "1e3", "9007199254740992"]) {
  assert.deepEqual(
    await exercise({ fileText: new Error("missing head file"), httpText }),
    { statusCode: 503, body: { ok: false, number: -1, err: "no-head" } },
    `HTTP fallback must reject non-canonical or unsafe head text: ${httpText}`,
  );
}

console.log("file_complete_decimal_required=true");
console.log("file_safe_integer_required=true");
console.log("http_complete_decimal_required=true");
console.log("http_safe_integer_required=true");
console.log("VOID_LATEST_NUMBER2_SHIM_V3_HEAD_BOUNDS_V1_GREEN");
