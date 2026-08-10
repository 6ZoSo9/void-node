# VOID private Chain-2050 startup-selection proof notes v1

The focused proof for the startup-selection lane is synthetic and filesystem-local.

It verifies that:

- an exact pinned baseline may be selected when it satisfies the required minimum block;
- a valid baseline below the required minimum returns `durable_state_below_required_minimum`;
- a validated content-addressed parent-lane checkpoint at the required height is selected over the stale baseline;
- state-byte tamper is rejected;
- wrong-chain checkpoint identity is rejected;
- two distinct durable states at the same highest height return `ambiguous_highest_durable_state`;
- private checkpoint directory/file modes remain `0700`/`0600`; and
- all state-load, service-mutation, replay, broadcast, wallet, credential, and money authority flags remain false.

The proof does not start Anvil or validate a real deployed state file. Live startup integration and real state-load verification remain separate authorization and implementation gates.
