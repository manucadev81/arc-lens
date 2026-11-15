# Arc Lens: implementation plan

Stage: Engineering planning. This plan decomposes the approved architecture into 30 tasks with 121 acceptance criteria. It does not implement the product, authorize a merge, or mark any implementation task complete.

## 1. Sources and reviewed baseline

| Source | Pull request | Fixed baseline |
|---|---|---|
| Idea | [#1](https://github.com/manucadev81/arc-lens/pull/1) | `f62266ddeb8301a928c8b2713ba84c9b473534d0` |
| Requirements | [#2](https://github.com/manucadev81/arc-lens/pull/2) | `3f8642ecf726a02f9f73c7735980357403b10403` |
| Product | [#3](https://github.com/manucadev81/arc-lens/pull/3) | `5b8457248a419cb92fa3ecfaa508aeebc94952ce` |
| Architecture and ADRs 0001–0007 | [#4](https://github.com/manucadev81/arc-lens/pull/4) | `72389782111a9a53713694d6ef2692c97ee8f0fa` |

PR #1 contains the idea; requirements are in PR #2. Product and Architecture are still separate open PRs at planning time. Their commit links are the implementation baseline, even before those files reach main. The architecture approval is [recorded here](https://github.com/manucadev81/arc-lens/pull/4#issuecomment-6898259444). Changes to the baseline require an explicit review and affected-task update.

## 2. Scope, priorities and decisions

The MVP is a local read-only MCP server, with three tools, a reusable Arc-only hackathon/grant dataset, live Registrai enrichment, weekly reviewed refresh and optional self-hosted Streamable HTTP. There is no blockchain, payment feature, user account, hosted service operated by the maintainer, or continuous automatic data publication in the default scope.

Must/Should priorities follow Requirements. S/M sizes are provisional relative planning estimates, not dates or measured throughput. RICE is not numerically scored because measured reach, impact and effort inputs are unavailable; no fabricated adoption or delivery values are used. Source-coverage and correctness gates take precedence over outreach.

Owner premises A-01–A-07 remain pending until explicitly answered in [T01 / #5](https://github.com/manucadev81/arc-lens/issues/5). The approved defaults remain visible: local stdio plus optional self-hosting, proposed license pair, exclusions for forbidden sources, proposed timing/count thresholds, reviewed weekly refresh, and the multi-occurrence/degraded-answer layout. A pending decision blocks only the affected action; license publication, an alternate public endpoint, forbidden-source manual entry and changed acceptance targets require the corresponding owner decision. Final package/model selection is validated in its own task.

## 3. Execution order and gates

Dependencies in the task table are mandatory technical prerequisites; tasks in the same wave may run independently when their own prerequisites are satisfied. A role is accountable for the deliverable, not a pre-assigned individual.

| Wave | Outcome | Gate |
|---|---|---|
| 0 | Owner and Product alignment | Pending premises and affected actions are explicitly recorded; approved defaults are not silently changed |
| 1 | Package boundaries, schemas, identity and source permissions | Deterministic fakes/schema tests; no collector runs for an unapproved source |
| 2 | Initial source adapters, refresh, categories, status, model/index and Registrai | Source-isolated failures; no personal/Registrai payload persisted; index/model compatibility checked |
| 3 | Ranking, degraded paths, coverage, contracts and evaluation | Identity counts once; partial/keyword-only results never imply complete semantic absence; eval gate defined |
| 4 | Three use cases, transports and onboarding | Same facts through text/structured and stdio/HTTP; documented clean-package commands |
| 5 | Security and package/release pipeline | Blocking security findings fixed; reproducible tarball, licenses and provenance configuration checked |
| 6 | Integrated QA and readiness | Measured acceptance evidence, source-coverage gaps and role verdicts recorded for the maintainer |
| 7 | Collaboration drafts and outcome tracking | External outreach remains unsent until its separate approval |

Suggested first executable tasks: [T01 / #5](https://github.com/manucadev81/arc-lens/issues/5) and [T02 / #6](https://github.com/manucadev81/arc-lens/issues/6). No implementation starts merely because this planning PR exists; the coordinator assigns the next stage.

## 4. Task index

| Task / issue | Deliverable | Wave | Owner role | Priority | Size | Dependencies |
|---|---|---|---|---|---|---|
| [T01 / #5](https://github.com/manucadev81/arc-lens/issues/5) | Resolve owner premises and align the product contract | 0 | Product | Must | S | None |
| [T02 / #6](https://github.com/manucadev81/arc-lens/issues/6) | Establish the TypeScript package, domain boundaries and CI | 1 | Implementation | Must | M | None |
| [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7) | Implement dataset schemas, manifest validation and stable identifiers | 1 | Implementation | Must | M | [T02 / #6](https://github.com/manucadev81/arc-lens/issues/6) |
| [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10) | Implement confirmed project identity, aliases and occurrence-preserving cards | 1 | Implementation | Must | M | [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7) |
| [T05 / #11](https://github.com/manucadev81/arc-lens/issues/11) | Audit source terms and define the initial coverage inventory | 1 | Requirements | Must | M | [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7) |
| [T06 / #13](https://github.com/manucadev81/arc-lens/issues/13) | Collect the approved ETHGlobal Arc-track records | 2 | Implementation | Must | M | [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7), [T05 / #11](https://github.com/manucadev81/arc-lens/issues/11) |
| [T07 / #14](https://github.com/manucadev81/arc-lens/issues/14) | Collect the approved LabLab Arc-event records | 2 | Implementation | Must | M | [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7), [T05 / #11](https://github.com/manucadev81/arc-lens/issues/11) |
| [T08 / #15](https://github.com/manucadev81/arc-lens/issues/15) | Collect approved Circle hackathons and grant cohorts | 2 | Implementation | Must | M | [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7), [T05 / #11](https://github.com/manucadev81/arc-lens/issues/11) |
| [T09 / #19](https://github.com/manucadev81/arc-lens/issues/19) | Implement the reviewed weekly refresh workflow and report | 2 | DevOps | Must | M | [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10), [T06 / #13](https://github.com/manucadev81/arc-lens/issues/13), [T07 / #14](https://github.com/manucadev81/arc-lens/issues/14), [T08 / #15](https://github.com/manucadev81/arc-lens/issues/15) |
| [T10 / #12](https://github.com/manucadev81/arc-lens/issues/12) | Implement the curated category registry and mappings | 2 | Product | Must | M | [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7) |
| [T11 / #16](https://github.com/manucadev81/arc-lens/issues/16) | Implement evidence-based project status and refresh signals | 2 | Implementation | Must | M | [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10) |
| [T12 / #8](https://github.com/manucadev81/arc-lens/issues/8) | Implement the pinned local multilingual embedder lifecycle | 2 | Implementation | Must | M | [T02 / #6](https://github.com/manucadev81/arc-lens/issues/6) |
| [T13 / #17](https://github.com/manucadev81/arc-lens/issues/17) | Build reproducible packaged search indexes | 2 | Implementation | Must | M | [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7), [T10 / #12](https://github.com/manucadev81/arc-lens/issues/12), [T12 / #8](https://github.com/manucadev81/arc-lens/issues/8) |
| [T14 / #20](https://github.com/manucadev81/arc-lens/issues/20) | Implement hybrid ranking, project collapse and partial-hybrid labels | 3 | Implementation | Must | M | [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10), [T12 / #8](https://github.com/manucadev81/arc-lens/issues/8), [T13 / #17](https://github.com/manucadev81/arc-lens/issues/17) |
| [T15 / #21](https://github.com/manucadev81/arc-lens/issues/21) | Implement keyword-only search and unresolved free-text gaps | 3 | Implementation | Must | M | [T10 / #12](https://github.com/manucadev81/arc-lens/issues/12), [T12 / #8](https://github.com/manucadev81/arc-lens/issues/8), [T13 / #17](https://github.com/manucadev81/arc-lens/issues/17) |
| [T16 / #9](https://github.com/manucadev81/arc-lens/issues/9) | Implement the typed Registrai client and memory-only cache | 2 | Implementation | Must | M | [T02 / #6](https://github.com/manucadev81/arc-lens/issues/6) |
| [T17 / #22](https://github.com/manucadev81/arc-lens/issues/22) | Implement bounded Registrai enrichment and partial-search deadlines | 3 | Implementation | Must | M | [T11 / #16](https://github.com/manucadev81/arc-lens/issues/16), [T12 / #8](https://github.com/manucadev81/arc-lens/issues/8), [T16 / #9](https://github.com/manucadev81/arc-lens/issues/9) |
| [T18 / #18](https://github.com/manucadev81/arc-lens/issues/18) | Implement coverage, freshness, uncertainty and attribution | 3 | Implementation | Must | M | [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7), [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10), [T16 / #9](https://github.com/manucadev81/arc-lens/issues/9) |
| [T19 / #23](https://github.com/manucadev81/arc-lens/issues/23) | Implement tool schemas and the shared text/structured answer builder | 3 | Implementation | Must | M | [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10), [T18 / #18](https://github.com/manucadev81/arc-lens/issues/18), [T01 / #5](https://github.com/manucadev81/arc-lens/issues/5) |
| [T20 / #24](https://github.com/manucadev81/arc-lens/issues/24) | Implement the similar-project search use case | 4 | Implementation | Must | M | [T14 / #20](https://github.com/manucadev81/arc-lens/issues/20), [T15 / #21](https://github.com/manucadev81/arc-lens/issues/21), [T17 / #22](https://github.com/manucadev81/arc-lens/issues/22), [T19 / #23](https://github.com/manucadev81/arc-lens/issues/23) |
| [T21 / #25](https://github.com/manucadev81/arc-lens/issues/25) | Implement the category-gaps use case | 4 | Implementation | Must | M | [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10), [T10 / #12](https://github.com/manucadev81/arc-lens/issues/12), [T15 / #21](https://github.com/manucadev81/arc-lens/issues/21), [T17 / #22](https://github.com/manucadev81/arc-lens/issues/22), [T19 / #23](https://github.com/manucadev81/arc-lens/issues/23) |
| [T22 / #26](https://github.com/manucadev81/arc-lens/issues/26) | Implement project lookup, ambiguity and stable-ID resolution | 4 | Implementation | Must | M | [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10), [T11 / #16](https://github.com/manucadev81/arc-lens/issues/16), [T17 / #22](https://github.com/manucadev81/arc-lens/issues/22), [T19 / #23](https://github.com/manucadev81/arc-lens/issues/23) |
| [T23 / #28](https://github.com/manucadev81/arc-lens/issues/28) | Expose all tools over the default stdio transport | 4 | Implementation | Must | M | [T20 / #24](https://github.com/manucadev81/arc-lens/issues/24), [T21 / #25](https://github.com/manucadev81/arc-lens/issues/25), [T22 / #26](https://github.com/manucadev81/arc-lens/issues/26) |
| [T24 / #29](https://github.com/manucadev81/arc-lens/issues/29) | Expose the optional Streamable HTTP transport | 4 | Implementation | Must | M | [T23 / #28](https://github.com/manucadev81/arc-lens/issues/28) |
| [T25 / #27](https://github.com/manucadev81/arc-lens/issues/27) | Build the multilingual similarity evaluation and release quality gate | 3 | QA | Must | M | [T14 / #20](https://github.com/manucadev81/arc-lens/issues/20), [T15 / #21](https://github.com/manucadev81/arc-lens/issues/21) |
| [T26 / #30](https://github.com/manucadev81/arc-lens/issues/30) | Validate privacy, untrusted input and dependency safeguards | 5 | Security | Must | M | [T09 / #19](https://github.com/manucadev81/arc-lens/issues/19), [T19 / #23](https://github.com/manucadev81/arc-lens/issues/23), [T23 / #28](https://github.com/manucadev81/arc-lens/issues/28), [T24 / #29](https://github.com/manucadev81/arc-lens/issues/29) |
| [T27 / #32](https://github.com/manucadev81/arc-lens/issues/32) | Build the npm package and reviewed release pipeline | 5 | DevOps | Must | M | [T09 / #19](https://github.com/manucadev81/arc-lens/issues/19), [T13 / #17](https://github.com/manucadev81/arc-lens/issues/17), [T23 / #28](https://github.com/manucadev81/arc-lens/issues/28), [T24 / #29](https://github.com/manucadev81/arc-lens/issues/29), [T25 / #27](https://github.com/manucadev81/arc-lens/issues/27), [T28 / #31](https://github.com/manucadev81/arc-lens/issues/31), [T01 / #5](https://github.com/manucadev81/arc-lens/issues/5) |
| [T28 / #31](https://github.com/manucadev81/arc-lens/issues/31) | Write onboarding, licenses, contribution and maintenance guidance | 4 | Engineering | Must | M | [T01 / #5](https://github.com/manucadev81/arc-lens/issues/5), [T19 / #23](https://github.com/manucadev81/arc-lens/issues/23), [T23 / #28](https://github.com/manucadev81/arc-lens/issues/28), [T24 / #29](https://github.com/manucadev81/arc-lens/issues/29) |
| [T29 / #33](https://github.com/manucadev81/arc-lens/issues/33) | Validate the integrated release candidate and coverage target | 6 | QA | Must | M | [T06 / #13](https://github.com/manucadev81/arc-lens/issues/13), [T07 / #14](https://github.com/manucadev81/arc-lens/issues/14), [T08 / #15](https://github.com/manucadev81/arc-lens/issues/15), [T09 / #19](https://github.com/manucadev81/arc-lens/issues/19), [T20 / #24](https://github.com/manucadev81/arc-lens/issues/24), [T21 / #25](https://github.com/manucadev81/arc-lens/issues/25), [T22 / #26](https://github.com/manucadev81/arc-lens/issues/26), [T25 / #27](https://github.com/manucadev81/arc-lens/issues/27), [T26 / #30](https://github.com/manucadev81/arc-lens/issues/30), [T27 / #32](https://github.com/manucadev81/arc-lens/issues/32) |
| [T30 / #34](https://github.com/manucadev81/arc-lens/issues/34) | Prepare collaboration drafts and the 30-day outcome checklist | 7 | Product | Should | S | [T28 / #31](https://github.com/manucadev81/arc-lens/issues/31), [T29 / #33](https://github.com/manucadev81/arc-lens/issues/33) |

## 5. Task acceptance criteria

### T01. Resolve owner premises and align the product contract

Issue: [T01 / #5](https://github.com/manucadev81/arc-lens/issues/5). Owner: Product. Priority: Must. Size: S.

Keep implementation and publication decisions explicit.

Dependencies: None.

Traceability: Q1, Q2, Q4, Q6, Q7, Q10, P1, P2, P3, A-01–A-07, US-08.

Acceptance criteria:

- [ ] Record an owner decision or an explicit pending state for architecture A-01–A-07; retain the approved default premise until changed and name the affected task when pending.
- [ ] Align Product with project/occurrence cards, keyword-only and partial-hybrid states, T-16–T-20, exact attribution and English answers with Portuguese semantic input support.
- [ ] Confirm the package name/scope and source-permission process before package reservation or collection; public hosting, alternate licenses and forbidden-source manual entry require an owner decision.
- [ ] Changes to approved technical premises receive a linked ADR/PR; no source decision or acceptance threshold is silently invented.

### T02. Establish the TypeScript package, domain boundaries and CI

Issue: [T02 / #6](https://github.com/manucadev81/arc-lens/issues/6). Owner: Implementation. Priority: Must. Size: M.

Give each adapter a testable integration boundary.

Dependencies: None.

Traceability: US-08, NFR-08, Architecture §4.

Acceptance criteria:

- [ ] Node.js 22+ and TypeScript build, typecheck and test commands run from a clean install with a committed lockfile.
- [ ] Domain ports cover dataset, embedder, ecosystem directory and clock; domain tests use deterministic fakes and make no network calls.
- [ ] A boundary check fails when domain code imports adapters, the MCP SDK, transformers, fetch or filesystem APIs.
- [ ] Pull-request CI runs build, typecheck, boundary and unit checks; production/tests add no explanatory comments or disabled code.

### T03. Implement dataset schemas, manifest validation and stable identifiers

Issue: [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7). Owner: Implementation. Priority: Must. Size: M.

Make invalid public records fail before publication.

Dependencies: [T02 / #6](https://github.com/manucadev81/arc-lens/issues/6).

Traceability: US-01, US-02, US-12, BR1, BR4, ADR-0003, ADR-0004.

Acceptance criteria:

- [ ] JSON Schema 2020-12 validates per-source records, sources, categories, aliases, projects, identity proposals and the manifest; unknown record properties are rejected.
- [ ] Enforce stable occurrence/project identifier formats and 120-character bound, non-reuse, valid references and deterministic collision handling across reordered refresh input.
- [ ] Records retain project-level description, source URL/data date, event/cohort, winner or unknown flag and grant date; descriptions are at most 400 characters.
- [ ] CI rejects fixtures with team/contact fields, email addresses, handles or phone patterns; a human review check covers names not detectable by patterns.

### T04. Implement confirmed project identity, aliases and occurrence-preserving cards

Issue: [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10). Owner: Implementation. Priority: Must. Size: M.

Count projects once without discarding their funding and event history.

Dependencies: [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7).

Traceability: US-04, US-06, US-15, BR4, Architecture §5.6, ADR-0004.

Acceptance criteria:

- [ ] Only maintainer-confirmed projects.json links group occurrences; refresh proposes strong-key links in identity-pending.json and never merges by name alone.
- [ ] One confirmed project across three events, one grant and Registrai counts once and consumes one result slot while preserving five occurrence sources and prizes.
- [ ] Unlinked occurrences remain separate projects; unrelated same-name projects remain separate and uncertain relationships expose possibleSameAs/T-19 as specified.
- [ ] Occurrence IDs and old aliases resolve to the current project card; validation rejects overlapping confirmed membership, dangling references and alias cycles.

### T05. Audit source terms and define the initial coverage inventory

Issue: [T05 / #11](https://github.com/manucadev81/arc-lens/issues/11). Owner: Requirements. Priority: Must. Size: M.

Collect only eligible sources and make exclusions explicit.

Dependencies: [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7).

Traceability: US-01, US-02, US-11, BR5, Q4, M1.

Acceptance criteria:

- [ ] Inventory ETHGlobal Cannes/HackMoney 2026 Arc tracks, both named LabLab Arc events, Circle hackathons and published 2025/2026 grant cohorts with source URLs.
- [ ] Record terms URL, check date, allowed/forbidden/pending outcome and rationale per source before any collection; uncertain permission remains pending.
- [ ] Forbidden/pending sources never run collectors and appear as excluded; manual entry for a forbidden source follows the owner decision rather than bypassing it.
- [ ] Coverage report enumerates expected events/cohorts and exclusions, so the target of at least four hackathons and every published cohort can be checked without claiming unverified completeness.

### T06. Collect the approved ETHGlobal Arc-track records

Issue: [T06 / #13](https://github.com/manucadev81/arc-lens/issues/13). Owner: Implementation. Priority: Must. Size: M.

Provide the first independently refreshable hackathon source.

Dependencies: [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7), [T05 / #11](https://github.com/manucadev81/arc-lens/issues/11).

Traceability: US-01, US-10, US-12, BR1, BR4, BR5, M1.

Acceptance criteria:

- [ ] Eligible Cannes and HackMoney 2026 Arc-track pages produce per-source records; other tracks are excluded.
- [ ] Winner flags reflect source evidence and missing winner information becomes unknown; every record has event, source URL and collection/publication date.
- [ ] Collectors discard team sections before building records and produce reviewed paraphrases rather than storing unrestricted copied descriptions.
- [ ] Sanitized fixture tests cover normal pages, missing fields and changed markup; count shrinkage/failure is surfaced to the refresh orchestrator.

### T07. Collect the approved LabLab Arc-event records

Issue: [T07 / #14](https://github.com/manucadev81/arc-lens/issues/14). Owner: Implementation. Priority: Must. Size: M.

Cover the two required agent-focused events.

Dependencies: [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7), [T05 / #11](https://github.com/manucadev81/arc-lens/issues/11).

Traceability: US-01, US-10, US-12, BR1, BR4, BR5, M1.

Acceptance criteria:

- [ ] Eligible Agentic Commerce on Arc and Agentic Economy on Arc sources produce records isolated by source.
- [ ] Each record preserves event, winner/unknown evidence, source URL and date, with no team-member names or contacts.
- [ ] Descriptions are short reviewed paraphrases; forbidden/pending sources are skipped with the documented reason.
- [ ] Sanitized fixture tests detect changed markup and missing prize information; stable IDs survive reordered source listings.

### T08. Collect approved Circle hackathons and grant cohorts

Issue: [T08 / #15](https://github.com/manucadev81/arc-lens/issues/15). Owner: Implementation. Priority: Must. Size: M.

Cover the required grant history and remaining hackathon sources.

Dependencies: [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7), [T05 / #11](https://github.com/manucadev81/arc-lens/issues/11).

Traceability: US-01, US-02, US-10, US-12, BR1, BR4, BR5, M1.

Acceptance criteria:

- [ ] Inventory-approved Circle hackathon sources and every published eligible 2025/2026 grant cohort are represented or explicitly excluded with a reason.
- [ ] Grant records include program/cohort, project description, grant date and source URL/data date; hackathon records retain winner/unknown flags.
- [ ] No team/contact data or Registrai response content enters these files; paraphrased descriptions receive maintainer review.
- [ ] Fixture tests cover grants versus hackathons, incomplete dates and source format failure; duplicate occurrences retain stable occurrence IDs for identity resolution.

### T09. Implement the reviewed weekly refresh workflow and report

Issue: [T09 / #19](https://github.com/manucadev81/arc-lens/issues/19). Owner: DevOps. Priority: Must. Size: M.

Make weekly maintenance safe for one maintainer.

Dependencies: [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10), [T06 / #13](https://github.com/manucadev81/arc-lens/issues/13), [T07 / #14](https://github.com/manucadev81/arc-lens/issues/14), [T08 / #15](https://github.com/manucadev81/arc-lens/issues/15).

Traceability: US-10, US-11, US-12, BR6, NFR-01, NFR-03, ADR-0003, Product F5.

Acceptance criteria:

- [ ] One local command and a weekly/manual workflow build source candidates, validate them and open a refresh PR without merging it.
- [ ] Schema failure, collector failure or count below 80% preserves that source file and its previous data date; healthy sources still update.
- [ ] Report names updated, failed and excluded sources, record deltas, retained old dates, personal-data checks and identity proposals; proposals never auto-confirm projects.json links.
- [ ] The reviewed dataset reaches the package only through the maintainer merge/release path; a weekly schema check keeps Registrai payloads only in memory and reports pass or changed field paths.

### T10. Implement the curated category registry and mappings

Issue: [T10 / #12](https://github.com/manucadev81/arc-lens/issues/12). Owner: Product. Priority: Must. Size: M.

Make categories understandable and usable without a model.

Dependencies: [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7).

Traceability: US-06, Q8, P3, Architecture §5.4.

Acceptance criteria:

- [ ] Provide 15–25 maintainer-reviewed categories with stable IDs, labels, descriptions, synonyms and Registrai category mappings.
- [ ] Category IDs/labels/synonyms match case- and accent-insensitively without embeddings; ambiguous mappings have deterministic handling.
- [ ] Refresh proposes embedding-based tags for new records for maintainer confirmation, never silently replacing reviewed categories.
- [ ] Fixtures exercise a known category, a synonym, an unmapped Registrai category and free text that cannot match a known category.

### T11. Implement evidence-based project status and refresh signals

Issue: [T11 / #16](https://github.com/manucadev81/arc-lens/issues/16). Owner: Implementation. Priority: Must. Size: M.

Report activity evidence with an explicit Unknown state.

Dependencies: [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10).

Traceability: US-07, Q3, ADR-0006.

Acceptance criteria:

- [ ] Collect demo response and repository activity signals with observation dates at refresh, reporting unreadable/missing signals distinctly.
- [ ] Apply ADR-0006 precedence for live, announced, demo/recent commit, old/archived repository and unknown cases using a fixed clock in tests.
- [ ] Confirmed projects aggregate their best demo signal, most recent commit and linked Registrai status without losing occurrence evidence.
- [ ] Keep provisional 180/365-day windows in versioned configuration; status output carries the evidence and dates, including failure/unknown cases.

### T12. Implement the pinned local multilingual embedder lifecycle

Issue: [T12 / #8](https://github.com/manucadev81/arc-lens/issues/8). Owner: Implementation. Priority: Must. Size: M.

Provide semantic matching without a paid service key.

Dependencies: [T02 / #6](https://github.com/manucadev81/arc-lens/issues/6).

Traceability: US-04, Q12, NFR-06, ADR-0002.

Acceptance criteria:

- [ ] Select the quantized multilingual 384-dimension model against the evaluation cases, pin its revision/hashes and document its size and CPU requirements.
- [ ] Expose ready/loading/unavailable states; download/load occurs in the background and a call waits at most 3 seconds before keyword-only behavior.
- [ ] Unavailable state retries no more than once per 10 minutes; download, hash, load and model/index mismatch errors are observable without leaking user input.
- [ ] Portuguese and English paraphrase fixtures exercise semantic matching; offline-after-download and first-download-failure cases are reproducible.

### T13. Build reproducible packaged search indexes

Issue: [T13 / #17](https://github.com/manucadev81/arc-lens/issues/17). Owner: Implementation. Priority: Must. Size: M.

Keep releases internally consistent and avoid runtime rebuilds.

Dependencies: [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7), [T10 / #12](https://github.com/manucadev81/arc-lens/issues/12), [T12 / #8](https://github.com/manucadev81/arc-lens/issues/8).

Traceability: US-04, ADR-0002, ADR-0003, Architecture §5.5.

Acceptance criteria:

- [ ] Build vector, category and serialized BM25 indexes in fixed record order from approved data and configured embedding text.
- [ ] Index metadata records model ID/revision, dataset version and input hashes; mismatched model/index triggers keyword-only mode.
- [ ] Generated indexes stay out of git but are included and validated in the package; a clean build produces the same ordering and metadata for the same inputs.
- [ ] Tests detect changed record ordering, missing vectors and corrupt metadata rather than silently pairing the wrong vector with a record.

### T14. Implement hybrid ranking, project collapse and partial-hybrid labels

Issue: [T14 / #20](https://github.com/manucadev81/arc-lens/issues/20). Owner: Implementation. Priority: Must. Size: M.

Return ranked prior art without inventing semantic confidence.

Dependencies: [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10), [T12 / #8](https://github.com/manucadev81/arc-lens/issues/8), [T13 / #17](https://github.com/manucadev81/arc-lens/issues/17).

Traceability: US-04, US-05, NFR-02, ADR-0002, Architecture §6.1.

Acceptance criteria:

- [ ] Fuse semantic and keyword rankings over the documented candidate universe with RRF constant 60, then collapse confirmed projects using their best occurrence score before applying limit.
- [ ] Apply calibrated high/medium/low thresholds and noise floor; preserve low matches above the floor and exact-name behavior for candidates with cosine.
- [ ] Unembedded Registrai candidates qualify only on keyword terms, receive keyword-only RRF contribution and keyword_match, never fabricated cosine/high/medium/low.
- [ ] Ties use present/higher cosine, then BM25, then ascending ID; fixtures cover duplicates, equal scores and a deadline-expired description-only match with exactName:false.

### T15. Implement keyword-only search and unresolved free-text gaps

Issue: [T15 / #21](https://github.com/manucadev81/arc-lens/issues/21). Owner: Implementation. Priority: Must. Size: M.

Make reduced search coverage impossible to confuse with absence.

Dependencies: [T10 / #12](https://github.com/manucadev81/arc-lens/issues/12), [T12 / #8](https://github.com/manucadev81/arc-lens/issues/8), [T13 / #17](https://github.com/manucadev81/arc-lens/issues/17).

Traceability: US-04, US-05, US-06, NFR-02, Architecture §6.5.

Acceptance criteria:

- [ ] Unavailable/loading-too-long/mismatched model permits BM25-only search over local and fetched Registrai candidates with at least one non-stop-word query term.
- [ ] Results carry keyword_match/exactName as applicable, searchMode:keyword_only, complete:false, semantic-matching coverage exclusion and T-16; zero matches use T-17 rather than T-03.
- [ ] Known category queries work without the model; unresolved free-text category returns known categories, matchedBy:unresolved, verdict:null and T-18.
- [ ] Fixtures cover failed model download, exact-name search, Portuguese paraphrase without English keyword overlap, known category and lookup by ID without the model.

### T16. Implement the typed Registrai client and memory-only cache

Issue: [T16 / #9](https://github.com/manucadev81/arc-lens/issues/9). Owner: Implementation. Priority: Must. Size: M.

Isolate the external dependency and its retention rules.

Dependencies: [T02 / #6](https://github.com/manucadev81/arc-lens/issues/6).

Traceability: US-03, US-09, BR2, BR3, NFR-03, ADR-0005.

Acceptance criteria:

- [ ] Pin types from the public OpenAPI and implement directory, detail and apps-week calls with schema validation and no API key.
- [ ] Cache responses/summary embeddings in process memory for at most 15 minutes with original fetchedAt; cache hits preserve timestamp and expose fromCache.
- [ ] Enforce timeout/error/429 handling and Retry-After backoff; tests use synthetic fixtures and assert no Registrai response content is written to files, logs, dataset or indexes.
- [ ] Only slugs with local IDs and proposal reasons may persist; weekly drift checks retain only pass/changed-field paths and never response payloads.

### T17. Implement bounded Registrai enrichment and partial-search deadlines

Issue: [T17 / #22](https://github.com/manucadev81/arc-lens/issues/22). Owner: Implementation. Priority: Must. Size: M.

Keep directory latency and volume/status enrichment bounded.

Dependencies: [T11 / #16](https://github.com/manucadev81/arc-lens/issues/16), [T12 / #8](https://github.com/manucadev81/arc-lens/issues/8), [T16 / #9](https://github.com/manucadev81/arc-lens/issues/9).

Traceability: US-03, NFR-03, NFR-06, ADR-0005, Architecture §6.1.

Acceptance criteria:

- [ ] Use a 2.5-second whole-branch deadline including HTTP and embedding batches of 32; check the deadline between batches and cancel outstanding work as supported.
- [ ] Cap calls at 2+limit for search, 2 for gaps without per-entry details, and directory plus one detail for lookup; honor 429 backoff across calls.
- [ ] Warm-up can populate directory embeddings in memory; a warm-model/cold-directory fixture reaches the declared partial behavior without dropping local results.
- [ ] At deadline, retain eligible keyword-only candidates per T14 and expose partiallySearched/notComparedByMeaning, complete:false and T-20; no directory response yields an explicit not-searched reason.

### T18. Implement coverage, freshness, uncertainty and attribution

Issue: [T18 / #18](https://github.com/manucadev81/arc-lens/issues/18). Owner: Implementation. Priority: Must. Size: M.

Make every answer quotable with its actual limits.

Dependencies: [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7), [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10), [T16 / #9](https://github.com/manucadev81/arc-lens/issues/9).

Traceability: US-05, US-09, US-10, BR2, BR4, NFR-01, Product §4.2, Architecture §6.4.

Acceptance criteria:

- [ ] Coverage lists source data dates, retained older source dates, datasetUpdated, missing/partial reasons and semantic degradation; dates are never replaced by answer time.
- [ ] Registrai coverage retains actual upstream fetchedAt/fromCache and partial count; tests cross midnight and the 15-minute cache boundary.
- [ ] Stale warning follows the configured 14-day dataset/per-source rules; uncertain identity pairs add T-19 when their merge could change the gaps verdict.
- [ ] Any Registrai-derived card, occurrence or count carries the exact Registrai credit/link/license in text and structured output; local-only answers credit local sources.

### T19. Implement tool schemas and the shared text/structured answer builder

Issue: [T19 / #23](https://github.com/manucadev81/arc-lens/issues/23). Owner: Implementation. Priority: Must. Size: M.

Keep human and machine answers equivalent.

Dependencies: [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10), [T18 / #18](https://github.com/manucadev81/arc-lens/issues/18), [T01 / #5](https://github.com/manucadev81/arc-lens/issues/5).

Traceability: US-08, US-09, ADR-0004, Product §4, Product §8.

Acceptance criteria:

- [ ] Publish validated input/output schemas for all three tools including occurrence/project cards, candidate IDs, coverage, attribution and degraded/partial states.
- [ ] Build text only from the structured result; project cards render all occurrences and source/prize evidence with consistent English labels and dates.
- [ ] Include approved T-01–T-20 behavior, keyword_match/exactName and empty/error states; invalid inputs return safe actionable tool errors without stack traces.
- [ ] Snapshot/schema cases cover all Product examples plus grouped projects, possible duplicates, keyword-only, partial hybrid with T-20 and unresolved category.

### T20. Implement the similar-project search use case

Issue: [T20 / #24](https://github.com/manucadev81/arc-lens/issues/24). Owner: Implementation. Priority: Must. Size: M.

Let builders compare an idea across all covered sources.

Dependencies: [T14 / #20](https://github.com/manucadev81/arc-lens/issues/20), [T15 / #21](https://github.com/manucadev81/arc-lens/issues/21), [T17 / #22](https://github.com/manucadev81/arc-lens/issues/22), [T19 / #23](https://github.com/manucadev81/arc-lens/issues/23).

Traceability: US-04, US-05, Product F1.

Acceptance criteria:

- [ ] Validate idea length 10–2000 and limit 1–10 with default 5; return at most limit projects from local and available Registrai candidates.
- [ ] Compose ranking, identity, status/enrichment and coverage through domain ports; local results survive upstream failure.
- [ ] Summary distinguishes found, low-only, empty covered search, keyword-only incomplete and partial-hybrid outcomes with required attribution.
- [ ] End-to-end use-case fixtures cover normal, only-low, no-result, timeout, 429, same-project occurrences and a Portuguese query.

### T21. Implement the category-gaps use case

Issue: [T21 / #25](https://github.com/manucadev81/arc-lens/issues/25). Owner: Implementation. Priority: Must. Size: M.

Show category coverage without claiming an area is empty.

Dependencies: [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10), [T10 / #12](https://github.com/manucadev81/arc-lens/issues/12), [T15 / #21](https://github.com/manucadev81/arc-lens/issues/21), [T17 / #22](https://github.com/manucadev81/arc-lens/issues/22), [T19 / #23](https://github.com/manucadev81/arc-lens/issues/23).

Traceability: US-06, Product F2.

Acceptance criteria:

- [ ] Without category, list known categories and distinct-project counts from eligible local/Registrai occurrences.
- [ ] With known category, count projects once, use configured several/few/none thresholds and return at most 20 cards ordered by name with total count.
- [ ] Free text resolves semantically when ready or returns T-18/verdict:null when unavailable; uncertain identity threshold crossings disclose T-19.
- [ ] Fixtures cover zero/one/four/five projects, five occurrences of one project, unknown free text, unavailable Registrai and exact mapped categories.

### T22. Implement project lookup, ambiguity and stable-ID resolution

Issue: [T22 / #26](https://github.com/manucadev81/arc-lens/issues/26). Owner: Implementation. Priority: Must. Size: M.

Let users inspect a record without a similarity guess.

Dependencies: [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10), [T11 / #16](https://github.com/manucadev81/arc-lens/issues/16), [T17 / #22](https://github.com/manucadev81/arc-lens/issues/22), [T19 / #23](https://github.com/manucadev81/arc-lens/issues/23).

Traceability: US-15, US-07, Product F3.

Acceptance criteria:

- [ ] Lookup supports name or ID, ID precedence, aliases and project/occurrence/Registrai IDs; grouped occurrence IDs return their project card.
- [ ] Name matching ignores case/accents; one project returns one card, multiple projects return candidates without guessing, and missing names return coverage with T-09.
- [ ] Unknown IDs use T-15; lookup works without embeddings and respects two-request enrichment cap.
- [ ] Fixtures cover renamed IDs, same-name unrelated projects, grouped sources, Registrai detail failure and complete status evidence.

### T23. Expose all tools over the default stdio transport

Issue: [T23 / #28](https://github.com/manucadev81/arc-lens/issues/28). Owner: Implementation. Priority: Must. Size: M.

Provide the default zero-hosting client connection.

Dependencies: [T20 / #24](https://github.com/manucadev81/arc-lens/issues/24), [T21 / #25](https://github.com/manucadev81/arc-lens/issues/25), [T22 / #26](https://github.com/manucadev81/arc-lens/issues/26).

Traceability: US-08, US-13, ADR-0001.

Acceptance criteria:

- [ ] The executable starts the official MCP SDK stdio transport and advertises exactly the three agreed tools and read-only/idempotent/open-world annotations.
- [ ] Protocol messages use stdout without diagnostic pollution; diagnostics go to an appropriate non-protocol channel and exclude user/Registrai payloads.
- [ ] An MCP client integration test discovers and calls all three tools and validates text plus structured results/errors.
- [ ] No protocol session state is needed for result correctness; documented CLI command runs from the built package.

### T24. Expose the optional Streamable HTTP transport

Issue: [T24 / #29](https://github.com/manucadev81/arc-lens/issues/29). Owner: Implementation. Priority: Must. Size: M.

Support self-hosting with the same tool behavior.

Dependencies: [T23 / #28](https://github.com/manucadev81/arc-lens/issues/28).

Traceability: US-08, ADR-0001, Architecture §10.

Acceptance criteria:

- [ ] --http/--port/--host select Streamable HTTP; default bind is 127.0.0.1 and the documented Origin-validation behavior follows the pinned MCP SDK/spec.
- [ ] Same fixtures produce equivalent tool facts through stdio and HTTP without protocol-session dependence.
- [ ] Integration tests cover accepted/rejected origins, malformed requests, tool errors and cancellation/connection shutdown.
- [ ] Document network exposure and self-hosting limits; no maintainer public endpoint is provisioned unless the owner changes A-01.

### T25. Build the multilingual similarity evaluation and release quality gate

Issue: [T25 / #27](https://github.com/manucadev81/arc-lens/issues/27). Owner: QA. Priority: Must. Size: M.

Measure false negatives before calibrating thresholds.

Dependencies: [T14 / #20](https://github.com/manucadev81/arc-lens/issues/20), [T15 / #21](https://github.com/manucadev81/arc-lens/issues/21).

Traceability: US-04, US-05, NFR-02, ADR-0002, Architecture §11.

Acceptance criteria:

- [ ] Create at least 40 reviewed weekly-research cases with idea text and expected project/occurrence IDs, including Portuguese paraphrases and rare exact terms.
- [ ] Compute recall@10 with acceptance at least 0.90 and expected matches labeled at least Low; evaluate confirmed identity grouping consistently.
- [ ] Calibrate/version thresholds and noise floor with an attached run; release fails below the gate rather than silently lowering the acceptance value.
- [ ] Separate measured hybrid-quality cases from degraded-behavior fixtures; report model revision, dataset version, configuration and reproducible commands.

### T26. Validate privacy, untrusted input and dependency safeguards

Issue: [T26 / #30](https://github.com/manucadev81/arc-lens/issues/30). Owner: Security. Priority: Must. Size: M.

Prevent prohibited data and unsafe inputs from reaching a public release.

Dependencies: [T09 / #19](https://github.com/manucadev81/arc-lens/issues/19), [T19 / #23](https://github.com/manucadev81/arc-lens/issues/23), [T23 / #28](https://github.com/manucadev81/arc-lens/issues/28), [T24 / #29](https://github.com/manucadev81/arc-lens/issues/29).

Traceability: US-11, US-12, BR1, BR3, BR5, NFR-04, NFR-05, Architecture §10.

Acceptance criteria:

- [ ] Publish a security report tied to the reviewed commit covering public dataset privacy, source permissions, Registrai memory-only behavior and HTTP Origin handling.
- [ ] Adversarial fixtures keep third-party text in capped/sanitized data fields, preserve fixed tool descriptions and expose no secret/stack-trace payloads.
- [ ] Inspect model hash verification, lockfile/dependency checks and release provenance configuration; document severity and remediation of findings.
- [ ] Blocking findings remain open with linked corrective tasks; approval is recorded by the Security role without merging or publishing on its own.

### T27. Build the npm package and reviewed release pipeline

Issue: [T27 / #32](https://github.com/manucadev81/arc-lens/issues/32). Owner: DevOps. Priority: Must. Size: M.

Ship the approved dataset and indexes reproducibly.

Dependencies: [T09 / #19](https://github.com/manucadev81/arc-lens/issues/19), [T13 / #17](https://github.com/manucadev81/arc-lens/issues/17), [T23 / #28](https://github.com/manucadev81/arc-lens/issues/28), [T24 / #29](https://github.com/manucadev81/arc-lens/issues/29), [T25 / #27](https://github.com/manucadev81/arc-lens/issues/27), [T28 / #31](https://github.com/manucadev81/arc-lens/issues/31), [T01 / #5](https://github.com/manucadev81/arc-lens/issues/5).

Traceability: US-13, NFR-07, NFR-08, ADR-0001, ADR-0003.

Acceptance criteria:

- [ ] Clean package build includes executable, approved data, indexes/metadata, license files and README; npm pack dry-run verifies intended files and excludes fixtures/secrets.
- [ ] Choose a valid version/tag policy consistent with dataset date plus build number and the documented npx command; changes never overwrite an existing published version.
- [ ] Release workflow validates schemas, tests and similarity gate, builds indexes and configures npm provenance; dataset refresh releases require a maintainer-merged PR.
- [ ] Tarball installation and stdio/HTTP smoke tests run in an isolated clean environment; production publish remains an explicit maintainer-controlled action, with recovery instructions.

### T28. Write onboarding, licenses, contribution and maintenance guidance

Issue: [T28 / #31](https://github.com/manucadev81/arc-lens/issues/31). Owner: Engineering. Priority: Must. Size: M.

Let external users install and interpret results correctly.

Dependencies: [T01 / #5](https://github.com/manucadev81/arc-lens/issues/5), [T19 / #23](https://github.com/manucadev81/arc-lens/issues/23), [T23 / #28](https://github.com/manucadev81/arc-lens/issues/28), [T24 / #29](https://github.com/manucadev81/arc-lens/issues/29).

Traceability: US-09, US-10, US-13, ADR-0007, Product §7.

Acceptance criteria:

- [ ] README follows Product section order with the three tools, tested connection commands, five example questions, coverage/uncertainty explanations and issue links.
- [ ] Document first model download/size, offline-after-download, model failure recovery, keyword-only/partial search, Portuguese-query limits and self-hosting.
- [ ] After owner license confirmation, add Apache-2.0 code and CC BY 4.0 dataset license/credit with source references and reviewed paraphrase policy.
- [ ] Contribution templates require project-level data, source/date/terms evidence and acceptance checks; maintenance explains one-command refresh, identity review and stale sources without creating docs/STATUS.md.

### T29. Validate the integrated release candidate and coverage target

Issue: [T29 / #33](https://github.com/manucadev81/arc-lens/issues/33). Owner: QA. Priority: Must. Size: M.

Provide evidence that the end-to-end MVP is ready for the maintainer decision.

Dependencies: [T06 / #13](https://github.com/manucadev81/arc-lens/issues/13), [T07 / #14](https://github.com/manucadev81/arc-lens/issues/14), [T08 / #15](https://github.com/manucadev81/arc-lens/issues/15), [T09 / #19](https://github.com/manucadev81/arc-lens/issues/19), [T20 / #24](https://github.com/manucadev81/arc-lens/issues/24), [T21 / #25](https://github.com/manucadev81/arc-lens/issues/25), [T22 / #26](https://github.com/manucadev81/arc-lens/issues/26), [T25 / #27](https://github.com/manucadev81/arc-lens/issues/27), [T26 / #30](https://github.com/manucadev81/arc-lens/issues/30), [T27 / #32](https://github.com/manucadev81/arc-lens/issues/32).

Traceability: US-01–US-13, US-15, NFR-01–NFR-09, M1.

Acceptance criteria:

- [ ] Write docs/05-test-plan.md and docs/05-qa-report.md with the tested commit, requirement matrix, commands and actual results; do not substitute a coverage percentage for behavioral evidence.
- [ ] Run deterministic unit/contract/transport/package scenarios for healthy, unavailable, partial, duplicate, stale, malformed-input and offline-model paths; keep live smoke tests separate from synthetic fixtures.
- [ ] Check the source inventory against at least four required Arc hackathons and all published eligible grant cohorts; document exclusions or missing records as release gaps.
- [ ] Measure warm-model/cold-directory and warm-cache latency against owner-confirmed targets; report hardware/sample method and failures rather than claiming the unmeasured target.
- [ ] Record Code review, QA and Security verdicts against the candidate and leave release/merge to the maintainer; unresolved blocking findings prevent readiness.

### T30. Prepare collaboration drafts and the 30-day outcome checklist

Issue: [T30 / #34](https://github.com/manucadev81/arc-lens/issues/34). Owner: Product. Priority: Should. Size: S.

Turn publication into a reviewable community contribution.

Dependencies: [T28 / #31](https://github.com/manucadev81/arc-lens/issues/31), [T29 / #33](https://github.com/manucadev81/arc-lens/issues/33).

Traceability: US-14, M1, M2, M3, M4.

Acceptance criteria:

- [ ] Prepare separate drafts for Registrai dataset integration, the circlefin/skills ecosystem-research proposal and Arc docs/community feedback, with concrete public artifact links.
- [ ] Keep drafts unsent until the owner explicitly approves each outreach action/recipient; this issue does not authorize sending posts or opening third-party issues.
- [ ] Create a 30-day checklist for coverage, weekly internal use/research time, ten external adopters and one concrete collaboration response, with source evidence and unknown values left unknown.
- [ ] Use only public project-level evidence; record actual observations without adding analytics that collect private user query content.

## 6. Requirement coverage

Each task also references the source PRs in its issue. The following matrix identifies the primary delivery tasks; integrated evidence is consolidated in [T29 / #33](https://github.com/manucadev81/arc-lens/issues/33).

| Requirement | Primary tasks |
|---|---|
| US-01 Hackathon records | [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7), [T05 / #11](https://github.com/manucadev81/arc-lens/issues/11), [T06 / #13](https://github.com/manucadev81/arc-lens/issues/13), [T07 / #14](https://github.com/manucadev81/arc-lens/issues/14), [T08 / #15](https://github.com/manucadev81/arc-lens/issues/15) |
| US-02 Grant cohorts | [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7), [T05 / #11](https://github.com/manucadev81/arc-lens/issues/11), [T08 / #15](https://github.com/manucadev81/arc-lens/issues/15) |
| US-03 Registrai directory/volume | [T16 / #9](https://github.com/manucadev81/arc-lens/issues/9), [T17 / #22](https://github.com/manucadev81/arc-lens/issues/22), [T20 / #24](https://github.com/manucadev81/arc-lens/issues/24) |
| US-04 Similarity search | [T12 / #8](https://github.com/manucadev81/arc-lens/issues/8), [T13 / #17](https://github.com/manucadev81/arc-lens/issues/17), [T14 / #20](https://github.com/manucadev81/arc-lens/issues/20), [T15 / #21](https://github.com/manucadev81/arc-lens/issues/21), [T20 / #24](https://github.com/manucadev81/arc-lens/issues/24), [T25 / #27](https://github.com/manucadev81/arc-lens/issues/27) |
| US-05 Honest absence/weak matches | [T14 / #20](https://github.com/manucadev81/arc-lens/issues/20), [T15 / #21](https://github.com/manucadev81/arc-lens/issues/21), [T18 / #18](https://github.com/manucadev81/arc-lens/issues/18), [T19 / #23](https://github.com/manucadev81/arc-lens/issues/23), [T20 / #24](https://github.com/manucadev81/arc-lens/issues/24) |
| US-06 Category gaps | [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10), [T10 / #12](https://github.com/manucadev81/arc-lens/issues/12), [T15 / #21](https://github.com/manucadev81/arc-lens/issues/21), [T21 / #25](https://github.com/manucadev81/arc-lens/issues/25) |
| US-07 Evidence-based status | [T11 / #16](https://github.com/manucadev81/arc-lens/issues/16), [T17 / #22](https://github.com/manucadev81/arc-lens/issues/22), [T22 / #26](https://github.com/manucadev81/arc-lens/issues/26) |
| US-08 MCP/same facts | [T02 / #6](https://github.com/manucadev81/arc-lens/issues/6), [T19 / #23](https://github.com/manucadev81/arc-lens/issues/23), [T23 / #28](https://github.com/manucadev81/arc-lens/issues/28), [T24 / #29](https://github.com/manucadev81/arc-lens/issues/29) |
| US-09 Attribution | [T18 / #18](https://github.com/manucadev81/arc-lens/issues/18), [T19 / #23](https://github.com/manucadev81/arc-lens/issues/23), [T28 / #31](https://github.com/manucadev81/arc-lens/issues/31) |
| US-10 Weekly refresh | [T06 / #13](https://github.com/manucadev81/arc-lens/issues/13), [T07 / #14](https://github.com/manucadev81/arc-lens/issues/14), [T08 / #15](https://github.com/manucadev81/arc-lens/issues/15), [T09 / #19](https://github.com/manucadev81/arc-lens/issues/19), [T18 / #18](https://github.com/manucadev81/arc-lens/issues/18) |
| US-11 Source permissions | [T05 / #11](https://github.com/manucadev81/arc-lens/issues/11), [T09 / #19](https://github.com/manucadev81/arc-lens/issues/19), [T26 / #30](https://github.com/manucadev81/arc-lens/issues/30) |
| US-12 No personal data | [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7), [T06 / #13](https://github.com/manucadev81/arc-lens/issues/13), [T07 / #14](https://github.com/manucadev81/arc-lens/issues/14), [T08 / #15](https://github.com/manucadev81/arc-lens/issues/15), [T26 / #30](https://github.com/manucadev81/arc-lens/issues/30) |
| US-13 Open publication | [T23 / #28](https://github.com/manucadev81/arc-lens/issues/28), [T24 / #29](https://github.com/manucadev81/arc-lens/issues/29), [T27 / #32](https://github.com/manucadev81/arc-lens/issues/32), [T28 / #31](https://github.com/manucadev81/arc-lens/issues/31) |
| US-14 Collaboration (Should) | [T30 / #34](https://github.com/manucadev81/arc-lens/issues/34) |
| US-15 Project lookup | [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10), [T22 / #26](https://github.com/manucadev81/arc-lens/issues/26) |
| BR1 Project-level data only | [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7), [T26 / #30](https://github.com/manucadev81/arc-lens/issues/30) |
| BR2 Registrai attribution | [T18 / #18](https://github.com/manucadev81/arc-lens/issues/18), [T19 / #23](https://github.com/manucadev81/arc-lens/issues/23) |
| BR3 Registrai not copied | [T16 / #9](https://github.com/manucadev81/arc-lens/issues/9), [T17 / #22](https://github.com/manucadev81/arc-lens/issues/22), [T26 / #30](https://github.com/manucadev81/arc-lens/issues/30) |
| BR4 Source links and dates | [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7), [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10), [T18 / #18](https://github.com/manucadev81/arc-lens/issues/18) |
| BR5 Terms before collection | [T05 / #11](https://github.com/manucadev81/arc-lens/issues/11), [T09 / #19](https://github.com/manucadev81/arc-lens/issues/19), [T26 / #30](https://github.com/manucadev81/arc-lens/issues/30) |
| BR6 Weekly maintainer refresh | [T09 / #19](https://github.com/manucadev81/arc-lens/issues/19), [T27 / #32](https://github.com/manucadev81/arc-lens/issues/32) |
| BR7 Arc-only scope | [T05 / #11](https://github.com/manucadev81/arc-lens/issues/11), [T06 / #13](https://github.com/manucadev81/arc-lens/issues/13), [T07 / #14](https://github.com/manucadev81/arc-lens/issues/14), [T08 / #15](https://github.com/manucadev81/arc-lens/issues/15), [T28 / #31](https://github.com/manucadev81/arc-lens/issues/31) |
| BR8 No payments/onchain | [T02 / #6](https://github.com/manucadev81/arc-lens/issues/6), [T28 / #31](https://github.com/manucadev81/arc-lens/issues/31) |
| NFR-01 Freshness | [T09 / #19](https://github.com/manucadev81/arc-lens/issues/19), [T18 / #18](https://github.com/manucadev81/arc-lens/issues/18) |
| NFR-02 Correctness | [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10), [T14 / #20](https://github.com/manucadev81/arc-lens/issues/20), [T15 / #21](https://github.com/manucadev81/arc-lens/issues/21), [T18 / #18](https://github.com/manucadev81/arc-lens/issues/18), [T25 / #27](https://github.com/manucadev81/arc-lens/issues/27) |
| NFR-03 Source resilience | [T09 / #19](https://github.com/manucadev81/arc-lens/issues/19), [T16 / #9](https://github.com/manucadev81/arc-lens/issues/9), [T17 / #22](https://github.com/manucadev81/arc-lens/issues/22) |
| NFR-04 Attribution/licensing | [T05 / #11](https://github.com/manucadev81/arc-lens/issues/11), [T18 / #18](https://github.com/manucadev81/arc-lens/issues/18), [T26 / #30](https://github.com/manucadev81/arc-lens/issues/30), [T28 / #31](https://github.com/manucadev81/arc-lens/issues/31) |
| NFR-05 Privacy | [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7), [T26 / #30](https://github.com/manucadev81/arc-lens/issues/30) |
| NFR-06 Speed | [T12 / #8](https://github.com/manucadev81/arc-lens/issues/8), [T17 / #22](https://github.com/manucadev81/arc-lens/issues/22), [T29 / #33](https://github.com/manucadev81/arc-lens/issues/33) |
| NFR-07 Openness | [T24 / #29](https://github.com/manucadev81/arc-lens/issues/29), [T27 / #32](https://github.com/manucadev81/arc-lens/issues/32), [T28 / #31](https://github.com/manucadev81/arc-lens/issues/31) |
| NFR-08 Maintainability | [T02 / #6](https://github.com/manucadev81/arc-lens/issues/6), [T09 / #19](https://github.com/manucadev81/arc-lens/issues/19), [T27 / #32](https://github.com/manucadev81/arc-lens/issues/32) |
| NFR-09 Arc-specific knowledge | [T01 / #5](https://github.com/manucadev81/arc-lens/issues/5), [T28 / #31](https://github.com/manucadev81/arc-lens/issues/31) |

Product coverage: F1 → [T20 / #24](https://github.com/manucadev81/arc-lens/issues/24); F2 → [T21 / #25](https://github.com/manucadev81/arc-lens/issues/25); F3 → [T22 / #26](https://github.com/manucadev81/arc-lens/issues/26); F4 → [T28 / #31](https://github.com/manucadev81/arc-lens/issues/31); F5 → [T09 / #19](https://github.com/manucadev81/arc-lens/issues/19). The shared response/README texts are covered by [T19 / #23](https://github.com/manucadev81/arc-lens/issues/23) and [T28 / #31](https://github.com/manucadev81/arc-lens/issues/31). A-07 includes the additions T-16–T-20.

Architecture coverage: ADR-0001 → [T23 / #28](https://github.com/manucadev81/arc-lens/issues/28), [T24 / #29](https://github.com/manucadev81/arc-lens/issues/29), [T27 / #32](https://github.com/manucadev81/arc-lens/issues/32); ADR-0002 → [T12 / #8](https://github.com/manucadev81/arc-lens/issues/8), [T13 / #17](https://github.com/manucadev81/arc-lens/issues/17), [T14 / #20](https://github.com/manucadev81/arc-lens/issues/20), [T15 / #21](https://github.com/manucadev81/arc-lens/issues/21), [T25 / #27](https://github.com/manucadev81/arc-lens/issues/27); ADR-0003 → [T03 / #7](https://github.com/manucadev81/arc-lens/issues/7), [T09 / #19](https://github.com/manucadev81/arc-lens/issues/19), [T27 / #32](https://github.com/manucadev81/arc-lens/issues/32); ADR-0004 → [T04 / #10](https://github.com/manucadev81/arc-lens/issues/10), [T19 / #23](https://github.com/manucadev81/arc-lens/issues/23), [T22 / #26](https://github.com/manucadev81/arc-lens/issues/26); ADR-0005 → [T16 / #9](https://github.com/manucadev81/arc-lens/issues/9), [T17 / #22](https://github.com/manucadev81/arc-lens/issues/22), [T18 / #18](https://github.com/manucadev81/arc-lens/issues/18); ADR-0006 → [T11 / #16](https://github.com/manucadev81/arc-lens/issues/16); ADR-0007 → [T28 / #31](https://github.com/manucadev81/arc-lens/issues/31).

## 7. Delivery and integration policy

- Every task produces a focused branch/PR with its acceptance evidence. The responsible review stages record `Code review: APPROVED`, `QA: APPROVED` and `Security: APPROVED` only after their own checks. The maintainer decides merge/release readiness.
- Use `Closes #N` in an implementing PR body when it completes issue N; include one closing reference per completed issue. Use `Refs #N` for partial work. A planning-only PR does not close implementation issues.
- Only the maintainer merges into main, using the agreed squash workflow. No task instructs an automated merge or direct main commit.
- GitHub changes use the assigned personal token through gh CLI; do not fall back to a shared integration identity.
- New repository/GitHub content is English. Use accountable roles. Do not add explanatory code comments, disabled code or tool-author attribution; the platform-required commit trailer remains the sole attribution exception.
- Keep status in the coordination channel; never create docs/STATUS.md. Source terms, acceptance evidence, QA and security reports are durable repository artifacts.

## 8. Completion evidence and limits

Planning completion requires 30 distinct open implementation issues, one issue linked from every task, 121 acceptance criteria, an acyclic dependency graph and a docs-only PR containing this file. Creating the issues is not evidence that their criteria pass.

Implementation readiness requires accepted source decisions and dependencies for the selected task. Release readiness additionally requires integrated QA/security evidence, the calibrated recall gate, actual latency measurements, license confirmation, coverage/exclusion disclosure and the maintainer decision. Outreach drafts and publication do not authorize external sends.

Open decisions: architecture A-01–A-07 and source-specific permissions are tracked by [T01 / #5](https://github.com/manucadev81/arc-lens/issues/5) / [T05 / #11](https://github.com/manucadev81/arc-lens/issues/11). PR #3 and #4 are still open at this planning baseline. No task resolves those owner questions by assumption or changes the approved architecture without review.

The first 30-day outcome targets remain source targets, not observed results: at least four hackathons/every published cohort, weekly internal research use, ten external adopters and one concrete collaboration response. [T30 / #34](https://github.com/manucadev81/arc-lens/issues/34) records actual evidence after publication.
