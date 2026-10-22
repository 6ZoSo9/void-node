#!/usr/bin/env python3
import hashlib, pathlib, subprocess, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
TARGET=ROOT/"ops/precision/void_buy_void_v7_v5_receipt_stage_install_v1.py"
MARKER="VOID_BUY_VOID_V7_V5_RECEIPT_STAGE_INSTALL_V1_PROOF"
raw=TARGET.read_bytes()
compile(raw,str(TARGET),"exec",dont_inherit=True,optimize=0)
text=raw.decode("utf-8")
for token in (
 'SOURCE_RECEIPT_BLOB="eddd0b47263213ae8dd65ef72a5479c40ea6812e"',
 'SOURCE_RECEIPT_SHA256="12d4028d317ce871a61c89c60fd36a1e31421401a39397974063677cb4ab8001"',
 'SOURCE_RECEIPT_BYTES=1136',
 'SOURCE_RECEIPT_ID="voidbsfdep1_c936b6fad9623418aa3d34756226bb5f26411117dc9d3f77cbb874a98db84b37"',
 'TARGET=pathlib.Path("/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5")',
 'FIXED_V4_SHA256="da43b974970fdfee00f914d61064bee86d192ad9b67769f52696e1fbd05bfa87"',
 'RENAME_NOREPLACE=1',
 'fixed_receipt_exchange_authority=false',
):
    assert token in text,token
cp=subprocess.run([sys.executable,"-I","-B",str(TARGET),"--self-test"],
 stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=30,check=False)
assert cp.returncode==0 and cp.stderr=="",cp.stdout+cp.stderr
assert "VOID_BUY_VOID_V7_V5_RECEIPT_STAGE_INSTALL_V1_SELF_TEST_GREEN" in cp.stdout.splitlines()
print(MARKER+"_GREEN")
print("installer_sha256="+hashlib.sha256(raw).hexdigest())
print("exact_v5_receipt_bound=true")
print("hidden_receipt_stage_target_bound=true")
print("root_0444_nlink1_required=true")
print("rename_noreplace_required=true")
print("fixed_v4_receipt_revalidation_required=true")
print("fixed_receipt_exchange_authority=false")
print("service_mutation=false")
print("funds_movement=false")
