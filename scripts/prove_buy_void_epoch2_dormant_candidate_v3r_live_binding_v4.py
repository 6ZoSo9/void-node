#!/usr/bin/env python3

# This verifier uses assertion-based identity checks. A different optimized
# code object can disable them even when the parent interpreter flags are 0.
# Fail before importing non-builtin modules or performing source operations.
import sys
if sys.flags.optimize != 0 or not __debug__:
    sys.stderr.write("HOLD=optimized_python_forbidden\n")
    raise SystemExit(2)
if (sys.flags.isolated != 1 or not sys.dont_write_bytecode
    or sys.flags.no_site != 1):
    sys.stderr.write("HOLD=isolated_python_proof_required\n")
    raise SystemExit(2)

import hashlib
import json
import pathlib
import shutil
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
BINDER = ROOT / "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v4.mjs"
PREENTRY = ROOT / "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v4.c"

BINDER_BLOB = "d2d648b144d3b406ff845a597fa4b9f54167b6bc"
BINDER_SHA256 = "c447151d7bc4d1b3ffc5e9c8d58b92e8f041e3aa6c0c5747d6da621471e28207"
BINDER_BYTES = 66650
PREENTRY_BLOB = "e5920575541001bff00abf894f0d62869d8f2452"
NATIVE_LOCK_V6R2_REL = "ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v6r2.json"
NATIVE_LOCK_V6R2_BLOB = "bc3cb6d7843447ed1f0f769c2d298bb76dac8b1b"
RUNTIME_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"

CANDIDATE_REL = "ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v4.json"
CANDIDATE_BLOB = "e569c9211e01f14c7c00dd1c5041d4dfb0817609"
DEPENDENCIES = {
    "ops/precision/void_buy_void_user_manager_credential_query_installed_qualification_v3r.py":
        "74c69fe8a95ed5f361a39971618f43f7c768c865",
    "ops/precision/void_buy_void_user_manager_credential_query_protected_replace_v3r.py":
        "98f8b9fda89e33c50e19008268d97655aad54e6d",
    "ops/precision/void_buy_void_user_manager_query_live_qualification_v6.py":
        "83bfd3f3baf5c9d2a9e21852b0f752f27d7749bc",
    "ops/precision/void_buy_void_user_manager_query_protected_replace_v6.py":
        "f81d9fbead60593258d17dbb8720e1efc867b20f",
    "ops/security/buy-void-user-manager-credential-query-elf-lock-v3r.json":
        "c4870f3178aebc9a0bb6557562f663b8480cfefa",
    "ops/security/buy-void-user-manager-credential-query-elf-lock-v2.json":
        "b73415ce8fc95ff2d49cbde97a15d701ad5b7937",
    "ops/security/buy-void-user-manager-query-elf-lock-v6.json":
        "772945b639d138284fc18cc312f7b9115b10c748",
    "tools/void-buy-allocation-custody-host-evidence-v4.mjs":
        "223a8acf32f8c7961d61222b83c0db17075f86c6",
    "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs":
        "14cbe81e27d04fee77cbe75225ce308bf8561a7b",
}

def git_blob(raw: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw).hexdigest()

def git_text(*args: str) -> str:
    cp = subprocess.run(
        ["/usr/bin/git", *args],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=30,
    )
    assert cp.returncode == 0, (args, cp.stdout, cp.stderr)
    assert cp.stderr == "", (args, cp.stderr)
    return cp.stdout.strip()

binder_raw = BINDER.read_bytes()
preentry_raw = PREENTRY.read_bytes()
assert git_blob(binder_raw) == BINDER_BLOB
assert hashlib.sha256(binder_raw).hexdigest() == BINDER_SHA256
assert len(binder_raw) == BINDER_BYTES
assert git_blob(preentry_raw) == PREENTRY_BLOB
native_lock_raw = (ROOT / NATIVE_LOCK_V6R2_REL).read_bytes()
assert git_blob(native_lock_raw) == NATIVE_LOCK_V6R2_BLOB
native_lock = json.loads(native_lock_raw)
assert native_lock["lock_id"] == (
    "voidbuye2nativecandlock6r2_ab95f15c8f2731adf6bfd97dfd5467495c90bdb5ee267948efc6a522be74b417"
)
assert native_lock["native_binary_identity_accepted"] is True
assert native_lock["protected_install_authorized"] is False
assert native_lock["live_execution_authorized"] is False
assert native_lock["candidate_report"]["native_binary_sha256"] == (
    "85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8"
)
assert native_lock["candidate_report"]["native_binary_bytes"] == 726976
binder = binder_raw.decode("ascii")
preentry = preentry_raw.decode("ascii")

for forbidden in (
    'const SOURCE_HEAD=',
    'const SOURCE_TREE=',
    'COMPAT_V3_BLOB',
    'FIXED_COMPAT_V3',
    'void_buy_void_presale_epoch2_installed_generation_host_evidence_v3.py',
    'source_runtime_added_path_count:15',
    ');\\n  console.log(',
    'NEXT_ACTIfunction',
    'VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V3";',
    '/^voide2livecomp3_',
    'RUNTIME_POLICY_SHA256',
    'protected_v6r2_generation_verified:true',
    'retained_v4_predecessor_verified:true',
    'function assertTrustedExecutable(',
    'return run(SETPRIV,',
    'const r=run(FIXED_NATIVE,',
):
    assert forbidden not in binder, forbidden
# No root process may reopen a prechecked ELF pathname after it was qualified.
# The only allowed first-exec transport is an inherited verified descriptor.
for required in (
    'function requirePinnedNativeExecutionClosure(t){',
    'function verifyRetainedNativeElfBytes(t,expectedBytes,expectedDigest){',
    'verifyRetainedNativeElfBytes(',
    'trusted_native_load_segment_bounds_invalid',
    'proveRetainedNativeElfParserFixture',
    'badMemoryOnly.writeBigUInt64LE(1n,64+32)',
    'badMemoryOnly.writeBigUInt64LE(0n,64+40)',
    'badFileOnly.writeBigUInt64LE(200n,64+32)',
    'badFileOnly.writeBigUInt64LE(200n,64+40)',
    'badOffsetFileOnly.writeBigUInt64LE(110n,64+8)',
    'badOffsetFileOnly.writeBigUInt64LE(20n,64+32)',
    'badOffsetFileOnly.writeBigUInt64LE(20n,64+40)',
    'binder_native_ptload_mem_extent_independent_negative=true',
    'binder_native_ptload_file_extent_independent_negative=true',
    'binder_native_ptload_offset_plus_file_extent_negative=true',
    'native_parser_short_read_not_rejected',
    'native_parser_generation_drift_not_rejected',
    'const st=fs.fstatSync(t.fd,{bigint:true});',
    'const read=fs.readSync(t.fd,chunk,0,want,pos);',
    'trusted_native_binary_sha256_not_accepted',
    'trusted_native_dynamic_interpreter_forbidden',
    'trusted_root_native_wrong_binary_self_test_failed',
    'binder_native_retained_fd_sha256_and_size_required=true',
    'binder_native_static_no_interp_elf_required=true',
    'binder_wrong_root_owned_native_rejected_before_exec=true',
    'function requireCurrentInstalledBinderBytes(fd,installedPath,expectedBytes,expectedSha){',
    'binder_preentry_installed_source_digest_not_accepted',
    'binder_preentry_installed_source_generation_changed',
    'requireCurrentInstalledBinderBytes(',
    'binderFd,FIXED_BINDER_SOURCE,proof.binder_bytes,proof.binder_sha256,',
    'binder_receipt_same_inode_content_mutation_accepted',
    'binder_receipt_visible_path_rebind_accepted',
    'binder_terminal_retained_fd_sha256_rechecked=true',
    'binder_same_inode_size_inplace_mutation_receipt_rejected=true',
    'ACCEPTED_NATIVE_LOCK_V6R2_ID',
    'ACCEPTED_NATIVE_LOCK_V6R2_BLOB',
    'function openRetainedTrustedExecutable(',
    'requireRootOwnedExecutableAncestors(file,label);',
    'const st=fs.lstatSync(file,{bigint:true});',
    'const real=fs.realpathSync.native(file);',
    'if(real!==file)',
    'trusted_executable_configured_path_not_canonical',
    'configured_lexical_alias_self_test_failed',
    'configured_symlink_ancestor_self_test_failed',
    'function requireRootOwnedExecutableAncestors(',
    'function requireRuntimeUidNonwritable(',
    'function runRetainedTrustedExecutable(',
    'function revalidateRetainedTrustedExecutable(',
    'function requireActiveRootExecutionTools(',
    'activeRootExecutionTools=tools;',
    'spawnSync("/proc/self/fd/"+String(tools.setpriv.fd)',
    '"/proc/self/fd/"+String(childCommandFd)',
    'runRetainedTrustedExecutable(tools.native,[',
    'stdio[tools.setpriv.fd]=tools.setpriv.fd;',
):
    assert required in binder, required

for required in (
    'VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V4',
    'RUN_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V4',
    'const CANONICAL_GIT_DIR=ROOT+"/.git";',
    '"--git-dir="+CANONICAL_GIT_DIR',
    '"--work-tree="+ROOT',
    '"-c","core.worktree="+ROOT',
    'GIT_NO_LAZY_FETCH:"1"',
    'GIT_PROTOCOL_FROM_USER:"0"',
    'GIT_ALLOW_PROTOCOL:""',
    'function requireActualObjectAncestry(',
    'gitFn(["cat-file","-t",oid])',
    'gitFn(["cat-file","-p",oid])',
    'function sourceCompatibility(',
    'SOURCE_RUNTIME_DEPENDENCY_SPECS.length!==9',
    'source_runtime_actual_object_ancestry:true',
    'source_runtime_complete_dependency_set_bound:true',
    'tracked_source_checkout_exact:true',
    'untracked_paths_enumerated:false',
    'untracked_paths_source_authority:false',
    'source_runtime_revision_walk_metadata_authority=false',
    'historical_compat_v3_source_authority=false',
    'const before=sourceCompatibility(runtimeHead);',
    'const after=sourceCompatibility(runtimeHead);',
    'source_generation_changed_across_sensitive_sequence',
    'binder_preentry_source_head_not_current',
    'voide2candbind3r4_',
    'VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V4',
    'AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V4_GREEN_SOURCE_RUNTIME_COMPATIBILITY_EXACT',
    '/^voide2livecomp4_[0-9a-f]{64}$/u',
    'source_checkout_head:compatibility.source_head',
    'source_checkout_tree:compatibility.source_tree',
    'child_runner_v4_receipt_bound:true',
    'child_runner_v4_source_checkout_bound:true',
    'const child=runNativeLive(runtimeHead,before);',
    'runner_v4_child_source_checkout_drift_rejected=true',
    'runtime_policy_authenticated_by_native_preentry:true',
    'runtime_policy_runtime_head:RUNTIME_HEAD',
    'runtime_policy_sha256_compile_constant_absent=true',
    'runtime_policy_authenticated_by_native_preentry_required=true',
    'native_parent_installed_generation_bound:true',
    'runner_v4_source_checkout_bound:true',
):
    assert required in binder, required

for relative, blob in DEPENDENCIES.items():
    assert git_text("rev-parse", f"{RUNTIME_HEAD}:{relative}") == blob
    assert git_text("rev-parse", f"HEAD:{relative}") == blob
assert git_text("rev-parse", f"HEAD:{CANDIDATE_REL}") == CANDIDATE_BLOB

for required in (
    'VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V4',
    'RUN_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V4',
    '#define BINDER_GIT_BLOB "' + BINDER_BLOB + '"',
    '#define BINDER_BYTES ' + str(BINDER_BYTES) + 'U',
    '0xc4,0x47,0x15,0x1d',
    '0xd6,0xda,0x62,0x14',
    'void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v4.mjs',
    'VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PARENT_PROOF_V4',
    'MFD_CLOEXEC|MFD_ALLOW_SEALING',
    'F_SEAL_WRITE|F_SEAL_GROW|F_SEAL_SHRINK|F_SEAL_SEAL',
    'stage_sealed_source(binder_fd,BINDER_BYTES,BINDER_SHA256)',
    'stream_fd_exact(frozen_fd,source_pipe[1],BINDER_BYTES)',
    'binder_preentry_binder_generation_changed_during_stage',
    'self_test_sealed_source()',
    'open_leaf_nofollow_nonblocking(p)',
    'O_RDONLY|O_CLOEXEC|O_NOFOLLOW|O_NONBLOCK',
    'self_test_fifo_replacement_nonblocking()',
    'trusted_fifo_swap_open_nonblocking=true',
    'parse_policy_bytes(',
    'self_test_policy_parser()',
    'binder_preentry_policy_canonical_invalid',
    'policy_exact_physical_bytes_canonical=true',
    'policy_embedded_nul_blank_suffix_leading_zero_rejected=true',
    'binder_parent_proof_contains_accepted_source_digest=true',
    'binder_hex[64]=',
    'binder_bytes',
    'binder_sha256',
    '(char*)"--source-head",source_head',
    '(char*)"--runtime-head",policy.expected_head',
):
    assert required in preentry, required
assert 'strtok_r(buf,"\\n"' not in preentry
assert "static bool decimal_size(const char*" not in preentry

node = shutil.which("node")
gcc = shutil.which("gcc")
assert node is not None
assert gcc is not None

cp = subprocess.run(
    [node, "--check", str(BINDER)],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert cp.returncode == 0, (cp.stdout, cp.stderr)
assert cp.stderr == "", cp.stderr

for mode in ("--self-test", "--plan"):
    cp = subprocess.run(
        [node, str(BINDER), mode],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=30,
        env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C", "LC_ALL": "C"},
    )
    assert cp.returncode == 0, (mode, cp.stdout, cp.stderr)
    assert cp.stderr == "", (mode, cp.stderr)
    lines = set(cp.stdout.splitlines())
    if mode == "--self-test":
        for line in (
            "VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V4_SELF_TEST_GREEN",
            "source_head_compile_constant_absent=true",
            "source_tree_compile_constant_absent=true",
            "source_head_runtime_observed=true",
            "source_tree_runtime_observed=true",
            "runtime_policy_head_preserved=true",
            "runtime_policy_sha256_compile_constant_absent=true",
            "runtime_policy_authenticated_by_native_preentry=true",
            "source_runtime_actual_object_ancestry_required=true",
            "source_runtime_graft_only_ancestry_rejected=true",
            "source_runtime_dependency_count=9",
            "source_runtime_complete_dependency_set_bound=true",
            "historical_compat_v3_source_authority=false",
            "runner_v4_child_receipt_required=true",
            "runner_v4_child_source_checkout_crosscheck=true",
            "runner_v4_child_source_checkout_drift_rejected=true",
            "binder_root_setpriv_retained_first_exec=true",
            "binder_native_child_retained_first_exec=true",
            "binder_root_executable_ancestor_custody_required=true",
            "binder_runtime_uid_acl_custody_required=true",
            "binder_retained_exec_path_rebind_rejected=true",
            "binder_configured_original_path_custody_required=true",
            "binder_configured_symlink_alias_rejected=true",
            "binder_native_retained_fd_sha256_and_size_required=true",
            "binder_native_static_no_interp_elf_required=true",
            "binder_native_fake_elf_parser_positive_and_negatives_green=true",
            "binder_native_parser_short_read_and_generation_drift_rejected=true",
            "binder_native_load_segment_shape_bound=true",
            "binder_native_ptload_mem_extent_independent_negative=true",
            "binder_native_ptload_file_extent_independent_negative=true",
            "binder_native_ptload_offset_plus_file_extent_negative=true",
            "binder_wrong_root_owned_native_rejected_before_exec=true",
            "binder_native_parent_digest_binds_final_installed_source=true",
            "binder_terminal_retained_fd_sha256_rechecked=true",
            "binder_same_inode_size_inplace_mutation_receipt_rejected=true",
            "binder_visible_source_path_rebind_receipt_rejected=true",
            "transaction=false",
            "public_presale_activation=false",
            "funds_movement=false",
        ):
            assert line in lines, line
    else:
        for line in (
            "mode=plan",
            "source_head_runtime_observed=true",
            "source_tree_runtime_observed=true",
            "source_runtime_actual_object_ancestry_required=true",
            "source_runtime_revision_walk_metadata_authority=false",
            "source_runtime_dependency_count=9",
            "source_runtime_complete_dependency_set_bound=true",
            "tracked_source_checkout_exact_required=true",
            "untracked_paths_enumerated=false",
            "untracked_paths_source_authority=false",
            "historical_compat_v3_source_authority=false",
            "runner_v4_child_receipt_required=true",
            "runner_v4_child_source_checkout_crosscheck_required=true",
            "runtime_policy_sha256_compile_constant_absent=true",
            "runtime_policy_authenticated_by_native_preentry_required=true",
            "root_setpriv_git_native_retained_first_exec_required=true",
            "trusted_executable_ancestor_and_runtime_acl_custody_required=true",
            "credential_content_access=false",
            "signing=false",
            "transaction=false",
            "payment_acceptance=false",
            "public_presale_activation=false",
            "funds_movement=false",
        ):
            assert line in lines, line

with tempfile.TemporaryDirectory(prefix="void-dormant-binding-v4-proof-") as td:
    binary = pathlib.Path(td) / "preentry"
    cp = subprocess.run(
        [gcc, "-std=c11", "-O2", "-Wall", "-Wextra", str(PREENTRY), "-o", str(binary)],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=60,
    )
    assert cp.returncode == 0, (cp.stdout, cp.stderr)
    cp = subprocess.run(
        [str(binary), "--self-test"],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=10,
    )
    assert cp.returncode == 0, (cp.stdout, cp.stderr)
    assert cp.stderr == "", cp.stderr
    lines = set(cp.stdout.splitlines())
    for line in (
        "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V4_SELF_TEST_GREEN",
        "binder_exact_sha256_bound=true",
        "binder_git_blob_provenance_bound=true",
        "binder_parent_proof_contains_accepted_source_digest=true",
        "private_parent_proof_channel=true",
        "binder_verified_sealed_memfd_source=true",
        "binder_same_inode_mutation_streams_only_accepted_bytes=true",
        "trusted_fifo_swap_open_nonblocking=true",
        "policy_exact_physical_bytes_canonical=true",
        "policy_embedded_nul_blank_suffix_leading_zero_rejected=true",
        "source_runtime_two_head_contract=true",
        "runtime_policy_head_separate_from_source_head=true",
        "credential_content_access=false",
        "transaction=false",
        "public_presale_activation=false",
        "funds_movement=false",
    ):
        assert line in lines, line


# Actual subprocess matrix: neither -O/-OO nor an optimized code object in an
# otherwise unoptimized isolated interpreter can bypass identity assertions.
# In each case the guard must stop before source reads, Git or Node execution.
proof_path = pathlib.Path(__file__).resolve()
proof_env = {
    "PATH": "/usr/bin:/bin", "HOME": "/nonexistent",
    "LANG": "C", "LC_ALL": "C", "TZ": "UTC",
}
for optimization in ("-O", "-OO"):
    cp = subprocess.run(
        [sys.executable, optimization, "-I", "-B", "-S", str(proof_path)],
        cwd=ROOT, env=proof_env, stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        check=False, timeout=20,
    )
    assert cp.returncode == 2, (optimization, cp.returncode, cp.stdout, cp.stderr)
    assert cp.stdout == "", (optimization, cp.stdout)
    assert cp.stderr == "HOLD=optimized_python_forbidden\n", (optimization, cp.stderr)

# An unoptimized interpreter can receive a separately optimized code object
# via compile(..., optimize=1/2). The __debug__ guard must also reject it.
code_object_runner = (
    "import pathlib,sys\n"
    "p=pathlib.Path(sys.argv[1])\n"
    "code=compile(p.read_bytes(),str(p),'exec',optimize=int(sys.argv[2]))\n"
    "exec(code,{'__name__':'__main__','__file__':str(p)})\n"
)
for optimization in (1, 2):
    cp = subprocess.run(
        [sys.executable, "-I", "-B", "-S", "-c", code_object_runner,
         str(proof_path), str(optimization)],
        cwd=ROOT, env=proof_env, stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        check=False, timeout=20,
    )
    assert cp.returncode == 2, (optimization, cp.returncode, cp.stdout, cp.stderr)
    assert cp.stdout == "", (optimization, cp.stdout)
    assert cp.stderr == "HOLD=optimized_python_forbidden\n", (optimization, cp.stderr)


# The standard-library __future__ module is otherwise imported BEFORE the
# guard when the script uses a future statement. A sibling checkout-local
# __future__.py could execute before -I is checked. This disposable copy
# demonstrates that the removed preguard import cannot run attacker bytes.
with tempfile.TemporaryDirectory(prefix="void-dormant-proof-preimport-") as td:
    fixture_dir = pathlib.Path(td)
    poisoned_future = fixture_dir / "__future__.py"
    poisoned_future.write_text(
        'print("POISONED_PRE_GUARD_IMPORT")\nannotations=object()\n',
        encoding="utf-8",
    )
    fixture_script = fixture_dir / "verifier.py"
    fixture_script.write_bytes(proof_path.read_bytes())
    cp = subprocess.run(
        [sys.executable, "-B", "-S", str(fixture_script)],
        cwd=fixture_dir, env=proof_env, stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        check=False, timeout=20,
    )
    assert cp.returncode == 2, (cp.returncode, cp.stdout, cp.stderr)
    assert cp.stdout == "", cp.stdout
    assert cp.stderr == "HOLD=isolated_python_proof_required\n", cp.stderr

print("VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V4_PROOF_GREEN")
print("binder_blob=" + BINDER_BLOB)
print("binder_sha256=" + BINDER_SHA256)
print("binder_bytes=" + str(BINDER_BYTES))
print("preentry_blob=" + PREENTRY_BLOB)
print("source_head_compile_constant_absent=true")
print("source_tree_compile_constant_absent=true")
print("source_head_runtime_observed=true")
print("source_tree_runtime_observed=true")
print("source_runtime_actual_object_ancestry_required=true")
print("source_runtime_graft_only_ancestry_rejected=true")
print("source_runtime_dependency_count=9")
print("source_runtime_complete_dependency_set_bound=true")
print("historical_compat_v3_source_authority=false")
print("runner_v4_child_receipt_required=true")
print("runner_v4_child_source_checkout_crosscheck_bound=true")
print("runner_v4_child_source_checkout_drift_rejected=true")
print("runtime_policy_sha256_compile_constant_absent=true")
print("binder_retained_root_exec_source_bound=true")
print("binder_ancestor_and_runtime_acl_guard_source_bound=true")
print("binder_configured_original_path_symlink_guard_source_bound=true")
print("binder_native_accepted_lock_v6r2_digest_bound=true")
print("binder_native_retained_root_fd_static_elf_guard_proven=true")
print("binder_native_exact_fd_elf_parser_fixture_proven=true")
print("binder_native_ptload_memory_file_and_offset_bounds_proven=true")
print("binder_native_short_read_and_generation_drift_negative_proven=true")
print("optimized_python_negative_fixtures=2")
print("optimized_code_object_negative_fixtures=2")
print("per_code_object_debug_required=true")
print("isolated_no_site_python_proof_entry_required=true")
print("pre_guard_future_import_poison_rejected=true")
print("runtime_policy_authenticated_by_native_preentry=true")
print("historical_generation_overclaim_absent=true")
print("native_preentry_binds_exact_binder_bytes=true")
print("binder_sealed_memfd_source_verified_before_root_fork=true")
print("binder_inplace_mutation_cannot_change_streamed_js=true")
print("binder_native_trusted_open_fifo_swap_nonblocking=true")
print("native_policy_exact_physical_bytes_canonical=true")
print("native_policy_embedded_nul_blank_suffix_leading_zero_rejected=true")
print("binder_terminal_installed_source_digest_proven=true")
print("binder_same_inode_size_mutation_receipt_rejection_proven=true")
print("binder_parent_private_proof_accepted_digest_bound=true")
print("host_execution=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
