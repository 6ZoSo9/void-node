# 2026-09-28 — Continuity Rollup V1

Marker: `VOID_REN_CONTINUITY_ROLLUP_V1`

## Repository anchor

Canonical `main` observed for this rollup:

`9185023812bd5ae573dace2a4cc77911d8db2679`

A newer main supersedes that SHA immediately.

This entry is a continuity rollup, not a replacement for the detailed journal
entries from September 25–28. It records only durable state transitions and
corrections that are easy to lose across sessions.

## Tracker-state correction

Two long-running tracker issues are now closed as completed:

- #1005 — multipath public bootstrap with no single required seed;
- #1822 — production WC/VOID market coupled to the presale.

Do not translate tracker closure into broader authority than the repository and
runtime evidence proves.

For #1005, additional Tor-native transport/admission findings were recorded
after the issue was closed, including close/EOF handling, chain-identity
binding, and malformed UTF-8 admission. Tracker closure therefore is not a
blanket statement that every later public-bootstrap hardening question is
resolved.

For #1822, the issue itself explicitly separated source/proof work from
value-bearing authority. Closing the implementation tracker does not by itself
prove deployment, vault funding, public presale intake, WC/VOID activation,
transaction broadcast, liquidity movement, or funds movement.

## Economic continuity

The coupled launch invariant remains the durable policy:

- public VOID presale intake and production WC/VOID opening belong to the same
  launch ceremony;
- neither opens independently of the other;
- WC/VOID price discovery is market-determined;
- fixed WC-to-VOID redemption is retired and must not return as current policy;
- the opening WC side is real settled WC, not virtual or protocol-minted WC.

PR #1984 is merged and adds the opening concentration/Sybil policy source
boundary. It is policy/readiness hardening, not proof that the coupled public
launch ceremony occurred.

Epoch-2 economic migration work has advanced materially in source and public
evidence, but the authority boundary remains explicit. Detailed journal entries
already record the client-neutral state manifest publication, state-root anchor
preparation, DataNet publisher/deployer separation, and signed-submission
gateway work. None of those entries authorizes migration, public activation, or
funds movement by implication.

## Consensus continuity

Xiphos is now part of the production-candidate QBFT identity preparation.

The latest detailed journal state records:

- canonical production-candidate QBFT identities: 3;
- required identities: 4;
- unresolved identity slots: 1;
- production QBFT extraData built: false;
- production validator set bound: false.

The four-identity requirement is not reduced to fit current hardware.

## Public ingress outage and root-cause repair

On 2026-09-28, the public Precision web stack was unavailable while the live
VOID node and Tailscale remained healthy.

Observed path:

- node `4100`: healthy;
- Tailscale: active;
- Funnel: still configured to `443 -> 8083`;
- recovery adapter `8080`: not listening;
- recovery composition `8082`: not listening;
- recovery frontdoor `8083`: not listening.

The three recovery services were enabled but had not started. User-systemd had
deleted their startup jobs at 06:29:33 CDT to break this ordering cycle:

`default.target -> frontdoor -> composition -> adapter -> void-node-live.service -> default.target`

The back edge was the installed node unit's `After=default.target` while the
same unit was enabled through `WantedBy=default.target`.

Recovery proceeded without restarting the node:

1. start the existing recovery adapter, composition gateway, and frontdoor;
2. verify local `8080 -> 8082 -> 8083`;
3. verify the public Funnel returned `VOID_PUBLIC_FRONTDOOR_V1` with
   `ready:true`;
4. remove the bad `After=default.target` line from the installed node unit;
5. run `systemctl --user daemon-reload` with all running services preserved.

PR #1986 then merged the permanent source fix at
`16c8b3a11af026b09405f0fe3ba192f7f51c5c20`, removing the invalid ordering
edge from maintained user-node installers and adding regression coverage.

## Public UI continuity

The Network page had a stale static fallback even though a bounded live
read-only Network module already existed.

The stale fallback claimed a fixed three-machine topology and historical block
height `1,856,587`. That presentation was removed.

PR #1987 merged at
`a45f0fc402292442a0e2d6d0df405024349a01d7` and now:

- explicitly loads the live Network module from the app shell;
- replaces static topology/history with an honest loading/HOLD shell;
- keeps live network reads same-origin, GET-only, bounded, and read-only;
- rejects stale hard-coded Network fallback state in regression proof; and
- passed the complete hosted workflow set before merge.

The Buy VOID page was reviewed in the same pass and deliberately left
fail-closed. The public composition gateway exposes the bounded request route,
but there is not yet a public read-only presale-readiness projection for the UI
to consume. The UI should remain HOLD rather than infer OPEN, inventory, payment
instructions, or fulfillment readiness.

## Epoch-2 artifact hygiene

Immediately after the ingress/UI repairs, main continued through epoch-2
artifact-lineage cleanup, including #1988, #1989, and #1990 for exact symlink
and runtime-venv metadata classification.

Treat those as artifact/evidence hygiene unless a separate journal entry or
runtime proof establishes an authority transition. They do not by themselves
grant migration, activation, signing, broadcast, or funds authority.

## Highest continuity rule

For future sessions, preserve this ordering:

`newest ZoSo instruction -> live repository/runtime/external evidence -> live coordination -> current-state cache -> historical journal`

The current-state file remains a derived cache and its embedded repository
anchor may lag main. Do not promote an old snapshot over live repository truth.

Memory for context. Repo for truth. Brood journal for continuity.

`PROTECT THE CORE`. `PROTECT THE TRUTH`.
