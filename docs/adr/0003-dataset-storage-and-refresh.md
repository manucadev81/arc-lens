# ADR-0003: Dataset as JSON files in the repository, refreshed through a reviewed pull request

- Status: proposed
- Date: 2026-11-15
- Owner: Architecture
- Requirements: US-01, US-02, US-10, US-11, US-12, US-13, BR1, BR4, BR5, BR6, NFR-01, NFR-07, NFR-08

## Context

The dataset is small (hundreds of records), must be open and reusable (US-13), must be easy for one unfunded maintainer to refresh weekly (NFR-08), and must never lose a source's data because another source failed (US-10). Every record needs a source link and data date (BR4), and no personal data (BR1).

## Options

1. **JSON files in the repository**, one per source, validated by JSON Schema; search index built at release.
2. **SQLite file in the repository.** Queryable, but binary diffs make refresh reviews and community corrections hard.
3. **Hosted database.** Needs a server and money; contradicts ADR-0001.

## Decision

Option 1.

- **Files**: `data/records/<source-id>.json`, `data/sources.json`, `data/categories.json`, `data/aliases.json`, `data/projects.json`, `data/identity-pending.json`, `data/manifest.json` (fields in section 5 of `03-architecture.md`).
- **Schemas**: `schemas/*.schema.json` (JSON Schema 2020-12), `additionalProperties: false` on records. A CI job validates every file on every pull request.
- **Search index**: built by the release workflow from the JSON files and shipped in the npm package; not committed.
- **Refresh** (`npm run refresh`, run locally or by the `refresh` GitHub Actions workflow on a weekly schedule and on demand):
  1. For each source in `sources.json` with `termsCheck.result = "allowed"` and `method = "collector"`, run its collector into a candidate file.
  2. Validate the candidate: schema, personal-data checks, and record count at least 80% of the previous file.
  3. If valid, replace the source file, keeping `firstSeen` and `id` of existing records; compute status signals (ADR-0006).
  4. If invalid or the collector failed, keep the previous file and record the reason.
  5. Propose identity links for new or changed occurrences by strong keys (same normalized repository URL, same website domain, or a Registrai entry whose links contain them) into `identity-pending.json`; same-name occurrences without a strong key are added as `possible`. Nothing is added to `projects.json` automatically.
  6. Write `manifest.json` (per-source data dates and counts; a source whose previous file was kept keeps its previous data date) and the refresh report (Product 6.5), which also lists identity proposals and sources with retained older data.
  7. Open a pull request titled `Data refresh YYYY-MM-DD` with the report as its body. The maintainer confirms identity links by moving them from `identity-pending.json` to `projects.json` in that pull request.
- **Publication**: nothing reaches users until the maintainer merges the pull request; the merge triggers the release workflow, which checks the eval gate (ADR-0002), builds the index and publishes the npm package with provenance.
- **Community corrections**: a wrong or missing project is reported through an issue template (Product F4); a fix is a normal pull request to the JSON file.

## Consequences

- Good: diffs are readable; the maintainer reviews exactly what changed; the dataset is reusable without running the server; failures are isolated per source.
- Bad: the repository grows with every refresh (small: text only).
- The weekly schedule only prepares the pull request; whether this satisfies BR6 is A-06.
- Collectors are code that depends on third-party page formats. Each collector has a fixture test with a saved page, and the count guard catches silent shrinkage.
