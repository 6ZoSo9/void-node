# Chain-2050 role-authority broadcast authorization request v1

This is a **request**, not authority.

Exact request ID:

`voidcrabr1_661c57638e7c9904df997da50841811f509239495891a965aebd46fece405a51`

It binds the fresh pre-broadcast observation to the exact signed transaction:

`0x8da8cc5a8e126158bdc0e003c5521699939d95a26a72a933969cf6de15d88dd4`

and the exact signed-file SHA-256:

`96b5d004284e511c12b40f2de627c9a214656e025883b8cd7adec1b82348334d`

The request grants **no** broadcast, deployment, Chain-2050 mutation, funds
action, or automatic retry authority.

Status:

`HOLD_PENDING_EXPLICIT_SOVEREIGN_SINGLE_TRANSACTION_BROADCAST_AUTHORIZATION`

A later authorization must explicitly name either this exact request ID or the
exact signed transaction hash. That later authorization may grant at most one
submission attempt for this exact signed transaction. It must not silently
grant retries, unrelated deployment authority, or additional funds movement.
