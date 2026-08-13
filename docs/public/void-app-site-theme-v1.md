# VOID App site theme v1

Marker: `VOID_APP_SITE_THEME_V1`

## Purpose

Make the shared VOID App shell visually consistent with the canonical production
`voidchain.org` homepage without changing any application route, data contract,
mutation authority, runtime behavior, or specialist worker lane.

The visual source of truth is the checked-in production homepage source:

`ops/public/voidchain-org-wordpress-home-v1.html`

That source fixes the public product language around a near-black grid canvas,
monospace typography, hard-edged panels, hairline neutral borders, restrained
status color, and high-contrast white/black actions.

## Canonical tokens

The app's shared tokens intentionally bind to the production page:

- canvas: `#050506`;
- panel: `#0b0b0e`;
- hairline: `#2a2a31`;
- primary text: `#f2f2f4`;
- muted text: `#9898a3`;
- secondary copy: `#c8c8cf`;
- grid: `32px`;
- type: the same `ui-monospace` / SFMono / Menlo / Monaco / Consolas stack;
- primary action: light surface with near-black text;
- secondary action: transparent surface with a neutral border; and
- shared corner radius and decorative shadow/glow tokens: zero/none.

Semantic positive, warning, danger, and informational colors remain available,
but the shared theme prevents them from becoming decorative brand gradients or
glows.

## Composition

`assets/css/site-theme.css` is imported after the existing responsive layer. It
therefore acts as one final skin over existing and future views while preserving
all view-specific layout and behavior.

The theme normalizes the global canvas, header, sidebar, navigation, buttons,
panels, chips, inputs, tables, overlays, drawers, and common status surfaces.
It deliberately does not edit Home, Wallet, Earn, Data, Buy, Validate, Network,
or Foundation JavaScript.

This separation lets Darwin continue the Data lane and Curly continue Buy VOID
without a theme PR taking ownership of their functional source.

## Proof contract

`scripts/prove_void_app_site_theme_v1.mjs` reads the production homepage source,
extracts the canonical CSS variables, and requires the app token file to match
them. It also requires:

- the production 32px grid contract;
- monospace typography for both app font aliases;
- square shared radius tokens and disabled decorative shadows/glow;
- `site-theme.css` to be the final import in `main.css`;
- the theme layer to remove the old global cyan-grid and decorative hero glow;
- production-style primary and secondary button treatment; and
- no functional JavaScript or specialist view path in this v1 scope.

If the production homepage palette changes later, the proof fails until the app
is deliberately reconciled instead of silently drifting.

## Authority boundary

This is presentation source and deterministic proof only. It does not:

- mutate WordPress or deploy `voidchain.org`;
- change app routes, adapters, network calls, or data parsing;
- change Buy VOID price, inventory, intake, fulfillment, or payment behavior;
- connect, unlock, create, import, or use a wallet or signer;
- register, stake, admit, activate, demote, or write a validator set;
- mutate Work Credits or DataNet state;
- start, stop, restart, or deploy a node/service;
- construct, sign, or broadcast a transaction; or
- move funds.

Merge, deployment, production publication, and the later Validate capability
surface remain separate gates.
