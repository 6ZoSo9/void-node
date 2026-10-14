#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/public/void_public_earn_legacy_cutover_census_v1.py"

spec = importlib.util.spec_from_file_location("void_public_earn_legacy_cutover_census_v1", TARGET)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

module.self_test()

assert module.EXPECTED_HOSTNAME == "zoso-Precision-Tower-7810"
assert module.GATEWAY_UNIT == "void-public-earn-gateway-v1.service"
assert module.TUNNEL_UNIT == "void-public-seed-named-tunnel-v1.service"
assert module.LEGACY_SHARED_PORT == 4122
assert module.EXPECTED_GATEWAY_SOURCE_BLOB == "140796d809a13171f0186a226bade1b4d82f406d"

source = TARGET.read_text(encoding="utf-8")
for required in [
    "legacy_cutover_required",
    "mutation_route_removal_required",
    "status_route_preservation_required",
    "running_source_matches_ready_2993",
    "safe_to_stage_system_gateway_on_4122_while_legacy_running",
    "hostname_matches_precision",
    "ordinary_user_observer",
    "effective_user_is_zoso",
    "live_cutover_authorized",
]:
    assert required in source, required

for forbidden in [
    "systemctl --user restart",
    "systemctl --user stop",
    "systemctl --user start",
    "systemctl --user enable",
    "systemctl --user disable",
    "cloudflared tunnel route",
    "credentials-file=",
]:
    assert forbidden not in source, forbidden

print("VOID_PUBLIC_EARN_LEGACY_CUTOVER_CENSUS_V1_PROOF_GREEN")
print("legacy_gateway_and_tunnel_read_only=true")
print("process_generation_stability_required=true")
print("tunnel_credential_path_output=false")
print("process_environment_output=false")
print("live_cutover_authorized=false")
