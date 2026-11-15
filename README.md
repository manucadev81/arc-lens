# arc-lens
Open ecosystem intelligence MCP for builders on Arc: hackathon projects, Circle grants, prior art and gaps

## Development

Requirements: Node.js 22 or later and pnpm 10 (pinned in `package.json` under `packageManager`).

```sh
pnpm install --frozen-lockfile
pnpm check
```

| Command | What it does |
|---|---|
| `pnpm format:check` | Checks formatting (Biome) |
| `pnpm lint` | Lints (Biome) |
| `pnpm typecheck` | Type-checks the domain with no Node.js or DOM types, and the rest of the project with Node.js types |
| `pnpm boundaries` | Fails if `src/domain` or `src/ports` import adapters, the MCP SDK, transformers, HTTP clients or Node.js built-ins, or use globals such as `fetch` or `process` |
| `pnpm test` | Runs unit tests (Vitest). `fetch` is blocked, so a test that tries to reach the network fails |
| `pnpm build` | Compiles `src` to `dist` |
| `pnpm check` | Runs all of the above in CI order |

## Layout

| Path | Content |
|---|---|
| `src/domain` | Domain types and rules, pure TypeScript |
| `src/ports` | Interfaces for the dataset, embedder, ecosystem directory and clock |
| `src/adapters` | Implementations of the ports (packaged files, transformers.js, Registrai, MCP transports) |
| `scripts/boundaries` | Domain boundary analysis used by `pnpm boundaries` |
| `test/fakes` | Deterministic fakes for every port: in-memory dataset, fixed-vector embedder, recorded directory and fixed clock |
