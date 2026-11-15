# Arc Lens: open ecosystem intelligence for builders on Arc

Status: awaiting approval (2026-11-15). Working name: Arc Lens. Owner account and repository visibility to be confirmed before the repository is created.

## Problem

Builders who are new to Arc cannot quickly answer basic product questions: has this idea already been built on Arc, by whom, did it win a hackathon or a grant, is it live, and where are the gaps? The answers are scattered across Circle's grant announcements, Arc blog recaps of hackathon tracks, hackathon showcase pages (ETHGlobal, LabLab), the arc.io ecosystem page and third-party data such as Registrai.

Stellar has Raven (raven.stellar.org), which combines project directories, funding history, hackathon builds, partners, research and official docs behind one MCP server. Nothing at that level exists for Arc.

The team behind this idea runs this research every week. Today the result is either shallow (directory and docs only, no hackathon prior art or grant history) or takes days to become reliable.

## Audience

- Primary: builders on Arc looking for ideas, prior art and differentiation.
- Grant and hackathon reviewers checking for duplicates. They ask the same core question as builders.
- AI coding agents are the delivery channel: any agent that can use an MCP server gets the same answers.
- Later: Circle's ecosystem team, for aggregated views (out of scope for v1).

## Why blockchain

It does not need one. The product is an off-chain, open-source MCP server and dataset; removing the blockchain breaks nothing. It is developer tooling for the Arc ecosystem, not an onchain app. Charging per query in USDC through x402 was considered and rejected: the goal is community contribution and visibility, not revenue.

## Why this chain

- Stellar already has Raven; Arc does not. Arc mainnet launched on 2026-09-16 and its builder community is still forming.
- The tool must encode Arc-specific knowledge: USDC as the gas token, the two USDC decimal views (18 native, 6 ERC-20), the blocklist, native transfer events, transaction memos, the ERC-8004 and ERC-8183 agent standards, StableFX and the Circle Payments Network.
- Single-chain focus on purpose; no multichain support.

## Target program and competitors

- No funding program. The goal is visibility and contribution to the Arc community: publish openly, share in the Arc community channels and offer the tool to hackathon organizers.
- Existing tools and how this project relates to them:
  - Arc docs MCP (docs.arc.io/mcp, by Circle): documentation search only. Suggest improvements through its feedback tool and the community (for example, indexing hackathon and grant posts).
  - circlefin/skills (Apache-2.0, 16 code skills): code only, no ecosystem or product context. The repository mirrors an internal Circle repository and rarely merges outside pull requests; contribute through an issue proposing an ecosystem-research skill that uses this MCP.
  - Arc Studio (Circle): AI agent that builds and deploys apps to Arc testnet. Complementary.
  - Registrai Arc data (builder.registrai.cc): free, read-only MCP with a 297-project directory and onchain payment volume per app, CC BY 4.0, closed source. Reused as a data source with attribution, not duplicated. Propose an integration in which Registrai can consume this project's hackathon and grant dataset.
  - arc.io/ecosystem: official partner list, names only, no search by need.
- Model: hybrid. This project's open MCP server is the core; collaboration with Registrai, Circle skills and the docs MCP runs in parallel.

## MVP scope

The demo proves one sentence: "I describe my idea for Arc and within seconds I see who built something similar, whether it won a prize or grant, whether it is live, and where the gap is."

1. Dataset of Arc hackathon projects with winners flagged: ETHGlobal Cannes and HackMoney 2026 Arc tracks, LabLab Agentic Commerce on Arc and Agentic Economy on Arc, and Circle's own hackathons.
2. Dataset of Circle grant recipients: the published 2025 and 2026 cohorts, with project, description and date.
3. Registrai as the source for the ecosystem directory and onchain volume, queried with attribution and not copied.
4. Similarity search: given an idea description, return similar projects from all three sources, each with its source link and data date.
5. Gaps by category: what exists on Arc and what does not, ready to use.
6. Weekly dataset refresh, maintained by the project owner.

## Out of scope

- Docs and code skills: the official docs MCP and circlefin/skills already cover them; this project links to them.
- Partner matching by need (ramps, auditors) — backlog.
- Reference personas in the style of stellar-dev-skill — backlog.
- Ecosystem research and content indexing — backlog.
- Aggregated views for Circle's ecosystem team — backlog.
- Payments, monetization and any onchain component.
- Continuous automatic updates; v1 refreshes weekly.
- Personal data: the dataset stores project-level data only, never team members' names or contacts.

## Risks

- Third-party dependency, Registrai: closed source; it may change its API or go offline; per-IP rate limit; CC BY 4.0 requires attribution in every answer.
- Third-party dependency, hackathon and grant sources: pages change format without notice, and some sites' terms of use may forbid automated collection. Each source must be checked before collecting.
- Technical, similarity quality: false negatives ("nothing similar exists" when something does) are the worst error for a grant reviewer.
- Technical, incomplete data: many hackathon projects have short descriptions, dead demos or deleted repositories.
- Regulatory: low. Hackathon pages list team members; publishing them in an open dataset raises LGPD and GDPR issues. Mitigation: project-level data only.
- Adoption: Circle may launch an official ecosystem tool; Registrai may extend coverage to hackathons; without active outreach nobody installs it.
- Maintenance: no funding; a single maintainer keeps the weekly refresh. An open dataset that stops updating loses trust within about three months.

## Success metric

Within 30 days of publication:
1. Coverage: every project from at least 4 Arc hackathons and every published Circle grant cohort, each with source and date.
2. Internal use: the team uses the MCP in every weekly idea research, and research takes hours instead of days.
3. External use: at least 10 people outside the team install or use it (stars, issues or mentions).
4. Collaboration: at least one concrete response from Registrai or Circle's team (integration, issue comment or official mention).

## Open questions

- Final project name (working name: Arc Lens).
- Owner account (personal or Nearx-Labs) and confirming the public repository before creation.
- Terms of use of each hackathon and grant source for automated collection.
- How to decide whether a project is still live (demo up, recent commits, onchain activity via Registrai).
- Which other sources to add after v1 (DoraHacks or other hackathon platforms, if they host Arc events).
