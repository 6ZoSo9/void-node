#!/usr/bin/env node

import http from "node:http";
import {
  existsSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import {
  VOID_TOR_DESCRIPTOR_PATHS,
  VOID_TOR_ONION_TRANSPORT_MARKER,
  buildVoidTorDescriptorV1,
} from "./lib/void-tor-onion-descriptor-v1.mjs";
import {
  VOID_NODE_ONION_BINDING_MARKER,
  VOID_NODE_ONION_BINDING_PATHS,
  readAndVerifyVoidNodeOnionBindingV1,
} from "./lib/void-node-onion-binding-v1.mjs";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1"]);
const MAX_URL_LENGTH = 2048;

function fail(message) {
  console.error("VOID_TOR_ONION_PUBLIC_NODE_V1_FAIL");
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    host: process.env.VOID_TOR_PUBLIC_NODE_BIND || "127.0.0.1",
    port: Number(process.env.VOID_TOR_PUBLIC_NODE_PORT || "18088"),
    hostnameFile: process.env.VOID_TOR_HOSTNAME_FILE || "",
    virtualPort: Number(process.env.VOID_TOR_VIRTUAL_PORT || "80"),
    bindingFile: process.env.VOID_NODE_ONION_BINDING_FILE || "",
    checkOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`missing value for ${argument}`);
      return argv[index];
    };
    if (argument === "--host" || argument === "--bind") options.host = next();
    else if (argument === "--port") options.port = Number(next());
    else if (argument === "--hostname-file") options.hostnameFile = next();
    else if (argument === "--virtual-port") options.virtualPort = Number(next());
    else if (argument === "--binding-file") options.bindingFile = next();
    else if (argument === "--check") options.checkOnly = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`unknown argument: ${argument}`);
  }
  return options;
}

function usage() {
  console.log(`Usage:
  node tools/void-tor-onion-public-node-v1.mjs \\
    [--host 127.0.0.1] [--port 18088] \\
    [--hostname-file PATH] [--virtual-port 80] \
    [--binding-file PATH] [--check]

This server is intentionally loopback-only and permanently GET/HEAD-only.`);
}

function assertPort(value, label, allowZero = false) {
  if (!Number.isInteger(value) || value < (allowZero ? 0 : 1) || value > 65535) {
    throw new Error(`${label} must be ${allowZero ? "zero or " : ""}an integer from 1 through 65535`);
  }
}

function contentType(path) {
  const extension = extname(path).toLowerCase();
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".json") return "application/json; charset=utf-8";
  if (extension === ".txt") return "text/plain; charset=utf-8";
  if (extension === ".md") return "text/markdown; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".js" || extension === ".mjs") return "text/javascript; charset=utf-8";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".ico") return "image/x-icon";
  return "application/octet-stream";
}

function standardHeaders(extra = {}) {
  return {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    ...extra,
  };
}

function send(res, status, bodyValue, method, type = "text/plain; charset=utf-8") {
  const body = Buffer.isBuffer(bodyValue) ? bodyValue : Buffer.from(String(bodyValue), "utf8");
  res.writeHead(
    status,
    standardHeaders({
      "content-type": type,
      "content-length": String(body.length),
    }),
  );
  if (method === "HEAD") res.end();
  else res.end(body);
}

function safeResolveStatic(root, realRoot, rawUrl) {
  const rawPath = String(rawUrl || "/").split("?", 1)[0] || "/";
  if (rawPath.length > MAX_URL_LENGTH) return { error: 414 };

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    return { error: 400 };
  }

  if (decodedPath.includes("\0") || decodedPath.includes("\\")) return { error: 403 };
  const segments = decodedPath.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return { error: 403 };
  }

  const candidate = resolve(root, `.${decodedPath.startsWith("/") ? decodedPath : `/${decodedPath}`}`);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return { error: 403 };

  let file = candidate;
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file) || !statSync(file).isFile()) return { error: 404 };

  const realFile = realpathSync(file);
  if (realFile !== realRoot && !realFile.startsWith(`${realRoot}${sep}`)) return { error: 403 };
  return { file: realFile };
}

function bindingResponse(options, hostname) {
  if (!options.bindingFile || !existsSync(options.bindingFile)) {
    return { state: "absent", status: 404, value: null, summary: null };
  }
  try {
    const verified = readAndVerifyVoidNodeOnionBindingV1(options.bindingFile, {
      expectedOnionHostname: hostname,
      expectedVirtualPort: options.virtualPort,
    });
    return { state: "valid", status: 200, value: verified.binding, summary: verified.summary };
  } catch {
    return {
      state: "invalid",
      status: 503,
      summary: null,
      value: {
        marker: VOID_NODE_ONION_BINDING_MARKER,
        version: 1,
        status: "unavailable",
        reason: "signed-node-binding-invalid",
      },
    };
  }
}

function descriptorResponse(options, listeningPort) {
  if (!options.hostnameFile || !existsSync(options.hostnameFile)) {
    return {
      status: 503,
      value: {
        marker: VOID_TOR_ONION_TRANSPORT_MARKER,
        version: 1,
        status: "unavailable",
        reason: "onion-hostname-not-ready",
      },
    };
  }

  try {
    const hostname = readFileSync(options.hostnameFile, "utf8").trim();
    const generatedAt = statSync(options.hostnameFile).mtime.toISOString();
    const binding = bindingResponse(options, hostname);
    if (binding.state === "invalid") {
      return {
        status: 503,
        value: {
          marker: VOID_TOR_ONION_TRANSPORT_MARKER,
          version: 1,
          status: "unavailable",
          reason: "signed-node-binding-invalid",
        },
      };
    }
    return {
      status: 200,
      value: buildVoidTorDescriptorV1({
        onionHostname: hostname,
        localPort: listeningPort,
        virtualPort: options.virtualPort,
        generatedAt,
        status: "active",
        nodeBinding: binding.summary,
      }),
    };
  } catch {
    return {
      status: 503,
      value: {
        marker: VOID_TOR_ONION_TRANSPORT_MARKER,
        version: 1,
        status: "unavailable",
        reason: "onion-hostname-invalid",
      },
    };
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    process.exit(0);
  }
  if (!LOOPBACK_HOSTS.has(options.host)) {
    throw new Error("bind host must be exactly 127.0.0.1 or ::1");
  }
  assertPort(options.port, "port", true);
  assertPort(options.virtualPort, "virtual_port");

  const root = resolve(process.cwd(), "public");
  const publicNodeIndex = resolve(root, "public-node", "index.json");
  if (!existsSync(root)) throw new Error(`public root missing: ${root}`);
  if (!existsSync(publicNodeIndex)) {
    throw new Error(`public-node index missing: ${publicNodeIndex}`);
  }
  JSON.parse(readFileSync(publicNodeIndex, "utf8"));
  const realRoot = realpathSync(root);

  if (options.checkOnly) {
    console.log("VOID_TOR_ONION_PUBLIC_NODE_V1_CHECK_GREEN");
    console.log(`root=${root}`);
    console.log(`bind=${options.host}`);
    console.log("read_only=true");
    console.log("dangerous_paths_touched=false");
    process.exit(0);
  }

  let listeningPort = options.port;
  const server = http.createServer({ maxHeaderSize: 16 * 1024 }, (req, res) => {
    const method = req.method || "";
    if (!new Set(["GET", "HEAD"]).has(method)) {
      send(res, 405, "method not allowed\n", method);
      return;
    }

    const rawPath = String(req.url || "/").split("?", 1)[0] || "/";
    if (VOID_TOR_DESCRIPTOR_PATHS.includes(rawPath)) {
      const result = descriptorResponse(options, listeningPort);
      send(
        res,
        result.status,
        `${JSON.stringify(result.value, null, 2)}\n`,
        method,
        "application/json; charset=utf-8",
      );
      return;
    }

    if (VOID_NODE_ONION_BINDING_PATHS.includes(rawPath)) {
      let result;
      try {
        const hostname = options.hostnameFile && existsSync(options.hostnameFile)
          ? readFileSync(options.hostnameFile, "utf8").trim()
          : "";
        result = bindingResponse(options, hostname);
      } catch {
        result = { state: "invalid", status: 503, value: { marker: VOID_NODE_ONION_BINDING_MARKER, version: 1, status: "unavailable", reason: "signed-node-binding-invalid" } };
      }
      if (result.state === "absent") {
        send(res, 404, "not found\n", method);
      } else {
        send(res, result.status, `${JSON.stringify(result.value, null, 2)}\n`, method, "application/json; charset=utf-8");
      }
      return;
    }

    const resolved = safeResolveStatic(root, realRoot, req.url || "/");
    if (resolved.error) {
      const messages = {
        400: "bad request\n",
        403: "forbidden\n",
        404: "not found\n",
        414: "uri too long\n",
      };
      send(res, resolved.error, messages[resolved.error], method);
      return;
    }

    const body = readFileSync(resolved.file);
    send(res, 200, body, method, contentType(resolved.file));
  });

  server.maxConnections = 64;
  server.requestTimeout = 10_000;
  server.headersTimeout = 5_000;
  server.keepAliveTimeout = 2_000;
  server.maxRequestsPerSocket = 100;

  const stop = (signal) => {
    console.log(`signal=${signal}`);
    server.close((error) => process.exit(error ? 1 : 0));
    setTimeout(() => process.exit(1), 5_000).unref();
  };
  process.once("SIGTERM", () => stop("SIGTERM"));
  process.once("SIGINT", () => stop("SIGINT"));

  server.listen(options.port, options.host, () => {
    const address = server.address();
    if (!address || typeof address === "string") fail("unexpected listener address");
    listeningPort = address.port;
    console.log("VOID_TOR_ONION_PUBLIC_NODE_V1_READY");
    console.log(`bind=${options.host}`);
    console.log(`port=${listeningPort}`);
    console.log(`root=${root}`);
    console.log("read_only=true");
    console.log("dangerous_paths_touched=false");
  });
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
