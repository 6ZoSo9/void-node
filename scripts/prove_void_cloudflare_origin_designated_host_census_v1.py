#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import pathlib
import re

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

config = module.parse_tunnel_config(
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
assert config["sensitive_route_shape_observed"] is True
assert config["sensitive_adapter_port"] == 4311
assert config["ordinary_routes_preserved_candidate"] is True

source = TARGET.read_text(encoding="utf-8")
for required in (
    "CapEff",
    "CapPrm",
    "CapInh",
    "CapAmb",
    "CapBnd",
    "all_capability_sets_empty",
    "historical_user_tunnel_snapshot",
    "process_environment_access",
    "process_command_line_access",
    "credential_content_access",
    "sensitive_route_shape_observed",
    "ordinary_routes_preserved_candidate",
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
print("raw_process_command_line_output=false")
print("credential_contents_read=false")
print("historical_user_tunnel_read_only_query=true")
print("system_service_generation_binding=true")
print("adapter_dispatcher_source_blob_binding=true")
print("loopback_listener_ownership_observed=true")
print("tunnel_private_metadata_custody_observed=true")
print("nftables_raw_json_output=false")
print("nftables_exact_ruleset_verified=false")
print("cloudflare_control_plane_evidence_external=true")
print("live_acceptance_claimed=false")
