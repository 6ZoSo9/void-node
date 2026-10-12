# Literature notes informing Wave 1

This prototype adapts established application-shell, design-system, content, and accessibility guidance to VOID rather than copying another product's visual identity.

## Carbon Design System — UI shell

Applied decisions:

- Treat the shell as the persistent orientation and navigation framework.
- Put product identity at the left of the header and global utilities at the right.
- Use a fixed left panel for frequently switched destinations on desktop.
- Use a right-side panel for system-level utilities such as notifications and Advanced.
- Avoid a third navigation tier; route-specific subnavigation belongs inside the view.

## WCAG 2.2

Applied decisions:

- Target WCAG 2.2 AA.
- Keep keyboard focus visible and unobscured by the sticky header or bottom navigation.
- Preserve consistent navigation and component identification.
- Provide adequately sized primary touch targets.
- Support reduced motion.
- Use semantic landmarks, a skip link, `aria-current`, and modal focus management.

## Atlassian Design System — content and accessibility

Applied decisions:

- Use clear, accurate, concise interface copy.
- Keep warnings short and task-relevant.
- Use predictable patterns across the application.
- Move technical explanation into contextual help or Advanced rather than repeating paragraphs.

## GOV.UK Design System — components and task patterns

Applied decisions:

- Build reusable accessible components rather than restyling every feature.
- Treat patterns as task-level solutions, not decorative templates.
- Organize multistep work according to the order users need to complete it.
- Keep the primary transaction focused; supporting guidance and diagnostics do not compete with it.

## VOID-specific interpretation

These references support the structural decisions, but VOID retains its own design language:

- graphite surfaces
- cyan interaction and focus
- violet identity accent
- compact technical status
- strong authority separation
- participant work in the main app
- operator and diagnostic work in Advanced
