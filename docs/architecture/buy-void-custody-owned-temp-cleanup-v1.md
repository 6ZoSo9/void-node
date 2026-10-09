# Buy VOID custody high-water temp ownership repair

## Source-only scope

This proposal is a **Draft successor to [#2712](https://github.com/6ZoSo9/void-node/pull/2712)**,
which preserved [#2711](https://github.com/6ZoSo9/void-node/pull/2711)'s
read-only inspector and fixed path-free descriptor-close diagnostics.
The writer remains unmounted, with no authority to use real customer funds,
payments or custody records.

An [independent P2 review](https://github.com/6ZoSo9/void-node/pull/2712#pullrequestreview-5469749734)
found that `atomicAdvance()` could delete a private temporary high-water
file belonging to **another writer**. The old code opened a randomized name
with `O_CREAT | O_EXCL | O_NOFOLLOW` but unconditionally entered
`if (!renamed) { unlinkSync(tempPath) }` even if `openSync` failed.
A rare `EEXIST` collision, or an attempted substitution under an
untrusted writer namespace, could remove a file that this attempt never owned.

## Narrow change

The writer now initializes `tempCreated=false`. Only a *successfully returned*
`O_EXCL` file descriptor transitions it to `true`. The failed-attempt
unlink and cleanup directory fsync require **both** `tempCreated===true`
and `renamed===false`.

This deliberately preserves failure/recovery semantics:
- An existing temp on failed `O_EXCL` survives byte-for-byte; it is never
  unlinked or fsynced by this failed attempt.
- If exclusive creation succeeds but the attempt then fails before rename,
  exactly its own temporary file is removed, with the directory fsynced.
- An already renamed current high-water file remains never-unlinked.
- Original `inspect()` still performs no broad cleanup of other writers'
  in-flight or stale temporary files.
- FD-close failures still emit the fixed path-free diagnostics from #2712.

Only the changed exact writer Git blob is repinned in the three inherited
unchanged semantic proofs. Historical manifests and high-water record
identities are not rewritten.

## Inert negative and positive proof

`scripts/prove_buy_void_custody_owned_temp_cleanup_v1.mjs` first binds the
exact source Git blob and **extracts the actual `atomicAdvance()` function**.
It creates an isolated private `os.tmpdir()` directory and a deterministic
candidate temp pathname, using a synthetic PID/nonce in the VM. It plants an
0600 file before the attempted create. The actual
`fs.openSync(O_EXCL|O_NOFOLLOW)` must fail `EEXIST`; the preexisting temp's
original bytes **and inode** must remain, with zero unlink and zero directory
fsync calls.

The test then frees the name, lets the actual function successfully
`O_EXCL`-create its own temp, and injects an inert `writeAll` fault. Cleanup
must remove exactly that owned file and fsync the parent directory. A
three-Node GitHub workflow reruns this proof on Node 22, 24, 26 and compares
their emitted receipts byte-for-byte. The parent custody inspect, writer,
and close-visibility proofs still run through their own unchanged workflow.

## Unresolved critical custody and launch gates

**This does not close the separate cross-process high-water monotonicity P1.**
Two legitimate advance writers might pass the same pre-rename check then
race the fixed-name `renameSync`, allowing rollback to an older generation.
The independently staged exclusive custody writer fence and authenticated
interprocess serialization must be integrated and tested before accepting
real updates. This repair is not permission to clean up orphan temps
owned by unknown writers.

```text
unowned_temp_cleanup_enabled=false
inspect_temp_cleanup_enabled=false
cross_process_exclusive_writer_fence_verified=false
runtime_integration=false
custody_reserve_method_enabled=false
custody_recover_method_enabled=false
production_allocation_mutation_ready=false
funds_movement=false
```

No Ready/merge/deploy, service, key/wallet/signer, real customer record,
payment, high-water update, allocation, chain transaction, Chain-2050/WC,
presale/market activation, inventory/treasury/liquidity or funds movement.

**PROTECT THE CORE.**
