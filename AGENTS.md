# Project Instructions

## Code Task Workflow

When making code changes in this repository:

- Run `pnpm run typecheck` before finishing
- Run `pnpm run test` before finishing
- Do not treat implementation as complete until a code review pass has been done

For AI-driven work, prefer using the repository skills that reinforce this flow:

- `implement` for execution
- `tdd` when the task is test-first or benefits from it
- `review` or `requesting-code-review` before close-out

## Design System

All UI work must reference `docs/design-system.md` — the single source of truth for color tokens, typography, layout patterns, and component conventions. The login page (`frontend/src/pages/LoginPage.css`) is the reference implementation of the brand identity.

## Code Comments

所有代码注释必须使用中文编写。

When making substantive code changes, add concise comments that explain the intent, constraints, or non-obvious logic introduced by the change.

Avoid mechanical comments that merely restate the code line by line. Comments should help the next maintainer understand why the change exists or how the tricky part works.
