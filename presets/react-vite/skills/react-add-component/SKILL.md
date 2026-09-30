---
name: react-add-component
description: Create a React component with typed props, accessible markup, loading/error states and a behaviour test. Use when the user asks for a new component, widget or screen section in a React app.
---

# Add React Component

1. **Reuse first** — search existing components/design system for something that fits.
2. **Place it** in the feature folder (`src/features/<feature>/components/`) or shared UI folder, matching repo naming.
3. **Props** — typed, minimal; events as `onX` callbacks.
4. **Markup** — semantic, accessible (labels, roles, keyboard, focus). Use ui-ux-pro-max for design decisions.
5. **States** — handle loading, empty and error when the component shows async data.
6. **Test** — Testing Library test covering render + main interaction.
7. Finish with `definition-of-done`.
