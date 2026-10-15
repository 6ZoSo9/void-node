# Epoch-2 native live-composition protected install plan v1

Marker:
`VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_INSTALL_PLAN_V1`.

Status: **plan compiler only; protected installation remains unauthorized**.

## Purpose

Convert the accepted native/runner identity from the V2 candidate lock into one
operation-bound Precision installation plan without performing any root or
filesystem mutation.

Accepted lock:

`voide2nativecandlock2_0d824d2f5a367b3f15e37b8ee80d2a6a16e647db06400a38bd9866e4baf310c2`.

Accepted lock Git blob:

`83968ee655824e44d8e2c2eb243c2136b2dbe0e9`.

## Production inputs

Production `--plan` requires:

1. non-root execution;
2. exact clean branch `main`;
3. accepted lock bytes at their reviewed Git blob;
4. exact reviewed V2 runner bytes:
   - Git blob `92e8c8696ea7e2bb81b6ef089db8baa657188935`;
   - SHA-256
     `2ba779e98b76cd24c6b24de38b77dfded5ce7dd35869b8dd99490d3aa653af73`;
   - 30,103 bytes;
5. one absolute normalized native-candidate file whose retained
   `O_NOFOLLOW` generation revalidates before/after read and equals:
   - SHA-256
     `78a5159f7286dd107cb34568fe12e9758563123e8bda8c8cccc96eaf6c37c589`;
   - 726,976 bytes;
6. fixed `/usr/bin/node` as a root-owned executable regular non-symlink,
   non-group/world-writable file read through a retained `O_NOFOLLOW`
   descriptor.

The candidate path/dev/inode generation is recorded into the plan.

## Fixed target layout

The plan fixes:

```text
/opt/void-buy-void-epoch2-live-composition-v2/
  void_buy_void_epoch2_live_composition_native_preentry_v1  mode 0555
  void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs  mode 0444
  policy-v1.conf  mode 0444
```

No target path is caller-selectable.

## Policy

The planned root-custodied policy is exact text:

```text
schema=VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V1
expected_head=<exact clean current main>
runner_sha256=2ba779e98b76cd24c6b24de38b77dfded5ce7dd35869b8dd99490d3aa653af73
runner_bytes=30103
node_sha256=<exact /usr/bin/node SHA-256>
node_bytes=<exact /usr/bin/node byte length>
```

The plan records both policy SHA-256 and byte length.

This deliberately makes `expected_head` and Node identity host/current-main
facts rather than pretending the hosted candidate lock can know them in
advance.

## Content-addressed plan

The plan binds:

- exact repository head;
- accepted lock ID/blob;
- fixed install paths/modes;
- native candidate SHA/size and observed source path/dev/inode;
- runner Git blob/SHA/size;
- exact fixed Node SHA/size;
- exact policy SHA/size.

The body is canonicalized and produces:

`voide2installplan1_<sha256>`.

The tool writes nothing. JSON is emitted to stdout only.

## Usage

After the accepted lock is merged and the exact candidate ELF is present on
Precision outside the repository:

```bash
node ops/precision/void_buy_void_epoch2_live_composition_install_plan_v1.mjs \
  --plan \
  --native-candidate /absolute/path/to/accepted-native-elf
```

Do not redirect or treat the output as installation authority until the
separate protected installer/receipt successor is reviewed.

## Authority

Even GREEN remains:

- `filesystem_write=false`;
- `protected_install_authorized=false`;
- `protected_install_performed=false`;
- `live_execution_authorized=false`;
- `credential_access=false`;
- `private_key_access=false`;
- `signing=false`;
- `transaction=false`;
- `rpc_call=false`;
- `payment_acceptance=false`;
- `public_presale_activation=false`;
- `wc_void_market_activation=false`;
- `funds_movement=false`.

The next gate is a separately reviewed protected apply path that consumes an
exact accepted plan and cannot execute mutable caller-controlled privileged
source before verifying that plan and its fixed inputs.

PROTECT THE CORE.
