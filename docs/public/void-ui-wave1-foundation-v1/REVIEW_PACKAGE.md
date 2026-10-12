# VOID UI Wave 1 Foundation — Review Package v1

This package turns the approved architecture charter into a reviewable design-system and application-shell foundation.

## Review first

1. `screenshots/desktop-home-1440x900.png`
2. `screenshots/mobile-home-390x844.png`
3. `screenshots/desktop-foundation-1280x800.png`
4. `screenshots/desktop-advanced-drawer-1440x900.png`
5. `screenshots/mobile-more-390x844.png`

## Read

- `docs/WAVE1_FOUNDATION_SPEC.md`
- `docs/VISUAL_REVIEW_CHECKLIST.md`
- `docs/AUDIT_REPORT.md`
- `docs/LITERATURE_NOTES.md`

## Interact

```bash
cd prototype
bash launch.sh
```

Review routes:

- `#/home`
- `#/wallet`
- `#/earn`
- `#/data`
- `#/buy`
- `#/validate`
- `#/network`
- `#/foundation`

## Decision required

Wave 2 does not start until the shell is approved or revised through the visual review checklist.

## Safety boundary

This package is standalone. It does not alter the VOID repository, call VOID APIs, replace a route, or execute a mutation.
