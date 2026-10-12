# DataNet V24 source-bound I/O fault controls v1

This descendant is stacked on accepted preparatory Draft evidence head `f23eb57b0f07c6e32c4997ed0cbb9a8a394efa94` from #1490. #1490 proved the bounded adapter seam across Node 22/24/26 while deliberately leaving the admitted publisher unwired. This generation wires that exact engine into the publisher; it does not alter the accepted 27-lifetime / peak-9 campaign topology or publication ordering.

## Binding

Darwin V24 review `5172606312` requires the exact twelve controls below, independently for read and write:

- short positive return;
- zero before the exact end;
- `EINTR`;
- duplicate offset;
- discontinuous offset;
- max+1 offset.

Every control must HOLD after one injected fault event, retry zero times, and reach no payload allocation, `fallocate`, link, rename, unlink, publication, or availability terminal. Controls rejected before real dispatch must produce zero real destination data syscalls.

The accepted predecessor publisher remains source-bound in Git history by blob `7c4d708ddee16c48fb276540e99defed02fec931` at predecessor commit `f23eb57b0f07c6e32c4997ed0cbb9a8a394efa94`. The wired publisher is bound by blob `4e1f116dfbbb7dfc4805ff50dfc75f84b2304caa`. The bounded engine remains blob `3a1d459e3854c8a0d138d0d12410daf09ffa3411`; the one-control harness remains `d0abafe19c4115a93ae9748ce3484129166b23d2`.

## Shared engine contract

`scripts/datanet_v24_bounded_payload_io_v1.mjs` owns the finite positioned-I/O schedule. For a 64 MiB payload and 65,536-byte block size it emits exactly 1,024 non-EOF operations. Read mode may append exactly one one-byte EOF probe at offset 67,108,864.

The adapter has two bounded seams:

1. `plan(operation)` runs before dispatch and is where duplicate, discontinuous and max+1 offsets are injected. The engine validates the candidate offset before dispatch.
2. `dispatch(operation, realDispatch)` is where short-positive, zero-before-end and `EINTR` are injected. The injected control never calls `realDispatch`.

There is no retry loop. A non-full non-EOF result or `EINTR` becomes HOLD immediately.

The admitted ext4 publisher now imports this exact module. `writePayload()` delegates its 1,024 positioned writes to the engine and `fullHashFd()` delegates its 1,024 positioned reads plus exact EOF probe to the same engine. Both functions retain their previous externally visible ledger shape. The source-bound proof rejects either function if its former direct `for (let offset = ...)` loop returns.

## Positive proof

`scripts/prove_datanet_v24_bounded_payload_io_positive_v1.mjs` executes the same engine without an injected adapter against a regular 64 MiB test file. It requires:

- write: 1,024 calls, 67,108,864 requested/completed bytes;
- read: 1,025 calls, 67,108,865 requested bytes, 67,108,864 returned bytes, one EOF probe;
- zero retries;
- byte hash equality across write/read.

This checks the shared engine itself. The inherited ext4 regressions separately prove the admitted publisher continues to satisfy anonymous-inode reservation, create-only publication, S0-before-S1 verification, helper census, same-PID exec admission handoff and the full 27-lifetime / peak-9 campaign.

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

The same proof also requires the accepted predecessor commit to be an ancestor, resolves its publisher blob from Git history, binds the wired publisher blob in the current tree, and statically confirms that both publisher payload functions use the exact bounded engine. The Node 22/24/26 workflow fails closed if `strace` is absent. It does not install packages or downgrade to self-report.

## Candidate acceptance state

The fixture and aggregate proof now require:

- `publisher_shared_engine_wired=true`;
- `source_bound_injected_fault_matrix_proved=true`.

Those booleans are candidate contract assertions, not acceptance by themselves. This descendant is accepted only when the V24 control matrix, inherited #1488 admitted-publication regression, inherited #1489 V31 27/9 campaign matrix, repository reference guard and broader CI are all green on the same final head. Until then the PR remains Draft and the V24 source-bound fault-control seam remains unaccepted.

No Ready/merge, deployment, runtime/service mutation, credential/key/wallet/signer action, transaction, inventory/presale, treasury/liquidity, scheduler, cleanup or funds action is authorized by this lane.
