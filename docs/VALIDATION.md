# Validation record

## Completed locally

- Git repository initialized on `main`; incremental source commits recorded.
- Full pure-engine suite: 16 tests passed using the bundled Node 24 runtime.
- Tests include mother wins in both directions, pin/release, blocking, forced
  dice ordering, higher-die priority, partial doubles, bearing off, score,
  undo, blocked handover, a complete simulated round and piece conservation.
- Spread-board double-1 legal sequence search: approximately 6 ms on this Mac.
  This is not an iPhone responsiveness measurement.
- Engine and scenario modules passed strict TypeScript checking using a locally
  available TypeScript compiler.
- Home Screen PNG icons generated from the SVG source.

## Pending — do not treat as release acceptance

- Dependency installation: terminal DNS cannot resolve `registry.npmjs.org`.
- Svelte component checks, Vitest execution and Vite production build.
- Lockfile generation and switching CI installation to frozen-lockfile mode.
- Chrome gameplay/visual scenarios. Chrome extension is now connected, but the
  app cannot be built or served with Vite until dependencies are available.
- iPhone/Safari installation, standalone offline launch, touch and performance.
- GitHub owner verification, public repository creation and pushes. GitHub is
  not connected through a plugin and Chrome currently shows its sign-in screen.
- Sites source synchronization and deployment. Site identity is registered in
  `.openai/hosting.json`, but there is no deployed version.

After dependency installation, run all commands in README, execute the browser
checklist and update this record with observed outcomes, not inferred passes.
