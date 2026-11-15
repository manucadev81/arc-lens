# ADR-0007: Apache-2.0 for code, CC BY 4.0 for the dataset

- Status: proposed (owner confirms in A-03)
- Date: 2026-11-15
- Owner: Architecture
- Requirements: US-13, BR2, BR3, BR5, Q10, NFR-04, NFR-07

## Context

The server and the dataset are published openly so the community can use and contribute (US-13). Registrai, a likely consumer of the dataset (idea, collaboration model), publishes under CC BY 4.0. `circlefin/skills` is Apache-2.0. The dataset is built from third-party hackathon and grant pages whose text may be protected, even though facts (project name, event, prize, date, link) are not.

## Options

1. **Code MIT, dataset CC0.** Maximum reuse; no credit back to sources or to this project.
2. **Code Apache-2.0, dataset CC BY 4.0.** Reuse with credit; same license family as Registrai; patent grant on the code.
3. **Code and dataset under one license (Apache-2.0).** Software licenses fit data poorly.

## Decision

Option 2.

- `LICENSE` (Apache-2.0) covers the code.
- `data/LICENSE` (CC BY 4.0) covers the files in `data/`, with the credit `Arc Lens dataset, github.com/manucadev81/arc-lens, CC BY 4.0`.
- **Descriptions are paraphrased**: collectors keep the source text only in memory; the stored `description` is a short paraphrase of at most 400 characters written by the maintainer or produced at refresh and reviewed in the pull request. Verbatim text is stored only when the source's terms allow it, noted in `sources.json`.
- Each record keeps its `source.url`, so the original page is always credited (BR4).
- No Registrai data is in the dataset (BR3), so Registrai's license does not attach to the dataset; it attaches to answers, through the Attribution block (BR2).

## Consequences

- Good: Registrai and others can consume the dataset with a simple credit; the code license matches the closest ecosystem project.
- Bad: paraphrasing costs maintainer time at each refresh; new records without a reviewed description use the event name and category until reviewed.
- This is not legal advice; if the owner wants certainty about a specific source, the terms of that source decide.
