#!/usr/bin/env node
import http from "node:http";
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  openSync,
  readFileSync,
} from "node:fs";
import { hostname } from "node:os";
import { extname, join, relative, resolve, sep } from "node:path";

const args = process.argv.slice(2);
let port = Number(process.env.VOID_PUBLIC_NODE_PORT || "8088");
let bindHost = process.env.VOID_PUBLIC_NODE_BIND || "0.0.0.0";
let checkOnly = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--check") checkOnly = true;
  else if (a === "--port") port = Number(args[++i]);
  else if (a === "--host" || a === "--bind") bindHost = args[++i] || bindHost;
  else if (/^\d+$/.test(a)) port = Number(a);
}

const root = resolve(process.cwd(), "public");
const publicNodeIndex = resolve(root, "public-node", "index.json");
const PROC_SELF_FD = "/proc/self/fd";
let publicRootFd = null;

function fail(message) {
  console.error("VOID_PUBLIC_NODE_SAFE_SERVE_V1_FAIL");
  console.error(message);
  process.exit(1);
}

function safeResolve(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0] || "/");
  const rel = cleanPath.replace(/^\/+/, "");
  const target = resolve(root, rel);

  if (target !== root && !target.startsWith(root + sep)) {
    return null;
  }

  return target;
}

function contentType(path) {
  const ext = extname(path).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  if (ext === ".md") return "text/markdown; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js" || ext === ".mjs") return "text/javascript; charset=utf-8";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function requireDescriptorTraversalSupport() {
  if (
    typeof constants.O_NOFOLLOW !== "number" ||
    constants.O_NOFOLLOW <= 0 ||
    typeof constants.O_DIRECTORY !== "number" ||
    constants.O_DIRECTORY <= 0
  ) {
    throw new Error("required no-follow directory flags unavailable");
  }
  if (!existsSync(PROC_SELF_FD)) {
    throw new Error("/proc/self/fd unavailable");
  }
}

function bindPublicRoot() {
  if (publicRootFd !== null) return;
  requireDescriptorTraversalSupport();
  const fd = openSync(
    root,
    constants.O_RDONLY |
      constants.O_DIRECTORY |
      constants.O_NOFOLLOW |
      Number(constants.O_NONBLOCK || 0),
  );
  const st = fstatSync(fd);
  if (!st.isDirectory()) {
    closeSync(fd);
    throw new Error("public root is not a directory");
  }
  publicRootFd = fd;
}

function descriptorChildPath(parentFd, name) {
  return join(PROC_SELF_FD, String(parentFd), name);
}

function classifyPathError(error) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code || "")
      : "";
  if (code === "ELOOP" || code === "EACCES" || code === "EPERM") {
    return 403;
  }
  if (code === "ENOENT" || code === "ENOTDIR") {
    return 404;
  }
  return 500;
}

function openChildNoFollow(parentFd, name) {
  return openSync(
    descriptorChildPath(parentFd, name),
    constants.O_RDONLY |
      constants.O_NOFOLLOW |
      Number(constants.O_NONBLOCK || 0),
  );
}

function openPublicTarget(target) {
  if (publicRootFd === null) {
    throw new Error("public root descriptor not bound");
  }

  const rel = relative(root, target);
  if (rel === ".." || rel.startsWith(".." + sep) || resolve(root, rel) !== target) {
    return { status: 403 };
  }

  const parts = rel === "" ? [] : rel.split(sep).filter(Boolean);
  const directoryFds = [];
  let parentFd = publicRootFd;

  try {
    if (parts.length === 0) {
      const fd = openChildNoFollow(parentFd, "index.html");
      const st = fstatSync(fd);
      if (!st.isFile()) {
        closeSync(fd);
        return { status: 404 };
      }
      return { status: 200, fd, size: st.size, file: join(target, "index.html") };
    }

    for (let index = 0; index < parts.length; index += 1) {
      const fd = openChildNoFollow(parentFd, parts[index]);
      const st = fstatSync(fd);
      const final = index === parts.length - 1;

      if (!final) {
        if (!st.isDirectory()) {
          closeSync(fd);
          return { status: 404 };
        }
        directoryFds.push(fd);
        parentFd = fd;
        continue;
      }

      if (st.isDirectory()) {
        directoryFds.push(fd);
        const indexFd = openChildNoFollow(fd, "index.html");
        const indexStat = fstatSync(indexFd);
        if (!indexStat.isFile()) {
          closeSync(indexFd);
          return { status: 404 };
        }
        return {
          status: 200,
          fd: indexFd,
          size: indexStat.size,
          file: join(target, "index.html"),
        };
      }

      if (!st.isFile()) {
        closeSync(fd);
        return { status: 404 };
      }

      return { status: 200, fd, size: st.size, file: target };
    }

    return { status: 404 };
  } catch (error) {
    return { status: classifyPathError(error) };
  } finally {
    for (let index = directoryFds.length - 1; index >= 0; index -= 1) {
      closeSync(directoryFds[index]);
    }
  }
}

function readOpenedPublicFile(opened) {
  try {
    return readFileSync(opened.fd);
  } finally {
    closeSync(opened.fd);
  }
}

function preflight() {
  try {
    bindPublicRoot();
  } catch (error) {
    fail(`public root binding failed: ${error.message}`);
  }

  const opened = openPublicTarget(publicNodeIndex);
  if (opened.status !== 200) {
    fail(`public-node index unavailable through retained root: status=${opened.status}`);
  }

  try {
    JSON.parse(readOpenedPublicFile(opened).toString("utf8"));
  } catch (err) {
    fail(`public-node index JSON parse failed: ${err.message}`);
  }

  console.log("VOID_PUBLIC_NODE_SAFE_SERVE_V1_GREEN");
  console.log(`host=${hostname()}`);
  console.log(`root=${root}`);
  console.log(`public_node_index=${publicNodeIndex}`);
  console.log("descriptor_relative_path_custody=true");
  console.log("symlink_components_followed=false");
}

if (checkOnly) {
  preflight();
  process.exit(0);
}

preflight();

const server = http.createServer((req, res) => {
  if (!["GET", "HEAD"].includes(req.method || "")) {
    res.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
    res.end("method not allowed\n");
    return;
  }

  let target;
  try {
    target = safeResolve(req.url || "/");
  } catch (error) {
    void error;
    res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
    res.end("bad request\n");
    return;
  }

  if (!target) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    res.end("forbidden\n");
    return;
  }

  const opened = openPublicTarget(target);
  if (opened.status !== 200) {
    const status = opened.status === 403 ? 403 : opened.status === 404 ? 404 : 500;
    res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
    res.end(status === 403 ? "forbidden\n" : status === 404 ? "not found\n" : "internal error\n");
    return;
  }

  let body;
  try {
    body = readOpenedPublicFile(opened);
  } catch (error) {
    void error;
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("internal error\n");
    return;
  }

  res.writeHead(200, {
    "content-type": contentType(opened.file),
    "content-length": body.length,
    "cache-control": "no-store",
  });

  if (req.method === "HEAD") res.end();
  else res.end(body);
});

server.listen(port, bindHost, () => {
  const address = server.address();
  const actualPort =
    address && typeof address === "object" ? address.port : port;
  console.log("VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY");
  console.log(`host=${hostname()}`);
  console.log(`bind=${bindHost}`);
  console.log(`port=${actualPort}`);
  console.log(`root=${root}`);
  console.log(
    `local_url=http://127.0.0.1:${actualPort}/public-node/index.json`,
  );
  console.log("descriptor_relative_path_custody=true");
  console.log("symlink_components_followed=false");
  console.log("dangerous_paths_touched=false");
});
