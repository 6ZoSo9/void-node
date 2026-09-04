#!/usr/bin/env node
import http from "node:http";
import https from "node:https";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants as FS,
  fstatSync,
  mkdirSync,
  openSync,
  readSync,
  writeFileSync,
} from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_INACTIVITY_TIMEOUT_MS = 10_000;
const MAX_INACTIVITY_TIMEOUT_MS = 60_000;
const DEFAULT_TOTAL_TIMEOUT_MS = 30_000;
const MAX_TOTAL_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_BYTES = 64 * 1024 * 1024;
const ABSOLUTE_MAX_BYTES = 256 * 1024 * 1024;

function boundedEnvironmentInteger(name, fallback, minimum, maximum) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  if (!/^[0-9]+$/.test(raw)) {
    throw new Error(`${name} must be a canonical positive integer`);
  }
  const value = Number(raw);
  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(`${name} must be ${minimum}..${maximum}`);
  }
  return value;
}

function safeCode(error, fallback) {
  if (String(error?.code || "") === "HPE_INVALID_CONTENT_LENGTH") {
    return "INVALID_CONTENT_LENGTH";
  }
  const raw = String(error?.code || fallback || "PULL_FAILED")
    .replace(/[^A-Za-z0-9_.:-]/g, "_")
    .slice(0, 80);
  return raw || "PULL_FAILED";
}

function safeMessage(error, fallback) {
  return String(error?.message || fallback || "pull failed")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 500);
}

function failed(sourceType, code, error, displaySource = null) {
  return {
    ok: false,
    status: null,
    code,
    error,
    body: Buffer.alloc(0),
    source_type: sourceType,
    display_source: displaySource,
  };
}

function statStamp(stat) {
  return {
    dev: stat.dev.toString(),
    ino: stat.ino.toString(),
    size: stat.size.toString(),
    mtimeNs: stat.mtimeNs.toString(),
    ctimeNs: stat.ctimeNs.toString(),
  };
}

function sameStamp(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function readPinnedLocalFile(path, maxBytes) {
  let fd = null;
  try {
    fd = openSync(path, FS.O_RDONLY | FS.O_NOFOLLOW);
    const before = fstatSync(fd, { bigint: true });
    if (!before.isFile()) {
      const error = new Error("local source must be a regular file");
      error.code = "FILE_NOT_REGULAR";
      throw error;
    }
    if (before.size > BigInt(maxBytes)) {
      const error = new Error(
        `local source exceeds ${maxBytes} bytes`,
      );
      error.code = "FILE_TOO_LARGE";
      throw error;
    }
    if (before.size > BigInt(Number.MAX_SAFE_INTEGER)) {
      const error = new Error("local source size exceeds safe integer range");
      error.code = "FILE_SIZE_UNSAFE";
      throw error;
    }

    const expected = Number(before.size);
    const body = Buffer.alloc(expected);
    let offset = 0;
    while (offset < expected) {
      const read = readSync(fd, body, offset, expected - offset, offset);
      if (read === 0) {
        const error = new Error("local source ended before admitted size");
        error.code = "FILE_SHORT_READ";
        throw error;
      }
      offset += read;
    }

    const growthProbe = Buffer.alloc(1);
    if (readSync(fd, growthProbe, 0, 1, expected) !== 0) {
      const error = new Error("local source grew during bounded read");
      error.code = "FILE_GREW_DURING_READ";
      throw error;
    }

    const after = fstatSync(fd, { bigint: true });
    if (!sameStamp(statStamp(before), statStamp(after))) {
      const error = new Error("local source generation changed during read");
      error.code = "FILE_GENERATION_CHANGED";
      throw error;
    }
    return body;
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

function pullLocal(path, sourceType, maxBytes, displaySource) {
  try {
    return {
      ok: true,
      status: null,
      code: null,
      error: null,
      body: readPinnedLocalFile(path, maxBytes),
      source_type: sourceType,
      display_source: displaySource,
    };
  } catch (error) {
    return failed(
      sourceType,
      safeCode(error, "FILE_READ_FAILED"),
      safeMessage(error),
      displaySource,
    );
  }
}

function normalizedHttpSource(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "invalid URL" };
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    return { ok: false, reason: `unsupported protocol: ${url.protocol}` };
  }
  if (url.username || url.password) {
    return {
      ok: false,
      reason: "URL credentials are forbidden",
      displaySource: `${url.protocol}//${url.host}${url.pathname}`,
    };
  }
  if (url.hash) {
    return {
      ok: false,
      reason: "URL fragments are forbidden",
      displaySource: `${url.protocol}//${url.host}${url.pathname}`,
    };
  }
  const display = `${url.protocol}//${url.host}${url.pathname}`;
  return { ok: true, url, displaySource: display };
}

function pullHttp(normalized, limits) {
  const { url, displaySource } = normalized;
  const client = url.protocol === "https:" ? https : http;

  return new Promise((resolve) => {
    let settled = false;
    let request = null;
    let response = null;
    let totalTimer = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (totalTimer !== null) clearTimeout(totalTimer);
      resolve(result);
    };

    const fail = (code, message) => {
      finish(failed("http", code, message, displaySource));
    };

    request = client.get(
      url,
      {
        agent: false,
        headers: {
          accept: "application/octet-stream, application/json;q=0.9, text/plain;q=0.8",
          connection: "close",
          "user-agent": "void-node/datanet-field-object-pull-v1",
        },
      },
      (res) => {
        response = res;
        const status = Number(res.statusCode || 0);
        if (status >= 300 && status < 400) {
          res.resume();
          fail("HTTP_REDIRECT_REJECTED", `redirect rejected: HTTP ${status}`);
          return;
        }
        if (status < 200 || status >= 300) {
          res.resume();
          fail("HTTP_STATUS_NOT_OK", `HTTP ${status}`);
          return;
        }

        const advertisedRaw = res.headers["content-length"];
        if (advertisedRaw !== undefined) {
          const advertised = String(advertisedRaw);
          if (!/^(0|[1-9][0-9]*)$/.test(advertised)) {
            fail("INVALID_CONTENT_LENGTH", "invalid Content-Length");
            res.destroy();
            return;
          }
          const advertisedBytes = BigInt(advertised);
          if (advertisedBytes > BigInt(limits.maxBytes)) {
            fail(
              "RESPONSE_TOO_LARGE",
              `advertised response exceeds ${limits.maxBytes} bytes`,
            );
            res.destroy();
            return;
          }
        }

        const chunks = [];
        let total = 0;
        res.on("data", (chunk) => {
          if (settled) return;
          total += chunk.length;
          if (total > limits.maxBytes) {
            fail(
              "RESPONSE_TOO_LARGE",
              `streamed response exceeds ${limits.maxBytes} bytes`,
            );
            res.destroy();
            return;
          }
          chunks.push(chunk);
        });
        res.on("aborted", () => {
          fail("RESPONSE_ABORTED", "response aborted");
        });
        res.on("error", (error) => {
          fail(safeCode(error, "RESPONSE_ERROR"), safeMessage(error));
        });
        res.on("end", () => {
          if (settled) return;
          finish({
            ok: true,
            status,
            code: null,
            error: null,
            body: Buffer.concat(chunks, total),
            source_type: "http",
            display_source: displaySource,
          });
        });
      },
    );

    request.setTimeout(limits.inactivityTimeoutMs, () => {
      fail(
        "INACTIVITY_TIMEOUT",
        `inactivity timeout after ${limits.inactivityTimeoutMs}ms`,
      );
      if (response) response.destroy();
      request.destroy();
    });
    request.on("error", (error) => {
      if (settled) return;
      fail(safeCode(error, "REQUEST_ERROR"), safeMessage(error));
    });

    totalTimer = setTimeout(() => {
      fail(
        "TOTAL_TIMEOUT",
        `total timeout after ${limits.totalTimeoutMs}ms`,
      );
      if (response) response.destroy();
      request.destroy();
    }, limits.totalTimeoutMs);
  });
}

async function pull(input, limits) {
  if (input.startsWith("file://")) {
    let path;
    try {
      path = fileURLToPath(input);
    } catch (error) {
      return failed(
        "file",
        "INVALID_FILE_URL",
        safeMessage(error, "invalid file URL"),
        "file://<invalid>",
      );
    }
    return pullLocal(path, "file", limits.maxBytes, input);
  }

  try {
    const normalized = normalizedHttpSource(input);
    if (normalized.ok) return await pullHttp(normalized, limits);
    if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(input)) {
      return failed(
        "invalid",
        normalized.reason.startsWith("unsupported protocol")
          ? "UNSUPPORTED_PROTOCOL"
          : "INVALID_URL",
        normalized.reason,
        normalized.displaySource || "<invalid-url>",
      );
    }
  } catch {
    // Fall through to the operator-specified local pathname.
  }

  return pullLocal(input, "file_path", limits.maxBytes, input);
}

const [raw, expectedRaw] = process.argv.slice(2);

if (!raw || !expectedRaw) {
  console.error(
    "Usage: npm run datanet:field-object:pull -- <url-or-file-path> <expected-sha256>",
  );
  process.exit(2);
}

const expected = expectedRaw.replace(/^sha256:/, "").toLowerCase();

if (!/^[a-f0-9]{64}$/.test(expected)) {
  console.error(`Invalid expected SHA-256: ${expectedRaw}`);
  process.exit(2);
}

let limits;
try {
  limits = {
    inactivityTimeoutMs: boundedEnvironmentInteger(
      "VOID_PULL_TIMEOUT_MS",
      DEFAULT_INACTIVITY_TIMEOUT_MS,
      100,
      MAX_INACTIVITY_TIMEOUT_MS,
    ),
    totalTimeoutMs: boundedEnvironmentInteger(
      "VOID_PULL_TOTAL_TIMEOUT_MS",
      DEFAULT_TOTAL_TIMEOUT_MS,
      100,
      MAX_TOTAL_TIMEOUT_MS,
    ),
    maxBytes: boundedEnvironmentInteger(
      "VOID_PULL_MAX_BYTES",
      DEFAULT_MAX_BYTES,
      1,
      ABSOLUTE_MAX_BYTES,
    ),
  };
} catch (error) {
  console.error(`Invalid pull limit: ${safeMessage(error)}`);
  process.exit(2);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = join(
  ".void-field-trial",
  "datanet-field-object-pull",
  `${stamp}-${process.pid}`,
);
mkdirSync(dir, { recursive: true, mode: 0o700 });

const result = await pull(raw, limits);
const bodyPath = join(dir, "object.txt");
writeFileSync(bodyPath, result.body || Buffer.alloc(0), {
  flag: "wx",
  mode: 0o600,
});

const actual = createHash("sha256")
  .update(result.body || Buffer.alloc(0))
  .digest("hex");
const match = result.ok && actual === expected;

const receipt = {
  marker: match
    ? "VOID_DATANET_FIELD_OBJECT_PULL_V1_GREEN"
    : "VOID_DATANET_FIELD_OBJECT_PULL_V1_FAIL",
  created_at: new Date().toISOString(),
  host: hostname(),
  network_hint: process.env.VOID_NETWORK_HINT || "operator-specified",
  source: result.display_source || raw,
  source_type: result.source_type,
  ok: result.ok,
  status: result.status,
  code: result.code,
  error: result.error,
  expected_sha256: expected,
  actual_sha256: actual,
  match,
  bytes: result.body?.length || 0,
  object_path: bodyPath,
  dangerous_paths_touched: false,
  limits: {
    max_bytes: limits.maxBytes,
    inactivity_timeout_ms: limits.inactivityTimeoutMs,
    total_timeout_ms: limits.totalTimeoutMs,
  },
};

const receiptPath = join(dir, "receipt.json");
writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n", {
  encoding: "utf8",
  flag: "wx",
  mode: 0o600,
});

console.log(receipt.marker);
console.log(`source=${receipt.source}`);
console.log(`ok=${receipt.ok}`);
console.log(`status=${receipt.status}`);
console.log(`code=${receipt.code}`);
console.log(`bytes=${receipt.bytes}`);
console.log(`max_bytes=${limits.maxBytes}`);
console.log(`inactivity_timeout_ms=${limits.inactivityTimeoutMs}`);
console.log(`total_timeout_ms=${limits.totalTimeoutMs}`);
console.log(`expected_sha256=${expected}`);
console.log(`actual_sha256=${actual}`);
console.log(`match=${match}`);
console.log(`receipt=${receiptPath}`);

process.exit(match ? 0 : 1);
