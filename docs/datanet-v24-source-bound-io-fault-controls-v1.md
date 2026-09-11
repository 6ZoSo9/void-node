# DataNet V24 source-bound I/O fault controls v1

This lane is stacked on accepted Draft evidence head `5efbef576395d4d35b125b9d822068fccea13499` from #1489. It does not alter that accepted publisher or the 27-lifetime / peak-9 campaign.

## Binding

Darwin V24 review `5172606312` requires the exact twelve controls below, independently for read and write:

- short positive return;
- zero before the exact end;
- `EINTR`;
- duplicate offset;
- discontinuous offset;
- max+1 offset.

Every control must HOLD after one injected fault event, retry zero times, and reach no payload allocation, `fallocate`, link, rename, unlink, publication, or availability terminal. Controls rejected before real dispatch must produce zero real destination data syscalls.

The accepted predecessor publisher is source-bound by Git blob `7c4d708ddee16c48fb276540e99defed02fec931`. The new bounded engine is source-bound by Git blob `3a1d459e3854c8a0d138d0d12410daf09ffa3411`; the one-control harness is bound by `d0abafe19c4115a93ae9748ce3484129166b23d2`.

## Engine contract

`scripts/datanet_v24_bounded_payload_io_v1.mjs` owns the finite positioned-I/O schedule. For a 64 MiB payload and 65,536-byte block size it emits exactly 1,024 non-EOF operations. Read mode may append exactly one one-byte EOF probe at offset 67,108,864.

The adapter has two bounded seams:

1. `plan(operation)` runs before dispatch and is where duplicate, discontinuous and max+1 offsets are injected. The engine validates the candidate offset before dispatch.
2. `dispatch(operation, realDispatch)` is where short-positive, zero-before-end and `EINTR` are injected. The injected control never calls `realDispatch`.

There is no retry loop. A non-full non-EOF result or `EINTR` becomes HOLD immediately.

## Positive proof

`scripts/prove_datanet_v24_bounded_payload_io_positive_v1.mjs` executes the same engine without an injected adapter against a regular 64 MiB test file. It requires:

- write: 1,024 calls, 67,108,864 requested/completed bytes;
- read: 1,025 calls, 67,108,865 requested bytes, 67,108,864 returned bytes, one EOF probe;
- zero retries;
- byte hash equality across write/read.

This positive proof checks the engine itself. It is not a replacement for the ext4 anonymous-inode publication campaign.

## External observation

`scripts/prove_datanet_v24_source_bound_io_fault_controls_v1.py` runs all twelve controls as separate Node children under `strace -f -yy`. A poisoned 64 MiB sentinel path is supplied as the real destination that would be touched if the adapter ever reached real dispatch.

For every control the proof requires:

- exit 73 and one canonical HOLD record;
- exactly one injected fault event;
- zero retry;
- zero real dispatch and zero real destination opens;
- no traced syscall mentioning the sentinel destination;
- no traced `fallocate`, link, rename or unlink syscall;
- no `/usr/bin/fallocate` or `/usr/bin/ln` helper execution;
- unchanged sentinel identity, size and sampled bytes.

The Node 22/24/26 workflow fails closed if `strace` is absent. It does not install packages or downgrade to self-report.

## Deliberate non-acceptance state

This lane is preparatory. The accepted #1489 publisher still contains its original direct `fs.writeSync` / `fs.readSync` loops and does **not** import the new engine. Therefore the fixture and aggregate proof intentionally retain:

- `publisher_shared_engine_wired=false`;
- `source_bound_injected_fault_matrix_proved=false`.

The next step is to wire this exact engine into the admitted publisher, preserving the accepted #1489 publisher blob as predecessor provenance, then rerun both the twelve-control matrix and the full #1488/#1489 Node 22/24/26 regressions on one final descendant head. Only that descendant can claim the V24 source-bound injected fault matrix closed.

No Ready/merge, deployment, runtime/service mutation, credential/key/wallet/signer action, transaction, inventory/presale, treasury/liquidity, scheduler, cleanup or funds action is authorized by this lane.
