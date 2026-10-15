# Xiphos Apollyon build qualification v1

Marker: `VOID_XIPHOS_APOLLYON_BUILD_QUALIFICATION_V1`

Status: **source-only, read-only host-state qualifier with ephemeral temporary
builds; not an installer and not a trainer**.

## Purpose

The fixed Apollyon training service source and both reproducible executable
identities now exist in the active stack:

- merged bus-isolation unit and native pre-entry source;
- locked pre-entry ELF identity;
- Draft #2937 qualification entrypoint source;
- Draft #2939 entrypoint candidate derivation; and
- Draft #2947 entrypoint binary lock.

The remaining host question before a guarded installation can be designed is:

> Can Xiphos itself reproduce both locked ELF identities with its current
> compiler, can its current systemd parser accept the reviewed unit, and is the
> intended CUDA device free of foreign compute?

This lane answers only that question.

## Exact stack

```text
entrypoint source head=d790d2c273df8152d9077a42850fb82b88ab6bf1
entrypoint candidate head=f688bba3268bfeb9b9aae4d712c0ca24532883cb
entrypoint lock head=08b6a0658be6c2212c7de6b3d250e691ae60e288
entrypoint lock ID=
apollyon_candidate_training_entrypoint_binary_lock_v1:f63b6018e752ec685ed427a1badacae1799896f859dea8bb447a6fc271fd8a7a
```

Reviewed identities:

```text
unit Git blob:
62fbabe1cf7ae0d940f5d96e19b06282f841267b

pre-entry source Git blob:
9503d19c8bc0b4f073ba117f6a547d339b7623d0

pre-entry ELF:
bytes=17352
sha256=6e2885ceddf83bc9bf4636768ce6f046ab357268b0959cfa71bcbb766909cb47

entrypoint source Git blob:
bfeff81f3eab98988a9be9600a05c696674c49d6

entrypoint ELF:
bytes=17384
sha256=7a1ec91b612998824e37aa0f8522a94d7ceffe9f4f21e0702fe0a0d5ca5bdd9a
```

## Host behavior

`ops/xiphos/apollyon_xiphos_build_qualification_v1.py --run`:

1. requires hostname `Xiphos`;
2. binds the exact unit and both exact C-source Git blobs;
3. records the fixed `/usr/bin/cc` identity;
4. compiles each executable twice inside one `TemporaryDirectory`;
5. requires local byte equality, exact locked byte length and SHA-256, ELF
   magic, and each executable's exact self-test;
6. records the host systemd version and runs `systemd-analyze verify` against a
   temporary path-adjusted copy of the exact reviewed unit;
7. queries `nvidia-smi` for GPU inventory and active compute processes; and
8. deletes the temporary build tree on exit.

The unit adjustment exists only because the reviewed fixed paths and dedicated
account are intentionally absent before installation. It changes the temporary
parser fixture's user/group and filesystem paths, but does not modify the exact
tracked unit or load anything into PID 1.

## Ready result

`installation_candidate_ready=true` requires all of:

```text
preentry_reproduces_locked_identity=true
entrypoint_reproduces_locked_identity=true
preentry_self_test_green=true
entrypoint_self_test_green=true
systemd_parser_compatible=true
gpu_compute_free=true
```

This is build/install-candidate evidence only. It does not prove installed
filesystem custody, live systemd enforcement, descriptor isolation, attempt
claim, training, or model-weight mutation.

## Mutation boundary

The runner performs no persistent write. It creates only a private temporary
directory and removes it on exit.

It does not:

- use sudo or run as root;
- create or modify an account or group;
- write under `/etc`, `/opt`, or `/var/lib`;
- call `systemctl`, daemon-reload, enable, start, stop, or restart;
- access credentials, keys, wallets, signers, RPC endpoints, or payments;
- execute training or claim an attempt;
- construct or broadcast a transaction; or
- activate a presale, treasury, liquidity, WC, validator, or funds path.

Its remote execution output remains operator evidence because the repository
checkout and Python interpreter are not yet a protected Xiphos observer root.

## Focused proof

```bash
python3 -m py_compile \
  ops/xiphos/apollyon_xiphos_build_qualification_v1.py \
  scripts/prove_apollyon_xiphos_build_qualification_v1.py

python3 scripts/prove_apollyon_xiphos_build_qualification_v1.py
```

The hosted proof pins the runner Git blob, rejects network/privileged/install
primitives, exercises the self-test and wrong-host HOLD, rebuilds both locked
executables, verifies the adjusted unit with systemd major 255, and proves both
free and occupied GPU classifications with a bounded fake `nvidia-smi`.

## Operator command

After this exact source generation is accepted, a separately authorized
read-only Xiphos observation is:

```bash
python3 -I -B \
  ops/xiphos/apollyon_xiphos_build_qualification_v1.py --run
```

A successful result permits design of a create-only inactive installation
candidate. It does not authorize installation or training.

**PROTECT THE CORE.**
