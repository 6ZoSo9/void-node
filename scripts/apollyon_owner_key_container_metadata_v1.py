#!/usr/bin/env python3
"""Read-only Apollyon owner-key container metadata verifier.

This verifier deliberately never opens, reads, hashes, decrypts, copies, or signs
with the target file. It only uses lstat metadata on the target and its ancestor
directories.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import stat
import tempfile


MARKER = "VOID_APOLLYON_OWNER_KEY_CONTAINER_METADATA_V1"
DEFAULT_RELATIVE_PATH = Path(
    ".local/share/void-apollyon-owner-approval-key-v16/"
    "owner-ed25519-encrypted-pkcs8.pem"
)
MAX_METADATA_ONLY_SIZE = 65536


class Hold(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise Hold(reason)


def _mode(value: int) -> int:
    return stat.S_IMODE(value)


def inspect_container(target: Path, *, home: Path | None = None) -> dict[str, int | bool]:
    current_uid = os.getuid()
    current_gid = os.getgid()

    home_path = Path(os.path.abspath(os.fspath(home if home is not None else Path.home())))
    target_path = Path(os.path.abspath(os.fspath(target)))

    try:
        common = os.path.commonpath((os.fspath(home_path), os.fspath(target_path)))
    except ValueError as exc:
        raise Hold("target_home_relation_invalid") from exc
    if common != os.fspath(home_path):
        hold("target_outside_home")

    try:
        relative_parent = target_path.parent.relative_to(home_path)
    except ValueError as exc:
        raise Hold("target_parent_outside_home") from exc

    ancestor_paths = [home_path]
    cursor = home_path
    for part in relative_parent.parts:
        cursor = cursor / part
        ancestor_paths.append(cursor)

    for index, path in enumerate(ancestor_paths):
        try:
            metadata = os.lstat(path)
        except FileNotFoundError as exc:
            raise Hold("ancestor_missing") from exc
        if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISDIR(metadata.st_mode):
            hold("ancestor_not_direct_directory")
        if metadata.st_uid != current_uid:
            hold("ancestor_owner_mismatch")
        permissions = _mode(metadata.st_mode)
        if index == 0:
            if permissions & 0o022:
                hold("home_group_or_other_writable")
        elif permissions & 0o077:
            hold("sensitive_ancestor_not_owner_private")

    try:
        target_metadata = os.lstat(target_path)
    except FileNotFoundError as exc:
        raise Hold("target_missing") from exc

    if stat.S_ISLNK(target_metadata.st_mode) or not stat.S_ISREG(target_metadata.st_mode):
        hold("target_not_direct_regular")
    if target_metadata.st_uid != current_uid:
        hold("target_owner_mismatch")
    if target_metadata.st_gid != current_gid:
        hold("target_group_mismatch")
    if _mode(target_metadata.st_mode) != 0o600:
        hold("target_mode_not_600")
    if target_metadata.st_nlink != 1:
        hold("target_link_count_not_1")
    if target_metadata.st_size <= 0 or target_metadata.st_size > MAX_METADATA_ONLY_SIZE:
        hold("target_size_out_of_metadata_bound")

    return {
        "target_within_home": True,
        "target_regular": True,
        "target_symlink": False,
        "target_mode": _mode(target_metadata.st_mode),
        "target_uid": int(target_metadata.st_uid),
        "target_gid": int(target_metadata.st_gid),
        "target_size": int(target_metadata.st_size),
        "target_links": int(target_metadata.st_nlink),
        "ancestor_count": len(ancestor_paths),
        "sensitive_ancestors_owner_private": True,
    }


def _expect_hold(reason: str, fn) -> None:
    try:
        fn()
    except Hold as exc:
        if str(exc) != reason:
            raise AssertionError(f"expected {reason}, got {exc}") from exc
    else:
        raise AssertionError(f"expected HOLD {reason}")


def self_test() -> None:
    with tempfile.TemporaryDirectory(prefix="void-apollyon-key-metadata-v1-") as td:
        root = Path(td)
        home = root / "home"
        key_dir = home / DEFAULT_RELATIVE_PATH.parent
        key_dir.mkdir(parents=True, mode=0o700)

        for path in (
            home,
            home / ".local",
            home / ".local/share",
            key_dir,
        ):
            os.chmod(path, 0o700)

        target = home / DEFAULT_RELATIVE_PATH
        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        try:
            os.write(fd, b"fixture-encrypted-container-metadata-only\n")
        finally:
            os.close(fd)

        result = inspect_container(target, home=home)
        assert result["target_regular"] is True
        assert result["target_mode"] == 0o600
        assert result["target_links"] == 1

        os.chmod(target, 0o640)
        _expect_hold("target_mode_not_600", lambda: inspect_container(target, home=home))
        os.chmod(target, 0o600)

        sibling = key_dir / "hardlink-fixture.pem"
        os.link(target, sibling)
        _expect_hold("target_link_count_not_1", lambda: inspect_container(target, home=home))
        sibling.unlink()

        real = key_dir / "real-fixture.pem"
        target.rename(real)
        target.symlink_to(real.name)
        _expect_hold("target_not_direct_regular", lambda: inspect_container(target, home=home))
        target.unlink()
        real.rename(target)

        os.chmod(key_dir, 0o750)
        _expect_hold(
            "sensitive_ancestor_not_owner_private",
            lambda: inspect_container(target, home=home),
        )
        os.chmod(key_dir, 0o700)

        outside = root / "outside.pem"
        outside.write_bytes(b"fixture\n")
        os.chmod(outside, 0o600)
        _expect_hold("target_outside_home", lambda: inspect_container(outside, home=home))

    print(f"{MARKER}_SELF_TEST=GREEN")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--path",
        default=os.fspath(Path.home() / DEFAULT_RELATIVE_PATH),
        help="owner-key container path; contents are never opened or read",
    )
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0

    print(MARKER)
    print("read_only=true")
    print("source_mutation=false")
    print("runtime_mutation=false")
    print("remote_contact=false")
    print("private_key_content_access=false")
    print("private_key_hashing=false")
    print("private_key_decryption=false")
    print("signing=false")
    print("attempt_claim=false")
    print("generation=false")

    try:
        result = inspect_container(Path(os.path.expanduser(args.path)))
    except Hold as exc:
        print(f"HOLD={exc}")
        print(f"{MARKER}=HOLD")
        return 2

    print(f"target_within_home={str(result['target_within_home']).lower()}")
    print(f"target_regular={str(result['target_regular']).lower()}")
    print(f"target_symlink={str(result['target_symlink']).lower()}")
    print(f"target_mode={int(result['target_mode']):03o}")
    print(f"target_uid={result['target_uid']}")
    print(f"target_gid={result['target_gid']}")
    print(f"target_size={result['target_size']}")
    print(f"target_links={result['target_links']}")
    print(f"ancestor_count={result['ancestor_count']}")
    print(
        "sensitive_ancestors_owner_private="
        f"{str(result['sensitive_ancestors_owner_private']).lower()}"
    )
    print("cryptographic_correspondence_proven=false")
    print("signer_capability_proven=false")
    print(f"{MARKER}=GREEN")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
