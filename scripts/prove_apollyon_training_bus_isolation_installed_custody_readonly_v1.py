#!/usr/bin/env python3
from __future__ import annotations

import ast
import types
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parents[1]
OBSERVER=ROOT/"ops/xiphos/apollyon_training_bus_isolation_installed_custody_readonly_v1.py"
UNIT_SOURCE=ROOT/"ops/xiphos/void-apollyon-training-bus-isolation-v1.service"
PREENTRY_SOURCE=ROOT/"ops/xiphos/apollyon_training_bus_isolation_preentry_v1.c"
LOCK_FIXTURE=ROOT/"fixtures/security/apollyon-training-preentry-binary-candidate-lock-v1.json"
LOCK_VALIDATOR=ROOT/"scripts/prove_apollyon_training_preentry_binary_candidate_lock_v1.py"
EXPECTED_LOCK_VALIDATOR_BLOB="75aa69044b9413aad51352b760f7bd81806b0063"
CC="/usr/bin/cc"
FLAGS=(
    "-std=c11","-O2","-Wall","-Wextra","-Werror",
    "-D_FORTIFY_SOURCE=2","-fstack-protector-strong",
    "-Wl,-z,relro,-z,now","-Wl,--build-id=none",
)


def load_observer():
    spec=importlib.util.spec_from_file_location(
        "apollyon_training_installed_custody_v1",
        OBSERVER,
    )
    if spec is None or spec.loader is None:
        raise AssertionError("observer import unavailable")
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_lock_validator(observer_module):
    source=LOCK_VALIDATOR.read_bytes()
    if observer_module.git_blob_sha1(source)!=EXPECTED_LOCK_VALIDATOR_BLOB:
        raise AssertionError("merged candidate lock validator Git blob mismatch")
    module=types.ModuleType("void_apollyon_preentry_lock_validator_v1")
    module.__file__=os.fspath(LOCK_VALIDATOR)
    code=compile(
        source,
        os.fspath(LOCK_VALIDATOR),
        "exec",
        dont_inherit=True,
        optimize=0,
    )
    exec(code,module.__dict__)
    for name in ("load_validator","validate_lock","require_reviewed_head_ancestry"):
        if not callable(getattr(module,name,None)):
            raise AssertionError("candidate lock validator export missing: "+name)
    return module


def compile_preentry(output:Path)->None:
    result=subprocess.run(
        [CC,*FLAGS,"-o",os.fspath(output),os.fspath(PREENTRY_SOURCE)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=30,
        env={
            "PATH":"/usr/bin:/bin",
            "LC_ALL":"C",
            "TZ":"UTC",
            "SOURCE_DATE_EPOCH":"0",
        },
    )
    if result.returncode!=0:
        raise AssertionError(
            "pre-entry compile failed: "+
            result.stderr.decode("utf-8","replace")[-1500:]
        )
    os.chmod(output,0o755)


def expect_hold(module,reason,fn)->None:
    try:
        fn()
    except module.Hold as exc:
        if str(exc)!=reason:
            raise AssertionError(
                f"expected {reason}, got {exc}"
            ) from exc
    else:
        raise AssertionError("expected HOLD "+reason)


def main()->int:
    module=load_observer()
    module.self_test()

    lock_bytes=LOCK_FIXTURE.read_bytes()
    try:
        lock=json.loads(lock_bytes)
    except json.JSONDecodeError as exc:
        raise AssertionError("merged candidate lock JSON invalid") from exc
    if module.canonical(lock)+"\n"!=lock_bytes.decode("utf-8"):
        raise AssertionError("merged candidate lock is not canonical")
    lock_validator=load_lock_validator(module)
    lock_validator.require_reviewed_head_ancestry()
    candidate_validator=lock_validator.load_validator()
    lock_validator.validate_lock(lock,candidate_validator)
    if lock_validator.EXPECTED_LOCK_ID!=module.EXPECTED_LOCK_ID:
        raise AssertionError("observer lock ID does not match canonical validator")
    if lock_validator.EXPECTED_CANDIDATE_ID!=module.EXPECTED_CANDIDATE_ID:
        raise AssertionError("observer candidate ID does not match canonical validator")
    if lock_validator.EXPECTED_BINARY_SHA256!=module.EXPECTED_PREENTRY_SHA256:
        raise AssertionError("observer binary SHA-256 does not match canonical validator")
    if lock_validator.EXPECTED_BINARY_BYTES!=module.EXPECTED_PREENTRY_BYTES:
        raise AssertionError("observer binary byte count does not match canonical validator")

    unit_bytes=UNIT_SOURCE.read_bytes()
    if module.git_blob_sha1(unit_bytes)!=module.EXPECTED_UNIT_GIT_BLOB_SHA1:
        raise AssertionError("reviewed unit Git blob mismatch")

    with tempfile.TemporaryDirectory(
        prefix="void-apollyon-installed-custody-v1-"
    ) as td:
        trusted=Path(td)
        os.chmod(trusted,0o755)
        unit_dir=trusted/"etc/systemd/system"
        bin_dir=trusted/"opt/void-apollyon-training-bus-isolation-v1"
        unit_dir.mkdir(parents=True,mode=0o755)
        bin_dir.mkdir(parents=True,mode=0o755)
        for directory in (
            trusted,
            trusted/"etc",
            trusted/"etc/systemd",
            unit_dir,
            trusted/"opt",
            bin_dir,
        ):
            os.chmod(directory,0o755)

        unit=unit_dir/"void-apollyon-training-bus-isolation-v1.service"
        unit.write_bytes(unit_bytes)
        os.chmod(unit,0o644)

        preentry=bin_dir/"apollyon_training_bus_isolation_preentry_v1"
        compile_preentry(preentry)
        binary=preentry.read_bytes()
        if len(binary)!=module.EXPECTED_PREENTRY_BYTES:
            raise AssertionError("compiled pre-entry byte count drift")
        if module.sha256(binary)!=module.EXPECTED_PREENTRY_SHA256:
            raise AssertionError("compiled pre-entry SHA-256 drift")

        result=module.qualify_materials(
            unit,
            preentry,
            owner_uid=os.getuid(),
            owner_gid=os.getgid(),
            require_xiphos=False,
            observation_scope="synthetic_fixture",
            trusted_root=trusted,
        )
        if result["observation_scope"]!="synthetic_fixture":
            raise AssertionError("synthetic observation scope mismatch")
        if result["joint_material_identity_stable"] is not True:
            raise AssertionError("joint material identity not stable")
        if result["synthetic_fixture_unit_identity_observed"] is not True:
            raise AssertionError("synthetic unit identity not observed")
        if result["synthetic_fixture_preentry_binary_identity_observed"] is not True:
            raise AssertionError("synthetic pre-entry identity not observed")
        if result["installed_unit_identity_observed"] is not False:
            raise AssertionError("synthetic fixture overclaimed installed unit observation")
        if result["installed_preentry_binary_identity_observed"] is not False:
            raise AssertionError("synthetic fixture overclaimed installed binary observation")
        for key in (
            "installed_unit_identity_proven",
            "installed_preentry_binary_identity_proven",
            "trusted_observer_proven",
            "dynamic_runtime_closure_proven",
            "training_entrypoint_identity_proven",
            "live_systemd_enforcement_proven",
            "inherited_system_bus_descriptor_absence_proven",
            "absolute_runtime_service_control_denial_proven",
            "canonical_installed_qualification_complete",
            "host_mutation_performed",
            "service_action_performed",
            "training_execution_performed",
            "attempt_claimed",
            "wallet_access_performed",
            "transaction_signing_performed",
            "funds_movement_performed",
        ):
            if result[key] is not False:
                raise AssertionError("authority overclaim: "+key)

        original_hostname=module.socket.gethostname
        def failed_hostname():
            raise OSError("synthetic hostname lookup failure")
        module.socket.gethostname=failed_hostname
        try:
            expect_hold(
                module,
                "apollyon_training_installed_custody_hostname_lookup_failed",
                lambda: module.qualify_materials(
                    unit,
                    preentry,
                    owner_uid=os.getuid(),
                    owner_gid=os.getgid(),
                    require_xiphos=True,
                    observation_scope="live_installed",
                    trusted_root=trusted,
                ),
            )
        finally:
            module.socket.gethostname=original_hostname

        original_unit=unit.read_bytes()
        unit.write_bytes(original_unit+b"\n# tamper\n")
        expect_hold(
            module,
            "apollyon_training_installed_custody_unit_bytes_mismatch",
            lambda: module.qualify_materials(
                unit,preentry,
                owner_uid=os.getuid(),owner_gid=os.getgid(),
                require_xiphos=False,observation_scope="synthetic_fixture",trusted_root=trusted,
            ),
        )
        unit.write_bytes(original_unit)
        os.chmod(unit,0o644)

        original_binary=preentry.read_bytes()
        tampered=bytearray(original_binary)
        tampered[-1]^=1
        preentry.write_bytes(tampered)
        os.chmod(preentry,0o755)
        expect_hold(
            module,
            "apollyon_training_installed_custody_preentry_bytes_mismatch",
            lambda: module.qualify_materials(
                unit,preentry,
                owner_uid=os.getuid(),owner_gid=os.getgid(),
                require_xiphos=False,observation_scope="synthetic_fixture",trusted_root=trusted,
            ),
        )
        preentry.write_bytes(original_binary)
        os.chmod(preentry,0o755)

        os.chmod(preentry,0o775)
        expect_hold(
            module,
            "apollyon_training_installed_custody_file_metadata_invalid",
            lambda: module.qualify_materials(
                unit,preentry,
                owner_uid=os.getuid(),owner_gid=os.getgid(),
                require_xiphos=False,observation_scope="synthetic_fixture",trusted_root=trusted,
            ),
        )
        os.chmod(preentry,0o755)

        original_open=module.os.open
        def raced_open(path,*args,**kwargs):
            if Path(path)==preentry:
                raise OSError("synthetic O_NOFOLLOW race")
            return original_open(path,*args,**kwargs)
        module.os.open=raced_open
        try:
            expect_hold(
                module,
                "apollyon_training_installed_custody_file_open_failed",
                lambda: module.read_stable_regular_file(
                    preentry,
                    owner_uid=os.getuid(),
                    owner_gid=os.getgid(),
                    mode=module.EXPECTED_PREENTRY_MODE,
                    maximum_bytes=module.MAX_PREENTRY_BYTES,
                    exact_bytes=module.EXPECTED_PREENTRY_BYTES,
                    trusted_root=trusted,
                ),
            )
        finally:
            module.os.open=original_open

        original_read=module.os.read
        def failed_read(fd,count):
            raise OSError("synthetic descriptor read failure")
        module.os.read=failed_read
        try:
            expect_hold(
                module,
                "apollyon_training_installed_custody_descriptor_io_failed",
                lambda: module.read_stable_regular_file(
                    preentry,
                    owner_uid=os.getuid(),
                    owner_gid=os.getgid(),
                    mode=module.EXPECTED_PREENTRY_MODE,
                    maximum_bytes=module.MAX_PREENTRY_BYTES,
                    exact_bytes=module.EXPECTED_PREENTRY_BYTES,
                    trusted_root=trusted,
                ),
            )
        finally:
            module.os.read=original_read

        real_dir=trusted/"real-bin"
        real_dir.mkdir(mode=0o755)
        os.chmod(real_dir,0o755)
        alternate=real_dir/preentry.name
        alternate.write_bytes(original_binary)
        os.chmod(alternate,0o755)
        symlink_parent=trusted/"symlink-bin"
        symlink_parent.symlink_to(real_dir, target_is_directory=True)
        expect_hold(
            module,
            "apollyon_training_installed_custody_ancestor_untrusted",
            lambda: module.qualify_materials(
                unit,symlink_parent/preentry.name,
                owner_uid=os.getuid(),owner_gid=os.getgid(),
                require_xiphos=False,observation_scope="synthetic_fixture",trusted_root=trusted,
            ),
        )

    source=OBSERVER.read_text(encoding="utf-8")
    tree=ast.parse(source)
    forbidden_calls={
        "chmod","chown","fchmod","fchown","mkdir","makedirs",
        "unlink","remove","rename","replace","rmdir","removedirs",
        "truncate","write_text","write_bytes",
    }
    for node in ast.walk(tree):
        if not isinstance(node,ast.Call):
            continue
        fn=node.func
        if isinstance(fn,ast.Attribute) and fn.attr in forbidden_calls:
            raise AssertionError("observer mutation call: "+fn.attr)
        if isinstance(fn,ast.Name) and fn.id in forbidden_calls:
            raise AssertionError("observer mutation call: "+fn.id)
    for required in (
        "ancestor_after=assert_ancestor_custody(",
        "apollyon_training_installed_custody_ancestor_identity_drift",
        "apollyon_training_installed_custody_file_open_failed",
        "apollyon_training_installed_custody_descriptor_io_failed",
        "apollyon_training_installed_custody_hostname_lookup_failed",
        "joint_material_identity_stable",
        "revalidate_retained_file(",
        "close_descriptor(",
        'observation_scope=="live_installed"',
        'observation_scope=="synthetic_fixture"',
    ):
        if required not in source:
            raise AssertionError("observer missing hardening: "+required)

    for forbidden in (
        "subprocess","systemctl","busctl","pkcheck","createPrivateKey",
        "signTransaction","eth_sendRawTransaction",
    ):
        if forbidden in source:
            raise AssertionError("observer forbidden surface: "+forbidden)

    print(
        "VOID_APOLLYON_TRAINING_BUS_ISOLATION_"
        "INSTALLED_CUSTODY_READONLY_V1_PROOF_GREEN"
    )
    print("merged_candidate_lock_full_schema_validated=true")
    print("merged_candidate_lock_id_recomputed=true")
    print("exact_locked_candidate_binary_reproduced=true")
    print("exact_reviewed_unit_bytes_bound=true")
    print("stable_no_follow_reads=true")
    print("trusted_ancestry_required=true")
    print("ancestor_custody_revalidated_after_read=true")
    print("joint_material_identity_revalidated=true")
    print("retained_unit_and_preentry_descriptors=true")
    print("descriptor_io_failures_translate_to_hold=true")
    print("nofollow_open_race_translated_to_hold=true")
    print("hostname_lookup_failure_translated_to_hold=true")
    print("unit_tamper_rejected=true")
    print("binary_tamper_rejected=true")
    print("permission_drift_rejected=true")
    print("symlink_ancestor_rejected=true")
    print("synthetic_fixture_unit_identity_observed=true")
    print("synthetic_fixture_preentry_binary_identity_observed=true")
    print("installed_unit_identity_observed=false")
    print("installed_preentry_binary_identity_observed=false")
    print("installed_unit_identity_proven=false")
    print("installed_preentry_binary_identity_proven=false")
    print("trusted_observer_proven=false")
    print("training_entrypoint_identity_proven=false")
    print("dynamic_runtime_closure_proven=false")
    print("live_systemd_enforcement_proven=false")
    print("inherited_system_bus_descriptor_absence_proven=false")
    print("canonical_installed_qualification_complete=false")
    print("host_mutation=false")
    print("service_action=false")
    print("training_execution=false")
    return 0


if __name__=="__main__":
    raise SystemExit(main())
