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
  - Total: at most 2 + `limit` requests, well under the published limit.
- **Budget**: 2.5 seconds total per tool call, each request with its own `AbortController`. Over budget, error, or `429`: the Registrai part is skipped, the answer lists it under "Not searched" with `timeout`, `unavailable` or `rate_limited`, and T-10 is added. A `429` also blocks further calls until `retry-after` passes.
- **Cache**: in process memory only, keyed by URL, expiring after 15 minutes. Embeddings of Registrai summaries are cached the same way, keyed by the hash of the summary text. Nothing from Registrai is written to disk, logs, the dataset or the search index. A test runs a search with a mocked Registrai and asserts that no file is written.
- **What the dataset stores**: only `registraiSlug` on a hackathon or grant record whose match the maintainer confirmed. The refresh may call `GET /ecosystem?q=<name>` to suggest matches; the suggestion goes into the refresh report, not into the data, until the maintainer confirms it.
- **Typing**: types generated from the OpenAPI file and pinned in the repository; a contract test checks recorded responses; the weekly refresh runs one live call and reports a schema drift.
- **Untrusted text**: names and summaries from Registrai are stripped of control characters and capped at 400 characters before entering an answer.
- **Attribution**: whenever any Registrai field is in an answer, the `attribution` object and the Attribution block carry `Registrai, builder.registrai.cc, CC BY 4.0` and the link (BR2).

## Consequences

- Good: no Registrai data copied; fresh data on every query; the answer survives a Registrai outage.
- Bad: the first query after a restart pays for one directory download and the embedding of its summaries; later queries in the next 15 minutes do not.
- If Registrai changes or removes the REST API, the adapter can switch to its MCP server without changing the domain.
- This relies on Registrai's published terms as read on 2026-11-15; a change in their terms needs a new review.
