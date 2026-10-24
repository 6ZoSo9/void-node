#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import pathlib
import types

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = (
    ROOT
    / "ops/precision/"
    "void_buy_void_epoch2_live_composition_policy_chain_rebind_v3.py"
)
EXPECTED_SOURCE_BLOB = "93fe1261dc3fdd7f44a6af94b224cde35c70af9d"
EXPECTED_V2_BLOB = "891cce24244c62756caeba6d2bf702cc92e8a956"


def git_blob_sha1(raw: bytes) -> str:
    import hashlib

    header = ("blob " + str(len(raw)) + "\0").encode("ascii")
    return hashlib.sha1(header + raw).hexdigest()


raw = SOURCE.read_bytes()
assert git_blob_sha1(raw) == EXPECTED_SOURCE_BLOB

spec = importlib.util.spec_from_file_location(
    "void_epoch2_policy_chain_rebind_v3",
    SOURCE,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.V2_BLOB == EXPECTED_V2_BLOB
assert module.IMMEDIATE_HEAD == "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
assert module.IMMEDIATE_POLICY_BYTES == 305
assert module.IMMEDIATE_POLICY_SHA256 == (
    "746cfbe2f031868fff3a75f8307986f25c62460085f41a4827e712702a2d6549"
)
assert module.IMMEDIATE_BACKUP_NAME.endswith("policy-predecessor-4c80887a")
assert module.STAGE_NAME.endswith("policy-chain-rebind-4c80887.stage")

v2 = module._load_v2()
v1, installer = module._load_installer(v2)
assert v2.ORIGINAL_HEAD == "65b4515b78e467afb399b510037e8c64256e87a5"
assert v2.PREVIOUS_HEAD == "b92ba19cf16ea5f147c441e15de12b9932ca94c3"
assert installer.NATIVE_BYTES == 726_976
assert installer.RUNNER_BYTES == 45_147

synthetic_node = {
    "sha256": "fde6a4bf8d0562f7751d1a2d6cb9b417c4cfe107bbcb0aa3e9a24e125e348f48",
    "bytes": 124_827_920,
}
immediate_policy = installer.build_policy(module.IMMEDIATE_HEAD, synthetic_node)
assert len(immediate_policy) == module.IMMEDIATE_POLICY_BYTES
assert module.sha256(immediate_policy) == module.IMMEDIATE_POLICY_SHA256

# Exercise the V3 state classifier without touching /opt.
fake_installer = types.SimpleNamespace(
    INSTALL_PARENT=pathlib.Path("/synthetic/opt"),
)
fake_installer._trusted_root_directory = lambda _path: None
new_policy = b"synthetic-new-policy"
calls: list[str] = []

orig_exists = module._exists
orig_prior = module._verify_prior_lineage
orig_immediate = module._verify_immediate_backup
orig_current = v2._verify_current_with_policy

present: set[str] = set()
try:
    module._exists = lambda path: pathlib.Path(path).name in present
    module._verify_prior_lineage = (
        lambda _v1, _v2, _installer: calls.append("prior")
    )
    module._verify_immediate_backup = (
        lambda _v2, _installer: calls.append("immediate_backup")
    )
    v2._verify_current_with_policy = (
        lambda _installer, policy: calls.append(
            "current_immediate"
            if policy == immediate_policy
            else "current_new"
        )
    )

    ready = module.protected_state(
        v1,
        v2,
        fake_installer,
        immediate_policy=immediate_policy,
        new_policy=new_policy,
    )
    assert ready == module.READY_STATE
    assert calls == ["prior", "current_immediate"]

    calls.clear()
    present.add(module.IMMEDIATE_BACKUP_NAME)
    green = module.protected_state(
        v1,
        v2,
        fake_installer,
        immediate_policy=immediate_policy,
        new_policy=new_policy,
    )
    assert green == module.GREEN_STATE
    assert calls == ["prior", "current_new", "immediate_backup"]

    calls.clear()
    present.add(module.STAGE_NAME)
    try:
        module.protected_state(
            v1,
            v2,
            fake_installer,
            immediate_policy=immediate_policy,
            new_policy=new_policy,
        )
    except module.RebindError as exc:
        assert str(exc) == "policy_chain_rebind_v3_stage_present"
    else:
        raise AssertionError("V3 stage presence must HOLD")
finally:
    module._exists = orig_exists
    module._verify_prior_lineage = orig_prior
    module._verify_immediate_backup = orig_immediate
    v2._verify_current_with_policy = orig_current

good = module._failure_receipt(
    failure_phase="policy_exchanged",
    policy_exchange_performed=True,
    rollback_attempted=True,
    rollback_green=True,
    final_state_verified=True,
    final_state=module.READY_STATE,
)
assert good["policy_publication_performed"] is True
assert good["automatic_rollback_green"] is True

try:
    module._failure_receipt(
        failure_phase="pre_exchange",
        policy_exchange_performed=True,
        rollback_attempted=False,
        rollback_green=None,
        final_state_verified=False,
        final_state="UNKNOWN",
    )
except module.RebindError:
    pass
else:
    raise AssertionError("pre-exchange phase cannot claim an exchange")

source_text = raw.decode("utf-8")
assert "credential_access=false" in source_text
assert "signing=false" in source_text
assert "transaction=false" in source_text
assert "rpc_call=false" in source_text
assert "public_presale_activation=false" in source_text
assert "funds_movement=false" in source_text
assert "policy-predecessor-4c80887a" in source_text
assert "policy-predecessor-b92ba19c" not in source_text or module.V2_BLOB in source_text

print("VOID_BUY_VOID_EPOCH2_V6R2_POLICY_CHAIN_REBIND_V3_PROOF_GREEN")
print("v3_source_blob_bound=true")
print("v2_dependency_blob_bound=true")
print("observed_4c80887_policy_derivation_green=true")
print("ready_state_requires_live_4c80887_policy=true")
print("green_state_requires_retained_4c80887_policy=true")
print("interrupted_v3_stage_holds=true")
print("publication_aware_failure_receipt=true")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("rpc_call_authorized=false")
print("public_presale_activation_authorized=false")
print("funds_movement_authorized=false")
