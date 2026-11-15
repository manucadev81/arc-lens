# ADR-0005: Registrai queried live through its REST API, memory-only cache

- Status: proposed
- Date: 2026-11-15
- Owner: Architecture
- Requirements: US-03, US-09, BR2, BR3, NFR-03, NFR-04

## Context

Registrai is the source for the Arc ecosystem directory and onchain volume. BR3 says its data is queried with attribution and not copied into the dataset. Its public pages (read 2026-11-15) describe:

- a read-only MCP server over Streamable HTTP at `https://builder.registrai.cc/api/mcp`, no key;
- a REST data API at `https://builder.registrai.cc/api/v1`, version 1, public, no key, CORS open, with an OpenAPI 3.1 file at `/api/v1/openapi.json`;
- endpoints including `GET /ecosystem` (parameters `category`, `status`, `q`), `GET /ecosystem/{slug}` and `GET /arc/apps-week`;
- a limit of 100 requests per 10 seconds per IP, with `429` and `retry-after` above it; responses cached on their side for 60 seconds;
- data under CC BY 4.0, with the credit `Registrai, builder.registrai.cc, CC BY 4.0` and a link to `builder.registrai.cc`.

## Options

1. **Call the Registrai MCP server from our server** (MCP client inside an MCP server). Works, but tool input schemas are not published on the pages read and the response is text meant for a model.
2. **Call the REST API**, typed from its OpenAPI file.
3. **Copy the directory into the dataset at refresh.** Violates BR3.

## Decision

Option 2.

- **Calls per tool invocation**:
  - `GET /ecosystem` once (whole directory), served from the in-memory cache when fresh;
  - `GET /ecosystem/{slug}` for each Registrai entry in the final results (at most `limit`);
  - `GET /arc/apps-week` once, when any card needs volume.
  - Caps per tool call: `search_similar_projects` at most 2 + `limit`; `get_category_gaps` at most 2 (`/ecosystem`, `/arc/apps-week`), no detail calls; `lookup_project` at most 2 (`/ecosystem` and one detail call for a single matched project). All well under the published limit.
- **Budget**: 2.5 seconds from the start of the tool call cover the whole Registrai branch, HTTP and the embedding of uncached directory summaries. Embedding runs in batches of 32 with the deadline checked between batches; at the deadline, already embedded entries take part in the semantic ranking, all fetched entries take part in the keyword ranking, and Coverage marks Registrai as partially searched. Each request has its own `AbortController`. No directory response within the budget, error, or `429`: the Registrai part is skipped, the answer lists it under "Not searched" with `timeout`, `unavailable` or `rate_limited`, and T-10 is added. A `429` also blocks further calls until `retry-after` passes.
- **Cache**: in process memory only, keyed by URL, expiring after 15 minutes. Each cached response keeps the time it was fetched upstream; Coverage shows that `fetchedAt` and marks a cache hit as `from cache`, never as a fresh query. Embeddings of Registrai summaries are cached the same way, keyed by the hash of the summary text. Nothing from Registrai is written to disk, logs, the dataset or the search index. A test runs a search with a mocked Registrai and asserts that no file is written.
- **What may be stored outside memory** (and nothing else):
  - Registrai slugs in `data/projects.json` (confirmed links) and in `data/identity-pending.json` (proposals), each next to Arc Lens's own ids and the reason for the proposal (for example `same repository URL`). No Registrai name, summary, status, category or volume is stored.
  - The refresh report (the public pull request body) lists the same identifiers and reasons, plus the result of the weekly live schema check (`pass` or the list of changed field paths). It does not include Registrai response content.
  - Retention: these identifiers stay as long as the link stays in the dataset; proposals rejected by the maintainer are deleted from `identity-pending.json`.
- **Typing and tests**: types generated from the OpenAPI file and pinned in the repository. Tests use **synthetic fixtures** written by hand to match the OpenAPI schema, not saved copies of real responses. The weekly refresh makes one live call, validates the response against the pinned schema in memory, discards it and reports only the result.
- **Untrusted text**: names and summaries from Registrai are stripped of control characters and capped at 400 characters before entering an answer.
- **Attribution**: whenever any Registrai field is in an answer, the `attribution` object and the Attribution block carry `Registrai, builder.registrai.cc, CC BY 4.0` and the link (BR2).

## Consequences

- Good: no Registrai data copied; fresh data on every query; the answer survives a Registrai outage.
- Bad: the first query after a restart pays for one directory download and the embedding of its summaries; later queries in the next 15 minutes do not.
- If Registrai changes or removes the REST API, the adapter can switch to its MCP server without changing the domain.
- This relies on Registrai's published terms as read on 2026-11-15; a change in their terms needs a new review.
