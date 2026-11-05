# React component design

- Use controlled inputs when the application needs to own/validate form state; use uncontrolled/native form behavior when simpler.
- Define explicit prop types; avoid broad `any` and opaque prop bags.
- Prefer composition and children/slots over components with many boolean flags.
- Separate feature components from truly shared design-system components.
- Do not create a shared component solely to remove a few repeated lines if it obscures intent.
- Keep state at the lowest common owner; avoid global state for local UI concerns.
- Use context for stable cross-tree concerns, not as a default replacement for props or server data.
- Ensure dialogs, menus and forms support keyboard and screen-reader use.
