# Buy VOID V2 live-process collection plan

This source-only collector composes the accepted V2 contract with the exact
locked selector ELF.

Production collection is root-only and requires the selector at:

`/opt/void-buy-void-v7-selector-v1/void_buy_void_source_finality_live_process_v2_selector_guard_v1`

The collector verifies root custody, exact 26,680-byte size, SHA-256
`048564b0a351a5ba3b9f980962d9261fa14a49823b5075ca4794bbeefecbb232`,
and the accepted selector lock before execution.

The selector stays alive holding manager/service pidfds. After its READY line,
the collector independently checks the selected service's UID/GID,
capabilities, NoNewPrivs, source identity, cgroup, start ticks, cmdline digest,
initial loader environment, executable/cwd, the exact commit/tree-bound
Node/TSX launcher argv and exact clean main release generation. This plan does
not claim the broader source-custody receipt proof; that remains a final
protected-collector responsibility. Only then does it send `VERIFY`; the selector must re-prove the
same kernel generation and exit GREEN.

Collection is read-only but sensitive: it executes the locked selector and reads
the selected service's kernel-exposed initial environment. Unrelated
environment values are not returned or persisted. No filesystem or network
write is performed.

Output is a content-addressed `voidbsv2colplan1_` collection plan only. It
does not contain a deployment receipt ID and cannot be published as
`live-process-binding-v2.json`.

Receipt publication, V7 authority, presale activation and funds movement remain
false until a final protected collector generation binds this plan to the final
deployment/enforcement generation and accepted privileged launcher.
