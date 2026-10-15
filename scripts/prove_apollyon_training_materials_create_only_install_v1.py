#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
from pathlib import Path
import subprocess
import sys

MARKER = "VOID_APOLLYON_TRAINING_MATERIALS_CREATE_ONLY_INSTALL_V1_PROOF_GREEN"
ROOT = Path(__file__).resolve().parents[1]
PATHS = {
    "installer": ROOT / "ops/xiphos/install_apollyon_training_materials_create_only_v1.py",
    "contract": ROOT / "ops/xiphos/apollyon_training_materials_install_contract_v1.py",
    "plan": ROOT / "ops/xiphos/apollyon_training_materials_install_host_plan_v1.py",
    "build": ROOT / "ops/xiphos/apollyon_training_materials_install_build_v1.py",
    "apply": ROOT / "ops/xiphos/apollyon_training_materials_install_apply_v1.py",
    "doc": ROOT / "docs/security/apollyon-training-materials-create-only-install-v1.md",
    "workflow": ROOT / ".github/workflows/apollyon-training-materials-create-only-install-v1.yml",
}


def read(name: str) -> str:
    data = PATHS[name].read_bytes()
    if not data or len(data) > 2 * 1024 * 1024:
        raise AssertionError(name + " size invalid")
    return data.decode("utf-8")


def require(source: str, values: tuple[str, ...], label: str) -> None:
    for value in values:
        if value not in source:
            raise AssertionError(label + " missing: " + value)


def prove_no_activation(sources: dict[str, str]) -> None:
    forbidden_actions = {
        "daemon-reload", "enable", "start", "restart", "try-restart",
        "reload-or-restart",
    }
    for name in ("installer", "contract", "plan", "build", "apply"):
        tree = ast.parse(sources[name], filename=PATHS[name].as_posix())
        for call in (node for node in ast.walk(tree) if isinstance(node, ast.Call)):
            values = {
                child.value
                for child in ast.walk(call)
                if isinstance(child, ast.Constant) and isinstance(child.value, str)
            }
            if "/usr/bin/systemctl" in values and forbidden_actions.intersection(values):
                raise AssertionError(name + " contains systemctl activation")


def prove_sources(sources: dict[str, str]) -> None:
    prove_no_activation(sources)
    require(sources["contract"], (
        'TARGET_HOST = "Xiphos"',
        'ACCOUNT = "voidapollyontrain"',
        'EXPECTED_UNIT_BLOB = "62fbabe1cf7ae0d940f5d96e19b06282f841267b"',
        'EXPECTED_PREENTRY_SOURCE_BLOB = "9503d19c8bc0b4f073ba117f6a547d339b7623d0"',
        'EXPECTED_ENTRYPOINT_SOURCE_BLOB = "bfeff81f3eab98988a9be9600a05c696674c49d6"',
        'EXPECTED_PREENTRY_LOCK_BLOB = "ddff9c18153aa37e7e8b3faa3a43eb1dde921a3d"',
        'EXPECTED_ENTRYPOINT_LOCK_BLOB = "014957fbe9cceae6d3bfa4ee1c360917309213f5"',
        'EXPECTED_PREENTRY_BYTES = 17352',
        'EXPECTED_ENTRYPOINT_BYTES = 17384',
    ), "contract")
    negatives = (
        '"daemon_reload": False',
        '"service_enable": False',
        '"service_start": False',
        '"service_restart": False',
        '"attempt_claim": False',
        '"training_execution": False',
        '"candidate_weight_mutation": False',
        '"wallet_or_signer_access": False',
        '"funds_movement": False',
    )
    require(sources["plan"], negatives, "plan")
    require(sources["apply"], negatives + (
        '"--system",', '"--user-group",', '"--no-create-home",',
        'os.link(temporary, path, follow_symlinks=False)',
        '"plan_drift_before_mutation"',
    ), "apply")
    require(sources["build"], (
        "os.O_EXCL", '"compiled_binary_not_reproducible:"',
        "run_self_test_binary(first, expected_self_test_sha)",
    ), "build")
    require(sources["installer"], (
        'mode.add_argument("--plan", action="store_true")',
        'mode.add_argument("--apply", action="store_true")',
        'parser.add_argument("--expected-plan-id")',
        'parser.add_argument("--ack-no-daemon-reload", action="store_true")',
        'parser.add_argument("--ack-service-remains-disabled-and-inactive", action="store_true")',
    ), "installer")
    combined = "".join(sources.values())
    for value in ("curl ", "wget ", "ssh ", "scp ", "private_key", "seed_phrase"):
        if value in combined:
            raise AssertionError("forbidden surface: " + value)


def prove_doc_and_workflow(sources: dict[str, str]) -> None:
    require(sources["doc"], (
        "source-only create-only installer",
        "does not run `systemctl daemon-reload`",
        "does not enable, start, stop, or restart the service",
        "does not execute training",
        "97e5553562de6fa4cf170cc7eef5b77a61b4bf29ded7d2425900e5a7d7bc04e1",
        "#2947",
        "next separately authorized gate",
    ), "documentation")
    require(sources["workflow"], (
        "name: Apollyon training materials create-only install v1",
        "python3 -m py_compile",
        "python3 -I -B scripts/prove_apollyon_training_materials_create_only_install_v1.py",
        "git diff --check",
    ), "workflow")
    if "workflow_dispatch:" in sources["workflow"]:
        raise AssertionError("workflow gained manual execution authority")


def run_self_test() -> None:
    result = subprocess.run(
        [sys.executable, "-I", "-B", str(PATHS["installer"]), "--self-test"],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=120,
    )
    if result.returncode != 0 or result.stderr:
        raise AssertionError("installer self-test failed: " + result.stderr[-2000:])
    require(result.stdout, (
        "VOID_APOLLYON_TRAINING_MATERIALS_CREATE_ONLY_INSTALL_V1_SELF_TEST=GREEN",
        "operator_host_mutation=false",
        "daemon_reload=false",
        "service_enable=false",
        "service_start=false",
        "training_execution=false",
        "funds_movement=false",
    ), "self-test output")


def main() -> None:
    sources = {name: read(name) for name in PATHS}
    prove_sources(sources)
    prove_doc_and_workflow(sources)
    run_self_test()
    installer = PATHS["installer"].read_bytes()
    digest = hashlib.sha1(f"blob {len(installer)}\0".encode("ascii") + installer).hexdigest()
    print(MARKER)
    print("installer_git_blob_sha1=" + digest)
    print("source_only=true")
    print("temporary_ci_build_write=true")
    print("operator_host_mutation=false")
    print("daemon_reload=false")
    print("service_action=false")
    print("training_execution=false")
    print("funds_movement=false")


if __name__ == "__main__":
    main()
