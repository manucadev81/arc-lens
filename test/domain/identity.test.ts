import { describe, expect, it } from "vitest";
import {
	AliasCycleError,
	type ConfirmedProject,
	collapseToProjects,
	collapseToProjectsWithReport,
	countProjects,
	type DatasetRecord,
	type DirectoryEntry,
	defaultDirectoryQuota,
	directoryQuotaNote,
	gapSummary,
	gapVerdict,
	genericLinkWarning,
	type IdentityProposal,
	isSafeDirectoryLink,
	normalizeRepositoryUrl,
	ProjectIndex,
	projectOccurrences,
	proposeIdentityLinks,
	SELF_DECLARED_LINKS,
	websiteDomain,
} from "../../src/domain/index.js";

function hack(
	event: string,
	slug: string,
	name: string,
	options: { prize?: DatasetRecord["prize"]; repository?: string; website?: string } = {},
): DatasetRecord {
	return {
		id: `hack:${event}:${slug}`,
		kind: "hackathon_project",
		name,
		aliases: [],
		description: `Synthetic ${name}.`,
		categories: [],
		event: { id: event, name: `Event ${event}`, track: "Arc" },
		grant: null,
		prize: options.prize ?? "unknown",
		links: { demo: null, repository: options.repository ?? null, website: options.website ?? null },
		source: { id: "showcase", url: `https://example.com/${event}/${slug}`, dataDate: "2026-11-10" },
		status: { value: "unknown", checkedAt: "2026-11-10", evidence: [] },
		firstSeen: "2026-11-10",
		updatedAt: "2026-11-10",
	};
}

function grant(cohort: string, slug: string, name: string, repository?: string): DatasetRecord {
	return {
		...hack("x", slug, name, { repository }),
		id: `grant:${cohort}:${slug}`,
		kind: "grant_recipient",
		event: null,
		grant: { program: "Circle Grants", cohort: cohort, date: "2026-10-01" },
		prize: "unknown",
		source: { id: "grants", url: `https://example.com/grants/${cohort}`, dataDate: "2026-10-02" },
	};
}

function entry(slug: string, name: string, links: string[] = []): DirectoryEntry {
	return {
		id: `registrai:${slug}`,
		name,
		description: "Synthetic directory entry.",
		categories: [],
		status: "live",
		url: `https://builder.registrai.cc/ecosystem/${slug}`,
		links,
	};
}

function propose(input: Parameters<typeof proposeIdentityLinks>[0]): IdentityProposal[] {
	return [...proposeIdentityLinks(input).proposals];
}

const REPO = "https://github.com/example/examplemarket";
const market = [
	hack("cannes-2026", "examplemarket", "ExampleMarket", { prize: "winner", repository: REPO }),
	hack("hackmoney-2026", "examplemarket", "ExampleMarket", {
		prize: "not_winner",
		repository: REPO,
	}),
	hack("lablab-2026", "example-market", "Example Market", { repository: REPO }),
	grant("circle-2026", "examplemarket", "ExampleMarket", REPO),
];
const confirmed: ConfirmedProject = {
	id: "proj:examplemarket",
	name: "ExampleMarket",
	occurrences: market.map((record) => record.id),
	registraiSlug: "examplemarket",
	evidence: ["same repository github.com/example/examplemarket"],
	confirmedAt: "2026-11-17",
};
const sourceNames = new Map([
	["showcase", "Sample showcase"],
	["grants", "Circle grants"],
]);

describe("one project confirmed across three events, a grant and Registrai", () => {
	const other = hack("cannes-2026", "otherpay", "OtherPay");
	const index = new ProjectIndex({
		records: [...market, other],
		projects: [confirmed],
		aliases: [],
		pending: [],
	});

	it("counts once and uses one result slot", () => {
		const ranked = [
			{ occurrenceId: market[2]?.id ?? "", score: 0.91 },
			{ occurrenceId: "registrai:examplemarket", score: 0.88 },
			{ occurrenceId: other.id, score: 0.8 },
			{ occurrenceId: market[0]?.id ?? "", score: 0.7 },
			{ occurrenceId: market[3]?.id ?? "", score: 0.65 },
		];
		const top = collapseToProjects(ranked, index, 2);
		expect(top.map((p) => [p.projectId, p.score])).toEqual([
			["proj:examplemarket", 0.91],
			[other.id, 0.8],
		]);
		expect(top[0]?.matchedOccurrenceIds).toHaveLength(4);
		expect(collapseToProjects(ranked, index, 1).map((p) => p.projectId)).toEqual([
			"proj:examplemarket",
		]);
		expect(
			countProjects([...market.map((r) => r.id), "registrai:examplemarket"], index).count,
		).toBe(1);
	});

	it("keeps five occurrences with their sources and prizes on the card", () => {
		const project = index.resolve("proj:examplemarket");
		if (!project) throw new Error("project missing");
		const views = projectOccurrences(project, {
			records: new Map(market.map((r) => [r.id, r])),
			sourceNames,
			directoryEntry: entry("examplemarket", "ExampleMarket", [REPO]),
			fetchedOn: "2026-11-18",
		});
		expect(views.map((v) => [v.kind, v.prizeOrGrant.value, v.source.name])).toEqual([
			["hackathon_project", "winner", "Sample showcase"],
			["hackathon_project", "not_winner", "Sample showcase"],
			["hackathon_project", "unknown", "Sample showcase"],
			["grant_recipient", "grant", "Circle grants"],
			["directory_entry", "not_applicable", "Registrai"],
		]);
		expect(views[3]).toMatchObject({
			context: "Circle Grants, circle-2026",
			prizeOrGrant: { grantDate: "2026-10-01" },
		});
		expect(views[0]?.context).toBe("Event cannes-2026, Arc track");
		expect(new Set(views.map((v) => v.source.url)).size).toBe(5);
	});
});

describe("unlinked and same-name projects", () => {
	const alpha = hack("cannes-2026", "nova", "Nova", {
		repository: "https://github.com/alpha/nova",
	});
	const beta = hack("hackmoney-2026", "nova", "Nova", {
		repository: "https://github.com/beta/nova",
	});

	it("proposes only a possible link for the same name without a shared strong key", () => {
		const proposals = propose({
			records: [alpha, beta],
			directoryEntries: [],
			projects: [],
			pending: [],
			today: "2026-11-18",
		});
		expect(proposals).toEqual([
			{
				ids: [alpha.id, beta.id],
				kind: "possible",
				evidenceFor: ['same name "Nova"'],
				evidenceAgainst: ["no shared repository or website domain"],
				proposedAt: "2026-11-18",
			},
		]);
	});

	it("keeps them as two projects, each pointing to the other with possibleSameAs", () => {
		const pending: IdentityProposal[] = propose({
			records: [alpha, beta],
			directoryEntries: [],
			projects: [],
			pending: [],
			today: "2026-11-18",
		});
		const index = new ProjectIndex({ records: [alpha, beta], projects: [], aliases: [], pending });
		expect(index.projects().map((p) => p.id)).toEqual([alpha.id, beta.id]);
		const top = collapseToProjects(
			[
				{ occurrenceId: alpha.id, score: 0.9 },
				{ occurrenceId: beta.id, score: 0.8 },
			],
			index,
			5,
		);
		expect(top.map((p) => [p.projectId, p.possibleSameAs])).toEqual([
			[alpha.id, [beta.id]],
			[beta.id, [alpha.id]],
		]);
		expect(
			collapseToProjects([{ occurrenceId: alpha.id, score: 0.9 }], index, 5)[0]?.possibleSameAs,
		).toEqual([]);
	});

	it("flags that the count may be lower only when merging changes the verdict", () => {
		const others = ["a", "b", "c"].map((slug) => hack("event", slug, slug.toUpperCase()));
		const records = [alpha, beta, ...others];
		const pending = propose({
			records,
			directoryEntries: [],
			projects: [],
			pending: [],
			today: "2026-11-18",
		});
		const index = new ProjectIndex({ records, projects: [], aliases: [], pending });
		const five = countProjects(
			records.map((r) => r.id),
			index,
		);
		expect(five).toMatchObject({
			count: 5,
			minimumIfMerged: 4,
			verdict: "several",
			mayBeLower: true,
		});
		const four = countProjects(
			[alpha.id, beta.id, others[0]?.id ?? "", others[1]?.id ?? ""],
			index,
		);
		expect(four).toMatchObject({ count: 4, minimumIfMerged: 3, verdict: "few", mayBeLower: false });
	});

	it("leaves every unlinked occurrence as its own project", () => {
		const index = new ProjectIndex({
			records: [alpha, beta, ...market],
			projects: [],
			aliases: [],
			pending: [],
		});
		expect(index.projects()).toHaveLength(6);
		expect(index.resolve(market[0]?.id ?? "")?.occurrenceIds).toEqual([market[0]?.id]);
	});
});

describe("strong-key proposals", () => {
	it("links the same repository written in different forms and a Registrai entry that links it", () => {
		const a = hack("e1", "pay", "PayOne", { repository: "https://github.com/Example/Pay.git" });
		const b = hack("e2", "payments", "Totally Different", {
			repository: "http://www.github.com/example/pay/tree/main",
		});
		const proposals = propose({
			records: [a, b],
			directoryEntries: [entry("pay", "Pay", ["https://github.com/example/pay"])],
			projects: [],
			pending: [],
			today: "2026-11-18",
		});
		expect(proposals.filter((p) => p.kind === "strong_key")).toEqual([
			{
				ids: [a.id, b.id, "registrai:pay"],
				kind: "strong_key",
				evidenceFor: ["same repository github.com/example/pay"],
				evidenceAgainst: [SELF_DECLARED_LINKS],
				proposedAt: "2026-11-18",
			},
		]);
	});

	it("links by website domain but not by shared hosting or code hosts", () => {
		const a = hack("e1", "a", "Alpha", { website: "https://www.alpha.example/app" });
		const b = hack("e2", "b", "Beta", { website: "https://alpha.example" });
		const c = hack("e3", "c", "Gamma", { website: "https://devpost.com/software/c" });
		const d = hack("e4", "d", "Delta", { website: "https://devpost.com/software/d" });
		const proposals = propose({
			records: [a, b, c, d],
			directoryEntries: [],
			projects: [],
			pending: [],
			today: "2026-11-18",
		});
		expect(proposals.map((p) => [p.kind, p.ids])).toEqual([["strong_key", [a.id, b.id]]]);
	});

	it("never changes confirmed projects, skips pairs already confirmed or pending, and is order independent", () => {
		const projects = [structuredClone(confirmed)];
		const frozen = structuredClone(projects);
		const extra = hack("e9", "examplemarket", "ExampleMarket");
		const records = [...market, extra];
		const first = propose({
			records,
			directoryEntries: [],
			projects,
			pending: [],
			today: "2026-11-18",
		});
		expect(projects).toEqual(frozen);
		expect(first.every((p) => p.ids.includes(extra.id))).toBe(true);
		expect(first.every((p) => p.kind === "possible")).toBe(true);
		const reversed = propose({
			records: [...records].reverse(),
			directoryEntries: [],
			projects,
			pending: [],
			today: "2026-11-18",
		});
		expect(reversed).toEqual(first);
		expect(
			propose({
				records,
				directoryEntries: [],
				projects,
				pending: first,
				today: "2026-11-19",
			}),
		).toEqual([]);
	});

	it.each([
		["https://github.com/Org/Repo.git", "github.com/org/repo"],
		["git+https://gitlab.com/group/project/-/tree/main", "gitlab.com/group/project"],
		["https://github.com/org", null],
		["https://example.com/org/repo", null],
	])("normalizes repository %s", (url, expected) => {
		expect(normalizeRepositoryUrl(url)).toBe(expected);
	});

	it.each([
		["https://www.app.example/path", "app.example"],
		["https://myapp.vercel.app", "myapp.vercel.app"],
		["https://github.com/org/repo", null],
		["https://youtu.be/abc", null],
	])("website domain of %s", (url, expected) => {
		expect(websiteDomain(url)).toBe(expected);
	});
});

describe("resolving ids to the current project", () => {
	const index = new ProjectIndex({
		records: market,
		projects: [confirmed],
		aliases: [
			{
				from: "hack:cannes-2026:example-mkt",
				to: market[0]?.id ?? "",
				reason: "renamed",
				at: "2026-11-11",
			},
			{ from: "proj:old-market", to: "proj:examplemarket", reason: "merged", at: "2026-11-12" },
			{ from: "proj:older-market", to: "proj:old-market", reason: "merged", at: "2026-11-12" },
		],
		pending: [],
	});

	it.each([
		market[1]?.id ?? "",
		"proj:examplemarket",
		"registrai:examplemarket",
		"hack:cannes-2026:example-mkt",
		"proj:older-market",
	])("%s resolves to the project card", (id) => {
		expect(index.resolve(id)?.id).toBe("proj:examplemarket");
	});

	it("returns null for unknown ids and unlinked Registrai entries", () => {
		expect(index.resolve("proj:unknown")).toBeNull();
		expect(index.resolve("registrai:someone-else")).toBeNull();
	});

	it("rejects alias cycles, overlapping membership and dangling occurrences", () => {
		const cyclic = [
			{ from: "proj:a", to: "proj:b", reason: "merged" as const, at: "2026-11-12" },
			{ from: "proj:b", to: "proj:a", reason: "merged" as const, at: "2026-11-12" },
		];
		expect(
			() => new ProjectIndex({ records: market, projects: [], aliases: cyclic, pending: [] }),
		).toThrow(AliasCycleError);
		const overlapping = { ...confirmed, id: "proj:copy", registraiSlug: null };
		expect(
			() =>
				new ProjectIndex({
					records: market,
					projects: [confirmed, overlapping],
					aliases: [],
					pending: [],
				}),
		).toThrow("belongs to proj:examplemarket and proj:copy");
		const dangling = { ...confirmed, occurrences: ["hack:nowhere:missing"] };
		expect(
			() => new ProjectIndex({ records: market, projects: [dangling], aliases: [], pending: [] }),
		).toThrow("references unknown occurrence");
		const sameSlug = { ...confirmed, id: "proj:other", occurrences: [] };
		expect(
			() =>
				new ProjectIndex({
					records: market,
					projects: [confirmed, sameSlug],
					aliases: [],
					pending: [],
				}),
		).toThrow("Registrai entry registrai:examplemarket belongs to");
	});
});

describe("only possible links create uncertainty", () => {
	it("a pending strong_key proposal does not add possibleSameAs or T-19", () => {
		const records = ["a", "b", "c", "d", "e"].map((slug) => hack("e1", slug, slug.toUpperCase()));
		const pendingStrong: IdentityProposal = {
			ids: [records[0]?.id ?? "", records[1]?.id ?? ""],
			kind: "strong_key",
			evidenceFor: ["same repository github.com/x/y"],
			evidenceAgainst: [],
			proposedAt: "2026-11-18",
		};
		const index = new ProjectIndex({
			records,
			projects: [],
			aliases: [],
			pending: [pendingStrong],
		});
		expect(index.possibleSameAs(records[0]?.id ?? "")).toEqual([]);
		expect(
			countProjects(
				records.map((r) => r.id),
				index,
			),
		).toMatchObject({ verdict: "several", mayBeLower: false });
		const asPossible = new ProjectIndex({
			records,
			projects: [],
			aliases: [],
			pending: [{ ...pendingStrong, kind: "possible" }],
		});
		expect(
			countProjects(
				records.map((r) => r.id),
				asPossible,
			),
		).toMatchObject({ mayBeLower: true });
	});
});

describe("stable result payload", () => {
	it("returns matched occurrence ids in a canonical order regardless of input order", () => {
		const index = new ProjectIndex({
			records: market,
			projects: [confirmed],
			aliases: [],
			pending: [],
		});
		const ranked = market.map((r) => ({ occurrenceId: r.id, score: 0.5 }));
		const forward = collapseToProjects(ranked, index, 1);
		const backward = collapseToProjects([...ranked].reverse(), index, 1);
		expect(forward).toEqual(backward);
		expect(forward[0]?.matchedOccurrenceIds).toEqual(market.map((r) => r.id).sort());
	});
});

describe("gap verdict thresholds", () => {
	it.each([
		[0, "none"],
		[1, "few"],
		[4, "few"],
		[5, "several"],
	])("%s projects is %s", (count, verdict) => {
		expect(gapVerdict(count)).toBe(verdict);
	});
});

describe("proposal explosion guards", () => {
	const many = (
		count: number,
		links: { repository?: string; website?: string },
		name?: (i: number) => string,
	) =>
		Array.from({ length: count }, (_, i) =>
			hack("bulk-2026", `p${i}`, name ? name(i) : `Project ${i}`, links),
		);

	it("1,500 records sharing an Arc explorer link produce no proposals", () => {
		const records = many(1500, { website: "https://testnet.arcscan.app/address/0xabc" });
		const report = proposeIdentityLinks({
			records,
			directoryEntries: [],
			projects: [],
			pending: [],
			today: "2026-11-18",
		});
		expect(report.proposals).toEqual([]);
		expect(report.omitted).toBe(0);
	});

	it("1,500 records sharing a template repository and name give no proposal and are reported", () => {
		const records = many(
			1500,
			{ repository: "https://github.com/template/arc-starter" },
			() => "Arc Starter",
		);
		const report = proposeIdentityLinks({
			records,
			directoryEntries: [],
			projects: [],
			pending: [],
			today: "2026-11-18",
		});
		expect(report.proposals).toEqual([]);
		expect(report.sharedKeys).toEqual([
			{ key: "repo:github.com/template/arc-starter", candidates: 1500, proposed: false },
			{ key: "name:arcstarter", candidates: 1500, proposed: false },
		]);
	});

	it("proposes one group per key, flagging groups above three as possibly generic instead of dropping them", () => {
		const three = many(3, { repository: "https://github.com/team/app" });
		expect(
			propose({
				records: three,
				directoryEntries: [],
				projects: [],
				pending: [],
				today: "2026-11-18",
			}),
		).toEqual([
			{
				ids: three.map((r) => r.id).sort(),
				kind: "strong_key",
				evidenceFor: ["same repository github.com/team/app"],
				evidenceAgainst: [],
				proposedAt: "2026-11-18",
			},
		]);
		const four = many(4, { repository: "https://github.com/team/app" });
		const report = proposeIdentityLinks({
			records: four,
			directoryEntries: [],
			projects: [],
			pending: [],
			today: "2026-11-18",
		});
		expect(report.proposals).toEqual([
			{
				ids: four.map((r) => r.id).sort(),
				kind: "strong_key",
				evidenceFor: ["same repository github.com/team/app"],
				evidenceAgainst: [genericLinkWarning(4)],
				proposedAt: "2026-11-18",
			},
		]);
		expect(report.sharedKeys).toEqual([
			{ key: "repo:github.com/team/app", candidates: 4, proposed: true },
		]);
	});

	it("proposes the five occurrences of one real project sharing a repository as a single group", () => {
		const report = proposeIdentityLinks({
			records: market,
			directoryEntries: [entry("examplemarket", "ExampleMarket", [REPO])],
			projects: [],
			pending: [],
			today: "2026-11-18",
		});
		const strong = report.proposals.filter((p) => p.kind === "strong_key");
		expect(strong).toHaveLength(1);
		expect(strong[0]?.ids).toEqual([...market.map((r) => r.id), "registrai:examplemarket"].sort());
		expect(strong[0]?.evidenceAgainst).toEqual([SELF_DECLARED_LINKS, genericLinkWarning(5)].sort());
		expect(report.proposals.filter((p) => p.kind === "possible")).toEqual([]);
	});

	it("does not add same-name possible links inside a strong group larger than three", () => {
		const records = [
			["e1", "Nova"],
			["e2", "Nova"],
			["e3", "Nova Pay"],
			["e4", "Pay Nova"],
		].map(([event, name]) =>
			hack(event ?? "", "nova", name ?? "", { repository: "https://github.com/team/nova" }),
		);
		const proposals = propose({
			records,
			directoryEntries: [],
			projects: [],
			pending: [],
			today: "2026-11-18",
		});
		expect(proposals.map((p) => p.kind)).toEqual(["strong_key"]);
	});

	it("never proposes a possible link between members of a strong group over 50", () => {
		const records = [
			...many(60, { repository: "https://github.com/template/arc-starter" }),
			hack("x1", "nova", "Nova", { repository: "https://github.com/template/arc-starter" }),
			hack("x2", "nova", "Nova", { repository: "https://github.com/template/arc-starter" }),
		];
		const report = proposeIdentityLinks({
			records,
			directoryEntries: [],
			projects: [],
			pending: [],
			today: "2026-11-18",
		});
		expect(report.proposals).toEqual([]);
		expect(report.sharedKeys).toEqual([
			{ key: "repo:github.com/template/arc-starter", candidates: 62, proposed: false },
		]);
		const index = new ProjectIndex({
			records,
			projects: [],
			aliases: [],
			pending: [...report.proposals],
		});
		expect(index.possibleSameAs(records[60]?.id ?? "")).toEqual([]);
	});

	it("still proposes a possible link for the same name when the strong keys differ", () => {
		const a = hack("x1", "nova", "Nova", { repository: "https://github.com/alpha/nova" });
		const b = hack("x2", "nova", "Nova", { repository: "https://github.com/beta/nova" });
		expect(
			propose({
				records: [a, b],
				directoryEntries: [],
				projects: [],
				pending: [],
				today: "2026-11-18",
			}).map((p) => p.kind),
		).toEqual(["possible"]);
	});

	it("exposes omitted proposals in the public result", () => {
		const records = Array.from({ length: 20 }, (_, i) => [
			hack("e1", `a${i}`, `Alpha ${i}`, { repository: `https://github.com/team/app-${i}` }),
			hack("e2", `b${i}`, `Beta ${i}`, { repository: `https://github.com/team/app-${i}` }),
		]).flat();
		const report = proposeIdentityLinks({
			records,
			directoryEntries: [],
			projects: [],
			pending: [],
			today: "2026-11-18",
			maxProposals: 5,
		});
		expect(report.proposals).toHaveLength(5);
		expect(report.omitted).toBe(15);
	});

	it("caps proposals per refresh and reports how many were omitted, strong keys first", () => {
		const records = Array.from({ length: 20 }, (_, i) => [
			hack("e1", `a${i}`, `Alpha ${i}`, { repository: `https://github.com/team/app-${i}` }),
			hack("e2", `b${i}`, `Beta ${i}`, { repository: `https://github.com/team/app-${i}` }),
		]).flat();
		const report = proposeIdentityLinks({
			records,
			directoryEntries: [],
			projects: [],
			pending: [],
			today: "2026-11-18",
			maxProposals: 5,
		});
		expect(report.proposals).toHaveLength(5);
		expect(report.omitted).toBe(15);
		expect(report.proposals.every((p) => p.kind === "strong_key")).toBe(true);
	});

	it.each([
		["https://docs.arc.network/arc/concepts", null],
		["https://testnet.arcscan.app/tx/0x1", null],
		["https://faucet.circle.com", null],
		["https://developers.circle.com/w3s", null],
		["https://vercel.app", null],
		["https://myapp.vercel.app", "myapp.vercel.app"],
		["https://project.arc.example", "project.arc.example"],
	])("website domain of %s is %s", (url, expected) => {
		expect(websiteDomain(url)).toBe(expected);
	});
});

describe("directory links are self-declared and filtered", () => {
	const legit = hack("e1", "pay", "Pay", { repository: "https://github.com/legit/pay" });

	it("marks strong keys that rely on a Registrai entry as self-declared", () => {
		const proposals = propose({
			records: [legit],
			directoryEntries: [entry("copycat", "Copycat", ["https://github.com/legit/pay"])],
			projects: [],
			pending: [],
			today: "2026-11-18",
		});
		expect(proposals).toEqual([
			{
				ids: [legit.id, "registrai:copycat"],
				kind: "strong_key",
				evidenceFor: ["same repository github.com/legit/pay"],
				evidenceAgainst: [SELF_DECLARED_LINKS],
				proposedAt: "2026-11-18",
			},
		]);
	});

	it("ignores directory links that are not https or carry credentials", () => {
		for (const link of [
			"http://github.com/legit/pay",
			"https://user:secret@github.com/legit/pay",
			"javascript:alert(1)",
		]) {
			const proposals = propose({
				records: [legit],
				directoryEntries: [entry("other", "Other", [link])],
				projects: [],
				pending: [],
				today: "2026-11-18",
			});
			expect(proposals).toEqual([]);
		}
		expect(isSafeDirectoryLink("https://github.com/legit/pay")).toBe(true);
	});
});

describe("unreviewed directory entries cannot crowd out or inflate results", () => {
	const reviewed = ["a", "b", "c", "d", "e", "f"].map((slug) =>
		hack("e1", slug, slug.toUpperCase()),
	);
	const index = new ProjectIndex({ records: reviewed, projects: [], aliases: [], pending: [] });
	const spam = Array.from({ length: 10 }, (_, i) => ({
		occurrenceId: `registrai:spam-${i}`,
		score: 0.99,
	}));
	const legit = reviewed.map((record, i) => ({ occurrenceId: record.id, score: 0.6 - i * 0.01 }));

	it("allows at most half of the limit for directory-only projects", () => {
		const top = collapseToProjects([...spam, ...legit], index, 5);
		expect(top).toHaveLength(5);
		expect(top.filter((p) => p.directoryOnly)).toHaveLength(2);
		expect(top.filter((p) => !p.directoryOnly).map((p) => p.projectId)).toEqual(
			reviewed.slice(0, 3).map((r) => r.id),
		);
		expect(defaultDirectoryQuota(5)).toBe(2);
	});

	it("gives no directory-only slot when the limit is 1, unless the caller sets a quota", () => {
		expect(collapseToProjects([...spam, ...legit], index, 1).map((p) => p.directoryOnly)).toEqual([
			false,
		]);
		expect(
			collapseToProjects([...spam, ...legit], index, 1, { directoryQuota: 1 })[0]?.directoryOnly,
		).toBe(true);
	});

	it("bases the gap verdict on reviewed projects only", () => {
		const count = countProjects(
			[...spam.map((s) => s.occurrenceId), reviewed[0]?.id ?? "", reviewed[1]?.id ?? ""],
			index,
		);
		expect(count).toMatchObject({ count: 2, verdict: "few", mayBeLower: false });
		expect(count.directoryOnlyIds).toHaveLength(10);
		expect(
			countProjects(
				spam.map((s) => s.occurrenceId),
				index,
			),
		).toMatchObject({ count: 0, verdict: "none" });
	});

	it("counts a Registrai entry linked to a confirmed project as reviewed", () => {
		const linked = new ProjectIndex({
			records: market,
			projects: [confirmed],
			aliases: [],
			pending: [],
		});
		expect(countProjects(["registrai:examplemarket"], linked)).toMatchObject({
			count: 1,
			directoryOnlyIds: [],
		});
	});
});

describe("gap summary never implies a false absence", () => {
	const reviewed = ["a", "b"].map((slug) => hack("e1", slug, slug.toUpperCase()));
	const index = new ProjectIndex({ records: reviewed, projects: [], aliases: [], pending: [] });
	const directory = (n: number) => Array.from({ length: n }, (_, i) => `registrai:entry-${i}`);

	it("10 directory entries and 2 reviewed projects give few, T-05 and T-21", () => {
		const count = countProjects([...directory(10), ...reviewed.map((r) => r.id)], index);
		expect(count).toMatchObject({ count: 2, directoryOnlyCount: 10, verdict: "few" });
		expect(gapSummary(count)).toEqual([
			{ id: "T-05", text: "Only a few projects found in this category in the covered sources." },
			{
				id: "T-21",
				text: "10 more entries from the Registrai directory are listed but not reviewed, so they are not counted.",
			},
		]);
	});

	it("0 reviewed projects and 3 directory entries give none with T-22, never T-06", () => {
		const count = countProjects(directory(3), index);
		expect(count).toMatchObject({ count: 0, directoryOnlyCount: 3, verdict: "none" });
		const summary = gapSummary(count);
		expect(summary).toEqual([
			{
				id: "T-22",
				text: "No reviewed project found in this category. 3 Registrai directory entries were found but are not reviewed; they are listed below.",
			},
		]);
		expect(summary.some((line) => line.id === "T-06")).toBe(false);
	});

	it("nothing at all gives T-06", () => {
		expect(gapSummary(countProjects([], index))).toEqual([
			{
				id: "T-06",
				text: "No project found in this category in the covered sources. This does not mean that nobody has built something in this area.",
			},
		]);
	});

	it("a Registrai entry linked to a confirmed project counts as reviewed", () => {
		const linked = new ProjectIndex({
			records: market,
			projects: [confirmed],
			aliases: [],
			pending: [],
		});
		const count = countProjects(["registrai:examplemarket"], linked);
		expect(count).toMatchObject({ count: 1, directoryOnlyCount: 0, verdict: "few" });
		expect(gapSummary(count).map((line) => line.id)).toEqual(["T-05"]);
	});

	it("several reviewed projects add T-19 when merging could lower the verdict and T-21 for directory entries", () => {
		const five = ["a", "b", "c", "d"].map((slug) => hack("e2", slug, slug.toUpperCase()));
		const twin = hack("e3", "a", "A");
		const records = [...five, twin];
		const pending = propose({
			records,
			directoryEntries: [],
			projects: [],
			pending: [],
			today: "2026-11-18",
		});
		const withTwin = new ProjectIndex({ records, projects: [], aliases: [], pending });
		const count = countProjects([...records.map((r) => r.id), ...directory(1)], withTwin);
		expect(gapSummary(count).map((line) => line.id)).toEqual(["T-04", "T-19", "T-21"]);
	});
});

describe("the directory quota never hides matches silently", () => {
	const reviewed = ["a", "b", "c", "d", "e", "f"].map((slug) =>
		hack("e1", slug, slug.toUpperCase()),
	);
	const index = new ProjectIndex({ records: reviewed, projects: [], aliases: [], pending: [] });
	const spam = Array.from({ length: 10 }, (_, i) => ({
		occurrenceId: `registrai:entry-${i}`,
		score: 0.99,
	}));
	const legit = reviewed.map((record, i) => ({ occurrenceId: record.id, score: 0.6 - i * 0.01 }));

	it("reports how many directory matches the quota left out and marks the answer incomplete", () => {
		const report = collapseToProjectsWithReport([...spam, ...legit], index, 5);
		expect(report).toMatchObject({
			droppedByDirectoryQuota: 8,
			directoryQuota: 2,
			complete: false,
		});
		expect(directoryQuotaNote(report, 5)).toBe(
			"8 more unreviewed Registrai directory matches were left out, because unreviewed entries are limited to 2 of 5 results.",
		);
	});

	it("stays complete with no note when the quota drops nothing", () => {
		const report = collapseToProjectsWithReport([...spam.slice(0, 2), ...legit], index, 5);
		expect(report).toMatchObject({ droppedByDirectoryQuota: 0, complete: true });
		expect(directoryQuotaNote(report, 5)).toBeNull();
	});

	it("does not count matches that would not fit the limit anyway as dropped by the quota", () => {
		const lowSpam = Array.from({ length: 4 }, (_, i) => ({
			occurrenceId: `registrai:low-${i}`,
			score: 0.1,
		}));
		const report = collapseToProjectsWithReport([...legit, ...lowSpam], index, 5);
		expect(report.results.every((r) => !r.directoryOnly)).toBe(true);
		expect(report).toMatchObject({ droppedByDirectoryQuota: 0, complete: true });
	});
});
