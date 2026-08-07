# Mainnet0 Buy VOID truth v1

The Mainnet-0 blocker proof must not claim that first real Buy VOID fulfillment is complete unless the blockers and current-status artifacts agree on that state.

The classifier recognizes exactly two state classes:

- `first_real_fulfillment_complete`
- `first_real_fulfillment_pending`

It fails closed when either artifact contains both classes, neither class, or when the two artifacts disagree. The blocker-proof summary consumes the classified result instead of hardcoding completion.

This is proof/reporting logic only. It does not claim, fulfill, settle, sign, broadcast, access wallets or credentials, mutate Work Credits or validators, or move funds.
