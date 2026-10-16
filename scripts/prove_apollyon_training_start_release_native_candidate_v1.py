#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import os
import pathlib
import shutil
import subprocess
import tempfile
import textwrap

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE_REL = "ops/xiphos/apollyon_training_start_release_native_candidate_v1.c"
SOURCE = ROOT / SOURCE_REL
WORKFLOW_REL = ".github/workflows/apollyon-training-start-release-native-candidate-v1.yml"
WORKFLOW = ROOT / WORKFLOW_REL
PARENT_SOURCE_REL = "tools/apollyon-training-start-release-binding-v1.mjs"
PARENT_PROOF_REL = "scripts/prove_apollyon_training_start_release_binding_v1.mjs"
PARENT_WORKFLOW_REL = ".github/workflows/apollyon-training-start-release-binding-v1.yml"

SOURCE_BLOB = "66a20e42e6d73552c70253cd066af9d45af83749"
PARENT_SOURCE_BLOB = "b8d7229369e7d74e515955e726e0268bbdf6e513"
PARENT_PROOF_BLOB = "7a67f25c40d52574cc4a7bd25604e9ff79367487"
PARENT_WORKFLOW_BLOB = "c577da33e31b2c32d8a01e42105c7ced8cab0b4f"

MARKER = "VOID_APOLLYON_TRAINING_START_RELEASE_NATIVE_CANDIDATE_V1"
RELEASE_BINDING = (
    "apollyon_training_start_release_binding_v1:"
    + "a" * 64
)
RELEASE_DOMAIN_HEX = (
    "c201c621cc904c2e9c0c2527322debc326736b7f5e2c731a1032d2f1d3cb2b16"
)
EXPECTED_TRIGGER_PATHS = {
    SOURCE_REL,
    "scripts/prove_apollyon_training_start_release_native_candidate_v1.py",
    "docs/security/apollyon-training-start-release-native-candidate-v1.md",
    WORKFLOW_REL,
    PARENT_SOURCE_REL,
    PARENT_PROOF_REL,
    PARENT_WORKFLOW_REL,
}


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def stable_read(path: pathlib.Path) -> bytes:
    before = path.lstat()
    assert path.is_file() and not path.is_symlink(), path
    assert before.st_nlink == 1 and before.st_size > 0, path
    raw = path.read_bytes()
    after = path.lstat()
    for field in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        assert getattr(before, field) == getattr(after, field), (path, field)
    return raw


def run(
    argv: list[str],
    *,
    check: bool = True,
    env: dict[str, str] | None = None,
    timeout: int = 60,
) -> subprocess.CompletedProcess[str]:
    cp = subprocess.run(
        argv,
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="strict",
        env=env,
        check=False,
        timeout=timeout,
    )
    if check and cp.returncode != 0:
        raise AssertionError(
            f"command failed rc={cp.returncode}: {argv!r}\n"
            f"stdout={cp.stdout}\nstderr={cp.stderr}"
        )
    return cp


def event_paths(text: str, event: str, next_event: str) -> list[str]:
    lines = text.splitlines()
    marker = "  " + event + ":"
    end_marker = "  " + next_event + ":"
    assert lines.count(marker) == 1, marker
    start = lines.index(marker)
    end = lines.index(end_marker, start + 1)
    block = lines[start + 1 : end]
    path_markers = [i for i, line in enumerate(block) if line == "    paths:"]
    assert len(path_markers) == 1, (event, path_markers)
    out: list[str] = []
    for line in block[path_markers[0] + 1 :]:
        if not line.startswith("      "):
            break
        if line.startswith('      - "') and line.endswith('"'):
            out.append(line[9:-1])
        elif line.strip():
            raise AssertionError((event, line))
    return out


source_raw = stable_read(SOURCE)
parent_source_raw = stable_read(ROOT / PARENT_SOURCE_REL)
parent_proof_raw = stable_read(ROOT / PARENT_PROOF_REL)
parent_workflow_raw = stable_read(ROOT / PARENT_WORKFLOW_REL)

assert git_blob(source_raw) == SOURCE_BLOB
assert git_blob(parent_source_raw) == PARENT_SOURCE_BLOB
assert git_blob(parent_proof_raw) == PARENT_PROOF_BLOB
assert git_blob(parent_workflow_raw) == PARENT_WORKFLOW_BLOB

source = source_raw.decode("utf-8", "strict")
assert MARKER in source
assert PARENT_SOURCE_BLOB in source
assert "RELEASE_FD 3" in source
assert "RELEASE_FRAME_BYTES 64U" in source
assert "PARENT_RELEASE_BINDING_BLOB_SHA1" in source
assert "release_writer_exclusivity_proven=false" in source
assert "private_release_channel_origin_proven=false" in source
assert "PROC_SUPER_MAGIC" in source
assert "open_proc_context(&proc)" in source
assert "revalidate_proc_context(&proc)" in source
assert 'read_bounded_at(proc->self_fd,"status"' in source
assert 'read_bounded_at(proc->self_fd,"stat"' in source
assert 'readlinkat(proc->fd_dir_fd,"3"' in source
for forbidden_proc_path in (
    '"/proc/self/status"',
    '"/proc/self/stat"',
    '"/proc/self/fd"',
    '"/proc/self/exe"',
):
    assert forbidden_proc_path not in source, forbidden_proc_path
assert "trainer_releaser_lineage_proven=false" in source
assert "trainer_release_authorized=false" in source
assert "training_execution_authorized=false" in source
assert "training_execution_performed=false" in source

for forbidden in (
    "O_CREAT",
    "O_TRUNC",
    "unlink(",
    "rename(",
    "renameat",
    "systemctl",
    "AF_UNIX",
    "SOCK_STREAM",
    "connect(",
    "listen(",
    "accept(",
    "crypto.sign",
    "transaction_broadcast=true",
    "funds_movement=true",
):
    assert forbidden not in source, forbidden

run_start = source.index("static void run_gate(")
run_source = source[run_start:]
assert run_source.index("required_inherited_fds_present()") < run_source.index(
    "open_proc_context(&proc)"
)
assert run_source.index("open_proc_context(&proc)") < run_source.index(
    "inherited_fd_set_exact(&proc)"
)
assert run_source.index("inherited_fd_set_exact(&proc)") < run_source.index(
    "release_fd_snapshot(&proc,&pipe_before)"
)
assert run_source.index(
    "observe_security(&proc,expected_uid,expected_gid,&sec_before)"
) < run_source.index("install_noexec_seccomp()")
assert run_source.index("install_noexec_seccomp()") < run_source.index(
    "read_frame_then_eof(RELEASE_FD"
)
assert run_source.index("read_frame_then_eof(RELEASE_FD") < run_source.index(
    "release_native_procfs_generation_changed_after_frame"
)
assert run_source.index(
    "release_native_procfs_generation_changed_after_frame"
) < run_source.index(
    "observe_security(&proc,expected_uid,expected_gid,&sec_after)"
)
assert run_source.index("release_fd_snapshot(&proc,&pipe_after)") < run_source.index(
    'printf("release_gate_shape_verified=true'
)

workflow = WORKFLOW.read_text("utf-8")
pull = event_paths(workflow, "pull_request", "push")
push = event_paths(workflow, "push", "workflow_dispatch")
for label, actual in (("pull_request", pull), ("push", push)):
    assert len(actual) == len(EXPECTED_TRIGGER_PATHS), (label, actual)
    assert len(set(actual)) == len(actual), (label, actual)
    assert set(actual) == EXPECTED_TRIGGER_PATHS, (label, actual)

cc = shutil.which("cc")
readelf = shutil.which("readelf")
file_tool = shutil.which("file")
assert cc and readelf and file_tool

HARNESS_SOURCE = textwrap.dedent(
    r"""
    #define _GNU_SOURCE
    #include <errno.h>
    #include <fcntl.h>
    #include <grp.h>
    #include <linux/capability.h>
    #include <limits.h>
    #include <stdint.h>
    #include <stdio.h>
    #include <stdlib.h>
    #include <string.h>
    #include <sys/prctl.h>
    #include <sys/resource.h>
    #include <sys/syscall.h>
    #include <sys/types.h>
    #include <sys/wait.h>
    #include <unistd.h>

    static int hex_value(char c) {
        if (c >= '0' && c <= '9') return c - '0';
        if (c >= 'a' && c <= 'f') return 10 + c - 'a';
        return -1;
    }

    static int write_all(int fd, const unsigned char *data, size_t len) {
        size_t off = 0;
        while (off < len) {
            ssize_t n = write(fd, data + off, len - off);
            if (n < 0 && errno == EINTR) continue;
            if (n <= 0) return -1;
            off += (size_t)n;
        }
        return 0;
    }

    static int close_all_from(unsigned int first) {
    #ifdef SYS_close_range
        if (syscall(SYS_close_range, first, ~0U, 0U) == 0) return 0;
        if (errno != ENOSYS && errno != EINVAL) return -1;
    #endif
        struct rlimit lim;
        if (getrlimit(RLIMIT_NOFILE, &lim) != 0) return -1;
        unsigned long maxfd = lim.rlim_cur == RLIM_INFINITY ? 1048576UL : lim.rlim_cur;
        if (maxfd > 1048576UL) maxfd = 1048576UL;
        for (unsigned long fd = first; fd < maxfd; ++fd) close((int)fd);
        return 0;
    }

    static int close_except_candidate(int candidate_fd) {
    #ifdef SYS_close_range
        if (candidate_fd > 4) {
            if (syscall(SYS_close_range, 4U, (unsigned int)candidate_fd - 1U, 0U) != 0) {
                return -1;
            }
        }
        if (syscall(SYS_close_range, (unsigned int)candidate_fd + 1U, ~0U, 0U) != 0) {
            return -1;
        }
        return 0;
    #else
        struct rlimit lim;
        if (getrlimit(RLIMIT_NOFILE, &lim) != 0) return -1;
        unsigned long maxfd = lim.rlim_cur == RLIM_INFINITY ? 1048576UL : lim.rlim_cur;
        if (maxfd > 1048576UL) maxfd = 1048576UL;
        for (unsigned long fd = 4; fd < maxfd; ++fd) {
            if ((int)fd != candidate_fd) close((int)fd);
        }
        return 0;
    #endif
    }

    static int clear_inheritable_caps(void) {
    #if defined(SYS_capget) && defined(SYS_capset)
        struct __user_cap_header_struct hdr = {
            .version = _LINUX_CAPABILITY_VERSION_3,
            .pid = 0,
        };
        struct __user_cap_data_struct data[2];
        memset(data, 0, sizeof(data));
        if (syscall(SYS_capget, &hdr, data) != 0) return -1;
        data[0].inheritable = 0;
        data[1].inheritable = 0;
        return syscall(SYS_capset, &hdr, data) == 0 ? 0 : -1;
    #else
        return -1;
    #endif
    }

    int main(int argc, char **argv) {
        if (argc != 4 || strlen(argv[3]) != 128U) return 10;
        unsigned char frame[64];
        for (size_t i = 0; i < 64U; ++i) {
            int hi = hex_value(argv[3][i * 2U]);
            int lo = hex_value(argv[3][i * 2U + 1U]);
            if (hi < 0 || lo < 0) return 11;
            frame[i] = (unsigned char)((hi << 4) | lo);
        }

        if (close_all_from(3U) != 0) return 12;

        int p[2];
        if (pipe2(p, O_CLOEXEC) != 0 || p[0] != 3 || p[1] != 4) return 13;
        int candidate_fd = open(argv[1], O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
        if (candidate_fd != 5) return 14;

        pid_t child = fork();
        if (child < 0) return 15;
        if (child == 0) {
            close(p[1]);
            if (close_except_candidate(candidate_fd) != 0) _exit(20);

            for (int cap = 0; cap < 64; ++cap) {
                errno = 0;
                if (prctl(PR_CAPBSET_DROP, cap, 0, 0, 0) != 0 && errno != EINVAL) {
                    _exit(21);
                }
            }
    #ifdef PR_CAP_AMBIENT
            errno = 0;
            if (
                prctl(PR_CAP_AMBIENT, PR_CAP_AMBIENT_CLEAR_ALL, 0, 0, 0) != 0 &&
                errno != EINVAL
            ) _exit(22);
    #endif
            if (clear_inheritable_caps() != 0) _exit(23);
            if (setgroups(0, NULL) != 0) _exit(24);
            if (setresgid(1000, 1000, 1000) != 0) _exit(25);
            if (setresuid(1000, 1000, 1000) != 0) _exit(26);
            if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) != 0) _exit(27);

            char *const child_argv[] = {
                argv[1],
                (char *)"--run",
                (char *)"--release-binding-id",
                argv[2],
                (char *)"--expected-uid",
                (char *)"1000",
                (char *)"--expected-gid",
                (char *)"1000",
                NULL,
            };
            char *const envp[] = {
                (char *)"LANG=C",
                (char *)"LC_ALL=C",
                (char *)"TZ=UTC",
                NULL,
            };
            fexecve(candidate_fd, child_argv, envp);
            _exit(28);
        }

        close(p[0]);
        close(candidate_fd);
        int write_rc = write_all(p[1], frame, sizeof(frame));
        int close_rc = close(p[1]);
        int status = 0;
        if (waitpid(child, &status, 0) != child) return 16;
        if (write_rc != 0 || close_rc != 0) return 17;
        if (!WIFEXITED(status)) return 18;
        return WEXITSTATUS(status);
    }
    """
)


def compile_harness(cc: str, path: pathlib.Path) -> pathlib.Path:
    source_path = path / "positive-run-harness.c"
    harness = path / "positive-run-harness"
    source_path.write_text(HARNESS_SOURCE, encoding="utf-8")
    run([
        cc,
        "-std=c11",
        "-Wall",
        "-Wextra",
        "-Werror",
        "-O2",
        str(source_path),
        "-o",
        str(harness),
    ])
    return harness


def release_frame_hex(binding_id: str) -> str:
    domain = bytes.fromhex(RELEASE_DOMAIN_HEX)
    bound = hashlib.sha256(binding_id.encode("utf-8")).digest()
    frame = domain + bound
    assert len(frame) == 64
    return frame.hex()


with tempfile.TemporaryDirectory(
    prefix="void-apollyon-release-native-v1-"
) as td:
    temp = pathlib.Path(td)
    a = temp / "candidate-a"
    b = temp / "candidate-b"
    c_path = temp / "candidate-c"
    flags = [
        cc,
        "-std=c11",
        "-Wall",
        "-Wextra",
        "-Werror",
        "-O2",
        "-static",
        "-Wl,--build-id=none",
        str(SOURCE),
    ]
    run(flags + ["-o", str(a)])
    run(flags + ["-o", str(b)])
    run(flags + ["-o", str(c_path)])
    raw_a = a.read_bytes()
    raw_b = b.read_bytes()
    raw_c = c_path.read_bytes()
    assert raw_a == raw_b == raw_c
    candidate_sha256 = hashlib.sha256(raw_a).hexdigest()
    assert len(raw_a) > 0
    assert len(candidate_sha256) == 64

    file_out = run([file_tool, str(a)]).stdout
    assert "statically linked" in file_out, file_out
    program_headers = run([readelf, "-l", str(a)]).stdout
    assert " INTERP " not in program_headers
    dynamic = run([readelf, "-d", str(a)], check=False)
    assert "NEEDED" not in dynamic.stdout

    self_test = run([str(a), "--self-test"], timeout=30)
    lines = set(self_test.stdout.splitlines())
    for expected in (
        MARKER + "_SELF_TEST_GREEN",
        "parent_release_binding_blob_bound=true",
        "fixed_release_fd=3",
        "release_fd_read_only_pipe_required=true",
        "release_fd_anonymous_pipe_identity_required=true",
        "exact_64_byte_frame_then_eof_required=true",
        "short_frame_rejected=true",
        "extra_frame_rejected=true",
        "missing_eof_rejected=true",
        "delayed_extra_rejected=true",
        "held_duplicate_writer_timeout_rejected=true",
        "exact_uid_gid_slots_required=true",
        "supplementary_groups_empty_required=true",
        "no_new_privileges_required=true",
        "retained_self_pidfd_required=true",
        "retained_self_pidfd_liveness_revalidated=true",
        "procfs_super_magic_required=true",
        "procfs_self_pid_bound_to_getpid=true",
        "procfs_self_generation_retained=true",
        "fake_proc_root_rejected=true",
        "all_capability_sets_zero_required=true",
        "hostile_nnp_zero_rejected=true",
        "hostile_nonzero_capability_rejected=true",
        "hostile_supplementary_group_rejected=true",
        "post_first_entry_exec_forbidden=true",
        "hostile_loader_runtime_environment_rejected=true",
        "private_release_channel_origin_proven=false",
        "release_writer_exclusivity_proven=false",
        "trainer_releaser_lineage_proven=false",
        "trainer_release_authorized=false",
        "trainer_release_performed=false",
        "training_execution_authorized=false",
        "training_execution_performed=false",
        "candidate_weight_mutation_performed=false",
        "automatic_retry_authorized=false",
        "filesystem_write=false",
        "service_action=false",
        "socket_action=false",
        "production_signing=false",
        "transaction_broadcast=false",
        "funds_movement=false",
    ):
        assert expected in lines, expected

    no_fd = run(
        [
            str(a),
            "--run",
            "--release-binding-id",
            "apollyon_training_start_release_binding_v1:" + "a" * 64,
            "--expected-uid",
            str(os.getuid() or 1000),
            "--expected-gid",
            str(os.getgid() or 1000),
        ],
        check=False,
    )
    assert no_fd.returncode == 2
    assert MARKER + "_HOLD" in no_fd.stderr
    assert (
        "reason=release_native_inherited_fd_set_invalid" in no_fd.stderr
        or "reason=release_native_root_forbidden" in no_fd.stderr
    )
    assert "trainer_release_authorized=false" in no_fd.stderr
    assert "training_execution_authorized=false" in no_fd.stderr

    sudo = shutil.which("sudo")
    assert sudo is not None
    harness = compile_harness(cc, temp)
    frame_hex = release_frame_hex(RELEASE_BINDING)

    positive = run(
        [sudo, "-n", str(harness), str(a), RELEASE_BINDING, frame_hex],
        check=False,
        timeout=30,
    )
    assert positive.returncode == 0, (positive.stdout, positive.stderr)
    positive_lines = set(positive.stdout.splitlines())
    for expected in (
        MARKER,
        "mode=run",
        "release_gate_shape_verified=true",
        "release_frame_verified=true",
        "release_eof_verified=true",
        "release_pipe_generation_stable=true",
        "release_pipe_anonymous_identity_verified=true",
        "trainer_process_generation_stable=true",
        "trainer_pidfd_retained=true",
        "trainer_pidfd_liveness_revalidated=true",
        "trainer_security_policy_revalidated=true",
        "procfs_provenance_verified=true",
        "procfs_self_pid_bound_to_getpid=true",
        "procfs_generation_revalidated=true",
        "post_first_entry_exec_forbidden=true",
        "private_release_channel_origin_proven=false",
        "release_writer_exclusivity_proven=false",
        "trainer_releaser_lineage_proven=false",
        "trainer_release_authorized=false",
        "trainer_release_performed=false",
        "training_execution_authorized=false",
        "training_execution_performed=false",
        "candidate_weight_mutation_performed=false",
        "automatic_retry_authorized=false",
        "filesystem_write=false",
        "service_action=false",
        "socket_action=false",
        "production_signing=false",
        "transaction_broadcast=false",
        "funds_movement=false",
        "next_gate=apollyon_training_start_release_releaser_integration_v1",
    ):
        assert expected in positive_lines, expected
    assert positive.stderr == ""

    fake_root = temp / "fake-proc-root"
    fake_root.mkdir()
    fake_candidate = temp / "candidate-fake-proc"
    run(
        flags[:-2]
        + [
            f'-DVOID_APOLLYON_PROC_ROOT="{fake_root}"',
            str(SOURCE),
            "-o",
            str(fake_candidate),
        ]
    )
    fake_run = run(
        [sudo, "-n", str(harness), str(fake_candidate), RELEASE_BINDING, frame_hex],
        check=False,
        timeout=30,
    )
    assert fake_run.returncode == 2, (fake_run.stdout, fake_run.stderr)
    assert MARKER + "_HOLD" in fake_run.stderr
    assert "reason=release_native_procfs_context_invalid" in fake_run.stderr
    assert "release_frame_verified=false" in fake_run.stderr
    assert "trainer_release_authorized=false" in fake_run.stderr
    assert "training_execution_authorized=false" in fake_run.stderr

print("VOID_APOLLYON_TRAINING_START_RELEASE_NATIVE_CANDIDATE_V1_PROOF_GREEN")
print("parent_release_binding_blob_bound=true")
print("candidate_static=true")
print("candidate_no_pt_interp=true")
print("candidate_no_needed=true")
print("candidate_reproducible_bytes=true")
print("candidate_three_build_equality=true")
print("candidate_sha256=" + candidate_sha256)
print("release_fd3_exact_allowlist_bound=true")
print("release_fd_anonymous_pipe_identity_bound=true")
print("release_frame_short_extra_timeout_adversaries=true")
print("held_duplicate_writer_timeout_adversary=true")
print("trainer_nnp_capability_adversaries=true")
print("trainer_pidfd_retained_and_revalidated=true")
print("procfs_super_magic_and_self_generation_bound=true")
print("fake_proc_root_adversary_rejected=true")
print("actual_run_gate_positive_harness=true")
print("actual_run_gate_exact_fd3_frame_eof=true")
print("post_first_entry_noexec_barrier_proven=true")
print("release_pipe_identity_observed_but_writer_origin_unproven=true")
print("private_release_channel_origin_proven=false")
print("release_writer_exclusivity_proven=false")
print("trainer_releaser_lineage_proven=false")
print("trainer_release_authorized=false")
print("trainer_release_performed=false")
print("training_execution_authorized=false")
print("training_execution_performed=false")
print("candidate_weight_mutation_performed=false")
print("automatic_retry_authorized=false")
print("filesystem_write=false")
print("service_action=false")
print("socket_action=false")
print("production_signing=false")
print("transaction_broadcast=false")
print("funds_movement=false")
print("next_gate=apollyon_training_start_release_releaser_integration_v1")
