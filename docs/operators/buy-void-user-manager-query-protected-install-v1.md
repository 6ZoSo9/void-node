# Buy VOID protected user-manager query installation v1

Marker: `VOID_BUY_VOID_USER_MANAGER_QUERY_PROTECTED_INSTALL_V1`.

Status: **reviewed create-only installer contract; no live installation is performed by CI or by this PR**.

## Purpose

Merged #3057 accepted one exact authenticated user-manager private-unit query
binary pair but deliberately left:

```text
install_authorized=false
protected_install_performed=false
production_host_evidence_authority=false
```

The current request-root authority hold requires that exact pair to be available
from the fixed root-owned path expected by the reviewed static pre-exec boundary.
This installer defines that missing host mutation without also executing the
query or changing the running VOID service.

## Accepted input identity

The installer binds the merged lock:

`ops/security/buy-void-user-manager-query-elf-lock-v1.json`

Git blob:

`4f255dbc98ac4b65fb4e6433f4e7aee7b86351db`

Lock ID:

`voidbuyumqelflock1_0b0b791995f7a3346c3562387e211e9e2bb54ca6a050a964950e70a0e4cd1a16`

Only these candidate bytes are accepted:

- static preexec: 706,504 bytes, SHA-256
  `8963c77f02c83c04c386912525b7c6177a6ef99507c7f85113c8b7c74e245c11`;
- private-unit query: 34,872 bytes, SHA-256
  `98fb0de18c7e2acc133db38f15036acc8345f503b2dd196cc07193523dd0a435`.

The source candidates are opened with `O_NOFOLLOW`, must be direct single-link
regular files with exact size, and are identity-rechecked before and after the
complete bounded read. Installation uses those retained verified bytes, not a
later pathname reopen.

## Fixed protected target

The exact installation root is:

`/opt/void-buy-void-user-manager-query-v1`

with mode 0755, owner/group root:root.

The two installed files are:

- `void_buy_void_user_manager_private_unit_query_preexec_v1`;
- `void_buy_void_user_manager_private_unit_query_v1`.

Both must be root:root, mode 0555, direct single-link regular files with exact
accepted byte length and SHA-256.

This path is not arbitrary: the accepted static preexec source refuses to run
unless its own executable path and the query path match this fixed layout.

## Create-only semantics

Apply requires:

- effective UID 0;
- Python isolated mode (`-I`);
- absence of loader/Python injection variables including `LD_PRELOAD`,
  `LD_LIBRARY_PATH`, `LD_AUDIT`, `GLIBC_TUNABLES`, `PYTHONPATH` and
  `PYTHONHOME`;
- trusted root-owned, non-group/world-writable `/` and `/opt`;
- the complete installation root to be absent;
- the explicit confirmation token
  `INSTALL_ACCEPTED_USER_MANAGER_QUERY_PAIR_CREATE_ONLY_V1`.

The installer creates the directory once, creates each target with
`O_CREAT|O_EXCL|O_NOFOLLOW`, fsyncs and re-verifies the installed bytes.
A failed per-file creation removes the file it created; an ordinary apply
failure then removes any earlier files created by that invocation and removes
the newly created directory when possible.

If the installation root already exists, the installer HOLDS instead of
repairing, replacing, deleting, or adopting it. A partial tree after an
external interruption therefore requires separate inspection rather than an
automatic overwrite.

## No execution during installation

The installer contains no query execution path. It does not:

- invoke the preexec or private-unit query;
- call `systemctl`;
- start/restart/enable a service;
- make a network request;
- access credentials, keys, wallets, or signers;
- inspect request/payment contents;
- accept a payment or activate the presale;
- move funds.

A successful apply proves only that the accepted pair was create-only installed
at the reviewed protected path.

The next gate is a separately reviewed **read-only authenticated live query**
that executes this exact fixed preexec as root, parses the exact #3057 native
evidence, and binds its authenticated MainPID into the request-root census.

## Operator modes

Inert contract/self-test:

```bash
python3 -I -B ops/precision/void_buy_void_user_manager_query_protected_install_v1.py --self-test
```

Read-only plan:

```bash
python3 -I -B ops/precision/void_buy_void_user_manager_query_protected_install_v1.py --plan
```

Read-only verification of downloaded candidate paths can be added to plan:

```bash
python3 -I -B ops/precision/void_buy_void_user_manager_query_protected_install_v1.py \
  --plan \
  --preexec /absolute/path/to/preexec \
  --query /absolute/path/to/query
```

A live `--apply` is intentionally not authorized merely by merging this
source. It requires separate operator authorization and must be invoked through
isolated Python (for example, `sudo python3 -I -B ... --apply`); the installer
also checks that dangerous loader/Python environment variables are absent.

## Authority boundary

The PR and hosted CI perform no host installation. Even a successful later
apply keeps false:

- live authenticated query execution;
- complete host-evidence authority;
- historical request-history disposition;
- stable request-root apply;
- payment acceptance;
- public presale activation;
- funds movement.

**PROTECT THE CORE.**
