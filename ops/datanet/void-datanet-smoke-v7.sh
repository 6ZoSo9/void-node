#!/usr/bin/env bash
set -euo pipefail
cd "${REPO:-$HOME/dev/void-node}" 2>/dev/null || cd "$HOME/dev/void-node" || exit 1

SMOKE6="${SMOKE6:-ops/datanet/void-datanet-smoke-v6.sh}"
TRUTH="${TRUTH:-/tmp/void-datanet-smoke.last.json}"

TS="$(date +%s)"
TMP_OUT="/tmp/void-datanet-smoke.v7.$$.out.txt"

# run v6, capture output, preserve rc
set +e
bash "$SMOKE6" 2>&1 | tee "$TMP_OUT"
rc="${PIPESTATUS[0]}"
set -e

# parse last observed values from output
dataset_root="$(rg -n '^dataset_root=' "$TMP_OUT" | tail -n 1 | sed 's/^.*dataset_root=//')"
leaf="$(rg -n '^leaf=' "$TMP_OUT" | tail -n 1 | sed 's/^.*leaf=//')"
status_code="$(rg -n '^status_code=' "$TMP_OUT" | tail -n 1 | sed 's/^.*status_code=//')"
chunk_put_code="$(rg -n '^chunk_put_code=' "$TMP_OUT" | tail -n 1 | sed 's/^.*chunk_put_code=//' | awk '{print $1}')"
manifest_put_code="$(rg -n '^manifest_put_code=' "$TMP_OUT" | tail -n 1 | sed 's/^.*manifest_put_code=//' | awk '{print $1}')"
fetch_chunk_code="$(rg -n '^fetch_chunk_code=' "$TMP_OUT" | tail -n 1 | sed 's/^.*fetch_chunk_code=//' | awk '{print $1}')"
size_bytes="$(rg -n '^BIN=.* bytes=' "$TMP_OUT" | tail -n 1 | sed -n 's/^.* bytes=\([0-9]\+\) .*$/\1/p')"
chunk_bytes="$(rg -n '^CHUNK_BYTES=' "$TMP_OUT" | tail -n 1 | sed 's/^.*CHUNK_BYTES=//')"
chunks_count="$(rg -n '^\[ok\] size=.* chunks=' "$TMP_OUT" | tail -n 1 | sed -n 's/^.* chunks=\([0-9]\+\).*$/\1/p')"

python3 - <<PY
import json, os, time
p="${TRUTH}"
tmp=p+".tmp."+str(os.getpid())
d={
  "ts": int(${TS}),
  "rc": int(${rc}),
  "ok": 1 if int(${rc})==0 else 0,
  "dataset_root": "${dataset_root}".strip(),
  "leaf": "${leaf}".strip(),
  "status_code": "${status_code}".strip(),
  "chunk_put_code": "${chunk_put_code}".strip(),
  "manifest_put_code": "${manifest_put_code}".strip(),
  "fetch_chunk_code": "${fetch_chunk_code}".strip(),
  "size_bytes": int("${size_bytes}".strip() or 0),
  "chunk_bytes": int("${chunk_bytes}".strip() or 0),
  "chunks_count": int("${chunks_count}".strip() or 0),
}
with open(tmp,"w") as f:
  json.dump(d,f,sort_keys=True)
  f.write("\n")
os.replace(tmp,p)
print("[ok] wrote truth ->", p)
print("[ok] truth:", d)
PY

rm -f "$TMP_OUT" 2>/dev/null || true
exit "$rc"
