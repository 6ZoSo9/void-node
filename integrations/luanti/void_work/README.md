# `void_work` Luanti foundation mod

License: `GPL-3.0-or-later`

This is a server-side foundation mod for the working-title game **VOID
Realms**. It records a player's in-game intent and displays a sanitized,
read-only Worker Companion status.

This mod starts no work and awards no Work Credits. It only records in-game intent and displays sanitized status.

It deliberately does not:

- run on the player's machine;
- start or install the Worker Companion;
- make HTTP or other network requests;
- read or write arbitrary files;
- execute external programs;
- receive raw worker credentials;
- access wallets or signers;
- issue work tickets;
- execute jobs;
- award Work Credits or VOID.

Commands:

- `/voidwork`
- `/voidwork_consent on`
- `/voidwork_consent off`

`/voidwork_consent on` is not sufficient to start compute. The external Worker
Companion must independently obtain explicit consent and enforce CPU,
bandwidth, power and thermal limits.

A later trusted server bridge may call
`void_work.publish_sanitized_snapshot(player_name, snapshot)`. That API accepts
status only. It grants no ledger or reward authority.
