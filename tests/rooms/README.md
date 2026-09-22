# `tests/rooms/` — one file per room, append-only

This directory and `src/sections/registry.ts` are the **only two shared things**
in the build (spec §G). The rule that keeps seven agents out of each other's way:

> **One file per room, named for the room. You create and own exactly the files
> for the rooms your work package owns. You never edit another room's file, and
> you never edit a top-level `tests/*.spec.ts`.**

| File | Owner |
|---|---|
| `origin.spec.ts`, `return.spec.ts` | WP1 |
| `pulse.spec.ts`, `tone.spec.ts` | WP2 |
| `trail.spec.ts` | WP3 |
| `swarm.spec.ts`, `mirror.spec.ts` | WP4 |
| `growth.spec.ts`, `orbit.spec.ts` | WP5 |
| `loom.spec.ts`, `wear.spec.ts` | WP6 |
| `garden.spec.ts` | WP7 |
| `_example.spec.ts` | WP0 (the template — copy it) |

Top-level suites are owned as follows and are **not** yours to edit:
`smoke.spec.ts`, `rooms.spec.ts`, `a11y.spec.ts`, `reduced-motion.spec.ts`,
`fixtures.ts` → WP0. `navigation.spec.ts` → WP3. `hidden.spec.ts` → WP7.

## Writing one

```bash
cp tests/rooms/_example.spec.ts tests/rooms/<your-slug>.spec.ts
```

Every room spec must assert, at minimum:

1. the room's `<section id="section-<slug>">` is in the raw response body;
2. `/?s=<slug>` activates it and its chunk mounts within 2 s;
3. it emits `section_viewed` (intercept `POST /api/beacon` with `page.route`);
4. the room canvas keeps a real `aria-label`;
5. the room's own trick actually happens — the part only you can write.

Import `test` and `expect` from `../fixtures`, never from `@playwright/test`:
the fixture is what asserts zero console errors, zero page errors and no
response >= 400 on every spec in the suite.
