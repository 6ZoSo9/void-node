#!/usr/bin/env python3
import sys
import hashlib
from pathlib import Path
import importlib.util
import os
import subprocess
import tempfile

MARKER = "VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_INSTALL_V1_PROOF"
if sys.flags.isolated != 1 or sys.flags.optimize != 0 or not __debug__:
    print(MARKER)
    print("status=HOLD")
    print("reason=python_isolated_unoptimized_mode_required")
    raise SystemExit(2)

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/precision/void_v7_full_history_protected_replica_install_v1.py"
TARGET_BLOB = "a4d5762fe0e1c41b0919b8abb827123e556552ca"

def git(*args: str) -> str:
    cp = subprocess.run(
        ["/usr/bin/git", "-C", str(ROOT), *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=30,
        check=False,
    )
    if cp.returncode != 0 or cp.stderr:
        raise RuntimeError("git_failed:" + (args[0] if args else "unknown"))
    return cp.stdout.strip()

assert git("hash-object", str(TARGET)) == TARGET_BLOB

raw = TARGET.read_bytes()
compile(raw, str(TARGET), "exec", dont_inherit=True, optimize=0)
text = raw.decode("utf-8")

# Production provenance must be built-in. Git is permitted only in this proof
# as an oracle for disposable fixtures.
assert "import subprocess" not in text
assert "subprocess." not in text
assert "/usr/bin/git" not in text
assert "FIXED_GIT" not in text
assert "def _git_run(" not in text
assert "def git_text(" not in text
assert "def git_bytes(" not in text
assert "def git_ancestor(" not in text
assert "os.listdir(" not in text
assert "sorted(os.scandir" not in text
assert "list(os.scandir" not in text
assert "def _bounded_directory_names(" in text
assert "def _require_exact_directory_names(" in text
assert "MAX_PACK_ENTRY_BYTES = MAX_GIT_OBJECT_BYTES + 2 * 1024 * 1024" in text
assert "MAX_PACK_CACHE_BYTES = 64 * 1024 * 1024" in text
assert "def _entry_span(" in text
assert "self.cache_bytes > MAX_PACK_CACHE_BYTES" in text
assert "self.pack_fd = -1" in text
assert "self.idx_fd = -1" in text
assert "except BaseException:\n            self.close()\n            raise" in text
assert "mode_value == 0o100644" in text
assert "mode_value == 0o100755" in text
assert "mode_value == 0o120000" in text

for required in (
    'BASE_HEAD = "6a577bc61bd95524597e534b37a531c5b60ee7c1"',
    'BUILDER_BLOB = "030182d544a92cd6c67868fa4c4f3e83188e4249"',
    'V4_BLOB = "4448acb51cbc15d845550a55cd11c38f4185a7b3"',
    'ATOMIC_BLOB = "3fe1158a0fdf19fa4307c2a8122314b75ee36345"',
    'SOURCE_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"',
    'SOURCE_TREE = "de12c9d2d5e475d435d21da3b047d7b63b69e2b7"',
    '"5752b69a7253a44fd3fabe2964476174b3a80c40"',
    '"6b7fc90219676a96f5a2c34619e4cfdf3f002244"',
    'REACHABLE_COMMITS = 17931',
    'MAX_COPY_DEPTH = 128',
    'MAX_GIT_OBJECT_BYTES = 128 * 1024 * 1024',
    'MAX_PACK_ENTRY_BYTES = MAX_GIT_OBJECT_BYTES + 2 * 1024 * 1024',
    'MAX_PACK_CACHE_BYTES = 64 * 1024 * 1024',
    'class _PackReader:',
    'self.cache_bytes = 0',
    'def _entry_span(',
    '_pack_entry_size_limit',
    'def _read_loose(',
    '_loose_object_size_limit',
    '_loose_zlib_incomplete',
    'class _ObjectStore:',
    'def _apply_git_delta(',
    'def _parse_commit_object(',
    'def _parse_tree_object(',
    'def _verify_full_history_graph(',
    'def _read_index_manifest(',
    'def _next_optional_index_extension(',
    '_required_extension_forbidden',
    '_path_length_sentinel_invalid',
    '_padding_nonzero',
    'git_index_optional_extensions_bounded=true',
    'git_index_required_extensions_rejected=true',
    'git_index_v2_zero_padding_required=true',
    'git_index_v2_name_length_sentinel_required=true',
    'def _verify_worktree_manifest(',
    'history_object_closure_not_exact',
    'history_reachable_commit_count_mismatch',
    '_pack_checksum_mismatch',
    '_idx_checksum_mismatch',
    '_pack_filename_digest_mismatch',
    '_pack_entry_crc_mismatch',
    '_object_oid_mismatch:',
    '_delta_cycle_or_depth',
    '_thin_pack_forbidden',
    '_index_head_mismatch',
    'built_in_object_closure_verified',
    'built_in_shallow_provenance_verified',
    'dynamic_git_provenance_authority_removed=true',
    'built_in_pack_index_verification_required=true',
    'built_in_full_history_object_closure_required=true',
    'trusted_expected_head_tree_pair_required=true',
    'parser.add_argument("--expected-tree", default="")',
    'expected_tree_required',
    '"expected_tree": expected_tree',
    'def _copy_candidate_tree_iterative(',
    'copy_node_limit',
    'copy_depth_limit',
    'candidate_copy_incremental_enumeration_required=true',
    'candidate_copy_iterative_depth_bound_required=true',
    'candidate_copy_operation_bound_node_budget_required=true',
    'candidate_copy_operation_bound_byte_budget_required=true',
    'candidate_copy_exact_planned_counts_required=true',
    'large_file_authentication_streamed=true',
    'byte_returning_reads_tiny_metadata_only=true',
    'def _planned_candidate_copy_limits(',
    'CANDIDATE = pathlib.Path("/home/zoso/Downloads/void-v7-full-history-candidate-6011fc")',
    'LIVE_RELEASE = pathlib.Path("/opt/void-node-live/releases/" + SOURCE_HEAD)',
    'TARGET_NAME = "void-v7-source-release-full-history-v1"',
    'STAGE_NAME = ".void-v7-source-release-full-history-v1.stage-v1"',
    'CONFIRM_TOKEN = "INSTALL_VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_V1_CREATE_ONLY"',
    'RENAME_NOREPLACE = 1',
    'def _verify_full_history_root(',
    'def _verify_live_shallow_release()',
    'def _copy_candidate_to_stage(',
    'def _rename_noreplace(',
    'def _reconcile_publication_receipt()',
    'def _require_privileged_source_custody()',
    'def _runtime_uid_child_call(',
    'def _collect_plan_for_apply(',
    'def _verify_stage_for_apply(',
    'root_required_for_runtime_uid_child',
    'PR_SET_NO_NEW_PRIVS = 38',
    'PR_CAP_AMBIENT = 47',
    'PR_CAP_AMBIENT_CLEAR_ALL = 4',
    'LINUX_CAPABILITY_VERSION_3 = 0x20080522',
    'SYS_CAPSET_X86_64 = 126',
    'def _clear_runtime_child_capabilities(',
    'def _drop_runtime_child_privileges()',
    'def _proc_self_status_security_fields()',
    'prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0)',
    'runtime_uid_child_capability_clear_required=true',
    'runtime_uid_child_capability_status_zero_required=true',
    'os.getresuid() != (RUNTIME_UID, RUNTIME_UID, RUNTIME_UID)',
    'os.getresgid() != (RUNTIME_GID, RUNTIME_GID, RUNTIME_GID)',
    'runtime_uid_child_identity_drop_incomplete',
    'runtime_uid_child_no_new_privs_required=true',
    'apply_root_dynamic_git_exec=false',
    'termination_signal_reconciliation_required=true',
    'install_parent_publication_lease_required=true',
    'signal.SIGTERM',
    'signal.SIGHUP',
    'signal.SIGQUIT',
    'install_parent_descriptor_identity_mismatch',
    'install_parent_descriptor_generation_changed',
    'git_regular_leaf_metadata_invalid:',
    'git_index_head_equality_required=true',
    'git_metadata_leaves_nonexecutable_required=true',
    'def _prepare_private_stage_for_runtime_verification()',
    'def _seal_verified_stage_for_publication()',
    'def _verify_private_stage_for_apply(',
    'private_stage_content_digest_mismatch',
    'private_stage_git_verified_digest_mismatch',
    'private_stage_git_verification_before_world_readable=true',
    'private_stage_named_runtime_uid_acl_required=true',
    'private_stage_acl_group_object_zero_required=true',
    'private_stage_acl_xattr_roundtrip_required=true',
    'candidate_utf8_path_components_required=true',
    'candidate_receipt_safe_path_components_required=true',
    'candidate_printable_path_components_required=true',
    'terminal_reason_line_sanitization_required=true',
    'terminal_reason_printable_sanitization_required=true',
    'def _receipt_safe_text(',
    'out.append(ch if ch.isprintable() else "_")',
    'if not all(ch.isprintable() for ch in name)',
    'copy_entry_name_control_forbidden',
    'print("reason=" + _receipt_safe_text(str(exc)))',
    'opened_generation_copy_budget_required=true',
    'write_boundary_precedes_first_stage_mutation=true',
    'runtime_uid_private_stage_writable',
    'runtime_uid_private_stage_not_readable',
    'POSIX_ACL_ACCESS_XATTR = "system.posix_acl_access"',
    'ACL_GROUP_OBJ = 0x04',
    'def _runtime_uid_read_acl_blob(',
    'def _set_runtime_uid_read_acl_fd(',
    'def _remove_runtime_uid_read_acl_fd(',
    'copy_entry_name_not_utf8',
    'live_release_parent_object_unexpectedly_present',
    'stage_content_digest_mismatch',
    'plan_binding_changed_before_publication',
    'final_protected_replica_not_green',
    'live_release_mutation=false',
    'trusted_root_launcher_required=true',
):
    assert required in text, required

# Exercise the built-in pack/index/object graph reader against Git only as a
# disposable test oracle. Shared subtrees intentionally appear at a/ and b/.
spec = importlib.util.spec_from_file_location("void_v7_replica_builtin_provenance", TARGET)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def fixture_git(repo: Path, *args: str) -> str:
    cp = subprocess.run(
        ["/usr/bin/git", "-C", str(repo), *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=60,
        check=False,
        env={
            "PATH": "/usr/bin:/bin",
            "HOME": "/nonexistent",
            "LANG": "C",
            "LC_ALL": "C",
            "TZ": "UTC",
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_CONFIG_SYSTEM": "/dev/null",
            "GIT_TERMINAL_PROMPT": "0",
            "GIT_PAGER": "",
        },
    )
    if cp.returncode != 0:
        raise RuntimeError("fixture_git_failed:" + args[0] + ":" + cp.stderr)
    return cp.stdout.strip()

with tempfile.TemporaryDirectory(prefix="void-v7-builtin-pack-proof-") as td:
    repo = Path(td) / "repo"
    repo.mkdir()
    fixture_git(repo, "init", "-q", "-b", "main")
    fixture_git(repo, "config", "user.name", "VOID proof")
    fixture_git(repo, "config", "user.email", "proof@invalid")
    (repo / "root.txt").write_text("one\n", "utf-8")
    fixture_git(repo, "add", "--", "root.txt")
    fixture_git(repo, "commit", "-q", "-m", "one")

    for dirname in ("a", "b"):
        (repo / dirname).mkdir()
        (repo / dirname / "same.txt").write_text("same\n", "utf-8")
    (repo / "run.sh").write_text("#!/bin/sh\nexit 0\n", "utf-8")
    os.chmod(repo / "run.sh", 0o755)
    fixture_git(repo, "add", "--", "a", "b", "run.sh")
    fixture_git(repo, "commit", "-q", "-m", "two")

    os.symlink("a/same.txt", repo / "link")
    (repo / "root.txt").write_text("three\n", "utf-8")
    fixture_git(repo, "add", "--", "root.txt", "link")
    fixture_git(repo, "commit", "-q", "-m", "three")

    head = fixture_git(repo, "rev-parse", "HEAD")
    tree = fixture_git(repo, "rev-parse", "HEAD^{tree}")
    parent_lines = fixture_git(repo, "cat-file", "-p", head)
    parents = tuple(
        line[7:] for line in parent_lines.splitlines() if line.startswith("parent ")
    )
    commits = int(fixture_git(repo, "rev-list", "--count", head))
    oracle_oids = {
        line.split(" ", 1)[0]
        for line in fixture_git(repo, "rev-list", "--objects", head).splitlines()
        if line
    }

    # First exercise loose-object decoding before repacking.
    loose_store = module._ObjectStore(repo, "proof_loose", exact_pack_only=False)
    try:
        loose_type, loose_commit = loose_store.read_object(head)
        assert loose_type == "commit"
        loose_tree, loose_parents = module._parse_commit_object(
            loose_commit, "proof_loose"
        )
        assert loose_tree == tree
        assert loose_parents == parents
    finally:
        loose_store.close()

    fixture_git(repo, "-c", "pack.writeReverseIndex=false", "repack", "-a", "-d")
    fixture_git(repo, "prune-packed")
    # Remove empty fanout directories left by some Git versions; production
    # candidates are already required to have the exact pack-only layout.
    objects = repo / ".git" / "objects"
    for entry in list(objects.iterdir()):
        if len(entry.name) == 2 and entry.name not in ("info",):
            try:
                entry.rmdir()
            except OSError:
                pass
    fixture_git(repo, "read-tree", head)

    old_constants = (
        module.SOURCE_HEAD,
        module.SOURCE_TREE,
        module.SOURCE_PARENTS,
        module.REACHABLE_COMMITS,
    )
    module.SOURCE_HEAD = head
    module.SOURCE_TREE = tree
    module.SOURCE_PARENTS = parents
    module.REACHABLE_COMMITS = commits
    store = module._ObjectStore(repo, "proof_pack", exact_pack_only=True)
    try:
        manifest, observed_commits, observed_objects = module._verify_full_history_graph(store)
        assert observed_commits == commits
        assert observed_objects == len(oracle_oids)
        assert store.all_oids() == oracle_oids
        assert module._read_index_manifest(repo / ".git" / "index", "proof_index") == manifest
        module._verify_worktree_manifest(repo, manifest)
        assert "a/same.txt" in manifest and "b/same.txt" in manifest
        assert manifest["a/same.txt"] == manifest["b/same.txt"]
        assert manifest["run.sh"][0] == "100755"
        assert manifest["link"][0] == "120000"

        # Canonical v2 index adversaries. Preserve checksum-covered optional
        # extensions and recompute the trailer so rejection is semantic.
        index_path = repo / ".git" / "index"
        original_index = index_path.read_bytes()
        assert original_index[:4] == b"DIRC"
        assert int.from_bytes(original_index[4:8], "big") == 2
        entry_count = int.from_bytes(original_index[8:12], "big")
        assert entry_count > 0

        def index_entry_layout(raw_index: bytes):
            rows = []
            entry_offset = 12
            content_end = len(raw_index) - 20
            for _ in range(entry_count):
                fixed = raw_index[entry_offset:entry_offset + 62]
                assert len(fixed) == 62
                flags = int.from_bytes(fixed[60:62], "big")
                name_start = entry_offset + 62
                nul = raw_index.index(b"\0", name_start, content_end)
                name_len = nul - name_start
                entry_len = 62 + name_len + 1
                padded_len = (entry_len + 7) & ~7
                next_offset = entry_offset + padded_len
                assert next_offset <= content_end
                rows.append(
                    (entry_offset, flags, name_start, nul, next_offset)
                )
                entry_offset = next_offset
            return rows

        layouts = index_entry_layout(original_index)

        padding_row = next(
            row for row in layouts if row[4] > row[3] + 1
        )
        bad_padding = bytearray(original_index)
        bad_padding[padding_row[3] + 1] = 0x41
        bad_padding[-20:] = hashlib.sha1(
            bad_padding[:-20]
        ).digest()
        bad_padding_path = repo / ".git" / "index-proof-bad-padding"
        bad_padding_path.write_bytes(bad_padding)
        try:
            module._read_index_manifest(
                bad_padding_path, "proof_index_bad_padding"
            )
        except module.InstallError as exc:
            assert str(exc) == "proof_index_bad_padding_padding_nonzero"
        else:
            raise AssertionError("nonzero_index_padding_not_rejected")
        finally:
            bad_padding_path.unlink()

        short_row = next(
            row for row in layouts if row[3] - row[2] < 0x0fff
        )
        bad_sentinel = bytearray(original_index)
        flags_offset = short_row[0] + 60
        original_flags = int.from_bytes(
            bad_sentinel[flags_offset:flags_offset + 2], "big"
        )
        bad_flags = (original_flags & 0xf000) | 0x0fff
        bad_sentinel[flags_offset:flags_offset + 2] = bad_flags.to_bytes(
            2, "big"
        )
        bad_sentinel[-20:] = hashlib.sha1(
            bad_sentinel[:-20]
        ).digest()
        bad_sentinel_path = repo / ".git" / "index-proof-bad-sentinel"
        bad_sentinel_path.write_bytes(bad_sentinel)
        try:
            module._read_index_manifest(
                bad_sentinel_path, "proof_index_bad_sentinel"
            )
        except module.InstallError as exc:
            assert (
                str(exc)
                == "proof_index_bad_sentinel_path_length_sentinel_invalid"
            )
        else:
            raise AssertionError(
                "short_index_path_length_sentinel_not_rejected"
            )
        finally:
            bad_sentinel_path.unlink()
    finally:
        store.close()
        (
            module.SOURCE_HEAD,
            module.SOURCE_TREE,
            module.SOURCE_PARENTS,
            module.REACHABLE_COMMITS,
        ) = old_constants

    pack_dir = repo / ".git" / "objects" / "pack"
    pack = next(pack_dir.glob("*.pack"))
    idx = next(pack_dir.glob("*.idx"))
    original_pack = pack.name
    original_idx = idx.name
    fake_stem = "pack-" + ("0" * 40)
    fake_pack = pack_dir / (fake_stem + ".pack")
    fake_idx = pack_dir / (fake_stem + ".idx")
    if fake_pack == pack or fake_idx == idx:
        raise AssertionError("fixture_fake_pack_name_collision")
    pack.rename(fake_pack)
    idx.rename(fake_idx)
    try:
        module._ObjectStore(repo, "proof_fake_pack_name", exact_pack_only=True)
    except module.InstallError:
        pass
    else:
        raise AssertionError("fake_pack_name_not_rejected")
    fake_pack.rename(pack_dir / original_pack)
    fake_idx.rename(pack_dir / original_idx)
    pack = pack_dir / original_pack

    original_pack_mode = pack.stat().st_mode & 0o7777
    os.chmod(pack, original_pack_mode | 0o200)
    try:
        with pack.open("r+b") as fh:
            fh.seek(16)
            original = fh.read(1)
            assert original
            fh.seek(16)
            fh.write(bytes([original[0] ^ 0x01]))
            fh.flush()
            os.fsync(fh.fileno())
    finally:
        os.chmod(pack, original_pack_mode)
    try:
        module._ObjectStore(repo, "proof_corrupt", exact_pack_only=True)
    except module.InstallError:
        pass
    else:
        raise AssertionError("corrupt_pack_not_rejected")

# P2 memory-bound adversaries. These validate the guard itself without
# allocating a forbidden-size pack entry.
try:
    module._PackReader._entry_span(
        0,
        module.MAX_PACK_ENTRY_BYTES + 1,
        "proof_oversized_entry",
    )
except module.InstallError as exc:
    assert str(exc) == "proof_oversized_entry_pack_entry_size_limit"
else:
    raise AssertionError("oversized_pack_entry_span_not_rejected")

cache_reader = object.__new__(module._PackReader)
cache_reader.cache = __import__("collections").OrderedDict()
cache_reader.cache_bytes = 0
old_cache_budget = module.MAX_PACK_CACHE_BYTES
module.MAX_PACK_CACHE_BYTES = 10
try:
    cache_reader._cache_put("1" * 40, ("blob", b"123456"))
    cache_reader._cache_put("2" * 40, ("blob", b"abcdef"))
    assert cache_reader.cache_bytes <= module.MAX_PACK_CACHE_BYTES
    assert (
        sum(len(value[1]) for value in cache_reader.cache.values())
        == cache_reader.cache_bytes
    )
    assert list(cache_reader.cache) == ["2" * 40]
finally:
    module.MAX_PACK_CACHE_BYTES = old_cache_budget

# Privileged source apply must not become a supported mutable-checkout pattern.
assert 'root_required_for_privileged_apply' in text
assert 'privileged_source_ancestor_custody_invalid:' in text
assert 'privileged_source_ancestor_generation_changed:' in text
assert 'privileged_source_ancestor_generation_changed_terminal:' in text
assert 'privileged_source_owner_invalid:' in text
assert 'privileged_source_writable:' in text
apply_start = text.index("def apply(")
apply_end = text.index("def _termination_signal_handler(")
apply_text = text[apply_start:apply_end]
assert "subprocess." not in apply_text
assert "/usr/bin/git" not in apply_text
assert "_verify_full_history_root(" not in apply_text

copy_start = text.index("def _copy_candidate_to_stage(")
copy_end = text.index("def _rename_noreplace(", copy_start)
copy_text = text[copy_start:copy_end]
assert copy_text.index("_WRITE_BOUNDARY_ENTERED = True") < copy_text.index(
    "os.mkdir(STAGE_NAME"
)
assert copy_text.index("_prepare_private_stage_for_runtime_verification()") < copy_text.index(
    "_verify_private_stage_for_apply("
)
assert copy_text.index("_verify_private_stage_for_apply(") < copy_text.index(
    "_seal_verified_stage_for_publication()"
)
assert "_copy_candidate_tree_iterative(" in copy_text
assert "_planned_candidate_copy_limits(" in copy_text
assert "node_limit=planned_nodes" in copy_text
assert "total_limit=planned_regular_file_bytes" in copy_text
assert 'raise InstallError("copy_planned_node_count_mismatch")' in copy_text
assert 'raise InstallError("copy_planned_regular_file_bytes_mismatch")' in copy_text
assert copy_text.index("_planned_candidate_copy_limits(") < copy_text.index(
    "_WRITE_BOUNDARY_ENTERED = True"
)
assert "def recurse(" not in copy_text
assert "sorted(os.listdir" not in copy_text
assert "total += st.st_size" not in copy_text
assert "copy_entry_name_not_utf8" in text

walker_start = text.index("def _copy_candidate_tree_iterative(")
walker_end = text.index("def _copy_candidate_to_stage(", walker_start)
walker_text = text[walker_start:walker_end]
assert "os.scandir(src_root_fd)" in walker_text
assert "entry = next(iterator)" in walker_text
assert walker_text.index("nodes += 1") < walker_text.index("name = entry.name")
assert "if nodes > node_limit:" in walker_text
assert "if child_depth > depth_limit:" in walker_text
assert "_require_utf8_copy_component(name)" in walker_text
assert "sorted(os.listdir" not in walker_text
assert "def recurse(" not in walker_text
assert "_copy_candidate_tree_iterative(" not in walker_text[walker_text.index("while stack:"):]

limits_start = text.index("def _planned_candidate_copy_limits(")
limits_end = text.index("def _copy_candidate_to_stage(", limits_start)
limits_text = text[limits_start:limits_end]
assert "type(nodes) is not int" in limits_text
assert "nodes < 0 or nodes > MAX_NODES" in limits_text
assert "type(regular_file_bytes) is not int" in limits_text
assert "regular_file_bytes < 0" in limits_text
assert "regular_file_bytes > MAX_TOTAL_BYTES" in limits_text
assert "return nodes, regular_file_bytes" in limits_text
assert "os.fchown(fd, 0, RUNTIME_GID)" not in text
assert "stage_prepare_named_runtime_uid_acl" not in text
assert "private_stage_named_runtime_uid_acl_required=true" in text
assert "private_stage_acl_group_object_zero_required=true" in text
assert "candidate_utf8_path_components_required=true" in text

copy_regular_start = text.index("def _copy_regular_at(")
copy_regular_end = text.index(
    "def _prepare_private_stage_for_runtime_verification()", copy_regular_start
)
copy_regular_text = text[copy_regular_start:copy_regular_end]
assert "remaining_budget: int" in copy_regular_text
assert "before.st_size > remaining_budget" in copy_regular_text
assert "_metadata_identity(before) != expected_source" in copy_regular_text
assert "_metadata_identity(opened) != expected_source" in copy_regular_text
assert "return opened.st_size" in copy_regular_text

drop_start = text.index("def _drop_runtime_child_privileges()")
drop_end = text.index("def _runtime_uid_child_call(", drop_start)
drop_text = text[drop_start:drop_end]
assert drop_text.index(
    "prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0)"
) < drop_text.index("os.setgroups([])")
assert drop_text.index("os.setgroups([])") < drop_text.index(
    "os.setgid(RUNTIME_GID)"
) < drop_text.index("os.setuid(RUNTIME_UID)")
assert drop_text.index("os.setuid(RUNTIME_UID)") < drop_text.index(
    "_clear_runtime_child_capabilities(libc, prctl)"
)
assert "os.getresuid() != (RUNTIME_UID, RUNTIME_UID, RUNTIME_UID)" in drop_text
assert "os.getresgid() != (RUNTIME_GID, RUNTIME_GID, RUNTIME_GID)" in drop_text

cap_start = text.index("def _clear_runtime_child_capabilities(")
cap_end = text.index("def _drop_runtime_child_privileges()", cap_start)
cap_text = text[cap_start:cap_end]
assert "PR_CAP_AMBIENT_CLEAR_ALL" in cap_text
assert "SYS_CAPSET_X86_64" in cap_text
assert 'for key in ("CapInh", "CapPrm", "CapEff", "CapAmb")' in cap_text
assert 'runtime_uid_child_capability_not_zero:' in cap_text
assert 'runtime_uid_child_no_new_privs_status_invalid' in cap_text

runtime_child_start = text.index("def _runtime_uid_child_call(")
runtime_child_end = text.index("def _collect_plan_for_apply(", runtime_child_start)
runtime_child_text = text[runtime_child_start:runtime_child_end]
assert 'operation == "verify_stage_private"' in runtime_child_text
assert runtime_child_text.index("_drop_runtime_child_privileges()") < runtime_child_text.index(
    'if operation == "collect_plan":'
)
assert "_verify_full_history_root(" in runtime_child_text
assert "STAGE, 0, 0, 0o750" in runtime_child_text
assert "runtime_uid_private_stage_writable" in runtime_child_text
assert "runtime_uid_private_stage_not_readable" in runtime_child_text
assert "STAGE, 0, RUNTIME_GID, 0o550" not in runtime_child_text

# No live-root replacement primitive is allowed in this create-only lane.
assert "RENAME_EXCHANGE" not in text
assert 'os.unlink(LIVE_RELEASE' not in text
assert 'shutil.rmtree(LIVE_RELEASE' not in text
assert 'os.rename(LIVE_RELEASE' not in text
assert "UnicodeError," in text
assert "subprocess.SubprocessError" not in text
assert 'copy_entry_name_not_utf8' in text
assert 'copy_entry_name_control_forbidden' in text
assert 'def _receipt_safe_text(' in text
assert 'out.append(ch if ch.isprintable() else "_")' in text
assert 'if not all(ch.isprintable() for ch in name)' in text
assert 'print("reason=" + _receipt_safe_text(str(exc)))' in text
assert 'os.setxattr(acl_fd, POSIX_ACL_ACCESS_XATTR, acl_blob)' in text
assert 'os.getxattr(acl_fd, POSIX_ACL_ACCESS_XATTR)' in text
assert 'runtime_uid_acl_mode_projection_invalid' in text

plain = subprocess.run(
    [sys.executable, "-B", str(TARGET), "--source-plan"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    timeout=30,
    check=False,
)
assert plain.returncode == 2
assert "reason=python_isolated_unoptimized_mode_required" in plain.stdout.splitlines()

selftest = subprocess.run(
    [sys.executable, "-I", "-B", str(TARGET), "--self-test"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    timeout=30,
    check=False,
)
assert selftest.returncode == 0, selftest.stdout + selftest.stderr
assert selftest.stderr == ""
for marker in (
    "VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_INSTALL_V1_SELF_TEST_GREEN",
    "create_only_target=true",
    "live_release_mutation=false",
    "full_history_candidate_reauthentication_required=true",
    "live_shallow_runtime_cross_binding_required=true",
    "root_owned_immutable_stage_required=true",
    "private_stage_named_runtime_uid_acl_required=true",
    "private_stage_acl_group_object_zero_required=true",
    "private_stage_acl_xattr_roundtrip_required=true",
    "runtime_uid_child_capability_clear_required=true",
    "runtime_uid_child_capability_status_zero_required=true",
    "candidate_copy_incremental_enumeration_required=true",
    "candidate_copy_iterative_depth_bound_required=true",
    "large_file_authentication_streamed=true",
    "byte_returning_reads_tiny_metadata_only=true",
    "candidate_utf8_path_components_required=true",
    "candidate_receipt_safe_path_components_required=true",
    "candidate_printable_path_components_required=true",
    "terminal_reason_line_sanitization_required=true",
    "terminal_reason_printable_sanitization_required=true",
    "rename_noreplace_publication_required=true",
    "trusted_root_launcher_required=true",
    "pack_entry_span_bound_required=true",
    "pack_cache_byte_budget_required=true",
    "git_index_optional_extensions_bounded=true",
    "git_index_required_extensions_rejected=true",
    "git_index_v2_zero_padding_required=true",
    "git_index_v2_name_length_sentinel_required=true",
    "dynamic_git_provenance_authority_removed=true",
    "built_in_pack_index_verification_required=true",
    "built_in_full_history_object_closure_required=true",
    "trusted_expected_head_tree_pair_required=true",
    "service_mutation=false",
    "credential_access=false",
    "transaction=false",
    "funds_movement=false",
):
    assert marker in selftest.stdout.splitlines(), marker

source_plan = subprocess.run(
    [sys.executable, "-I", "-B", str(TARGET), "--source-plan"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    timeout=30,
    check=False,
)
assert source_plan.returncode == 0, source_plan.stdout + source_plan.stderr
assert source_plan.stderr == ""
for marker in (
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "candidate_path=/home/zoso/Downloads/void-v7-full-history-candidate-6011fc",
    "live_release_path=/opt/void-node-live/releases/4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb",
    "protected_replica_target=/opt/void-v7-source-release-full-history-v1",
    "create_only=true",
    "live_release_mutation=false",
    "trusted_root_launcher_required=true",
    "apply_plan_runtime_uid_drop_required=true",
    "runtime_uid_child_no_new_privs_required=true",
    "runtime_uid_child_capability_clear_required=true",
    "runtime_uid_child_capability_status_zero_required=true",
    "candidate_copy_descriptor_relative=true",
    "candidate_copy_incremental_enumeration_required=true",
    "candidate_copy_iterative_depth_bound_required=true",
    "candidate_copy_operation_bound_node_budget_required=true",
    "candidate_copy_operation_bound_byte_budget_required=true",
    "candidate_copy_exact_planned_counts_required=true",
    "large_file_authentication_streamed=true",
    "byte_returning_reads_tiny_metadata_only=true",
    "apply_root_dynamic_git_exec=false",
    "pack_entry_span_bound_required=true",
    "pack_cache_byte_budget_required=true",
    "dynamic_git_provenance_authority_removed=true",
    "built_in_pack_index_verification_required=true",
    "built_in_full_history_object_closure_required=true",
    "trusted_expected_head_tree_pair_required=true",
    "termination_signal_reconciliation_required=true",
    "install_parent_publication_lease_required=true",
    "git_index_head_equality_required=true",
    "git_index_optional_extensions_bounded=true",
    "git_index_required_extensions_rejected=true",
    "git_index_v2_zero_padding_required=true",
    "git_index_v2_name_length_sentinel_required=true",
    "git_metadata_leaves_nonexecutable_required=true",
    "private_stage_before_content_authentication=true",
    "private_stage_git_verification_before_world_readable=true",
    "private_stage_named_runtime_uid_acl_required=true",
    "private_stage_acl_group_object_zero_required=true",
    "candidate_utf8_path_components_required=true",
    "candidate_receipt_safe_path_components_required=true",
    "candidate_printable_path_components_required=true",
    "terminal_reason_line_sanitization_required=true",
    "terminal_reason_printable_sanitization_required=true",
    "opened_generation_copy_budget_required=true",
    "write_boundary_precedes_first_stage_mutation=true",
    "service_mutation=false",
    "credential_access=false",
    "transaction=false",
    "funds_movement=false",
):
    assert marker in source_plan.stdout.splitlines(), marker

print(MARKER + "_GREEN")
print("target_blob=" + TARGET_BLOB)
print("exact_reseal_dependency_bound=true")
print("full_history_candidate_contract_bound=true")
print("live_shallow_runtime_cross_binding_bound=true")
print("create_only_rename_noreplace_bound=true")
print("publication_reconciliation_bound=true")
print("direct_mutable_checkout_privileged_apply_forbidden=true")
print("apply_plan_runtime_uid_drop_bound=true")
print("runtime_uid_child_no_new_privs_bound=true")
print("runtime_uid_child_capability_clear_bound=true")
print("runtime_uid_child_capability_status_zero_bound=true")
print("candidate_copy_descriptor_relative_bound=true")
print("candidate_copy_incremental_enumeration_bound=true")
print("candidate_copy_iterative_depth_bound=true")
print("candidate_copy_operation_bound_node_budget_bound=true")
print("candidate_copy_operation_bound_byte_budget_bound=true")
print("candidate_copy_exact_planned_counts_bound=true")
print("large_file_authentication_streamed_bound=true")
print("byte_returning_reads_tiny_metadata_only_bound=true")
print("install_parent_stage_transition_bound=true")
print("root_dynamic_git_exec_forbidden_bound=true")
print("dynamic_git_provenance_authority_removed_bound=true")
print("built_in_pack_index_verification_bound=true")
print("built_in_full_history_object_closure_bound=true")
print("trusted_expected_head_tree_pair_bound=true")
print("loose_object_oracle_green=true")
print("packed_repository_oracle_green=true")
print("pack_filename_digest_binding_bound=true")
print("pack_entry_span_bound=true")
print("pack_cache_byte_budget_bound=true")
print("corrupt_pack_rejection_bound=true")
print("bounded_git_object_decompression_bound=true")
print("class_wide_bounded_directory_scans_bound=true")
print("termination_signal_reconciliation_bound=true")
print("install_parent_publication_lease_bound=true")
print("git_index_head_equality_bound=true")
print("git_index_optional_extensions_bounded=true")
print("git_index_required_extensions_rejected=true")
print("git_index_v2_zero_padding_bound=true")
print("git_index_v2_name_length_sentinel_bound=true")
print("git_metadata_leaves_nonexecutable_bound=true")
print("private_stage_content_authentication_bound=true")
print("private_stage_git_verification_before_world_readable_bound=true")
print("private_stage_named_runtime_uid_acl_bound=true")
print("private_stage_acl_group_object_zero_bound=true")
print("private_stage_acl_xattr_roundtrip_bound=true")
print("candidate_utf8_path_components_bound=true")
print("candidate_receipt_safe_path_components_bound=true")
print("candidate_printable_path_components_bound=true")
print("terminal_reason_line_sanitization_bound=true")
print("terminal_reason_printable_sanitization_bound=true")
print("opened_generation_copy_budget_bound=true")
print("write_boundary_precedes_first_stage_mutation_bound=true")
print("live_release_replacement_forbidden=true")
print("source_plan_inert=true")
print("service_mutation=false")
print("credential_access=false")
print("transaction=false")
print("funds_movement=false")
