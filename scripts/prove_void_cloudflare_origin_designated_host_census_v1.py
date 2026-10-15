#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import os
import pathlib
import re
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/public/void_cloudflare_origin_designated_host_census_v1.py"

spec = importlib.util.spec_from_file_location(
    "void_cloudflare_origin_designated_host_census_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

module.self_test()

assert module.EXPECTED_HOSTNAME == "zoso-Precision-Tower-7810"
assert module.EXPECTED_USER == "zoso"
assert module.PUBLIC_HOSTNAME == "seed.nullfeed.org"
assert module.SYSTEM_UNITS == {
    "cloudflared": "void-public-seed-named-tunnel-v1.service",
    "adapter": "void-cloudflare-origin-proxy-v2-adapter-v1.service",
    "dispatcher": "void-public-443-proxy-v2-dispatch-v1.service",
}
assert module.SENSITIVE_PATHS == (
    "/__void/agents/paid-work/credential-requests/v1",
    "/wc/public-earning-pilot-v1/claim-ticket",
    "/wc/public-earning-pilot-v1/submit-result",
)

for role, row in module.SOURCE_BLOBS.items():
    assert re.fullmatch(r"[0-9a-f]{40}", row["git_blob_sha1"]), role
    path = ROOT / row["path"]
    data = path.read_bytes()
    assert module.git_blob_sha1(data) == row["git_blob_sha1"], role

status = module.parse_proc_status(
    "Uid:\t991 991 991 991\n"
    "Gid:\t991 991 991 991\n"
    "CapInh:\t0000000000000000\n"
    "CapPrm:\t0000000000000000\n"
    "CapEff:\t0000000000000000\n"
    "CapBnd:\t0000000000000000\n"
    "CapAmb:\t0000000000000000\n"
    "NoNewPrivs:\t1\n"
)
assert status["all_capability_sets_empty"] is True

fake_retired = module.classify_historical_user_tunnel_query(
    0,
    {
        "LoadState": "loaded",
        "ActiveState": "inactive",
        "SubState": "dead",
        "MainPID": "0",
        "UnitFileState": "disabled",
    },
)
assert fake_retired["query_observed"] is True
assert fake_retired["reported_active_running"] is False
assert fake_retired["query_authenticated"] is False
assert fake_retired["retired_candidate_observed"] is False
assert fake_retired["retirement_verified"] is False
assert fake_retired["authority"] == "untrusted_user_bus_shape_only"
for key in (
    "capabilities_effective_empty",
    "capabilities_permitted_empty",
    "capabilities_inheritable_empty",
    "capabilities_ambient_empty",
    "capabilities_bounding_empty",
):
    assert status[key] is True, key

for cap_name, field in (
    ("CapEff", "capabilities_effective_empty"),
    ("CapPrm", "capabilities_permitted_empty"),
    ("CapInh", "capabilities_inheritable_empty"),
    ("CapAmb", "capabilities_ambient_empty"),
    ("CapBnd", "capabilities_bounding_empty"),
):
    rows = {
        "CapEff": "0000000000000000",
        "CapPrm": "0000000000000000",
        "CapInh": "0000000000000000",
        "CapAmb": "0000000000000000",
        "CapBnd": "0000000000000000",
    }
    rows[cap_name] = "0000000000000080"
    parsed = module.parse_proc_status(
        "Uid:\t991 991 991 991\n"
        "Gid:\t991 991 991 991\n"
        + "".join(f"{key}:\t{value}\n" for key, value in rows.items())
        + "NoNewPrivs:\t1\n"
    )
    assert parsed[field] is False, cap_name
    assert parsed["all_capability_sets_empty"] is False, cap_name

shared_rows = module.parse_ss(
    'LISTEN 0 511 127.0.0.1:4311 0.0.0.0:* users:(("node",pid=123,fd=20),("other",pid=124,fd=21))\n'
)
shared_listener = module.listener_set(shared_rows, 123)
assert shared_listener["exclusive_process_owner"] is False
assert shared_listener["additional_process_owner_observed"] is True
assert shared_listener["exact_single_ipv4_loopback_listener"] is False
assert shared_listener["listener_port"] is None

config_text = (
    "tunnel: not-emitted\n"
    "credentials-file: /run/void-cloudflared/private/credentials.json\n"
    "ingress:\n"
    "  - hostname: seed.nullfeed.org\n"
    "    path: ^/__void/agents/paid-work/credential-requests/v1$\n"
    "    service: http://127.0.0.1:4311\n"
    "    originRequest:\n"
    "      httpHostHeader: seed.nullfeed.org\n"
    "      disableChunkedEncoding: true\n"
    "  - hostname: seed.nullfeed.org\n"
    "    path: ^/wc/public-earning-pilot-v1/claim-ticket$\n"
    "    service: http://127.0.0.1:4311\n"
    "    originRequest:\n"
    "      httpHostHeader: seed.nullfeed.org\n"
    "      disableChunkedEncoding: true\n"
    "  - hostname: seed.nullfeed.org\n"
    "    path: ^/wc/public-earning-pilot-v1/submit-result$\n"
    "    service: http://127.0.0.1:4311\n"
    "    originRequest:\n"
    "      httpHostHeader: seed.nullfeed.org\n"
    "      disableChunkedEncoding: true\n"
    "  - hostname: seed.nullfeed.org\n"
    "    service: http://127.0.0.1:8083\n"
)
config = module.parse_tunnel_config(config_text)
assert config["sensitive_route_shape_observed"] is True
assert module.canonical_sensitive_path(module.SENSITIVE_PATHS[0]) is None
assert (
    module.canonical_sensitive_path("^" + module.SENSITIVE_PATHS[0] + "$")
    == module.SENSITIVE_PATHS[0]
)
unanchored_config = module.parse_tunnel_config(
    config_text.replace(
        "^/__void/agents/paid-work/credential-requests/v1$",
        "/__void/agents/paid-work/credential-requests/v1",
    )
)
assert unanchored_config["sensitive_route_shape_observed"] is False
assert config["sensitive_adapter_port"] == 4311
assert config["ordinary_routes_preserved_candidate"] is True
extra_adapter = module.parse_tunnel_config(
    config_text.replace(
        "    service: http://127.0.0.1:8083\n",
        "    service: http://127.0.0.1:4311\n",
    )
)
assert extra_adapter["sensitive_route_shape_observed"] is False
assert extra_adapter["extra_adapter_seed_rule_observed"] is True
assert extra_adapter["ordinary_routes_preserved_candidate"] is False

def fixture_config(credential_path: pathlib.Path) -> str:
    return config_text.replace(
        "/run/void-cloudflared/private/credentials.json",
        str(credential_path),
    )

with tempfile.TemporaryDirectory(
    prefix="void-cloudflare-origin-census-proof-",
) as tmp:
    root = pathlib.Path(tmp)
    os.chmod(root, 0o700)
    owner_uid = os.getuid()
    credential = root / "credentials.json"
    credential.write_text('{"opaque":"metadata-only"}\n', encoding="utf-8")
    os.chmod(credential, 0o600)
    config_path = root / "config.yml"
    config_path.write_text(fixture_config(credential), encoding="utf-8")
    os.chmod(config_path, 0o600)

    snapshot = module.tunnel_config_snapshot(config_path, owner_uid)
    assert snapshot["config_generation_stable"] is True
    assert snapshot["config_custody"]["generation_stable"] is True
    assert snapshot["config_custody"]["custody_shape_observed"] is True
    assert snapshot["config_custody"]["contents_read"] is True
    assert snapshot["credentials_custody"]["generation_stable"] is True
    assert snapshot["credentials_custody"]["custody_shape_observed"] is True
    assert snapshot["credentials_custody"]["metadata_descriptor_only"] is True
    assert snapshot["credentials_custody"]["contents_read"] is False
    assert snapshot["credential_contents_read"] is False

    credential_link = root / "credentials-link.json"
    credential_link.symlink_to(credential)
    symlink_config = root / "symlink-config.yml"
    symlink_config.write_text(fixture_config(credential_link), encoding="utf-8")
    os.chmod(symlink_config, 0o600)
    symlink_snapshot = module.tunnel_config_snapshot(
        symlink_config,
        owner_uid,
    )
    assert symlink_snapshot["config_generation_stable"] is True
    assert symlink_snapshot["credentials_custody"]["generation_stable"] is False
    assert symlink_snapshot["credentials_custody"]["custody_shape_observed"] is False
    assert symlink_snapshot["credential_contents_read"] is False

    swap_config = root / "swap-config.yml"
    swap_replacement = root / "swap-replacement.yml"
    swap_config.write_text(fixture_config(credential), encoding="utf-8")
    swap_replacement.write_text(
        fixture_config(credential).replace(
            "http://127.0.0.1:8083",
            "http://127.0.0.1:8084",
        ),
        encoding="utf-8",
    )
    os.chmod(swap_config, 0o600)
    os.chmod(swap_replacement, 0o600)
    real_open = module.os.open
    state = {"swapped": False}

    def adversarial_open(path_value, flags, *args, **kwargs):
        if (
            not state["swapped"]
            and path_value == swap_config.name
            and kwargs.get("dir_fd") is not None
        ):
            swap_replacement.replace(swap_config)
            state["swapped"] = True
        return real_open(path_value, flags, *args, **kwargs)

    module.os.open = adversarial_open
    try:
        _data, swapped_custody = module.descriptor_bound_file_custody(
            swap_config,
            owner_uid,
            maximum=module.MAX_CONFIG_BYTES,
            read_contents=True,
        )
    finally:
        module.os.open = real_open
    assert state["swapped"] is True
    assert swapped_custody["generation_stable"] is False
    assert swapped_custody["custody_shape_observed"] is False

source = TARGET.read_text(encoding="utf-8")
for required in (
    "CapEff",
    "CapPrm",
    "CapInh",
    "CapAmb",
    "CapBnd",
    "all_capability_sets_empty",
    "retained_descriptor_generation_stable",
    "root_owned_nonwritable_source",
    "historical_user_tunnel_snapshot",
    "classify_historical_user_tunnel_query",
    "untrusted_user_bus_shape_only",
    "query_authenticated",
    "retirement_verified",
    "UnitFileState",
    "retired_candidate_observed",
    "systemd_capability_bounding_set_empty",
    "systemd_ambient_capabilities_empty",
    "extra_adapter_seed_rule_observed",
    "process_environment_access",
    "cloudflared_process_command_line_access",
    "node_runtime_command_line_access",
    "operator_tunnel_config_path",
    "credential_content_access",
    "sensitive_route_shape_observed",
    "config_generation_stable",
    "read_regular_descriptor_bound",
    "descriptor_bound_file_custody",
    "metadata_descriptor_only",
    "same_file_stat",
    "same_directory_stat",
    "ordinary_routes_preserved_candidate",
    "listener_process_pids",
    "exclusive_process_owner",
    "additional_process_owner_observed",
    "adapter_route_matches_listener",
    "exact_ruleset_verified",
    "cloudflare_worker_route_absence_proven",
    "pseudo_ipv4_mode_off_proven",
    "adapter_dispatcher_target_verified",
    "local_transport_trust_proven",
    "external_acceptance",
):
    assert required in source, required

for forbidden in (
    "/environ",
    "eth_sendRawTransaction",
    "BEGIN PRIVATE KEY",
    "seed_phrase",
    "mnemonic",
    "systemctl restart",
    "systemctl start",
    "systemctl stop",
    "systemctl enable",
    "systemctl disable",
    "daemon-reload",
    "nft add",
    "nft insert",
    "nft delete",
    "cloudflared tunnel route dns",
):
    assert forbidden not in source, forbidden

print("VOID_CLOUDFLARE_ORIGIN_DESIGNATED_HOST_CENSUS_V1_PROOF_GREEN")
print("all_five_linux_capability_sets_observed=true")
print("process_environment_access=false")
print("cloudflared_process_command_line_access=false")
print("operator_tunnel_config_path_required=true")
print("raw_process_command_line_output=false")
print("credential_contents_read=false")
print("historical_user_tunnel_read_only_query=true")
print("historical_user_tunnel_query_authenticated=false")
print("historical_user_tunnel_retirement_verified=false")
print("fake_user_bus_retirement_cannot_promote=true")
print("system_service_generation_binding=true")
print("systemd_capability_bounds_observed=true")
print("extra_sensitive_adapter_route_rejected=true")
print("unanchored_sensitive_path_rejected=true")
print("adapter_dispatcher_source_blob_binding=true")
print("running_source_retained_descriptor_binding=true")
print("running_source_root_custody_required=true")
print("loopback_listener_ownership_observed=true")
print("shared_listener_process_rejected=true")
print("tunnel_private_metadata_custody_observed=true")
print("tunnel_config_retained_descriptor_binding=true")
print("tunnel_config_custody_same_generation=true")
print("tunnel_config_path_swap_rejected=true")
print("credential_metadata_descriptor_binding=true")
print("credential_symlink_rejected=true")
print("nftables_raw_json_output=false")
print("nftables_exact_ruleset_verified=false")
print("cloudflare_control_plane_evidence_external=true")
print("live_acceptance_claimed=false")
