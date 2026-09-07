#!/usr/bin/env node
import http from "node:http";
import https from "node:https";
import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  constants as FS,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readSync,
  writeSync,
} from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MARKER_GREEN = "VOID_DATANET_FIELD_OBJECT_PULL_V1_GREEN";
const MARKER_FAIL = "VOID_DATANET_FIELD_OBJECT_PULL_V1_FAIL";
const MARKER_HOLD = "VOID_DATANET_FIELD_OBJECT_PULL_V1_HOLD";

const DEFAULT_INACTIVITY_TIMEOUT_MS = 10_000;
const MAX_INACTIVITY_TIMEOUT_MS = 60_000;
const DEFAULT_TOTAL_TIMEOUT_MS = 30_000;
const MAX_TOTAL_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_BYTES = 64 * 1024 * 1024;
const ABSOLUTE_MAX_BYTES = 256 * 1024 * 1024;
const OUTPUT_ROOT_COMPONENT = ".void-field-trial";
const OUTPUT_FAMILY_COMPONENT = "datanet-field-object-pull";
const PRIVATE_DIRECTORY_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;
const SAFE_COMPONENT = /^[A-Za-z0-9._-]{1,160}$/;

function boundedEnvironmentInteger(name, fallback, minimum, maximum) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  if (!/^[0-9]+$/.test(raw)) {
    throw Object.assign(
      new Error(`${name} must be a canonical positive integer`),
      { code: "INVALID_LIMIT" },
    );
  }
  const value = Number(raw);
  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw Object.assign(
      new Error(`${name} must be ${minimum}..${maximum}`),
      { code: "INVALID_LIMIT" },
    );
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

function statIdentity(stat) {
  return {
    dev: stat.dev.toString(),
    ino: stat.ino.toString(),
    uid: Number(stat.uid),
    gid: Number(stat.gid),
    mode: Number(stat.mode & 0o7777n),
    size: stat.size.toString(),
    nlink: stat.nlink.toString(),
    mtime_ns: stat.mtimeNs.toString(),
    ctime_ns: stat.ctimeNs.toString(),
  };
}

function sameObjectIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function sameFileGeneration(left, right) {
  return (
    sameObjectIdentity(left, right) &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.size === right.size &&
    left.nlink === right.nlink &&
    left.mtime_ns === right.mtime_ns &&
    left.ctime_ns === right.ctime_ns
  );
}

function requireLinuxDescriptorPrimitives() {
  for (const [name, value] of [
    ["O_DIRECTORY", FS.O_DIRECTORY],
    ["O_NOFOLLOW", FS.O_NOFOLLOW],
    ["O_EXCL", FS.O_EXCL],
  ]) {
    if (!Number.isInteger(value)) {
      throw Object.assign(
        new Error(`required Linux descriptor primitive unavailable: ${name}`),
        { code: "OUTPUT_PRIMITIVE_UNAVAILABLE" },
      );
    }
  }
  try {
    lstatSync("/proc/self/fd");
  } catch {
    throw Object.assign(
      new Error("required /proc/self/fd descriptor namespace unavailable"),
      { code: "OUTPUT_PRIMITIVE_UNAVAILABLE" },
    );
  }
}

function currentUid() {
  if (typeof process.getuid !== "function") {
    throw Object.assign(
      new Error("current UID is unavailable"),
      { code: "OUTPUT_UID_UNAVAILABLE" },
    );
  }
  return process.getuid();
}

function requireDirectoryAuthority(stat, exactPrivate, label) {
  if (!stat.isDirectory()) {
    throw Object.assign(
      new Error(`${label} is not a directory`),
      { code: "OUTPUT_PARENT_NOT_DIRECTORY" },
    );
  }
  if (Number(stat.uid) !== currentUid()) {
    throw Object.assign(
      new Error(`${label} is not owned by the current UID`),
      { code: "OUTPUT_PARENT_WRONG_OWNER" },
    );
  }
  const mode = Number(stat.mode & 0o7777n);
  if (exactPrivate ? mode !== PRIVATE_DIRECTORY_MODE : (mode & 0o022) !== 0) {
    throw Object.assign(
      new Error(
        exactPrivate
          ? `${label} must have mode 0700`
          : `${label} must not be group/other writable`,
      ),
      { code: "OUTPUT_PARENT_UNSAFE_MODE" },
    );
  }
}

function procChildPath(parentFd, component) {
  if (!SAFE_COMPONENT.test(component) || component === "." || component === "..") {
    throw Object.assign(
      new Error("unsafe output path component"),
      { code: "OUTPUT_COMPONENT_INVALID" },
    );
  }
  return `/proc/self/fd/${parentFd}/${component}`;
}

function openPinnedDirectory(path, exactPrivate, label) {
  let fd = null;
  try {
    const before = lstatSync(path, { bigint: true });
    if (before.isSymbolicLink()) {
      throw Object.assign(
        new Error(`${label} must not be a symbolic link`),
        { code: "OUTPUT_PARENT_SYMLINK" },
      );
    }
    fd = openSync(path, FS.O_RDONLY | FS.O_DIRECTORY | FS.O_NOFOLLOW);
    const pinned = fstatSync(fd, { bigint: true });
    if (!sameObjectIdentity(statIdentity(before), statIdentity(pinned))) {
      throw Object.assign(
        new Error(`${label} changed while being acquired`),
        { code: "OUTPUT_PARENT_GENERATION_CHANGED" },
      );
    }
    requireDirectoryAuthority(pinned, exactPrivate, label);
    return {
      fd,
      identity: statIdentity(pinned),
    };
  } catch (error) {
    if (fd !== null) closeSync(fd);
    throw error;
  }
}

function openOrCreatePinnedChildDirectory(
  parent,
  component,
  lexicalPath,
  label,
) {
  const path = procChildPath(parent.fd, component);
  let created = false;
  try {
    lstatSync(path, { bigint: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    mkdirSync(path, { mode: PRIVATE_DIRECTORY_MODE });
    fsyncSync(parent.fd);
    created = true;
  }

  const child = openPinnedDirectory(path, true, label);
  const lexical = lstatSync(lexicalPath, { bigint: true });
  if (!sameObjectIdentity(statIdentity(lexical), child.identity)) {
    closeSync(child.fd);
    throw Object.assign(
      new Error(`${label} lexical generation does not match pinned generation`),
      { code: "OUTPUT_PARENT_GENERATION_CHANGED" },
    );
  }

  if (created) {
    fsyncSync(child.fd);
    fsyncSync(parent.fd);
  }
  return child;
}

function assertPinnedDirectory(path, pinned, exactPrivate, label) {
  const lexical = lstatSync(path, { bigint: true });
  const current = fstatSync(pinned.fd, { bigint: true });
  const lexicalIdentity = statIdentity(lexical);
  const currentIdentity = statIdentity(current);
  requireDirectoryAuthority(current, exactPrivate, label);
  if (
    !sameObjectIdentity(lexicalIdentity, pinned.identity) ||
    !sameObjectIdentity(currentIdentity, pinned.identity) ||
    !sameObjectIdentity(lexicalIdentity, currentIdentity)
  ) {
    throw Object.assign(
      new Error(`${label} generation changed`),
      { code: "OUTPUT_NAMESPACE_CHANGED" },
    );
  }
}

function acquireOutputNamespace() {
  requireLinuxDescriptorPrimitives();

  const cwd = openPinnedDirectory(".", false, "working directory");
  let root = null;
  let family = null;
  let run = null;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runComponent = `${stamp}-${process.pid}-${randomBytes(16).toString("hex")}`;
  const rootPath = OUTPUT_ROOT_COMPONENT;
  const familyPath = join(rootPath, OUTPUT_FAMILY_COMPONENT);
  const runPath = join(familyPath, runComponent);

  try {
    root = openOrCreatePinnedChildDirectory(
      cwd,
      OUTPUT_ROOT_COMPONENT,
      rootPath,
      "output root",
    );
    family = openOrCreatePinnedChildDirectory(
      root,
      OUTPUT_FAMILY_COMPONENT,
      familyPath,
      "output family",
    );
    run = openOrCreatePinnedChildDirectory(
      family,
      runComponent,
      runPath,
      "output run directory",
    );

    assertPinnedDirectory(".", cwd, false, "working directory");
    assertPinnedDirectory(rootPath, root, true, "output root");
    assertPinnedDirectory(familyPath, family, true, "output family");
    assertPinnedDirectory(runPath, run, true, "output run directory");
    fsyncSync(family.fd);

    return {
      cwd,
      root,
      family,
      run,
      rootPath,
      familyPath,
      runPath,
      objectPath: join(runPath, "object.txt"),
      receiptPath: join(runPath, "receipt.json"),
    };
  } catch (error) {
    for (const entry of [run, family, root, cwd]) {
      if (entry?.fd !== undefined) {
        try {
          closeSync(entry.fd);
        } catch {
          // Preserve the primary acquisition failure.
        }
      }
    }
    throw error;
  }
}

function closeOutputNamespace(namespace) {
  for (const entry of [
    namespace?.run,
    namespace?.family,
    namespace?.root,
    namespace?.cwd,
  ]) {
    if (entry?.fd !== undefined) {
      try {
        closeSync(entry.fd);
      } catch {
        // Process exit owns the final descriptor terminal.
      }
    }
  }
}

function assertOutputNamespace(namespace) {
  assertPinnedDirectory(".", namespace.cwd, false, "working directory");
  assertPinnedDirectory(
    namespace.rootPath,
    namespace.root,
    true,
    "output root",
  );
  assertPinnedDirectory(
    namespace.familyPath,
    namespace.family,
    true,
    "output family",
  );
  assertPinnedDirectory(
    namespace.runPath,
    namespace.run,
    true,
    "output run directory",
  );
}

function writeAll(fd, bytes) {
  let offset = 0;
  while (offset < bytes.length) {
    const written = writeSync(fd, bytes, offset, bytes.length - offset, offset);
    if (written <= 0) {
      throw Object.assign(
        new Error("zero-progress evidence write"),
        { code: "OUTPUT_ZERO_PROGRESS_WRITE" },
      );
    }
    offset += written;
  }
}

function readExact(fd, length) {
  const bytes = Buffer.alloc(length);
  let offset = 0;
  while (offset < length) {
    const count = readSync(fd, bytes, offset, length - offset, offset);
    if (count <= 0) {
      throw Object.assign(
        new Error("short evidence readback"),
        { code: "OUTPUT_SHORT_READBACK" },
      );
    }
    offset += count;
  }
  const probe = Buffer.alloc(1);
  if (readSync(fd, probe, 0, 1, length) !== 0) {
    throw Object.assign(
      new Error("evidence file grew during readback"),
      { code: "OUTPUT_GREW_DURING_READBACK" },
    );
  }
  return bytes;
}

function publishPinnedFile(namespace, leaf, bytes) {
  assertOutputNamespace(namespace);
  const procPath = procChildPath(namespace.run.fd, leaf);
  let fd = null;
  try {
    fd = openSync(
      procPath,
      FS.O_RDWR | FS.O_CREAT | FS.O_EXCL | FS.O_NOFOLLOW,
      PRIVATE_FILE_MODE,
    );
    writeAll(fd, bytes);
    fsyncSync(fd);
    const committed = fstatSync(fd, { bigint: true });
    if (!committed.isFile()) {
      throw Object.assign(
        new Error("published evidence leaf is not regular"),
        { code: "OUTPUT_LEAF_NOT_REGULAR" },
      );
    }
    const committedIdentity = statIdentity(committed);
    if (
      committedIdentity.uid !== currentUid() ||
      committedIdentity.mode !== PRIVATE_FILE_MODE ||
      committedIdentity.nlink !== "1" ||
      committedIdentity.size !== String(bytes.length)
    ) {
      throw Object.assign(
        new Error("published evidence leaf authority mismatch"),
        { code: "OUTPUT_LEAF_AUTHORITY_MISMATCH" },
      );
    }
    const readback = readExact(fd, bytes.length);
    if (!readback.equals(bytes)) {
      throw Object.assign(
        new Error("published evidence readback mismatch"),
        { code: "OUTPUT_LEAF_READBACK_MISMATCH" },
      );
    }
    fsyncSync(namespace.run.fd);
    assertOutputNamespace(namespace);

    const lexicalPath =
      leaf === "object.txt" ? namespace.objectPath : namespace.receiptPath;
    const lexical = lstatSync(lexicalPath, { bigint: true });
    if (!sameFileGeneration(statIdentity(lexical), committedIdentity)) {
      throw Object.assign(
        new Error("published evidence lexical generation mismatch"),
        { code: "OUTPUT_LEAF_GENERATION_CHANGED" },
      );
    }
    return committedIdentity;
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

function readPinnedLocalFile(path, maxBytes) {
  let fd = null;
  try {
    fd = openSync(path, FS.O_RDONLY | FS.O_NOFOLLOW);
    const before = fstatSync(fd, { bigint: true });
    if (!before.isFile()) {
      throw Object.assign(
        new Error("local source must be a regular file"),
        { code: "FILE_NOT_REGULAR" },
      );
    }
    if (before.size > BigInt(maxBytes)) {
      throw Object.assign(
        new Error(`local source exceeds ${maxBytes} bytes`),
        { code: "FILE_TOO_LARGE" },
      );
    }
    if (before.size > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw Object.assign(
        new Error("local source size exceeds safe integer range"),
        { code: "FILE_SIZE_UNSAFE" },
      );
    }

    const expected = Number(before.size);
    const body = Buffer.alloc(expected);
    let offset = 0;
    while (offset < expected) {
      const count = readSync(fd, body, offset, expected - offset, offset);
      if (count === 0) {
        throw Object.assign(
          new Error("local source ended before admitted size"),
          { code: "FILE_SHORT_READ" },
        );
      }
      offset += count;
    }

    const growthProbe = Buffer.alloc(1);
    if (readSync(fd, growthProbe, 0, 1, expected) !== 0) {
      throw Object.assign(
        new Error("local source grew during bounded read"),
        { code: "FILE_GREW_DURING_READ" },
      );
    }

    const after = fstatSync(fd, { bigint: true });
    if (!sameFileGeneration(statIdentity(before), statIdentity(after))) {
      throw Object.assign(
        new Error("local source generation changed during read"),
        { code: "FILE_GENERATION_CHANGED" },
      );
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

function classifyInput(raw) {
  if (!/^[A-Za-z][A-Za-z0-9+.-]*:/.test(raw)) {
    return {
      ok: true,
      kind: "file_path",
      path: raw,
      displaySource: raw,
    };
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    return {
      ok: false,
      result: failed(
        "invalid",
        "INVALID_URL",
        "invalid URL",
        "<invalid-url>",
      ),
    };
  }

  if (url.protocol === "file:") {
    if (url.username || url.password || url.search || url.hash) {
      return {
        ok: false,
        result: failed(
          "file",
          "INVALID_FILE_URL",
          "file URL credentials, query, and fragment are forbidden",
          "file://<rejected-local-path>",
        ),
      };
    }
    if (url.hostname && url.hostname !== "localhost") {
      return {
        ok: false,
        result: failed(
          "file",
          "INVALID_FILE_URL",
          "non-local file URL authority is forbidden",
          "file://<rejected-local-path>",
        ),
      };
    }
    try {
      return {
        ok: true,
        kind: "file",
        path: fileURLToPath(url),
        displaySource: "file://<operator-local-path>",
      };
    } catch {
      return {
        ok: false,
        result: failed(
          "file",
          "INVALID_FILE_URL",
          "invalid local file URL",
          "file://<rejected-local-path>",
        ),
      };
    }
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      ok: false,
      result: failed(
        "invalid",
        "UNSUPPORTED_PROTOCOL",
        `unsupported protocol: ${url.protocol}`,
        "<unsupported-url>",
      ),
    };
  }
  if (url.username || url.password) {
    return {
      ok: false,
      result: failed(
        "http",
        "INVALID_URL",
        "URL credentials are forbidden",
        `${url.protocol}//${url.host}${url.pathname}`,
      ),
    };
  }
  if (url.hash) {
    return {
      ok: false,
      result: failed(
        "http",
        "INVALID_URL",
        "URL fragments are forbidden",
        `${url.protocol}//${url.host}${url.pathname}`,
      ),
    };
  }
  return {
    ok: true,
    kind: "http",
    url,
    displaySource: `${url.protocol}//${url.host}${url.pathname}`,
  };
}

function pullHttp(classified, limits) {
  const { url, displaySource } = classified;
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
          accept:
            "application/octet-stream, application/json;q=0.9, text/plain;q=0.8",
          connection: "close",
          "user-agent": "void-node/datanet-field-object-pull-v1",
        },
      },
      (res) => {
        response = res;
        const status = Number(res.statusCode || 0);
        if (status >= 300 && status < 400) {
          fail("HTTP_REDIRECT_REJECTED", `redirect rejected: HTTP ${status}`);
          res.destroy();
          return;
        }
        if (status < 200 || status >= 300) {
          fail("HTTP_STATUS_NOT_OK", `HTTP ${status}`);
          res.destroy();
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
            chunks.length = 0;
            total = 0;
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

async function pull(classified, limits) {
  if (!classified.ok) return classified.result;
  if (classified.kind === "http") return pullHttp(classified, limits);
  return pullLocal(
    classified.path,
    classified.kind,
    limits.maxBytes,
    classified.displaySource,
  );
}

function emitHold(error) {
  console.error(MARKER_HOLD);
  console.error(`code=${safeCode(error, "OUTPUT_NAMESPACE_HOLD")}`);
  console.error(`error=${safeMessage(error, "output namespace hold")}`);
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
  console.error("Invalid expected SHA-256");
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

const classified = classifyInput(raw);
let namespace = null;

try {
  namespace = acquireOutputNamespace();
  const result = await pull(classified, limits);
  assertOutputNamespace(namespace);

  const body = result.body || Buffer.alloc(0);
  publishPinnedFile(namespace, "object.txt", body);

  const actual = createHash("sha256").update(body).digest("hex");
  const match = result.ok && actual === expected;
  const receipt = {
    marker: match ? MARKER_GREEN : MARKER_FAIL,
    created_at: new Date().toISOString(),
    host: hostname(),
    network_hint: process.env.VOID_NETWORK_HINT || "operator-specified",
    source: result.display_source || "<unavailable>",
    source_type: result.source_type,
    ok: result.ok,
    status: result.status,
    code: result.code,
    error: result.error,
    expected_sha256: expected,
    actual_sha256: actual,
    match,
    bytes: body.length,
    object_path: namespace.objectPath,
    dangerous_paths_touched: false,
    output_namespace_bound: true,
    output_namespace_policy: {
      descriptor_relative_publication: true,
      no_follow_parent_traversal: true,
      current_uid_owned: true,
      private_directory_mode: "0700",
      private_file_mode: "0600",
      directory_fsync: true,
      generation_revalidated: true,
    },
    limits: {
      max_bytes: limits.maxBytes,
      inactivity_timeout_ms: limits.inactivityTimeoutMs,
      total_timeout_ms: limits.totalTimeoutMs,
    },
  };

  const receiptBytes = Buffer.from(
    `${JSON.stringify(receipt, null, 2)}\n`,
    "utf8",
  );
  publishPinnedFile(namespace, "receipt.json", receiptBytes);
  assertOutputNamespace(namespace);
  fsyncSync(namespace.run.fd);
  fsyncSync(namespace.family.fd);

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
  console.log("output_namespace_bound=true");
  console.log(`receipt=${namespace.receiptPath}`);

  process.exitCode = match ? 0 : 1;
} catch (error) {
  emitHold(error);
  process.exitCode = 2;
} finally {
  closeOutputNamespace(namespace);
}
