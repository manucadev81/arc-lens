import { describe, expect, it } from "vitest";
import {
	AliasCycleError,
	type ConfirmedProject,
	collapseToProjects,
	countProjects,
	type DatasetRecord,
	type DirectoryEntry,
	gapVerdict,
	type IdentityProposal,
	normalizeRepositoryUrl,
	ProjectIndex,
	projectOccurrences,
	proposeIdentityLinks,
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
		const proposals = proposeIdentityLinks({
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
		const pending: IdentityProposal[] = proposeIdentityLinks({
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
		const pending = proposeIdentityLinks({
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
		const proposals = proposeIdentityLinks({
			records: [a, b],
			directoryEntries: [entry("pay", "Pay", ["https://github.com/example/pay"])],
			projects: [],
			pending: [],
			today: "2026-11-18",
		});
		expect(proposals.filter((p) => p.kind === "strong_key").map((p) => p.ids)).toEqual([
			[a.id, b.id],
			[a.id, "registrai:pay"],
			[b.id, "registrai:pay"],
		]);
		expect(
			proposals.every((p) => p.evidenceFor.includes("same repository github.com/example/pay")),
		).toBe(true);
	});

	it("links by website domain but not by shared hosting or code hosts", () => {
		const a = hack("e1", "a", "Alpha", { website: "https://www.alpha.example/app" });
		const b = hack("e2", "b", "Beta", { website: "https://alpha.example" });
		const c = hack("e3", "c", "Gamma", { website: "https://devpost.com/software/c" });
		const d = hack("e4", "d", "Delta", { website: "https://devpost.com/software/d" });
		const proposals = proposeIdentityLinks({
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
		const first = proposeIdentityLinks({
			records,
			directoryEntries: [],
			projects,
			pending: [],
			today: "2026-11-18",
		});
		expect(projects).toEqual(frozen);
		expect(first.every((p) => p.ids.includes(extra.id))).toBe(true);
		expect(first.every((p) => p.kind === "possible")).toBe(true);
		const reversed = proposeIdentityLinks({
			records: [...records].reverse(),
			directoryEntries: [],
			projects,
			pending: [],
			today: "2026-11-18",
		});
		expect(reversed).toEqual(first);
		expect(
			proposeIdentityLinks({
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
