#!/usr/bin/env python3
import argparse, json, os, re, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "ops/security/buy-void-epoch2-v6r3-collapse-external-admission-v1.json"
MARKER = "VOID_BUY_VOID_EPOCH2_V6R3_COLLAPSE_EXTERNAL_ADMISSION_V1_GREEN"

def git(*args):
    env = dict(os.environ)
    env["GIT_NO_LAZY_FETCH"] = "1"
    env["GIT_TERMINAL_PROMPT"] = "0"
    proc = subprocess.run(
        ["git", *args], cwd=ROOT, env=env, text=True,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        timeout=20, check=False,
    )
    if proc.returncode != 0:
        raise AssertionError("git_failed:" + ":".join(args) + ":" + proc.stderr.strip())
    return proc.stdout.strip()

def tree_entry(commit, path):
    out = git("ls-tree", commit, "--", path)
    if not out or "\t" not in out:
        raise AssertionError("tree_entry_missing:" + path)
    left, actual_path = out.split("\t", 1)
    mode, kind, blob = left.split()
    if actual_path != path:
        raise AssertionError("tree_entry_path_mismatch:" + path)
    return mode, kind, blob

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--candidate", required=True)
    ns = ap.parse_args()
    candidate = ns.candidate.strip()
    if not re.fullmatch(r"[0-9a-f]{40}", candidate):
        raise AssertionError("candidate_sha_invalid")
    git("cat-file", "-e", candidate + "^{commit}")

    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert data["schema"] == "void_buy_void_epoch2_v6r3_collapse_external_admission_v1"
    assert data["version"] == 1
    assert data["path_count"] == 21
    assert data["inherited_count"] == 17
    assert data["adapted_count"] == 4
    entries = data["entries"]
    assert len(entries) == 21
    assert len({e["path"] for e in entries}) == 21
    historical = data["historical_leaf"]
    git("cat-file", "-e", historical + "^{commit}")

    inherited = 0
    adapted = {}
    for entry in entries:
        path = entry["path"]
        current = tree_entry(candidate, path)
        old = tree_entry(historical, path)
        assert current == (entry["mode"], entry["type"], entry["blob"]), "candidate_object_mismatch:" + path
        assert old == (entry["historical_mode"], entry["historical_type"], entry["historical_blob"]), "historical_object_mismatch:" + path
        role = entry["role"]
        if role == "inherited":
            inherited += 1
            assert current == old, "inherited_object_changed:" + path
        else:
            adapted[path] = role
            assert current != old, "adapted_object_not_changed:" + path

    assert inherited == 17
    assert adapted == {
        ".github/workflows/buy-void-epoch2-dormant-candidate-v3r-live-binding-v4.yml": "adapted_workflow",
        "docs/operators/buy-void-epoch2-dormant-candidate-v3r-live-binding-v4.md": "adapted_doc",
        "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v4.c": "adapted_native",
        "scripts/prove_buy_void_epoch2_dormant_candidate_v3r_live_binding_v4.py": "adapted_proof",
    }
    assert tree_entry(candidate, ".github/workflows/buy-void-epoch2-dormant-candidate-v3r-live-binding-v4.yml")[2] == "3d1f8cc8a0d377063c9dd3ca3509648d3a859ec5"
    assert all(value is False for value in data["authority"].values())

    print(MARKER)
    print("path_count=21")
    print("inherited_count=17")
    print("adapted_count=4")
    print("adapted_workflow_blob=3d1f8cc8a0d377063c9dd3ca3509648d3a859ec5")
    print("candidate_content_admitted=true")
    print("protected_host_install=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")

if __name__ == "__main__":
    main()
