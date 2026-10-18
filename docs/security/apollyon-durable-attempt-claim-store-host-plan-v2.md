# Apollyon durable attempt-claim store Xiphos preinstall plan v2

Marker: `VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_HOST_PLAN_V2`

Status: **read-only designated-host planning source; no installation and no claim authority**.

## Purpose

Accepted #3233 defines the protected attempt-claim store requirements, but deliberately does not choose a UID/GID, account name, socket path, state root or systemd unit. Those choices must be fixed before any installation can be reviewed.

This phase binds the Xiphos preinstall choices without creating them. It is not the final installed-host qualification and does not claim that a claim service, publisher, protected root, socket or durable claim exists.

Exact parent:

`#3233@9475035552881f34658a7c8f3a6b336199fda159`

Parent contract Git blob:

`bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc`

Stable terminal-independent store policy:

`apollyon_claim_store_policy_v2:e7591d97e95ba4af17097fc89e1e2db612275c84715872153e1ae0a278c01137`

The focused proof independently imports the exact accepted parent contract and
re-derives this policy ID from its canonical policy material. Before that import,
the proof pins the exact complete ESM dependency closure used by the policy
derivation: the parent contract, claim-contract canonicalizer, terminal-receipt
module, and the terminal module's live source/session binding dependency. The
focused workflow triggers on all four reviewed files. The host plan carries this
stable policy identity directly. It does **not** use a terminal-specific
`store_contract_id` as the durable host-store identity.

## Fixed future names

- claim service user/group: `voidapollyonclaim`
- claim publisher user/group: `voidapollyonclaimpub`
- claim IPC group: `voidapollyonclaimipc`

The plan requires all five future user/group namespace entries to be absent. It does not create them.

Existing protected identities are observed read-only from:

- `voidapollyontrain`
- `voidapollyoncustody`
- `voidapollyonipc`
- public runtime/operator account `zoso`

## Fixed future paths

- state root: `/var/lib/void-apollyon-attempt-claim-v2`
- socket parent: `/run/void-apollyon-attempt-claim-v2`
- socket: `/run/void-apollyon-attempt-claim-v2/claim.sock`
- service unit: `/etc/systemd/system/void-apollyon-attempt-claim-v2.service`
- service source root: `/opt/void-apollyon-attempt-claim-v2-reviewed-v1`
- publisher source root: `/opt/void-apollyon-attempt-claim-publisher-v2-reviewed-v1`

The plan requires the install-target leaves to be absent and the retained system parents `/`, `/var`, `/var/lib`, `/run`, `/opt`, `/etc`, `/etc/systemd`, and `/etc/systemd/system` to be direct, root-owned and non-group/world-writable.

## Local identity authority and numeric slot selection

The plan does **not** call libc NSS. Before any identity lookup or candidate selection it descriptor-binds direct root-owned, non-group/world-writable copies of:

- `/etc/nsswitch.conf`;
- `/etc/passwd`;
- `/etc/group`;
- `/etc/login.defs`.

It accepts exactly `passwd: files` and `group: files`; SSS, LDAP, NIS, compat, systemd or action-clause profiles HOLD. Passwd/group data are parsed directly from the bound local files, so the declared `network_access=false` boundary does not depend on an external NSS provider. The four file identities/hashes are revalidated before the plan is emitted.

The live read-only plan parses the exact `SYS_UID_MIN/MAX` and `SYS_GID_MIN/MAX` values from the bound `/etc/login.defs`, inventories only the bound local passwd/group files, and selects:

- two unused system UID candidates;
- three unused system GID candidates.

Selection is deterministic from the highest available values downward. For conservative separation, the five selected numbers must be globally distinct and cannot collide with any currently used UID/GID, any observed protected identity, **or any numeric credential carried by a stable live process generation**.

### Host-wide live-process credential exclusion

Local account files are not enough to prove a numeric UID/GID is unused. A
process can retain its numeric credentials after the corresponding passwd/group
entry is deleted. Reusing that number for a new protected principal could grant
the stale process access to future claim-store paths or sockets.

Therefore authoritative `--run` is read-only but root-required on Xiphos and
requires two externally reviewed same-boot namespace identity leases in
`<st_dev>:<st_ino>` form:

- the host PID namespace; and
- the host/initial user namespace.

Numeric `euid=0` is not accepted as host-root authority by itself. The plan
requires:

- canonical root-owned `/proc` backed by procfs with no `hidepid` option;
- the planner and PID 1 to occupy the exact externally leased PID namespace;
- the planner and PID 1 to occupy the exact externally leased host user
  namespace;
- full root UID/GID slots for the planner and PID 1;
- a stable start-time generation around each process status read;
- every still-existing numeric `/proc/<pid>/status` to be readable and
  structurally valid;
- all four `Uid:` slots, all four `Gid:` slots, and every supplementary
  `Groups:` value to enter the unavailable numeric-ID set;
- malformed or unreadable status for a still-existing PID to HOLD;
- a PID that disappears during observation to be skipped rather than invented;
- a PID generation change during one credential read to HOLD;
- a second authoritative process census before plan emission, with every
  selected candidate still absent from live credentials.

The externally reviewed PID-namespace and user-namespace dev/inodes are
host-evidence leases; the planner does not manufacture or infer host-wide root
or namespace authority from its own current namespace view. A separately
reviewed operator step obtains both leases from the designated Xiphos host
before running this planner.

The emitted process census is still only an **observation**. It does not make the
selected slots safe to provision later. Any future create-only account/group
provisioner must repeat the same root + host-PID-namespace + host-user-namespace
+ procfs census immediately before mutation and must HOLD if either namespace
lease changes or any selected UID/GID has become live.

The result binds candidate numbers and the accepted stable
`store_policy_id` into the content-addressed plan. The numeric values are only
candidates until a separately reviewed create-only account/bootstrap gate
provisions them. That later provisioning gate must repeat both the local-files
authority census and the authoritative live-process credential census under
the same externally reviewed host PID-namespace and host user-namespace leases,
prove the selected numeric slots are still free immediately before create-only
mutation, and preserve the same accepted store policy identity.

## Host and source-generation binding

Authoritative planner execution requires `python3 -I -B`. The script checks Python isolated/safe-path, ignored-environment, no-user-site and no-bytecode-write flags immediately after importing built-in `sys`, before importing any module that could resolve through a mutable script/search path. A non-isolated invocation HOLDs before planner imports or host census.

A future `--run` requires hostname `Xiphos`, the exact #3233 parent head, and an explicit reviewed planner source-head lease supplied by the operator/reviewer. The lease is not trusted by string comparison alone.

Before any READY plan can be emitted, the planner uses fixed `/usr/bin/git` with a sanitized local-only environment and requires:

- fixed `/usr/bin/git` plus its retained directory ancestry to be direct, root-owned and non-group/world-writable;
- the Git toplevel to be the planner's canonical repository root;
- live `HEAD` to equal the supplied reviewed source head exactly;
- accepted #3233 `9475035552881f34658a7c8f3a6b336199fda159` to appear in the raw cryptographic commit-parent chain of that source head;
- the planner path to be the canonical direct repository path;
- the descriptor-stable working planner bytes to equal the exact blob tracked at that HEAD;
- the descriptor-stable parent contract bytes to equal the exact blob tracked at that HEAD and accepted contract blob `bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc`;
- the same source-generation evidence to remain unchanged at the end of the plan census.

The content-addressed plan carries the authenticated source head and planner/contract blob evidence. A wrong reviewed head or substituted working planner therefore HOLDs instead of producing READY.

Git is used only for local read-only metadata/object lookup. The environment removes inherited Git configuration/prompt authority, sets `GIT_NO_REPLACE_OBJECTS=1`, and sets `GIT_NO_LAZY_FETCH=1` so a partial/promisor checkout cannot demand-fetch missing objects. Parent ancestry is reconstructed from raw Git objects rather than revision-walk metadata: every traversed object must report exact type `commit` via `git cat-file -t` before its `git cat-file -p` parent fields are accepted. Local replace refs, graft-style traversal changes, or a non-commit object masquerading as commit text therefore cannot manufacture the accepted #3233 ancestry. Missing required objects HOLD locally instead of causing network/object-store mutation. No Git network access, fetch, checkout, ref mutation or repository write is permitted.

The plan also records SHA-256 plus stable file identity for the current `/etc/machine-id`. All other host observations remain direct read-only filesystem observations; libc NSS lookup and remote NSS providers are not used.

Hosted CI does **not** perform the Xiphos census. It proves the current checkout source binding, wrong-source-head rejection and substituted-planner rejection, then runs an explicit live-run negative that must stop at `HOLD=wrong_host`.

## Non-authority

Even a READY plan keeps all of the following false:

- account/group provisioning;
- Git checkout/fetch/ref mutation or other repository write;
- directory/file creation;
- systemd unit installation or daemon reload;
- service start/stop;
- claim-service or publisher source installation;
- protected claim-store qualification;
- durable attempt claim;
- training or candidate-weight mutation;
- credential/private-key/signing/wallet/transaction/funds authority.

The next source gate is:

`apollyon_durable_attempt_claim_store_service_source_candidate_v2`

A plan is not installation authority.

## Bounded raw-commit ancestry on merge-forwarded source

The read-only source-generation proof uses a breadth-first traversal of raw Git
commit-object parents. This ensures a nearby reviewed #3233 ancestor remains
reachable after a legitimate non-force two-parent reconciliation, even if the
other parent is the repository's very deep current-main history. Every traversed
object is still checked as type commit with replacement objects, graft shortcuts,
and lazy fetch disabled. The unchanged 4,096-commit visited-object ceiling fails
closed for distant, ambiguous or unbounded history; it is not raised to admit
this reconciliation. Hosted adversaries exercise both the nearby reviewed-parent
positive and a missing ancestor on a >cap lineage.
