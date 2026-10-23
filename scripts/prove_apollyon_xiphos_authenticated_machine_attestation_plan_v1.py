#!/usr/bin/env python3
"""Source-only proof for authenticated Xiphos machine-attestation plan V1."""
from __future__ import annotations

import copy
import hashlib
import json
import os
from pathlib import Path
import stat
import sys

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "ops/security/apollyon-xiphos-authenticated-machine-attestation-plan-v1.json"
MARKER = "VOID_APOLLYON_XIPHOS_AUTHENTICATED_MACHINE_ATTESTATION_PLAN_V1_PROOF"
PARENT_HEAD = "d7c3145dd202a4a7c3914732c8a8920c33a904ef"
PLAN_ID = "voidapollyonxiphosattestplan1_b0449a1b41766da2fad19a248f5eec3c9c9287b87eede149f6ea2eab09f6bc15"
OBSERVED_DIGEST = "543902c4c208d749dbe2baa239e9cd010ac50eb8cde4db8eb8cd26f6e806f057"

PINS = {
    "ops/security/apollyon-xiphos-machine-id-provenance-hold-v2.json":
        "bd75e2606cb13beb3ba1c6f80f596e2729709c37",
    "scripts/prove_apollyon_xiphos_machine_id_provenance_hold_v2.py":
        "5a105aa167488e864b93c4490ddb58e99e70b784",
    "docs/security/apollyon-xiphos-machine-id-provenance-hold-v2.md":
        "f98a2a2dc14f16b760185ed1dcdc55c048e5ae74",
    ".github/workflows/apollyon-xiphos-machine-id-provenance-hold-v2.yml":
        "81d875cddd7771aab75e1b7e99cb19b897d498a9",
}

TRANSPORT_BINDING = {
    "remote_host_alias": "xiphos",
    "remote_endpoint": None,
    "remote_port": 22,
    "remote_user": None,
    "host_key_algorithm": "ssh-ed25519",
    "host_key_sha256": None,
    "known_hosts_path": None,
    "known_hosts_sha256": None,
    "client_key_algorithm": "ssh-ed25519",
    "client_identity_file_path": None,
    "client_public_key_sha256": None,
    "transport_identity_bound": False,
    "host_key_fingerprint_independently_authenticated": False,
}

TRANSPORT_REQUIREMENTS = {
    "openssh_binary_exact_path_required": True,
    "openssh_config_dev_null_required": True,
    "batch_mode_required": True,
    "identities_only_required": True,
    "identity_agent_disabled_required": True,
    "publickey_only_required": True,
    "preferred_authentications_publickey_only_required": True,
    "password_authentication_forbidden": True,
    "kbd_interactive_authentication_forbidden": True,
    "strict_host_key_checking_required": True,
    "host_key_alias_xiphos_required": True,
    "exact_numeric_remote_endpoint_source_bound_required": True,
    "fixed_remote_account_source_bound_required": True,
    "exact_client_identity_file_source_bound_required": True,
    "client_identity_parent_custody_required": True,
    "client_identity_file_mode_0600_required": True,
    "dedicated_user_known_hosts_required": True,
    "dedicated_known_hosts_exact_path_source_bound_required": True,
    "known_hosts_single_canonical_entry_required": True,
    "known_hosts_entry_exact_alias_ed25519_and_key_required": True,
    "known_hosts_key_matches_independently_authenticated_host_key_required": True,
    "host_key_independent_authentication_artifact_source_bound_required": True,
    "host_key_authentication_artifact_independent_of_attestation_transport_required": True,
    "host_key_sha256_raw_ssh_public_key_blob_required": True,
    "client_public_key_sha256_raw_ssh_public_key_blob_required": True,
    "known_hosts_sha256_exact_file_bytes_required": True,
    "remote_authorized_key_restrict_required": True,
    "remote_authorized_key_exact_client_public_key_required": True,
    "remote_authorized_key_exact_forced_command_required": True,
    "remote_authorized_key_environment_options_forbidden": True,
    "remote_authorized_keys_file_custody_required": True,
    "remote_forced_command_rejects_nonempty_original_command_required": True,
    "remote_sshd_permit_user_environment_no_required": True,
    "remote_sshd_permit_user_rc_no_required": True,
    "remote_sshd_accept_env_empty_required": True,
    "remote_account_shell_exact_root_owned_reviewed_required": True,
    "remote_system_sshrc_absent_or_exact_reviewed_required": True,
    "remote_forced_command_handler_root_owned_nonwritable_required": True,
    "known_hosts_parent_root_owned_nonwritable_required": True,
    "known_hosts_file_root_owned_readonly_required": True,
    "global_known_hosts_disabled_required": True,
    "update_host_keys_forbidden": True,
    "canonicalize_hostname_forbidden": True,
    "verify_host_key_dns_forbidden": True,
    "client_certificate_forbidden": True,
    "request_tty_forbidden": True,
    "clear_all_forwardings_required": True,
    "forward_agent_forbidden": True,
    "forward_x11_forbidden": True,
    "permit_local_command_forbidden": True,
    "control_master_forbidden": True,
    "proxy_command_forbidden": True,
    "proxy_jump_forbidden": True,
    "local_ssh_environment_minimal_required": True,
    "local_home_fixed_to_identity_parent_required": True,
    "connection_attempts": 1,
    "connect_timeout_ms": 4000,
    "operation_timeout_ms": 30000,
}

ATTESTATION_REQUIREMENTS = {
    "client_generated_csprng_challenge_required": True,
    "challenge_bytes": 32,
    "single_use_challenge_required": True,
    "challenge_echo_hash_binding_required": True,
    "fixed_remote_command_bytes_required": True,
    "remote_measurement_runtime_provenance_required": True,
    "remote_command_path_and_interpreter_caller_influence_forbidden": True,
    "caller_selected_remote_command_forbidden": True,
    "caller_selected_remote_path_forbidden": True,
    "machine_id_path_fixed": "/etc/machine-id",
    "machine_id_exact_lowercase_hex32_required": True,
    "raw_machine_id_response_forbidden": True,
    "raw_machine_id_never_transmitted_on_any_channel_required": True,
    "machine_id_sha256_response_required": True,
    "machine_id_digest_must_match_observed_digest": True,
    "descriptor_generation_stability_required": True,
    "canonical_single_json_frame_required": True,
    "canonical_single_request_frame_required": True,
    "request_eof_required": True,
    "request_closed_schema_and_canonical_json_required": True,
    "request_duplicate_keys_and_nonfinite_forbidden": True,
    "response_closed_schema_duplicate_keys_and_nonfinite_forbidden": True,
    "response_eof_required": True,
    "ssh_stderr_empty_required": True,
    "ssh_zero_exit_no_signal_required": True,
    "max_request_bytes": 256,
    "max_response_bytes": 4096,
    "response_replay_forbidden": True,
    "transport_policy_digest_bound_into_receipt_required": True,
    "host_key_digest_bound_into_receipt_required": True,
    "known_hosts_digest_bound_into_receipt_required": True,
    "client_public_key_digest_bound_into_receipt_required": True,
    "challenge_digest_bound_into_receipt_required": True,
}

AUTHORITY = (
    "attestation_execution_authorized",
    "authenticated_transport_attestation_present",
    "authenticated_xiphos_machine_identity_proven",
    "collector_machine_identity_prerequisite_satisfied_for_host_execution",
    "host_pass_authorized",
    "filesystem_mutation_authorized",
    "service_mutation_authorized",
    "training_execution_authorized",
    "credential_access_authorized",
    "private_key_access_authorized",
    "signing_authorized",
    "transaction_authorized",
    "funds_movement_authorized",
)

class Hold(Exception):
    pass

def need(ok: bool, reason: str) -> None:
    if not ok:
        raise Hold(reason)

def canonical(value: object) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"),
        ensure_ascii=True, allow_nan=False,
    ).encode("ascii")

def reject_constant(value: str):
    raise Hold("nonfinite_json_constant:" + value)

def reject_duplicate_pairs(pairs):
    out = {}
    for key, value in pairs:
        if key in out:
            raise Hold("duplicate_json_key:" + str(key))
        out[key] = value
    return out

def parse_json(raw: bytes) -> object:
    try:
        text = raw.decode("utf-8", "strict")
    except UnicodeError as exc:
        raise Hold("plan_utf8_invalid") from exc
    try:
        return json.loads(
            text,
            object_pairs_hook=reject_duplicate_pairs,
            parse_constant=reject_constant,
        )
    except Hold:
        raise
    except (ValueError, TypeError, RecursionError) as exc:
        raise Hold("plan_json_invalid") from exc

def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()

def read_regular(path: Path, maximum: int = 2 * 1024 * 1024) -> bytes:
    before = path.lstat()
    need(
        stat.S_ISREG(before.st_mode)
        and not stat.S_ISLNK(before.st_mode)
        and before.st_nlink == 1
        and 0 < before.st_size <= maximum,
        "file_metadata_invalid:" + str(path),
    )
    flags = os.O_RDONLY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    if hasattr(os, "O_NONBLOCK"):
        flags |= os.O_NONBLOCK
    fd = os.open(path, flags)
    try:
        opened = os.fstat(fd)
        attrs = (
            "st_dev", "st_ino", "st_mode", "st_uid", "st_gid",
            "st_nlink", "st_size", "st_mtime_ns", "st_ctime_ns",
        )
        need(
            all(getattr(before, k) == getattr(opened, k) for k in attrs),
            "file_generation_changed_on_open:" + str(path),
        )
        data = bytearray()
        while len(data) < opened.st_size:
            chunk = os.read(fd, min(65536, opened.st_size - len(data)))
            need(bool(chunk), "file_short_read:" + str(path))
            data.extend(chunk)
        need(os.read(fd, 1) == b"", "file_grew_during_read:" + str(path))
        after = os.fstat(fd)
    finally:
        os.close(fd)
    visible = path.lstat()
    need(
        all(
            getattr(opened, k) == getattr(after, k) == getattr(visible, k)
            for k in attrs
        ),
        "file_terminal_generation_changed:" + str(path),
    )
    return bytes(data)

def closed(value: object, keys, label: str) -> dict:
    need(type(value) is dict and set(value) == set(keys), label + "_shape_invalid")
    return value

def validate(value: object) -> dict:
    plan = closed(
        value,
        (
            "schema", "marker", "version", "repository", "parent",
            "transport_binding", "required_transport_contract",
            "required_attestation_contract", "authority", "next_gate",
            "plan_id",
        ),
        "plan",
    )
    need(
        plan["schema"]
        == "void_apollyon_xiphos_authenticated_machine_attestation_plan_v1"
        and plan["marker"]
        == "VOID_APOLLYON_XIPHOS_AUTHENTICATED_MACHINE_ATTESTATION_PLAN_V1"
        and type(plan["version"]) is int and plan["version"] == 1
        and plan["repository"] == "6ZoSo9/void-node",
        "schema_invalid",
    )

    parent = closed(
        plan["parent"],
        ("pr", "head", "provenance_hold_v2_blobs", "observed_machine_id_sha256"),
        "parent",
    )
    need(
        parent["pr"] == 3768
        and parent["head"] == PARENT_HEAD
        and parent["observed_machine_id_sha256"] == OBSERVED_DIGEST,
        "parent_lineage_invalid",
    )
    need(parent["provenance_hold_v2_blobs"] == PINS, "parent_blob_map_invalid")

    binding = closed(plan["transport_binding"], tuple(TRANSPORT_BINDING), "transport_binding")
    for key, expected in TRANSPORT_BINDING.items():
        need(binding[key] == expected and type(binding[key]) is type(expected),
             "transport_binding_invalid:" + key)

    transport = closed(
        plan["required_transport_contract"],
        tuple(TRANSPORT_REQUIREMENTS),
        "transport_contract",
    )
    for key, expected in TRANSPORT_REQUIREMENTS.items():
        need(transport[key] == expected and type(transport[key]) is type(expected),
             "transport_requirement_invalid:" + key)

    attestation = closed(
        plan["required_attestation_contract"],
        tuple(ATTESTATION_REQUIREMENTS),
        "attestation_contract",
    )
    for key, expected in ATTESTATION_REQUIREMENTS.items():
        need(attestation[key] == expected and type(attestation[key]) is type(expected),
             "attestation_requirement_invalid:" + key)

    authority = closed(plan["authority"], AUTHORITY, "authority")
    for key in AUTHORITY:
        need(authority[key] is False, "forbidden_authority:" + key)

    need(
        plan["next_gate"]
        == "INDEPENDENTLY_AUTHENTICATE_AND_SOURCE_BIND_XIPHOS_ED25519_HOST_KEY_KNOWN_HOSTS_CLIENT_IDENTITY_AND_ENDPOINT_THEN_SEPARATELY_AUTHORIZE_ATTESTATION_EXECUTION",
        "next_gate_invalid",
    )
    without_id = copy.deepcopy(plan)
    del without_id["plan_id"]
    expected_id = "voidapollyonxiphosattestplan1_" + hashlib.sha256(
        canonical(without_id)
    ).hexdigest()
    need(plan["plan_id"] == PLAN_ID == expected_id, "content_identity_invalid")
    return plan

def verify_parent_blobs() -> None:
    for rel, expected in PINS.items():
        need(git_blob(read_regular(ROOT / rel)) == expected,
             "parent_blob_mismatch:" + rel)

def changed(value):
    if value is None:
        return "unexpected"
    if type(value) is bool:
        return not value
    if type(value) is int:
        return value + 1
    if type(value) is str:
        return value + "-unexpected"
    raise Hold("unsupported_adversary_type")

def adversaries(plan: dict) -> int:
    rejected = 0

    def expect(bad: dict, reason: str, label: str) -> None:
        nonlocal rejected
        try:
            validate(bad)
        except Hold as exc:
            need(str(exc) == reason, "wrong_rejection_reason:" + label + ":" + str(exc))
        else:
            raise Hold("mutation_accepted:" + label)
        rejected += 1

    for key in TRANSPORT_BINDING:
        bad = copy.deepcopy(plan)
        bad["transport_binding"][key] = changed(bad["transport_binding"][key])
        expect(bad, "transport_binding_invalid:" + key, "transport_binding:" + key)

    for key in TRANSPORT_REQUIREMENTS:
        bad = copy.deepcopy(plan)
        bad["required_transport_contract"][key] = changed(
            bad["required_transport_contract"][key]
        )
        expect(bad, "transport_requirement_invalid:" + key, "transport:" + key)

    for key in ATTESTATION_REQUIREMENTS:
        bad = copy.deepcopy(plan)
        bad["required_attestation_contract"][key] = changed(
            bad["required_attestation_contract"][key]
        )
        expect(bad, "attestation_requirement_invalid:" + key, "attestation:" + key)

    for key in AUTHORITY:
        bad = copy.deepcopy(plan)
        bad["authority"][key] = True
        expect(bad, "forbidden_authority:" + key, "authority:" + key)

    bad = copy.deepcopy(plan)
    bad["parent"]["head"] = "0" * 40
    expect(bad, "parent_lineage_invalid", "parent_head")

    bad = copy.deepcopy(plan)
    bad["parent"]["observed_machine_id_sha256"] = "0" * 64
    expect(bad, "parent_lineage_invalid", "observed_digest")

    bad = copy.deepcopy(plan)
    first = next(iter(PINS))
    bad["parent"]["provenance_hold_v2_blobs"][first] = "0" * 40
    expect(bad, "parent_blob_map_invalid", "parent_blob")

    bad = copy.deepcopy(plan)
    bad["plan_id"] = "voidapollyonxiphosattestplan1_" + "0" * 64
    expect(bad, "content_identity_invalid", "plan_id")

    duplicate = (
        '{"schema":"void_apollyon_xiphos_authenticated_machine_attestation_plan_v1",'
        '"authority":{"attestation_execution_authorized":true},'
        '"authority":{"attestation_execution_authorized":false}}'
    ).encode("utf-8")
    try:
        parse_json(duplicate)
    except Hold as exc:
        need(str(exc).startswith("duplicate_json_key:"), "duplicate_json_wrong_hold")
    else:
        raise Hold("duplicate_json_accepted")
    rejected += 1

    try:
        parse_json(b'{"x":NaN}')
    except Hold as exc:
        need(str(exc).startswith("nonfinite_json_constant:"), "nonfinite_json_wrong_hold")
    else:
        raise Hold("nonfinite_json_accepted")
    rejected += 1

    return rejected

def main() -> None:
    need(sys.argv[1:] in ([], ["--self-test"], ["--run"]), "mode_invalid")
    plan = validate(parse_json(read_regular(PLAN, 256 * 1024)))
    verify_parent_blobs()
    rejected = adversaries(plan)
    need(rejected == 123, "semantic_adversary_count_invalid")
    print(MARKER + "_GREEN")
    print("plan_id=" + PLAN_ID)
    print("source_only=true")
    print("observed_machine_id_sha256=" + OBSERVED_DIGEST)
    print("transport_identity_bound=false")
    print("host_key_fingerprint_independently_authenticated=false")
    print("exact_numeric_remote_endpoint_source_bound_required=true")
    print("exact_client_identity_file_source_bound_required=true")
    print("known_hosts_single_canonical_entry_required=true")
    print("known_hosts_key_matches_independently_authenticated_host_key_required=true")
    print("host_key_independent_authentication_artifact_source_bound_required=true")
    print("host_key_authentication_artifact_independent_of_attestation_transport_required=true")
    print("host_key_sha256_raw_ssh_public_key_blob_required=true")
    print("client_public_key_sha256_raw_ssh_public_key_blob_required=true")
    print("known_hosts_sha256_exact_file_bytes_required=true")
    print("remote_authorized_key_restrict_required=true")
    print("remote_authorized_key_exact_client_public_key_required=true")
    print("remote_authorized_key_exact_forced_command_required=true")
    print("remote_authorized_key_environment_options_forbidden=true")
    print("remote_authorized_keys_file_custody_required=true")
    print("remote_forced_command_rejects_nonempty_original_command_required=true")
    print("remote_sshd_permit_user_environment_no_required=true")
    print("remote_sshd_permit_user_rc_no_required=true")
    print("remote_sshd_accept_env_empty_required=true")
    print("remote_account_shell_exact_root_owned_reviewed_required=true")
    print("remote_system_sshrc_absent_or_exact_reviewed_required=true")
    print("remote_forced_command_handler_root_owned_nonwritable_required=true")
    print("remote_measurement_runtime_provenance_required=true")
    print("attestation_execution_authorized=false")
    print("authenticated_transport_attestation_present=false")
    print("authenticated_xiphos_machine_identity_proven=false")
    print("collector_machine_identity_prerequisite_satisfied_for_host_execution=false")
    print("host_pass_authorized=false")
    print("challenge_bytes=32")
    print("max_request_bytes=256")
    print("max_response_bytes=4096")
    print("strict_host_key_checking_required=true")
    print("raw_machine_id_response_forbidden=true")
    print("raw_machine_id_never_transmitted_on_any_channel_required=true")
    print("canonical_single_request_frame_required=true")
    print("request_eof_required=true")
    print("request_closed_schema_and_canonical_json_required=true")
    print("request_duplicate_keys_and_nonfinite_forbidden=true")
    print("response_closed_schema_duplicate_keys_and_nonfinite_forbidden=true")
    print("parent_blob_validation=true")
    print("semantic_adversaries=" + str(rejected))
    print("training_execution_authorized=false")
    print("funds_movement_authorized=false")
    print("next_gate=INDEPENDENTLY_AUTHENTICATE_AND_SOURCE_BIND_XIPHOS_ED25519_HOST_KEY_KNOWN_HOSTS_CLIENT_IDENTITY_AND_ENDPOINT_THEN_SEPARATELY_AUTHORIZE_ATTESTATION_EXECUTION")

if __name__ == "__main__":
    try:
        main()
    except (Hold, OSError, ValueError, TypeError, UnicodeError, RecursionError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc)[:220])
        print("attestation_execution_authorized=false")
        print("authenticated_xiphos_machine_identity_proven=false")
        print("host_pass_authorized=false")
        print("training_execution_authorized=false")
        print("funds_movement_authorized=false")
        raise SystemExit(2)
