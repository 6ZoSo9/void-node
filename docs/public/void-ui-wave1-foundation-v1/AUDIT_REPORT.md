# VOID Wave 1 Foundation — Automated Audit Report

**Result:** `VOID_UI_WAVE1_FOUNDATION_V1_GREEN`

## Viewport and route matrix

Every one of the eight review routes was checked at every listed viewport.

| Viewport | No page overflow | One H1 | One visible current destination | No page errors |
|---|---:|---:|---:|---:|
| 1440x900 | Yes | Yes | Yes | Yes |
| 1280x800 | Yes | Yes | Yes | Yes |
| 768x1024 | Yes | Yes | Yes | Yes |
| 390x844 | Yes | Yes | Yes | Yes |
| 320x568 | Yes | Yes | Yes | Yes |

Routes checked: Home, Wallet, Earn, Data, Buy, Validate, Network, and UI Foundation.

## Interaction checks

- Notification drawer moves focus to its close control.
- Escape closes the drawer.
- Focus returns to the notification trigger.
- `aria-expanded` changes from `false` to `true` and back.
- Command menu opens with Ctrl/Command+K.
- Focus enters the command search field.
- Tab focus is trapped within the active overlay.
- Mobile More sheet moves focus to its close control.
- Escape closes the sheet and resets `aria-expanded`.

## Contrast checks

| Token pairing | Contrast ratio | WCAG normal text |
|---|---:|---:|
| Primary text on canvas | 18.54:1 | Pass |
| Secondary text on canvas | 11.06:1 | Pass |
| Muted text on Surface 1 | 5.06:1 | Pass |
| Cyan on canvas | 12.89:1 | Pass |
| Inverse text on cyan | 12.42:1 | Pass |
| Positive on Surface 1 | 11.46:1 | Pass |
| Warning on Surface 1 | 11.89:1 | Pass |
| Danger on Surface 1 | 7.16:1 | Pass |

## Static policy checks

- No API calls or feature logic
- No inline event behavior
- No inline style attributes
- No `!important` declarations
- Seven primary destinations present
- Desktop and mobile navigation present
- Skip link and reduced-motion support present

## Limits of this audit

This is a foundation audit, not production certification. Manual visual review, screen-reader review, and real-device testing remain required before Wave 1 approval.
