# ADR-0001: Local stdio server distributed through npm, Streamable HTTP for self-hosting

- Status: proposed
- Date: 2026-11-15
- Owner: Architecture
- Requirements: US-08, US-13, NFR-03, NFR-06, NFR-07, NFR-08, BR8

## Context

Arc Lens is reached only through MCP clients (US-08). The project has no funding and a single maintainer (NFR-08), and no payment component (BR8). It calls Registrai at query time, and Registrai limits requests per IP (100 requests per 10 seconds, per its public data API page). Builders mostly use desktop or CLI agents (Claude Code, Cursor, other MCP hosts); some web clients accept only remote servers.

## Options

1. **Local stdio server published to npm** (`npx -y arc-lens`). Runs on the user's machine; the dataset ships inside the package.
2. **Public remote server over Streamable HTTP, run by the maintainer.** One URL for everyone; needs hosting, monitoring and abuse control; all Registrai calls leave from one IP.
3. **Both from the same code**: stdio as the default, Streamable HTTP available with a flag for anyone who wants to host it.

## Decision

Option 3, with no public endpoint run by the maintainer in v1:

- One TypeScript package built on the official MCP TypeScript SDK. Node.js 22 or later.
- Default: stdio. Example for Claude Code: `claude mcp add arc-lens -- npx -y arc-lens`. Other clients use the same command in their configuration.
- `arc-lens --http [--port 3333] [--host 127.0.0.1]` starts the Streamable HTTP transport for self-hosting. It binds to `127.0.0.1` unless `--host` is given and validates the `Origin` header.
- The server does not rely on protocol-level session state, so either transport works the same way.
- Whether the maintainer should also run a public endpoint is A-01. If the owner says yes later, the same binary runs behind a host with a per-IP rate limit, and the Registrai concentration risk is accepted then.

## Consequences

- Good: zero hosting cost and zero operations for the maintainer; each user calls Registrai from their own IP; works offline for the dataset part; same answers in every client (US-08).
- Bad: clients that accept only remote servers cannot use v1 without self-hosting.
- The package carries the dataset and the search index, so a new dataset reaches users with a new package version; `npx -y` picks it up on the next start.
- The first run downloads the embedding model (ADR-0002); the README must say so.
