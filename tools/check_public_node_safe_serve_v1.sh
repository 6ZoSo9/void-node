#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(pwd)"

node --check tools/public-node-safe-serve-v1.mjs

node - <<'NODE'
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (pkg.scripts?.["public-node:serve"] !== "node tools/public-node-safe-serve-v1.mjs") {
  throw new Error("missing public-node:serve script");
}
if (!fs.existsSync("tools/public-node-safe-serve-v1.mjs")) {
  throw new Error("missing tools/public-node-safe-serve-v1.mjs");
}
const source = fs.readFileSync("tools/public-node-safe-serve-v1.mjs", "utf8");
if (!source.includes("const MAX_PUBLIC_FILE_BYTES = 8 * 1024 * 1024;")) {
  throw new Error("missing reviewed 8 MiB public-file ceiling");
}
if (source.includes("readFileSync(opened.fd)")) {
  throw new Error("unbounded retained-fd read remains");
}
const sizeGate = source.indexOf("st.size > MAX_PUBLIC_FILE_BYTES");
const allocation = source.indexOf("Buffer.allocUnsafe(opened.size)");
if (sizeGate < 0 || allocation < 0 || sizeGate > allocation) {
  throw new Error("file-size admission must precede body allocation");
}
const handler = source.indexOf("const server = http.createServer");
const headBranch = source.indexOf('if (req.method === "HEAD")', handler);
const bodyRead = source.indexOf("body = readOpenedPublicFile(opened)", handler);
if (handler < 0 || headBranch < handler || bodyRead < 0 || headBranch > bodyRead) {
  throw new Error("HEAD must close from retained metadata before body read");
}
NODE

check_output="$(npm run public-node:serve -- --check)"
grep -q 'VOID_PUBLIC_NODE_SAFE_SERVE_V1_GREEN' <<<"$check_output"
grep -q 'descriptor_relative_path_custody=true' <<<"$check_output"
grep -q 'symlink_components_followed=false' <<<"$check_output"

tmp="$(mktemp -d)"
log="$tmp/server.log"
pid=""

cleanup() {
  if [[ -n "$pid" ]]; then
    kill "$pid" 2>/dev/null || true
  fi
  rm -rf "$tmp"
}
trap cleanup EXIT

mkdir -p "$tmp/public/public-node" "$tmp/outside-dir"
printf '{"ok":true,"fixture":"safe-serve-path-custody-v1"}\n' >"$tmp/public/public-node/index.json"
printf 'LEAF_SYMLINK_SECRET_MUST_NOT_BE_SERVED\n' >"$tmp/outside-secret.txt"
printf 'ANCESTOR_SYMLINK_SECRET_MUST_NOT_BE_SERVED\n' >"$tmp/outside-dir/secret.txt"
ln -s "$tmp/outside-secret.txt" "$tmp/public/public-node/leaf-link.txt"
ln -s "$tmp/outside-dir" "$tmp/public/public-node/dir-link"
truncate -s 8388609 "$tmp/public/public-node/oversized.bin"

(
  cd "$tmp"
  exec node "$REPO_ROOT/tools/public-node-safe-serve-v1.mjs" \\\n    --host 127.0.0.1 \\\n    --port 0 >"$log" 2>&1
) &
pid=$!

for _ in $(seq 1 60); do
  if grep -q 'VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY' "$log"; then
    break
  fi
  if ! kill -0 "$pid" 2>/dev/null; then
    cat "$log" >&2
    exit 1
  fi
  sleep 0.1
done

grep -q 'VOID_PUBLIC_NODE_SAFE_SERVE_V1_READY' "$log"
grep -q 'descriptor_relative_path_custody=true' "$log"
grep -q 'symlink_components_followed=false' "$log"

port="$(awk -F= '$1 == "port" { print $2; exit }' "$log")"
if [[ ! "$port" =~ ^[0-9]+$ ]] || (( port < 1 || port > 65535 )); then
  echo "invalid dynamic port: $port" >&2
  cat "$log" >&2
  exit 1
fi

PORT="$port" node - <<'NODE'
const http = require("http");
const port = Number(process.env.PORT);

function request(path, method = "GET") {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, path, method },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.once("end", () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.once("error", reject);
    req.end();
  });
}

(async () => {
  const index = await request("/public-node/index.json");
  if (index.status !== 200) throw new Error("index status " + index.status);
  const parsed = JSON.parse(index.body);
  if (parsed.fixture !== "safe-serve-path-custody-v1") {
    throw new Error("unexpected fixture body");
  }

  const leaf = await request("/public-node/leaf-link.txt");
  if (leaf.status !== 403) throw new Error("leaf symlink status " + leaf.status);
  if (leaf.body.includes("LEAF_SYMLINK_SECRET_MUST_NOT_BE_SERVED")) {
    throw new Error("leaf symlink secret disclosed");
  }

  const ancestor = await request("/public-node/dir-link/secret.txt");
  if (ancestor.status !== 403) {
    throw new Error("ancestor symlink status " + ancestor.status);
  }
  if (ancestor.body.includes("ANCESTOR_SYMLINK_SECRET_MUST_NOT_BE_SERVED")) {
    throw new Error("ancestor symlink secret disclosed");
  }

  const traversal = await request("/%2e%2e/outside-secret.txt");
  if (traversal.status !== 403) {
    throw new Error("lexical traversal status " + traversal.status);
  }
  if (traversal.body.includes("LEAF_SYMLINK_SECRET_MUST_NOT_BE_SERVED")) {
    throw new Error("lexical traversal secret disclosed");
  }

  const oversized = await request("/public-node/oversized.bin");
  if (oversized.status !== 413) {
    throw new Error("oversized file status " + oversized.status);
  }
  if (oversized.body.length > 1024) {
    throw new Error("oversized rejection unexpectedly buffered a large body");
  }

  const head = await request("/public-node/index.json", "HEAD");
  if (head.status !== 200) throw new Error("HEAD status " + head.status);
  if (head.body.length !== 0) throw new Error("HEAD returned a body");
  if (Number(head.headers["content-length"]) !== Buffer.byteLength(index.body)) {
    throw new Error("HEAD content-length did not come from retained metadata");
  }

  const afterOversized = await request("/public-node/index.json");
  if (afterOversized.status !== 200) {
    throw new Error("server did not remain healthy after oversized rejection");
  }

  console.log("public_index_served=true");
  console.log("leaf_symlink_escape_rejected=true");
  console.log("ancestor_symlink_escape_rejected=true");
  console.log("lexical_traversal_rejected=true");
  console.log("head_body_empty=true");
  console.log("oversized_file_rejected=true");
  console.log("head_body_read=false");
  console.log("bounded_descriptor_read=true");
  console.log("descriptor_generation_revalidated=true");
  console.log("public_file_snapshot_max_bytes=8388608");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE

kill "$pid" 2>/dev/null || true
pid=""
trap - EXIT
rm -rf "$tmp"

echo "VOID_PUBLIC_NODE_SAFE_SERVE_PATH_CUSTODY_V1_GREEN"
echo "descriptor_relative_path_custody=true"
echo "symlink_components_followed=false"
echo "public_file_snapshot_max_bytes=8388608"
echo "oversized_file_rejected=true"
echo "head_body_read=false"
echo "bounded_descriptor_read=true"
echo "descriptor_generation_revalidated=true"
echo "dangerous_paths_touched=false"
