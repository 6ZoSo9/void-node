# Buy VOID V2 native selector guard

Marker: `VOID_BUY_VOID_V2_NATIVE_SELECTOR_GUARD_V1`.

Status: **source-only native process-selector primitive; no receipt authority**.

This child implements the kernel selector required by the V2 live-process
contract without publishing a V2 receipt or integrating it into V7.

The production `--select` path is root-only. It:

- discovers the single cgroup-v2 mount from `/proc/self/mountinfo`;
- inspects the runtime user's `user@<uid>.service/init.scope`;
- requires exactly one manager candidate with:
  - stable runtime UID/GID;
  - PPid 1;
  - exact `systemd` comm;
  - exact cgroup;
  - exact `/usr/lib/systemd/systemd` executable;
  - root-owned/non-writable direct executable and ancestor custody;
  - exact argv `/usr/lib/systemd/systemd --user`;
- inspects the exact `void-node-live.service` cgroup;
- requires exactly one Node service candidate directly parented by that manager;
- rejects esbuild/service children because their PPid is the Node service PID;
- opens manager and service pidfds;
- checks both pidfds for liveness;
- emits bounded PID/start-tick/cmdline-digest selection metadata;
- keeps both pidfds open while a future higher-level collector performs its
  source/deployment/environment checks;
- waits for the exact `VERIFY` token;
- rechecks pidfd liveness and independently rederives the complete selection;
- returns GREEN only if the same manager and service generation remains.

The helper never calls `systemctl`, D-Bus, network APIs, RPC providers, wallet
or signer code. It performs no service or filesystem mutation.

This PR intentionally does not define the final collector-generation ID. The
next collector child must bind the exact reviewed helper binary/source identity,
the V2 contract, and the protected first-entry generation before any
`live-process-binding-v2.json` receipt can be created.

Authority remains false:

`receipt_publication=false`

`production_source_finality_authority_ready=false`

`public_presale_activation=false`

`funds_movement=false`
