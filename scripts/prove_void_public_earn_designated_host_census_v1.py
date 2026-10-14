#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/public/void_public_earn_designated_host_census_v1.py"

spec = importlib.util.spec_from_file_location("void_public_earn_designated_host_census_v1", TARGET)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

module.self_test()

assert module.EXPECTED_HOSTNAME == "zoso-Precision-Tower-7810"
assert module.TABLE_FAMILY == "inet"
assert module.TABLE_NAME == "void_public_earn_edge_v1"
assert module.UNITS == {
    "dispatcher": "void-public-443-proxy-v2-dispatch-v1.service",
    "earn_edge": "void-public-earn-proxy-v2-edge-v1.service",
    "gateway": "void-public-earn-gateway-v1.service",
}

for role, evidence in module.SOURCE_BLOBS.items():
    assert re.fullmatch(r"[0-9a-f]{40}", evidence["git_blob_sha1"]), role
    assert not pathlib.Path(evidence["path"]).is_absolute(), role
    source_path = ROOT / evidence["path"]
    data = source_path.read_bytes()
    assert module.git_blob_sha1(data) == evidence["git_blob_sha1"], role

checkout = module.reviewed_checkout_blobs()
assert checkout["all_match"] is True
assert all(
    row["matches_reviewed_blob"] is True
    for row in checkout["files"].values()
)

sample_time = module.datetime.now(module.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
assert re.fullmatch(r"\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z", sample_time)

source = TARGET.read_text(encoding="utf-8")
for required in [
    "process_environment_output_allowlisted_only",
    "nftables_ruleset_live_verified",
    "old_direct_publication_cutover_verified",
    "funnel_to_dispatcher_trust_proven",
    "local_transport_trust_proven",
    "live_host_acceptance_claimed",
    "VOID_PUBLIC_EARN_PROXY_V2_RATE_STATE_FILE",
    "VOID_EARN_MUTATION_DOWNSTREAM_PORT",
    "VOID_PUBLIC_443_EARN_EDGE_PORT",
]:
    assert required in source, required

for forbidden in [
    "cat /proc/",
    "print(environ",
    "BEGIN PRIVATE KEY",
    "seed_phrase=",
    "mnemonic=",
    "eth_sendRawTransaction",
]:
    assert forbidden not in source, forbidden

print("VOID_PUBLIC_EARN_DESIGNATED_HOST_CENSUS_V1_PROOF_GREEN")
print("canonical_service_units_bound=true")
print("reviewed_runtime_source_blobs_bound=true")
print("process_environment_output_allowlisted_only=true")
print("nftables_raw_output_printed=false")
print("rate_state_contents_read=false")
print("live_host_acceptance_claimed=false")
