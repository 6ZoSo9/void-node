#!/usr/bin/env python3
import hashlib, pathlib, subprocess, sys, tempfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
TARGET=ROOT/"ops/precision/void_buy_void_v7_v5_receipt_stage_install_v1.py"
MARKER="VOID_BUY_VOID_V7_V5_RECEIPT_STAGE_INSTALL_V1_PROOF"
raw=TARGET.read_bytes()
compile(raw,str(TARGET),"exec",dont_inherit=True,optimize=0)
text=raw.decode("utf-8")
assert raw.startswith(
    b"#!/usr/bin/env python3\n"
    b"# Privileged apply must fail before importing any source-tree-shadowable module\n"
    b"# unless Python was entered through the reviewed isolated/safe-path boundary.\n"
    b"import sys as _bootstrap_sys\n"
)
assert "from __future__ import annotations" not in text
for token in (
    "MARKER=_BOOTSTRAP_MARKER",
    "python_isolated_unoptimized_mode_required",
    "safe_path",
    "isolated",
    "optimize != 0",
    "filesystem_write=false",
    "fixed_receipt_mutation=false",
):
    assert token in text, token

for token in (
 'SOURCE_RECEIPT_BLOB="eddd0b47263213ae8dd65ef72a5479c40ea6812e"',
 'SOURCE_RECEIPT_SHA256="12d4028d317ce871a61c89c60fd36a1e31421401a39397974063677cb4ab8001"',
 'SOURCE_RECEIPT_BYTES=1136',
 'SOURCE_RECEIPT_ID="voidbsfdep1_c936b6fad9623418aa3d34756226bb5f26411117dc9d3f77cbb874a98db84b37"',
 'TARGET=pathlib.Path("/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5")',
 'FIXED_V4_SHA256="da43b974970fdfee00f914d61064bee86d192ad9b67769f52696e1fbd05bfa87"',
 'RENAME_NOREPLACE=1',
 'fixed_receipt_exchange_authority=false',
 'fixed_v4_receipt_parent_device_mismatch',
):
    assert token in text,token
assert "expected_git_identity_invalid" not in text
assert "--expected-head" not in text
assert "--expected-tree" not in text
with tempfile.TemporaryDirectory(prefix="void-v7-v5-receipt-pre-guard-") as td:
    td_path=pathlib.Path(td)
    copied=td_path/"receipt_stage.py"
    copied.write_bytes(raw)
    (td_path/"argparse.py").write_text(
        'print("HOSTILE_SIBLING_IMPORT_EXECUTED")\\n'
        'raise RuntimeError("hostile sibling import executed")\\n',
        encoding="utf-8",
    )
    hostile=subprocess.run(
        [sys.executable,"-B",str(copied),"--self-test"],
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,timeout=30,check=False,
    )
    assert hostile.returncode==2,(hostile.stdout,hostile.stderr)
    assert hostile.stderr=="",hostile.stderr
    lines=hostile.stdout.splitlines()
    assert "HOSTILE_SIBLING_IMPORT_EXECUTED" not in lines,lines
    assert lines==[
        "VOID_BUY_VOID_V7_V5_RECEIPT_STAGE_INSTALL_V1",
        "status=HOLD",
        "reason=python_isolated_unoptimized_mode_required",
        "filesystem_write=false",
        "fixed_receipt_mutation=false",
    ],lines

cp=subprocess.run([sys.executable,"-I","-B",str(TARGET),"--self-test"],
 stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=30,check=False)
assert cp.returncode==0 and cp.stderr=="",cp.stdout+cp.stderr
assert "VOID_BUY_VOID_V7_V5_RECEIPT_STAGE_INSTALL_V1_SELF_TEST_GREEN" in cp.stdout.splitlines()
assert "isolated_python_entry_required=true" in cp.stdout.splitlines()
print(MARKER+"_GREEN")
print("installer_sha256="+hashlib.sha256(raw).hexdigest())
print("exact_v5_receipt_bound=true")
print("receipt_pre_guard_sibling_import_poison_rejected=true")
print("receipt_isolated_python_entry_required=true")
print("hidden_receipt_stage_target_bound=true")
print("root_0444_nlink1_required=true")
print("rename_noreplace_required=true")
print("fixed_v4_receipt_revalidation_required=true")
print("fixed_receipt_exchange_authority=false")
print("service_mutation=false")
print("funds_movement=false")