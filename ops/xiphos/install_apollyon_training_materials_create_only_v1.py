#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
from pathlib import Path
import sys

MODULE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, os.fspath(MODULE_DIR))

from apollyon_training_materials_install_contract_v1 import (  # noqa: E402
    MARKER,
    TARGET_HOST,
    Hold,
    canonical,
)
from apollyon_training_materials_install_host_plan_v1 import build_plan  # noqa: E402
from apollyon_training_materials_install_apply_v1 import apply, self_test  # noqa: E402

def emit_hold(exc: BaseException) -> int:
    print("HOLD=" + str(exc), file=os.sys.stderr)
    print("filesystem_mutation=false", file=os.sys.stderr)
    print("daemon_reload=false", file=os.sys.stderr)
    print("service_enable=false", file=os.sys.stderr)
    print("service_start=false", file=os.sys.stderr)
    print("training_execution=false", file=os.sys.stderr)
    print("funds_movement=false", file=os.sys.stderr)
    return 2


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--apply", action="store_true")
    parser.add_argument("--expected-plan-id")
    parser.add_argument("--confirm-create-only-account-and-files", action="store_true")
    parser.add_argument("--ack-no-daemon-reload", action="store_true")
    parser.add_argument("--ack-service-remains-disabled-and-inactive", action="store_true")
    args = parser.parse_args()
    print(MARKER)
    print("target_host=" + TARGET_HOST)
    print("credential_access=false")
    print("wallet_or_signer_access=false")
    print("transaction=false")
    print("training_execution=false")
    print("funds_movement=false")
    try:
        if args.self_test:
            self_test()
            return 0
        if args.plan:
            if any(
                (
                    args.expected_plan_id,
                    args.confirm_create_only_account_and_files,
                    args.ack_no_daemon_reload,
                    args.ack_service_remains_disabled_and_inactive,
                )
            ):
                raise Hold("plan_rejects_apply_arguments")
            print("read_only=true")
            print("filesystem_mutation=false")
            print("daemon_reload=false")
            print("service_action=false")
            print(canonical(build_plan()))
            return 0
        if not args.expected_plan_id:
            raise Hold("apply_requires_expected_plan_id")
        if not args.confirm_create_only_account_and_files:
            raise Hold("apply_requires_create_only_confirmation")
        if not args.ack_no_daemon_reload:
            raise Hold("apply_requires_no_daemon_reload_acknowledgement")
        if not args.ack_service_remains_disabled_and_inactive:
            raise Hold("apply_requires_inert_service_acknowledgement")
        print("read_only=false")
        print("filesystem_mutation=true")
        print("daemon_reload=false")
        print("service_action=false")
        print(canonical(apply(args.expected_plan_id)))
        return 0
    except (Hold, OSError, KeyError, ValueError, TypeError) as exc:
        return emit_hold(exc)


if __name__ == "__main__":
    raise SystemExit(main())

