# DataNet executed-byte designated-host closure v1

This closes the host-diversity half of the executed-byte gate without changing
the semantics exercised by the hosted campaign. The designated host runs the
same 48-schedule member campaign for each Node 22/24/26 major and both
`current|protected` profiles, producing six `designated-host` members and one
recursively validated designated-host tier.

Generation identity is deterministic and source-bound:
`executed-byte-v1-<40-hex-head>`. Hosted and designated-host evidence can
therefore compose only when it was produced from the same exact Git head, tree,
schedule manifest and source inventory.

`ops/datanet/run-executed-byte-designated-host-v1.sh` is the operator entry
point. It:

1. refuses a dirty tracked worktree;
2. discovers one executable Node runtime for each supported major (22/24/26),
   with optional `VOID_NODE22`, `VOID_NODE24`, and `VOID_NODE26` overrides;
3. executes all six designated-host members;
4. recursively validates the designated-host tier;
5. locates the successful hosted-campaign GitHub Actions run for the same exact
   head and downloads only its retained hosted-tier artifact; and
6. recursively validates and composes the two tiers into `two-tier.json`.

The output directory is create-only and defaults outside the repository. The
operator script performs no checkout, commit, push, merge, deployment, service
mutation, Chain-2050 mutation, wallet access, signing, transaction broadcast,
liquidity action or funds movement.

A GREEN two-tier receipt means the executed-byte host-diversity gate is
structurally satisfied. The receipt keeps all broader authority flags false and
does not by itself make PR #1464 source-green, reviewed, merged, deployed, or
operationally authoritative.
