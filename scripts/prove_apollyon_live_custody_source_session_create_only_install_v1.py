#!/usr/bin/env python3
from __future__ import annotations
import ast
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
INSTALLER=ROOT/"ops/xiphos/apollyon_live_custody_source_session_create_only_install_v1.py"
MANIFEST=ROOT/"ops/xiphos/apollyon-custody-deployment-manifest-v1.json"
RETIRED_LAUNCHER=ROOT/"ops/xiphos/apollyon_live_custody_source_session_launcher_lifecycle_lock_v1.py"

def git_blob(path:Path)->str:
    data=path.read_bytes()
    h=hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"));h.update(data)
    return h.hexdigest()

assert git_blob(MANIFEST)=="2495dae4f20a9a224ed8be972748d45f3e066340"
source=INSTALLER.read_text(encoding="utf-8")
ast.parse(source)

# installer: root-capable CLI must reject non-isolated Python before loading
# attacker-controlled checkout-local standard-module substitutes. This checks
# post-interpreter pre-import behavior, NOT Python startup hooks like .pth/sitecustomize.
with tempfile.TemporaryDirectory(prefix="void-apollyon-installer-isolation-") as td:
    temp = Path(td)
    copied = temp / "privileged_cli.py"
    copied.write_bytes(INSTALLER.read_bytes())
    sentinel = temp / "checkout-json-shadow-executed"
    (temp / "json.py").write_text(
        "from pathlib import Path\nPath(" + repr(str(sentinel)) + ").write_text('executed')\n",
        encoding="utf-8",
    )
    clean_env = {
        "PATH": "/usr/sbin:/usr/bin:/sbin:/bin",
        "LANG": "C", "LC_ALL": "C", "TZ": "UTC",
    }
    for argv in (
        [sys.executable, "-B", str(copied), "--self-test"],
        [sys.executable, "-I", str(copied), "--self-test"],
    ):
        denied = subprocess.run(
            argv, cwd=temp, env=clean_env,
            stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, text=True, check=False, timeout=10,
        )
        assert denied.returncode == 2, (argv, denied.stdout, denied.stderr)
        assert "HOLD=python_runtime_not_isolated" in denied.stderr, denied.stderr
        assert not sentinel.exists(), "checkout-local json.py was loaded before guard"

assert source.index("_require_isolated_python()") < source.index("import argparse")
assert "flags.isolated == 1" in source
assert "flags.dont_write_bytecode == 1" in source
assert 'getattr(flags, "safe_path", 0) == 1' in source

for required in (
    'MARKER="VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_CREATE_ONLY_INSTALL_V1"',
    'MANIFEST_BLOB="2495dae4f20a9a224ed8be972748d45f3e066340"',
    'EXPECTED_PUBLIC_RAW_SHA256="c7aba012afd257699e85b296cc3337cf7b205a869e3f9b37876688c675783134"',
    'NODE_RUNTIME=Path("/opt/void-apollyon-node-runtime-v1/node")',
    'NODE_VERSION="v24.21.0"',
    'NODE_BYTES=126595440',
    'NODE_SHA256="7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c"',
    'UNIT_BLOB="30b7b7c62b6b7834ae91db1eb37df05286ca5764"',
    'LIVE_LAUNCHER_REL="ops/xiphos/apollyon_live_custody_source_session_launcher_lifecycle_lock_v1.py"',
    'LIVE_LAUNCHER_BLOB="352bd36f2b07091140b990de4170f708eb11fee6"',
    'LIFECYCLE_BLOB="3cb5f2b85c80b9a26ba5e8d73634c29f584011af"',
    'custody_uid_process_exclusivity_required',
    'custody_uid_process_census_uid_slots',
    'unclassifiable_process_status_holds',
    'activation_target_unit_file_state_required',
    'custody_service_unit_file_state_required',
    'service_contract.get("unset_environment")',
    '"GCONV_PATH","LD_AUDIT","LD_LIBRARY_PATH","LD_PRELOAD"',
    '"NODE_OPTIONS","NODE_PATH","OPENSSL_CONF"',
    'require_exact_post_install_systemd_state',
    'custody_service_unit_file_state_not_static',
    'custody_target_unit_file_state_not_disabled',
    'CLEANUP_HELPER=LIFECYCLE_ROOT/"apollyon_custody_stale_socket_cleanup_v1.py"',
    'install_file(CLEANUP_HELPER,cleanup_helper,0o444,0,0)',
    'PREENTRY_BYTES=798736',
    'PREENTRY_SHA256="2d705515d825051111b5fd9f99356466bf341056a0bf67d34b80a869a337d21d"',
    '"/usr/sbin/groupadd","--system",name',
    '"/usr/sbin/usermod","--append","--groups",group,user',
    '"/usr/bin/systemd-tmpfiles","--create"',
    '"/usr/bin/systemctl","daemon-reload"',
    '"service_start":False',
    '"service_enable":False',
    '"training_execution":False',
    '"durable_attempt_claim":False',
    '"operator_private_key_access":False',
    '"-static","-fno-pie","-no-pie"',
    'input=data,stdout=subprocess.PIPE',
    'public_key_generation_changed',
):
    assert required in source,required
assert git_blob(RETIRED_LAUNCHER)=="352bd36f2b07091140b990de4170f708eb11fee6"
retired_source=RETIRED_LAUNCHER.read_text(encoding="utf-8")
retired_start=retired_source.index("def execute_live(argv:list[str])->int:")
retired_end=retired_source.index("def self_test()->None:",retired_start)
retired_body=retired_source[retired_start:retired_end]
assert "apollyon_live_session_launcher_activation_retired_" in retired_body
assert "atomic_ownership_required" in retired_body
for forbidden_live in (
    "assert_installed_launcher_identity(",
    "open_trusted_executable(",
    "materialize_reviewed_closure(",
    "acquire_training_lifecycle_lock(",
    "_run_training_systemctl(",
    "subprocess.run(",
):
    assert forbidden_live not in retired_body,forbidden_live

for forbidden in (
    '"/usr/bin/systemctl","start"',
    '"/usr/bin/systemctl","enable"',
    '"/usr/bin/systemctl","restart"',
    "subprocess.Popen(",
    "shell=True",
    "PRIVATE KEY-----",
    '"-in",os.fspath(absolute)',
):
    assert forbidden not in source,forbidden

result=subprocess.run(
    ["python3","-I","-B",str(INSTALLER),"--self-test"],
    cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,
    check=False,timeout=30,
)
assert result.returncode==0,result.stderr
for line in (
    "VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_CREATE_ONLY_INSTALL_V1_SELF_TEST_GREEN",
    "create_only=true","source_contract_verified=true",
    "public_key_raw_sha256=c7aba012afd257699e85b296cc3337cf7b205a869e3f9b37876688c675783134",
    "preentry_sha256=2d705515d825051111b5fd9f99356466bf341056a0bf67d34b80a869a337d21d",
    "node_runtime_required=true",
    "node_runtime_path=/opt/void-apollyon-node-runtime-v1/node",
    "node_runtime_sha256=7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c",
    "preentry_static_rederived=true",
    "public_key_retained_generation=true",
    "public_key_path_swap_rejected=true",
    "exact_post_install_unit_states_required=true",
    "manager_environment_influence_unset=true",
    "service_start=false","service_enable=false","training_execution=false",
    "durable_attempt_claim=false","funds_movement=false",
):
    assert line in result.stdout,line

print("VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_CREATE_ONLY_INSTALL_V1_PROOF_GREEN")
print("installer_self_test_green=true")
print("preentry_static_rederived=true")
print("public_key_retained_generation=true")
print("public_key_path_swap_rejected=true")
print("exact_post_install_unit_states_required=true")
print("manager_environment_influence_unset=true")
print("create_only=true")
print("fixed_launcher_source_retired=true")
print("fixed_launcher_runner_spawn_absent=true")
print("fixed_launcher_systemd_action_absent=true")
print("service_start=false")
print("service_enable=false")
print("training_execution=false")
print("durable_attempt_claim=false")
print("funds_movement=false")
print("isolated_python_preimport_guard=true")
print("nonisolated_checkout_module_not_executed=true")
