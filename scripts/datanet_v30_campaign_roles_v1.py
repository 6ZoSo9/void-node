#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import argparse
import json
import os
import stat

from datanet_v30_campaign_common_v1 import *

def contender_mode(ns: argparse.Namespace) -> int:
    fixture = load_fixture()
    assert_admission_source(fixture)
    binding = parse_binding(ns)
    root_fd = lock_fd = -1
    locked = False
    try:
        root_fd, lock_fd = admission.open_bound(ns.root, binding)
        os.write(ns.ready_fd, b"R")
        assert os.read(ns.start_fd, 1) == b"G", "race start token missing"
        got = admission.acquire(lock_fd)
        if not got:
            os.write(ns.event_fd, (json.dumps({"pid": os.getpid(), "status": "busy"}, separators=(",", ":")) + "\n").encode())
            return 0
        locked = True
        admission.revalidate(root_fd, lock_fd, binding)
        os.write(ns.event_fd, (json.dumps({"pid": os.getpid(), "status": "acquired"}, separators=(",", ":")) + "\n").encode())
        assert os.read(ns.gate_fd, 1) == b"G", "winner gate token missing"

        prior = None
        if ns.slot == 1:
            prior = reduce_s0_only(root_fd, binding, fixture)
            assert prior["decision"] == "AUTHORIZE_H1"
            admission.revalidate(root_fd, lock_fd, binding)

        # All race/control descriptors except the publication hold are retired before exec.
        for fd in (ns.ready_fd, ns.start_fd, ns.event_fd, ns.gate_fd):
            close_quiet(fd)
        close_quiet(root_fd)
        root_fd = -1
        exec_publication(ns.root, binding, fixture, ns.slot, lock_fd, ns.hold_fd, prior)
        return 99
    finally:
        if locked and lock_fd >= 0:
            try:
                admission.unlock(lock_fd)
            except OSError:
                pass
        close_quiet(lock_fd)
        close_quiet(root_fd)


def publisher_mode(ns: argparse.Namespace) -> int:
    fixture = load_fixture()
    assert_admission_source(fixture)
    binding = parse_binding(ns)
    root_fd = lock_fd = -1
    locked = False
    try:
        root_fd, lock_fd = admission.open_bound(ns.root, binding)
        assert admission.acquire(lock_fd), "R0 H0 publisher capability unexpectedly busy"
        locked = True
        admission.revalidate(root_fd, lock_fd, binding)
        close_quiet(root_fd)
        root_fd = -1
        exec_publication(ns.root, binding, fixture, 0, lock_fd, ns.hold_fd, None)
        return 99
    finally:
        if locked and lock_fd >= 0:
            try:
                admission.unlock(lock_fd)
            except OSError:
                pass
        close_quiet(lock_fd)
        close_quiet(root_fd)


def classifier_mode(ns: argparse.Namespace) -> int:
    fixture = load_fixture()
    assert_admission_source(fixture)
    binding = parse_binding(ns)
    root_fd = open_root_readonly(ns.root, binding.root_identity)
    try:
        result = reduce_s0_only(root_fd, binding, fixture)
    finally:
        os.close(root_fd)
    emit({"marker": CLASSIFIER_MARKER, "status": "GREEN", "pid": os.getpid(), **result})
    return 0


def collector_mode(ns: argparse.Namespace) -> int:
    fixture = load_fixture()
    assert_admission_source(fixture)
    binding = parse_binding(ns)
    root_fd, lock_fd = admission.open_bound(ns.root, binding)
    try:
        assert admission.acquire(lock_fd) is False, "checkpoint collector unexpectedly acquired held capability"
        expected = sorted([cap_name(binding.k), slot_name(binding.k, 0)])
        assert sorted(os.listdir(root_fd)) == expected
        visible = os.stat(slot_name(binding.k, 0), dir_fd=root_fd, follow_symlinks=False)
        assert stat.S_ISREG(visible.st_mode)
        assert identity(visible) == ns.expected_s0_identity
        assert visible.st_uid == os.getuid()
        assert visible.st_nlink == 1
        assert stat.S_IMODE(visible.st_mode) == 0o600
        assert visible.st_size == fixture["payload_bytes"]
        assert visible.st_blocks * 512 >= fixture["payload_bytes"]
        emit({
            "marker": COLLECTOR_MARKER,
            "status": "GREEN",
            "pid": os.getpid(),
            "root_identity": binding.root_identity,
            "s0_identity": identity(visible),
            "capability_busy": True,
            "s1_absent": slot_name(binding.k, 1) not in os.listdir(root_fd),
            "payload_reread_performed": False,
            "source_receipt_hash_required_by_parent": True,
        })
        return 0
    finally:
        os.close(lock_fd)
        os.close(root_fd)
