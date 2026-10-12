#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

BASE="${BASE:-http://127.0.0.1:4100}"
MAN="${MAN:-config/update-manifest.v0.json}"
OUT="${OUT:-/tmp/void-signed-artifact-mutation-proof.$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

cleanup() {
  set +e
  if [ -f "$OUT/original-update-manifest.v0.json" ]; then
    cp -a "$OUT/original-update-manifest.v0.json" "$MAN"
  fi
}
trap cleanup EXIT

echo "=== signed artifact mutation proof ==="
echo "base=$BASE"
echo "out=$OUT"

cp -a "$MAN" "$OUT/original-update-manifest.v0.json"

echo
echo "=== [1] baseline signed status ==="
curl -fsS "$BASE/__void/update/notification-status.json" | tee "$OUT/baseline-status.json"
echo

python3 - "$OUT/baseline-status.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("signature_valid") is True, j
assert j.get("verification_reason") == "signature_valid", j
print("[ok] baseline signature valid")
PY

echo
echo "=== [2] artifact_path mutation must invalidate signature ==="
python3 - "$MAN" <<'PY'
import json, sys
p=sys.argv[1]
m=json.load(open(p))
m["artifact_path"]="/tmp/evil-update-artifact.tgz"
open(p,"w").write(json.dumps(m,indent=2)+"\n")
PY

curl -fsS "$BASE/__void/update/notification-status.json" | tee "$OUT/mutated-path-status.json"
echo

python3 - "$OUT/mutated-path-status.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("signature_valid") is False, j
assert j.get("verification_reason") == "signature_invalid", j
print("[ok] artifact_path mutation invalidates signature")
PY

echo
echo "=== [3] artifact_sha256 mutation must invalidate signature ==="
cp -a "$OUT/original-update-manifest.v0.json" "$MAN"

python3 - "$MAN" <<'PY'
import json, sys
p=sys.argv[1]
m=json.load(open(p))
m["artifact_sha256"]="deadbeef"
open(p,"w").write(json.dumps(m,indent=2)+"\n")
PY

curl -fsS "$BASE/__void/update/notification-status.json" | tee "$OUT/mutated-sha-status.json"
echo

python3 - "$OUT/mutated-sha-status.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("signature_valid") is False, j
assert j.get("verification_reason") == "signature_invalid", j
print("[ok] artifact_sha256 mutation invalidates signature")
PY

echo
echo "=== [4] restore original manifest ==="
cleanup
trap - EXIT

curl -fsS "$BASE/__void/update/notification-status.json" | tee "$OUT/restored-status.json"
echo

python3 - "$OUT/restored-status.json" <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ok") is True, j
assert j.get("signature_valid") is True, j
assert j.get("update_available") is False, j
print("[ok] restored signed manifest valid")
PY

echo
echo "out=$OUT"
