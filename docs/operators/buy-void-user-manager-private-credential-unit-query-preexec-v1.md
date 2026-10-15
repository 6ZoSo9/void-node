# Buy VOID authenticated credential-unit query static preexec v1

Marker: \`VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_PREEXEC_V1\`.

Status: **source/CI pre-exec trust boundary only; no protected install or live authority**.

## Purpose

The authenticated credential-unit query from parent PR #3133 is dynamically
linked because it loads the reviewed systemd client library. Its in-process
loader checks occur only after process startup, so they cannot prove that a
caller-controlled dynamic-loader payload did not execute before \`main()\`.

This child adds the missing external pre-exec boundary without modifying the
credential query.

## Fixed protected paths

The credential lane deliberately uses its own tree rather than reusing the
ordinary user-manager query installation:

- root: \`/opt/void-buy-void-user-manager-credential-query-v1\`;
- preexec:
  \`void_buy_void_user_manager_private_credential_unit_query_preexec_v1\`;
- query:
  \`void_buy_void_user_manager_private_credential_unit_query_v1\`.

The distinct root prevents the ordinary accepted preexec from being
misrepresented as authority to execute the credential-specific query.

## Static boundary

The preexec must be built as a static ELF with no \`PT_INTERP\`.

Before executing the query it requires:

- effective UID 0;
- root-owned, non-group/world-writable \`/\`, \`/opt\`, and fixed root;
- execution from its exact fixed preexec path;
- a root-owned, executable, non-group/world-writable, single-link regular query
  file;
- \`O_NOFOLLOW\` open of the exact fixed query;
- visible/opened device+inode+ownership+mode+link-count+size equality;
- the same query generation still visible immediately before execution;
- bounded positive decimal UID input and bounded service-unit syntax.

It enters the retained query descriptor with \`fexecve()\`.

The child environment is constructed by the static preexec and contains only:

- \`PATH=/usr/bin:/bin\`;
- \`LANG=C\`;
- \`LC_ALL=C\`;
- \`VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1=1\`.

No caller loader environment is forwarded.

## Hosted adversaries

The focused Ubuntu 24.04 Node 22/24/26 workflow:

1. proves the exact four-path child scope and parent source identities;
2. builds the preexec statically and requires no \`PT_INTERP\`;
3. builds the exact parent credential query dynamically;
4. installs both into a disposable root-owned fixed \`/opt\` fixture;
5. proves an \`LD_PRELOAD\` constructor executes on an unsafe direct credential
   query launch;
6. proves that constructor cannot enter the query when the static fixed-path
   preexec is used;
7. proves a copied preexec outside its fixed path is rejected;
8. proves a group/world-writable query is rejected before execution;
9. proves a symlink query and a multi-link query are rejected;
10. requires diff hygiene.

## Remaining gates

This source lane does not accept exact compiled ELF identities. A later
candidate/lock generation must bind the exact credential-query + preexec bytes
before any protected installation can be reviewed.

It also does not compose the credential-query MainPID/start-ticks generation
with the accepted V6 security transcript. That same-generation composition
remains a separate mandatory gate.

Hard false boundaries:

- \`binary_acceptance=false\`;
- \`protected_install_authorized=false\`;
- \`live_query_authorized=false\`;
- \`credential_contents_read=false\`;
- \`production_host_evidence_authority=false\`;
- \`payment_acceptance=false\`;
- \`public_presale_activation=false\`;
- \`transaction=false\`;
- \`funds_movement=false\`.

No Precision filesystem/service/systemd mutation, credential-content read,
wallet/signer action, payment acceptance, transaction, WC/presale activation,
treasury/liquidity action, or funds movement occurs.

PROTECT THE CORE.
