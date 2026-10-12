# VOID UI Wave 1 — Design System and Application Shell Specification v1

**Status:** Review candidate
**Scope:** Tokens, primitives, responsive application shell, navigation, account/network context, global notifications, Advanced boundary, and visual evidence
**Explicitly excluded:** Feature migration, API integration, route replacement, wallet logic, Work Credits logic, DataNet logic, Buy VOID logic, validation logic, and operator mutations

## 1. Product-shell decision

VOID App is one route-based application, not one endless page. The shell stays stable while the main view changes.

### Primary destinations

1. Home
2. Wallet
3. Earn
4. Data
5. Buy
6. Validate
7. Network

Advanced is a restricted utility area, not an eighth primary destination. Settings, records, diagnostics, and operator tools enter through the account or Advanced controls.

### Desktop shell

- Fixed global header
- Persistent left navigation
- Main routed content
- Account and node context in the header
- Global notifications drawer
- Advanced drawer
- Maximum content width with responsive gutters

### Mobile shell

- Compact global header
- Five-slot bottom navigation: Home, Wallet, Earn, Data, More
- More sheet: Buy, Validate, Network, Advanced
- No permanent second navigation row

## 2. Visual direction

The V5 direction is retained but made more product-like:

- Black/graphite canvas and surfaces
- Cyan as the primary interaction and focus color
- Violet as a secondary identity accent
- Semantic green, amber, red, and blue only for state
- Fine technical grid used only as atmosphere
- Low-glow borders rather than large neon gradients
- Dense enough for operational data, spacious enough for task clarity
- System sans for normal UI; monospace only for identifiers and machine values

## 3. Token policy

All reusable styling is defined through semantic tokens.

### Color

- Canvas and four surface levels
- Three border strengths
- Primary, secondary, muted, and inverse text
- Cyan, violet, blue, positive, warning, danger, and info
- Soft semantic fills

### Typography

- 11–56 px-equivalent type scale
- Tight, snug, normal, and relaxed line heights
- Sans and mono families
- No arbitrary font sizes in feature work

### Spacing

4, 8, 12, 16, 20, 24, 32, 40, 48, 64, and 80 px-equivalent steps.

### Shape and depth

- Four radii plus pill
- Two elevation levels
- Cyan focus/glow treatment
- Shared transition timing and easing

## 4. Component policy

Wave 1 establishes:

- App header
- Desktop sidebar
- Mobile bottom navigation
- More sheet
- Account control
- Network context chip
- Notification drawer
- Advanced drawer
- Command menu
- Page header
- Button hierarchy
- Status chips
- Surfaces and panels
- Balance tiles
- Alerts
- Forms
- Tables
- Activity rows
- Empty states
- Loading skeletons
- Toasts

A new visual need becomes a component or token decision. It does not become feature-specific inline CSS.

## 5. Page template

Every view follows:

1. Eyebrow / location
2. One clear H1
3. One-sentence purpose
4. At most one dominant primary action
5. Optional contextual alert
6. Primary workflow region
7. Supporting state
8. Advanced disclosure elsewhere

## 6. Copy rules

- Short headings
- Labels over paragraphs
- Status chips for compact state
- Contextual help for technical explanation
- No implementation markers in normal UI
- No repeated safety essay on every panel
- Canonical authority language: Available, Preview, Guarded, Operator action required

## 7. Accessibility baseline

- Skip link
- Semantic header, nav, main, aside, and dialog landmarks
- Complete keyboard access
- Visible focus
- Escape closes overlays
- Focus moves into and returns from overlays
- Current route exposed with `aria-current`
- Mobile and desktop navigation stay consistent
- Reduced-motion support
- No color-only status communication
- Minimum 320 px layout smoke

## 8. Review decisions required

The reviewer should approve or reject:

- Global density
- Header and sidebar proportions
- Cyan/violet balance
- Page title scale
- Card/surface treatment
- Mobile bottom navigation
- Account/network context
- Advanced boundary
- Home composition
- Component language

No feature migration starts until these decisions are closed.
