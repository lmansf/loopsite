# Loop — working rules

Read `design/05-build-spec.md` first. It is the single source of truth and it
supersedes every other document. `design/06-wp0-notes.md` records the places the
spec needed a ruling and what the scaffold decided.

## Ownership

**One agent, one directory. A file has exactly one owner.** The ownership map is
in `README.md` ("File ownership map"). Do not edit a file you do not own — not
to fix a typo, not to unblock yourself. Open an issue instead.

- **Never touch `src/lib/**` — the one exception is `src/lib/audio.ts`, owned by
  WP2.** Everything else under `src/lib/` is frozen after WP0. Builders code
  against the §F signatures verbatim; changing one breaks every other agent.
  Editing `src/lib/types.ts` is the failure mode that costs the swarm a day.
- **`package.json` `dependencies` is frozen.** A new dependency needs the
  architect's approval and a Tier B budget line.
- **Never edit another room's folder, another room's test, or a top-level
  `tests/*.spec.ts` you do not own.**

## The two append-only shared files

1. **`src/sections/registry.ts`** — every slot already exists, one import per
   line, so two agents never touch the same line. Your slot already points at
   `src/sections/<your-slug>/index.ts`; write the real `SectionModule` there as
   the default export and you are registered. Touch the registry only if your own
   slot's metadata is wrong, and then only your own line.
2. **`tests/rooms/`** — one file per room, named for the room. Create and own
   only the files for the rooms your work package owns. See
   `tests/rooms/README.md`.

## Non-negotiables

- One `requestAnimationFrame` in the whole application, owned by
  `src/lib/clock.ts`. Rooms register a draw callback with `subscribeFrame`.
- Rooms never mutate `props.nodes`, never draw on the ring layer, never call
  `matchMedia`, never touch `localStorage` (use `@/lib/storage`), and never read
  `window`/`document` outside an effect. The last two are lint errors.
- Under reduced motion every room renders a **still, complete composition** —
  never a blank box. `tests/reduced-motion.spec.ts` fails on a uniform image.
- No word may appear on the site that is not in §I of the build spec.
- No fake counts, no invented people, no "live" language, no countdowns, no
  sign-up prompts, no `read more` / `learn more` / `click here`.

## Before every push

```bash
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
export NO_PROXY=localhost,127.0.0.1
export no_proxy=localhost,127.0.0.1

pnpm verify
```

`pnpm verify` = `typecheck → lint → build → budget → unit → e2e → a11y`.
It must be green, and your PR must state its Tier B delta from `pnpm budget`.

Never run `pnpm exec playwright install` — Chromium rev 1194 is preinstalled at
`/opt/pw-browsers`, which is why `@playwright/test` is pinned to 1.56.1.
