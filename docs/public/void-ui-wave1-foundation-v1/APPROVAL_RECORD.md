# VOID Unified Application UI — Wave 1 Direction Approval

**Approved:** 2026-07-14
**Approved by:** ZoSo
**Status:** Approved direction; repository foundation integration authorized

## Approved decisions

- Separate the public marketing site from the route-based VOID application.
- Use exactly seven primary application destinations:
  Home, Wallet, Earn, Data, Buy, Validate, and Network.
- Keep Advanced outside primary navigation.
- Use the recovered V5 visual direction as the foundation, evolved into a complete product UI.
- Use shared semantic tokens and reusable components.
- Prohibit feature-specific inline CSS.
- Keep existing routes operational during staged migration.
- Do not replace `/participant`, `/public-node`, or other live routes until parity and quality gates are green.
- Require desktop and mobile visual review for every UI lane.
- Require accessibility, functional, and authority-boundary verification before merge.
- Freeze new cards, tabs, and visual additions to the participant monolith.

## Scope of this repository lane

This lane integrates only:

- semantic tokens
- reusable component language
- responsive application shell
- desktop and mobile navigation
- account and network context slots
- notification, command, More, and Advanced shell interactions
- empty route scaffolds
- foundation review route
- approved architecture, audit, screenshots, and review evidence

It does not integrate wallet, Work Credit, DataNet, Buy VOID, validator,
operator, fulfillment, ledger, or money-movement functionality.
