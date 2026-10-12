# Mahbusa

A lightweight Mahbusa board for two people sharing one device. Svelte 5,
TypeScript, Vite and SVG. No accounts, server, saved games or tracking.

- Play now, no sign-in: https://mahbusa.bubblyspice4.chatgpt.site
- Public source: https://github.com/ramikamel/mahbusa

## Run

Install Node.js 22.18+ and pnpm, then:

```sh
pnpm install
pnpm dev
```

Open the printed localhost URL in Chrome. Play in landscape on phones.

```sh
pnpm check
pnpm test
pnpm test:engine
pnpm test:offline
pnpm build
pnpm preview
```

`test:engine` runs the full engine suite with Node's built-in test runner and needs
no downloaded dependencies. `test` checks the Vitest integration as well.
The build generates an asset-only service worker. Test offline behavior with the
production preview, not the development server.

## Rules

15 checkers per player, opposing directions, pinning rather than hitting.
A mother-piece pin immediately wins 2 points, without exceptions. Bear-off wins
1 point or 2 when the opponent has none off. First to 3 or more wins the round.
Maximum dice usage and higher-die priority are enforced, including four moves
for doubles. Undo is available within a turn, before a win or End Turn.
See [the agreed plan](docs/PLAN.md) and [rules reference](https://en.wikipedia.org/wiki/Plakoto).

## Structure

- `src/lib/engine.ts`: pure immutable state transitions and legal sequence search.
- `src/components/Board.svelte`: scalable SVG, input and accessible point labels.
- `src/App.svelte`: controls, round flow, dialogs and ephemeral UI state.
- `scripts/offline.mjs`: asset cache generation and production fixture exclusion.
- `tests/engine.node.test.mjs`: rule scenarios, complete rounds and performance.

## Browser validation

Use Chrome through the connected extension. Development-only fixtures are
available in the footer or with `?scenario=mother-win`. Production builds omit
the fixtures and predetermined dice input. Follow [the scenario checklist](docs/BROWSER_TESTS.md).
Actual iPhone/Safari installation and offline checks remain required before release.

On iPhone: Safari → Share → Add to Home Screen. Load once online. Cached files
permit offline play, but refreshing or restarting clears the game and scores.
The app may survive backgrounding while the OS keeps it alive.

## Repository and delivery

Commit coherent changes after checks and push each validated checkpoint.
The canonical remote is the public `ramikamel/mahbusa` repository. For a new
checkout or a different account, authenticate and verify the owner before creating
a repository:

```sh
gh auth login
gh api user --jq .login
gh repo create mahbusa --public --source=. --remote=origin --push
```

GitHub Actions runs checks, both test suites and the build. Sites deployment
uses `.openai/hosting.json`; this manifest records site identity, not credentials.
See [validation status](docs/VALIDATION.md) for completed checks and pending work.
