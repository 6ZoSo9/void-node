#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$ROOT"

SOURCE="src/http/datanet_routes.ts"
DOC="docs/public-node/datanet/datanet-paid-read-explicit-public-routes-v1.md"
PROOF="ops/mainnet0/void-datanet-paid-read-explicit-public-routes-v1-proof.sh"
WORKFLOW=".github/workflows/void-datanet-paid-read-explicit-public-routes-v1.yml"

INDEX="public/public-node/datanet/index.json"
CARD="public/public-node/datanet/paid-read-quote-v1.json"
SCHEMA="public/public-node/datanet/paid-read-quote-v1.schema.json"

INDEX_SHA="350f12849f1ee24dc8efd5fa3722b13944f38a37a247f847d1f763a91c087e0e"
CARD_SHA="aa2903c87d9ed5b41b16702e8ada063b6160ebcfc0a0c253e4a9cc8504a1d9aa"
SCHEMA_SHA="8e4d27a46168dd0c437f8708b6e904a556c73f5fa1032835a4b6cc4f1064aaf7"

for file in "$SOURCE" "$DOC" "$PROOF" "$WORKFLOW" "$INDEX" "$CARD" "$SCHEMA"
do
  test -f "$file" || {
    echo "HOLD: required explicit-route proof file missing: $file"
    exit 1
  }
done

TYPECHECK_BASE_SHA="${VOID_TYPECHECK_BASE_SHA:-HEAD}"
git cat-file -e "${TYPECHECK_BASE_SHA}^{commit}"
SOURCE_GUARD_BASE_SHA="$(git merge-base "$TYPECHECK_BASE_SHA" HEAD)"
git cat-file -e "${SOURCE_GUARD_BASE_SHA}^{commit}"

test "$(sha256sum "$INDEX" | awk '{print $1}')" = "$INDEX_SHA"
test "$(sha256sum "$CARD" | awk '{print $1}')" = "$CARD_SHA"
test "$(sha256sum "$SCHEMA" | awk '{print $1}')" = "$SCHEMA_SHA"

git diff --quiet "$SOURCE_GUARD_BASE_SHA" HEAD -- src/index.ts || {
  echo "HOLD: src/index.ts changed relative to branch merge base: $SOURCE_GUARD_BASE_SHA"
  exit 1
}
git diff --quiet "$SOURCE_GUARD_BASE_SHA" HEAD -- tools/void-tor-onion-public-node-v1.mjs || {
  echo "HOLD: Tor public-node tool changed relative to branch merge base: $SOURCE_GUARD_BASE_SHA"
  exit 1
}

python3 - "$SOURCE" "$DOC" "$WORKFLOW" <<'PY'
from pathlib import Path
import sys

source = Path(sys.argv[1]).read_text(encoding="utf-8")
doc = Path(sys.argv[2]).read_text(encoding="utf-8")
workflow = Path(sys.argv[3]).read_text(encoding="utf-8")

begin = "// VOID_DATANET_PAID_READ_EXPLICIT_PUBLIC_ROUTES_V1_BEGIN"
end = "// VOID_DATANET_PAID_READ_EXPLICIT_PUBLIC_ROUTES_V1_END"

assert source.count(begin) == 1
assert source.count(end) == 1
block = source.split(begin, 1)[1].split(end, 1)[0]

routes = [
    "/public-node/datanet/index.json",
    "/public-node/datanet/paid-read-quote-v1.json",
    "/public-node/datanet/paid-read-quote-v1.schema.json",
]
files = [
    "index.json",
    "paid-read-quote-v1.json",
    "paid-read-quote-v1.schema.json",
]

for route in routes:
    assert block.count(route) == 1, (route, block.count(route))
for name in files:
    assert block.count(f'file: "{name}"') == 1

assert block.count("app.head(entry.route") == 1
assert block.count("app.get(entry.route") == 1
assert "__void_datanet_paid_read_explicit_public_routes_v1" in block
assert 'path.resolve(' in block
assert '"public",' in block
assert '"public-node",' in block
assert '"datanet",' in block
assert 'path.relative(publicDatanetRoot, filePath)' in block
assert 'relative.startsWith("..")' in block
assert 'path.isAbsolute(relative)' in block
assert 'fs.readFileSync(filePath)' in block
assert 'fs.statSync(filePath)' in block
assert '"Cache-Control", "public, max-age=60"' in block
assert '"Content-Type", "application/json; charset=utf-8"' in block
assert '"X-Content-Type-Options", "nosniff"' in block
assert "express.static" not in block
assert "serveStatic" not in block
assert "sendFile" not in block
assert "app.use(" not in block
assert "req.params" not in block
assert "req.query" not in block
assert "router.post" not in block
assert "router.put" not in block
assert "router.patch" not in block
assert "router.delete" not in block

assert "VOID_DATANET_PAID_READ_EXPLICIT_PUBLIC_ROUTES_V1" in doc
assert "src/index.ts" in doc and "not modified" in doc
assert "Tor tool source" in doc and "not modified" in doc
assert "GET and HEAD" in doc
assert "directory-wide static mount" in doc
assert "VOID_DATANET_PAID_READ_EXPLICIT_PUBLIC_ROUTES_V1" in workflow
assert "fetch-depth: 0" in workflow
assert "VOID_TYPECHECK_BASE_SHA" in workflow
assert "npm run typecheck" not in workflow
proof_name = "void-datanet-paid-read-explicit-public-routes-v1-proof.sh"
assert proof_name in workflow

print("static_contract_green=true")
PY

TMP_ROOT="$(mktemp -d -t void-paid-read-explicit-routes-proof-XXXXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

BASE_ROOT="$TMP_ROOT/typecheck-base"
BASE_LOG="$TMP_ROOT/typecheck-base.log"
PATCHED_LOG="$TMP_ROOT/typecheck-patched.log"
BASE_RC_FILE="$TMP_ROOT/typecheck-base.rc"
PATCHED_RC_FILE="$TMP_ROOT/typecheck-patched.rc"

mkdir -p "$BASE_ROOT"
git archive --format=tar "$TYPECHECK_BASE_SHA" | tar -xf - -C "$BASE_ROOT"

test -d "$ROOT/node_modules" || {
  echo "HOLD: node_modules is required for typecheck delta proof"
  exit 1
}
ln -s "$ROOT/node_modules" "$BASE_ROOT/node_modules"

set +e
(
  cd "$BASE_ROOT"
  npm run typecheck
) >"$BASE_LOG" 2>&1
BASE_RC=$?

(
  cd "$ROOT"
  npm run typecheck
) >"$PATCHED_LOG" 2>&1
PATCHED_RC=$?
set -e

printf '%s\n' "$BASE_RC" >"$BASE_RC_FILE"
printf '%s\n' "$PATCHED_RC" >"$PATCHED_RC_FILE"

python3 - \
  "$BASE_LOG" \
  "$PATCHED_LOG" \
  "$BASE_RC_FILE" \
  "$PATCHED_RC_FILE" \
  "$BASE_ROOT" \
  "$ROOT" <<'PY'
from __future__ import annotations

from collections import Counter
from pathlib import Path
import json
import re
import sys

base_log = Path(sys.argv[1])
patched_log = Path(sys.argv[2])
base_rc = int(Path(sys.argv[3]).read_text(encoding="utf-8").strip())
patched_rc = int(Path(sys.argv[4]).read_text(encoding="utf-8").strip())
base_root = Path(sys.argv[5]).resolve()
patched_root = Path(sys.argv[6]).resolve()

pattern = re.compile(
    r"^(?P<path>.+?)\((?P<line>\d+),(?P<column>\d+)\): "
    r"error (?P<code>TS\d+): (?P<message>.*)$"
)


def normalize_path(value: str, root: Path) -> str:
    normalized = value.replace("\\", "/")
    root_text = str(root).replace("\\", "/").rstrip("/")
    if normalized == root_text:
        return "."
    if normalized.startswith(root_text + "/"):
        return normalized[len(root_text) + 1 :]
    return normalized


def diagnostics(path: Path, root: Path) -> list[tuple[str, int, int, str, str]]:
    records: list[tuple[str, int, int, str, str]] = []
    for raw_line in path.read_text(
        encoding="utf-8",
        errors="replace",
    ).splitlines():
        match = pattern.match(raw_line)
        if not match:
            continue
        message = match.group("message")
        for prefix in (str(base_root), str(patched_root)):
            message = message.replace(prefix, "<ROOT>")
        records.append(
            (
                normalize_path(match.group("path"), root),
                int(match.group("line")),
                int(match.group("column")),
                match.group("code"),
                message,
            )
        )
    return records


base_records = diagnostics(base_log, base_root)
patched_records = diagnostics(patched_log, patched_root)

if base_rc != patched_rc:
    raise SystemExit(
        "typecheck exit changed: "
        f"baseline={base_rc} patched={patched_rc}"
    )

if base_rc != 0 and not base_records:
    raise SystemExit(
        "baseline typecheck failed without parseable TypeScript diagnostics"
    )
if patched_rc != 0 and not patched_records:
    raise SystemExit(
        "patched typecheck failed without parseable TypeScript diagnostics"
    )

base_counter = Counter(base_records)
patched_counter = Counter(patched_records)
new_records = list((patched_counter - base_counter).elements())
removed_records = list((base_counter - patched_counter).elements())

route_records = [
    record
    for record in patched_records
    if record[0] == "src/http/datanet_routes.ts"
]

summary = {
    "baseline_typecheck_exit": base_rc,
    "patched_typecheck_exit": patched_rc,
    "baseline_typecheck_diagnostic_count": len(base_records),
    "patched_typecheck_diagnostic_count": len(patched_records),
    "new_typecheck_diagnostic_count": len(new_records),
    "removed_typecheck_diagnostic_count": len(removed_records),
    "route_module_typecheck_diagnostic_count": len(route_records),
}

for key, value in summary.items():
    print(f"{key}={value}")

if new_records:
    print(
        "new_typecheck_diagnostics="
        + json.dumps(new_records, sort_keys=True)
    )
if removed_records:
    print(
        "removed_typecheck_diagnostics="
        + json.dumps(removed_records, sort_keys=True)
    )
if route_records:
    print(
        "route_module_typecheck_diagnostics="
        + json.dumps(route_records, sort_keys=True)
    )

if new_records or removed_records or route_records:
    raise SystemExit("typecheck diagnostic multiset changed")

print("typecheck_delta_green=true")
PY

cat > "$TMP_ROOT/prove.mts" <<'TS'
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.env.VOID_PROOF_ROOT || "";
assert.ok(root, "VOID_PROOF_ROOT is required");
process.chdir(root);

const expressUrl = pathToFileURL(
  path.join(root, "node_modules", "express", "index.js"),
).href;
const expressModule: any = await import(expressUrl);
const express = expressModule.default || expressModule;

const routeModuleUrl = pathToFileURL(
  path.join(root, "src", "http", "datanet_routes.ts"),
).href;
const routeModule: any = await import(routeModuleUrl);
const registerDataNetRoutes = routeModule.registerDataNetRoutes;
assert.equal(typeof registerDataNetRoutes, "function");

const expected = new Map<string, { file: string; sha: string }>([
  [
    "/public-node/datanet/index.json",
    {
      file: "public/public-node/datanet/index.json",
      sha: "350f12849f1ee24dc8efd5fa3722b13944f38a37a247f847d1f763a91c087e0e",
    },
  ],
  [
    "/public-node/datanet/paid-read-quote-v1.json",
    {
      file: "public/public-node/datanet/paid-read-quote-v1.json",
      sha: "aa2903c87d9ed5b41b16702e8ada063b6160ebcfc0a0c253e4a9cc8504a1d9aa",
    },
  ],
  [
    "/public-node/datanet/paid-read-quote-v1.schema.json",
    {
      file: "public/public-node/datanet/paid-read-quote-v1.schema.json",
      sha: "8e4d27a46168dd0c437f8708b6e904a556c73f5fa1032835a4b6cc4f1064aaf7",
    },
  ],
]);

let assertions = 0;
function check(value: unknown, message: string): asserts value {
  assertions += 1;
  assert.ok(value, message);
}
function equal(actual: unknown, wanted: unknown, message: string): void {
  assertions += 1;
  assert.equal(actual, wanted, message);
}

const app = express();
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "void-datanet-routes-"));
registerDataNetRoutes(app, { dataDir });
registerDataNetRoutes(app, { dataDir });

const routeLayers = (app as any)._router.stack.filter(
  (layer: any) => layer?.route?.path,
);
for (const routePath of expected.keys()) {
  const layers = routeLayers.filter(
    (layer: any) => layer.route.path === routePath,
  );
  equal(layers.length, 2, `expected HEAD and GET layers for ${routePath}`);
  equal(
    layers.filter((layer: any) => layer.route.methods.head === true).length,
    1,
    `expected one HEAD handler for ${routePath}`,
  );
  equal(
    layers.filter((layer: any) => layer.route.methods.get === true).length,
    1,
    `expected one GET handler for ${routePath}`,
  );
}

const server = http.createServer(app);
await new Promise<void>((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => resolve());
});
const address = server.address();
check(address && typeof address === "object", "server address missing");
const port = address.port;

async function request(method: string, requestPath: string) {
  return await new Promise<{
    status: number;
    headers: http.IncomingHttpHeaders;
    body: Buffer;
  }>((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method,
        path: requestPath,
        headers: {
          "Accept-Encoding": "identity",
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    req.once("error", reject);
    req.end();
  });
}

try {
  for (const [routePath, contract] of expected.entries()) {
    const source = fs.readFileSync(path.join(root, contract.file));
    equal(
      createHash("sha256").update(source).digest("hex"),
      contract.sha,
      `source hash ${routePath}`,
    );

    const getResult = await request("GET", routePath);
    equal(getResult.status, 200, `GET status ${routePath}`);
    equal(
      createHash("sha256").update(getResult.body).digest("hex"),
      contract.sha,
      `GET hash ${routePath}`,
    );
    equal(
      getResult.headers["cache-control"],
      "public, max-age=60",
      `GET cache header ${routePath}`,
    );
    equal(
      getResult.headers["x-content-type-options"],
      "nosniff",
      `GET nosniff header ${routePath}`,
    );
    check(
      String(getResult.headers["content-type"] || "").startsWith(
        "application/json",
      ),
      `GET content type ${routePath}`,
    );

    const queryResult = await request("GET", `${routePath}?proof=1`);
    equal(queryResult.status, 200, `query GET status ${routePath}`);
    equal(
      createHash("sha256").update(queryResult.body).digest("hex"),
      contract.sha,
      `query GET hash ${routePath}`,
    );

    const headResult = await request("HEAD", routePath);
    equal(headResult.status, 200, `HEAD status ${routePath}`);
    equal(headResult.body.length, 0, `HEAD body empty ${routePath}`);
    equal(
      Number(headResult.headers["content-length"]),
      source.length,
      `HEAD content length ${routePath}`,
    );

    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const denied = await request(method, routePath);
      equal(denied.status, 404, `${method} denied ${routePath}`);
    }
  }

  for (const requestPath of [
    "/public-node/datanet/package.json",
    "/public-node/datanet/",
    "/public-node/datanet/../index.json",
    "/public-node/datanet/%2e%2e/index.json",
    "/public-node/index.json",
  ]) {
    const result = await request("GET", requestPath);
    equal(result.status, 404, `non-allowlisted path denied ${requestPath}`);
  }

  console.log(`dynamic_assertion_count=${assertions}`);
  console.log("idempotent_registration_green=true");
  console.log("exact_get_head_routes_green=true");
  console.log("mutation_methods_denied_green=true");
  console.log("arbitrary_and_traversal_paths_denied_green=true");
  console.log("VOID_DATANET_PAID_READ_EXPLICIT_PUBLIC_ROUTES_V1_GREEN");
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  fs.rmSync(dataDir, { recursive: true, force: true });
}
TS

VOID_PROOF_ROOT="$ROOT" "$ROOT/node_modules/.bin/tsx" "$TMP_ROOT/prove.mts"
