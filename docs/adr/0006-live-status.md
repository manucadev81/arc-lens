# ADR-0006: Live status from evidence, Unknown by default

- Status: proposed
- Date: 2026-11-15
- Owner: Architecture
- Requirements: US-07, Q3, NFR-02

## Context

US-07 asks for Live, Not live or Unknown, always with the evidence used. The idea lists three possible signals: demo up, recent commits, onchain activity via Registrai. Many hackathon projects have dead demos or deleted repositories. "Unknown is not no" (Product principle 4).

## Decision

### Signals

| Signal | When it is read | Result values |
|---|---|---|
| Registrai status | At query time, for records with a confirmed `registraiSlug` and for directory entries | `live`, `deployed`, `announced`, missing |
| Demo check | At refresh | `responds` (HTTP 2xx or 3xx to a final 2xx within 10 seconds), `fails`, `no demo link` |
| Repository activity | At refresh, through the GitHub API without authentication or with the workflow token | last commit date, `archived`, `not found`, `no repository link` |

### Rule

Evaluated in this order; the first rule that applies decides:

1. Registrai status is `live` → **Live**. Evidence: `Registrai status live, queried <date>`.
2. Registrai status is `announced` → **Not live**. Evidence: `announced on Registrai, not launched`.
3. Demo `responds` and last commit within 180 days → **Live**.
4. Demo `fails` or no demo link, **and** repository `archived`, `not found`, or last commit older than 365 days → **Not live**.
5. Anything else, including Registrai `deployed` without other signals → **Unknown**.

Evidence always lists every signal read, with its date, for example `demo responds 2026-11-10; last commit 2026-11-02`. Signals that could not be read are listed as such.

### Limits

- A demo that responds may be a parked domain; the rule accepts this and shows the evidence so a person can judge.
- No onchain reading outside Registrai: the product has no onchain component (BR8).

## Consequences

- Good: deterministic, testable with fixed inputs, and transparent; Unknown is the default when evidence is thin.
- Bad: a project can show Live because of a stale demo page; the evidence text makes this visible.
- The 180 and 365 day windows are provisional and live in `config/status.json`.
