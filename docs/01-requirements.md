# Arc Lens: requirements

Stage: Requirements. Single source: [docs/00-idea.md](00-idea.md). Nothing here comes from another source; whatever the idea does not define is listed under "Open questions".

## 1. Context

Arc Lens is an open, off-chain MCP server and dataset that answers product questions about the Arc ecosystem: has this idea already been built on Arc, by whom, did it win a hackathon or a grant, is it live, and where are the gaps. It covers Arc hackathon projects and Circle grant cohorts, and uses Registrai as the source for the ecosystem directory and onchain volume, with attribution. There is no funding program; the goal is visibility and contribution to the Arc community. Single-chain focus (Arc), no multichain support, no onchain component.

The demo proves one sentence: "I describe my idea for Arc and within seconds I see who built something similar, whether it won a prize or grant, whether it is live, and where the gap is."

## 2. Users

| Persona | Need |
|---|---|
| Builder | Find ideas, prior art and differentiation before building on Arc |
| Reviewer (grant or hackathon) | Check an application for duplicates; asks the same core question as the builder |
| Agent consumer | Any AI coding agent that can use an MCP server gets the same answers as a person |
| Maintainer | The project owner; keeps the dataset current with a weekly refresh |

Later, out of scope for v1: Circle's ecosystem team, for aggregated views.

## 3. Goals and success metrics

Within 30 days of publication:

- M1 Coverage: every project from at least 4 Arc hackathons and every published Circle grant cohort, each with source and date.
- M2 Internal use: the team uses the MCP in every weekly idea research, and research takes hours instead of days.
- M3 External use: at least 10 people outside the team install or use it (stars, issues or mentions).
- M4 Collaboration: at least one concrete response from Registrai or Circle's team (integration, issue comment or official mention).

## 4. Glossary

| Term | Meaning |
|---|---|
| Project record | One hackathon project or grant recipient, with project-level data only |
| Source | Where a record comes from: a hackathon page, a grant announcement or Registrai |
| Data date | The date the data in a record was collected or published |
| Winner flag | Marks a hackathon project that won a prize |
| Similarity search | Given an idea description, returns similar project records |
| Gap | A category where no project record exists for what a builder describes |
| Live | A project that is still running (how this is decided is an open question) |
| Refresh | The weekly update of the dataset by the maintainer |

## 5. Business rules

- BR1: the dataset stores project-level data only; it never stores names or contacts of team members.
- BR2: every answer that uses Registrai data carries the attribution required by CC BY 4.0.
- BR3: Registrai data is queried with attribution and not copied into the dataset.
- BR4: every project record returned has its source link and data date.
- BR5: the terms of use of each hackathon and grant source are checked before any automated collection from it.
- BR6: the dataset is refreshed weekly by the maintainer; v1 has no continuous automatic updates.
- BR7: the scope is the Arc ecosystem only; no other chain is covered.
- BR8: the product has no payment or monetization component and no onchain component.

## 6. User stories and acceptance criteria

Priority: Must = needed for the MVP defined in the idea.

### Epic A: Datasets

**US-01 (Must). Hackathon project dataset.** As a builder, I want a dataset of Arc hackathon projects with winners flagged, so that I can see what was already built.

- Given the dataset, then it contains projects from the Arc tracks of ETHGlobal Cannes and HackMoney 2026, LabLab Agentic Commerce on Arc and Agentic Economy on Arc, and Circle's own hackathons.
- Given a project record, then it has the project data, the hackathon it came from, a winner flag, the source link and the data date.
- Given a project whose hackathon page does not say whether it won, then the winner flag is shown as unknown, not as "no".
- Given a source whose terms of use forbid automated collection, then no data is collected from it (BR5).

**US-02 (Must). Circle grant recipients dataset.** As a reviewer, I want the Circle grant recipients, so that I can check whether an idea already got a grant.

- Given the dataset, then it contains the published 2025 and 2026 grant cohorts.
- Given a grant record, then it has the project, a description, the date, the source link and the data date.

**US-03 (Must). Registrai as directory and volume source.** As a builder, I want the ecosystem directory and onchain volume per app, so that I can see which projects are live and used.

- Given a query, when the answer includes Registrai data, then it is fetched from Registrai at query time, not copied into the dataset (BR3).
- Given an answer with Registrai data, then it shows the attribution required by CC BY 4.0 (BR2).
- Given Registrai is offline, rate limited or changed, then the answer still returns the hackathon and grant results and states that the Registrai part is unavailable.

### Epic B: Search and answers

**US-04 (Must). Similarity search.** As a builder, I want to describe my idea and get similar projects, so that I can see who built something like it.

- Given an idea description, when I search, then I get similar projects from the hackathon dataset, the grant dataset and Registrai.
- Given a result, then it shows the source it came from, the source link and the data date (BR4).
- Given a result, then it shows whether it won a prize or got a grant, and whether it is live when that is known.
- Given an idea description, then the answer arrives within seconds (target to be set, see Q6).

**US-05 (Must). Honest "nothing similar" answers.** As a reviewer, I want to know what was searched when nothing similar is found, so that I never read "nothing exists" when something does.

- Given a search with no similar project, then the answer says which sources and datasets were searched and their data dates, and does not state that nothing exists on Arc.
- Given a source that was unavailable during the search, then the answer lists it as not searched.
- Given a search with weak matches, then the answer shows them marked as low similarity instead of hiding them.

**US-06 (Must). Gaps by category.** As a builder, I want to see what exists on Arc and what does not, by category, so that I can pick an unserved area.

- Given a category, then I get the projects that exist in it and whether the category looks empty or thin.
- Given the gaps answer, then it is ready to use: a person or an agent can quote it without further processing.
- Given the answer, then it shows the data dates and the coverage it is based on (US-05).

**US-07 (Must). Project status.** As a reviewer, I want to know whether a project is still live, so that I can weigh prior art correctly.

- Given a project record, then it shows a status (live, not live or unknown) with the evidence used.
- How a project is decided to be live is Q3.

### Epic C: Delivery

**US-08 (Must). Use through MCP.** As an agent consumer, I want to use Arc Lens through an MCP server, so that any agent gets the same answers as a person.

- Given an MCP-capable agent, when it connects, then it can run the similarity search, the gaps view and the project lookup.
- Given the same question, then a person using an MCP client and an agent get the same answer content.
- The delivery mechanism (hosting, transport) is an Architecture decision.

**US-09 (Must). Attribution in every answer.** As the maintainer, I want attribution to travel with the data, so that the CC BY 4.0 terms are always met.

- Given any answer that includes Registrai data, then the attribution is part of the answer (BR2).
- Given an answer that includes only the hackathon and grant datasets, then it names its sources and links (BR4).

### Epic D: Maintenance and compliance

**US-10 (Must). Weekly refresh.** As the maintainer, I want to refresh the dataset every week, so that the data stays trustworthy.

- Given a refresh, then the dataset gets new and updated records with their data dates.
- Given any answer, then it shows how old the dataset is.
- Given a refresh that fails for one source, then the data from the other sources is not lost and the failed source is reported.
- Given a source that changed its page format, then the refresh reports it instead of silently returning less data.

**US-11 (Must). Check source terms before collecting.** As the maintainer, I want each source's terms of use checked, so that collection is allowed.

- Given a new source, then its terms of use are recorded as checked (allowed or forbidden) before any collection (BR5).
- Given a forbidden source, then it is not collected and it is documented as excluded.

**US-12 (Must). Project-level data only.** As the maintainer, I want the dataset to hold no personal data, so that publishing it does not raise privacy issues.

- Given any record, then it has no team member names or contacts (BR1).
- Given a source page that lists team members, then that data is dropped at collection time.

### Epic E: Publication and collaboration

**US-13 (Must). Publish openly.** As the maintainer, I want the MCP server and dataset published openly, so that the Arc community can use and contribute to them.

- Given the repository, then it is public and the dataset is available under terms that allow reuse, with the sources credited.
- Given the dataset, then it contains no Registrai records copied beyond what the attribution terms allow (BR3).

**US-14 (Should). Open the collaboration channels.** As the maintainer, I want to propose the collaborations in the hybrid model, so that the project gets a concrete response from the ecosystem (M4).

- Given the published project, then a proposal is sent to Registrai to consume this project's hackathon and grant dataset.
- Given the published project, then an issue is opened in circlefin/skills proposing an ecosystem-research skill that uses this MCP.
- Given the published project, then suggestions are sent to the Arc docs MCP through its feedback tool and the community, for example indexing hackathon and grant posts.
- These are outreach actions, not product features; the product works without them.

## 7. Non-functional requirements

- NFR-01 Freshness: the dataset is refreshed weekly (BR6); every answer shows its data date.
- NFR-02 Correctness over completeness: a false "nothing similar exists" is the worst error for a reviewer. Answers state what was searched and never claim absence beyond coverage (US-05).
- NFR-03 Resilience to sources: if a third-party source fails, changes format or goes offline, the product degrades visibly and keeps serving the other sources (US-03, US-10).
- NFR-04 Attribution and licensing: CC BY 4.0 attribution for Registrai in every answer that uses it (BR2); each source's terms respected (BR5).
- NFR-05 Privacy: no personal data in the dataset (BR1), which limits the exposure under LGPD and GDPR.
- NFR-06 Speed: answers arrive within seconds; the numeric target is Q6.
- NFR-07 Openness: open-source server and dataset in a public repository (US-13).
- NFR-08 Maintainability: a single maintainer can keep the weekly refresh going without funding; the refresh must be simple enough for that.
- NFR-09 Arc-specific knowledge: answers about the ecosystem reflect Arc specifics the idea lists (USDC as the gas token, the two USDC decimal views of 18 native and 6 ERC-20, the blocklist, native transfer events, transaction memos, the ERC-8004 and ERC-8183 agent standards, StableFX and the Circle Payments Network). How much of this goes into answers in v1 is Q7.

## 8. What is not a requirement

Out of scope, per the idea:

- Docs and code skills: the official docs MCP and circlefin/skills already cover them; this project links to them.
- Partner matching by need (ramps, auditors): backlog.
- Reference personas in the style of stellar-dev-skill: backlog.
- Ecosystem research and content indexing: backlog.
- Aggregated views for Circle's ecosystem team: backlog.
- Payments, monetization and any onchain component, including per-query charging in USDC.
- Continuous automatic updates; v1 refreshes weekly.
- Personal data of any kind: the dataset stores project-level data only.
- Any chain other than Arc.

## 9. Open questions

From the idea:

- Q1: final project name (working name: Arc Lens).
- Q2: owner account and confirming the public repository. The repository is already public under the maintainer's personal account; confirm that this is final.
- Q3: how to decide whether a project is still live (demo up, recent commits, onchain activity via Registrai). Affects US-07.
- Q4: terms of use of each hackathon and grant source for automated collection. Affects US-01, US-02, US-11.
- Q5: which other sources to add after v1 (DoraHacks or other hackathon platforms, if they host Arc events). Backlog.

Gaps the idea does not answer, to confirm:

- Q6: what "within seconds" means as a number for the search answer (US-04, NFR-06).
- Q7: how much of the Arc-specific knowledge in the idea (NFR-09) the v1 answers must carry.
- Q8: what the "categories" for the gaps view are, and who defines them (US-06).
- Q9: how similarity is judged, and how low a match can be before it is hidden (US-04, US-05).
- Q10: under what license the dataset is published, given CC BY 4.0 on Registrai and the terms of the other sources (US-13).

## 10. Risks that affect requirements

- Registrai is closed source: it may change its API or go offline, and it has a per-IP rate limit (US-03, NFR-03).
- Hackathon and grant pages change format without notice, and some terms may forbid automated collection (US-10, US-11).
- Similarity false negatives are the worst error for a reviewer (US-05, NFR-02).
- Many hackathon projects have short descriptions, dead demos or deleted repositories (US-01, US-07).
- Hackathon pages list team members; publishing them would raise LGPD and GDPR issues (BR1, US-12).
- Circle may launch an official ecosystem tool, Registrai may extend its coverage, and without outreach nobody installs it (US-14, M3, M4).
- A single unfunded maintainer: a dataset that stops updating loses trust within about three months (US-10, NFR-08).
