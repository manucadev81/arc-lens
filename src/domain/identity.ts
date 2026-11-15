import type { DirectoryEntry } from "./directory.js";
import { slugify } from "./identifiers.js";
import type { DatasetRecord, IsoDate } from "./records.js";

export interface ConfirmedProject {
	readonly id: string;
	readonly name: string;
	readonly occurrences: readonly string[];
	readonly registraiSlug: string | null;
	readonly evidence: readonly string[];
	readonly confirmedAt: IsoDate;
}

export interface IdAlias {
	readonly from: string;
	readonly to: string;
	readonly reason: "renamed" | "merged";
	readonly at: IsoDate;
}

export interface IdentityProposal {
	readonly ids: readonly string[];
	readonly kind: "strong_key" | "possible";
	readonly evidenceFor: readonly string[];
	readonly evidenceAgainst: readonly string[];
	readonly proposedAt: IsoDate;
}

const CODE_HOSTS = new Set(["github.com", "gitlab.com", "bitbucket.org", "codeberg.org"]);

const SHARED_HOSTS = new Set([
	"github.com",
	"gitlab.com",
	"bitbucket.org",
	"codeberg.org",
	"devpost.com",
	"ethglobal.com",
	"lablab.ai",
	"youtube.com",
	"youtu.be",
	"loom.com",
	"vimeo.com",
	"docs.google.com",
	"drive.google.com",
	"medium.com",
	"mirror.xyz",
	"notion.so",
	"notion.site",
	"linktr.ee",
	"x.com",
	"twitter.com",
	"figma.com",
	"canva.com",
	"builder.registrai.cc",
]);

function parseUrl(url: string): { host: string; segments: string[] } | null {
	const match = /^[a-z][a-z0-9+.-]*:\/\/(?:[^/?#@]*@)?([^/?#:]+)(?::\d+)?([^?#]*)/i.exec(
		url.trim(),
	);
	if (!match?.[1]) return null;
	const host = match[1]
		.toLowerCase()
		.replace(/\.$/, "")
		.replace(/^www\./, "");
	const segments = (match[2] ?? "").split("/").filter((segment) => segment.length > 0);
	return { host, segments };
}

export function normalizeRepositoryUrl(url: string): string | null {
	const parsed = parseUrl(url);
	if (!parsed || !CODE_HOSTS.has(parsed.host)) return null;
	const [owner, repository] = parsed.segments;
	if (!owner || !repository) return null;
	return `${parsed.host}/${owner.toLowerCase()}/${repository.toLowerCase().replace(/\.git$/, "")}`;
}

const SHARED_HOST_SUFFIXES = [
	"arc.network",
	"arc.io",
	"arcscan.app",
	"arcscan.io",
	"circle.com",
	"usdc.com",
	"vercel.app",
	"netlify.app",
	"github.io",
	"gitbook.io",
	"pages.dev",
	"replit.app",
	"onrender.com",
	"herokuapp.com",
];

function isSharedHost(host: string): boolean {
	return (
		SHARED_HOSTS.has(host) ||
		SHARED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))
	);
}

const PLATFORM_SUBDOMAIN_SUFFIXES = [
	"vercel.app",
	"netlify.app",
	"github.io",
	"gitbook.io",
	"pages.dev",
	"replit.app",
	"onrender.com",
	"herokuapp.com",
];

export function websiteDomain(url: string): string | null {
	const parsed = parseUrl(url);
	if (!parsed) return null;
	const isProjectSubdomain = PLATFORM_SUBDOMAIN_SUFFIXES.some((suffix) =>
		parsed.host.endsWith(`.${suffix}`),
	);
	if (isProjectSubdomain) return parsed.host;
	return isSharedHost(parsed.host) ? null : parsed.host;
}

export function isSafeDirectoryLink(url: string): boolean {
	return /^https:\/\/(?![^/?#]*@)[^\s/?#]+/i.test(url.trim());
}

export function normalizeName(name: string): string {
	return slugify(name).replace(/-/g, "");
}

export interface StrongKey {
	readonly key: string;
	readonly evidence: string;
}

function keysFromUrls(urls: readonly (string | null)[]): StrongKey[] {
	const keys = new Map<string, string>();
	for (const url of urls) {
		if (!url) continue;
		const repository = normalizeRepositoryUrl(url);
		if (repository) keys.set(`repo:${repository}`, `same repository ${repository}`);
		const domain = websiteDomain(url);
		if (domain) keys.set(`domain:${domain}`, `same website domain ${domain}`);
	}
	return [...keys].map(([key, evidence]) => ({ key, evidence }));
}

export function recordStrongKeys(record: DatasetRecord): StrongKey[] {
	return keysFromUrls([record.links.repository, record.links.website, record.links.demo]);
}

export function directoryStrongKeys(entry: DirectoryEntry): StrongKey[] {
	return keysFromUrls(entry.links.filter(isSafeDirectoryLink));
}

interface Candidate {
	readonly id: string;
	readonly names: readonly string[];
	readonly keys: readonly StrongKey[];
	readonly fromDirectory: boolean;
}

function sortedPair(a: string, b: string): [string, string] {
	return a < b ? [a, b] : [b, a];
}

export const DEFAULT_MAX_CANDIDATES_PER_KEY = 3;
export const DEFAULT_MAX_GROUP_SIZE = 50;
export const DEFAULT_MAX_PROPOSALS = 200;
export const SELF_DECLARED_LINKS = "links are self-declared by the Registrai entry";

export function genericLinkWarning(candidates: number): string {
	return `shared by ${candidates} occurrences; may be a template, explorer or other generic link`;
}

export interface SharedKey {
	readonly key: string;
	readonly candidates: number;
	readonly proposed: boolean;
}

export interface IdentityProposalReport {
	readonly proposals: readonly IdentityProposal[];
	readonly sharedKeys: readonly SharedKey[];
	readonly omitted: number;
}

export function proposeIdentityLinks(input: {
	readonly records: readonly DatasetRecord[];
	readonly directoryEntries: readonly DirectoryEntry[];
	readonly projects: readonly ConfirmedProject[];
	readonly pending: readonly IdentityProposal[];
	readonly today: IsoDate;
	readonly maxCandidatesPerKey?: number;
	readonly maxGroupSize?: number;
	readonly maxProposals?: number;
}): IdentityProposalReport {
	const genericAbove = input.maxCandidatesPerKey ?? DEFAULT_MAX_CANDIDATES_PER_KEY;
	const maxGroupSize = input.maxGroupSize ?? DEFAULT_MAX_GROUP_SIZE;
	const maxProposals = input.maxProposals ?? DEFAULT_MAX_PROPOSALS;
	const group = new Map<string, string>();
	for (const project of input.projects) {
		for (const occurrence of project.occurrences) group.set(occurrence, project.id);
		if (project.registraiSlug) group.set(`registrai:${project.registraiSlug}`, project.id);
	}
	const groupOf = (id: string) => group.get(id) ?? id;

	const candidates: Candidate[] = [
		...input.records.map((record) => ({
			id: record.id,
			names: [record.name, ...record.aliases],
			keys: recordStrongKeys(record),
			fromDirectory: false,
		})),
		...input.directoryEntries.map((entry) => ({
			id: entry.id,
			names: [entry.name],
			keys: directoryStrongKeys(entry),
			fromDirectory: true,
		})),
	];
	const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
	const sharedKeys: SharedKey[] = [];
	const known = new Set(input.pending.map((p) => `${p.kind} ${[...p.ids].sort().join(" ")}`));

	const strong = new Map<string, { ids: string[]; evidence: Set<string>; against: Set<string> }>();
	const byKey = new Map<string, Set<string>>();
	for (const candidate of candidates) {
		for (const { key } of candidate.keys)
			byKey.set(key, (byKey.get(key) ?? new Set()).add(candidate.id));
	}
	for (const [key, idSet] of [...byKey].sort(([a], [b]) => (a < b ? -1 : 1))) {
		const ids = [...idSet].sort();
		if (new Set(ids.map(groupOf)).size < 2) continue;
		if (ids.length > genericAbove) {
			sharedKeys.push({ key, candidates: ids.length, proposed: ids.length <= maxGroupSize });
			if (ids.length > maxGroupSize) continue;
		}
		const signature = ids.join(" ");
		const current = strong.get(signature) ?? { ids, evidence: new Set(), against: new Set() };
		const first = byId.get(ids[0] ?? "");
		current.evidence.add(first?.keys.find((k) => k.key === key)?.evidence ?? key);
		if (ids.some((id) => byId.get(id)?.fromDirectory)) current.against.add(SELF_DECLARED_LINKS);
		if (ids.length > genericAbove) current.against.add(genericLinkWarning(ids.length));
		strong.set(signature, current);
	}
	const shareStrongKey = (a: Candidate, b: Candidate) => {
		const keysOfB = new Set(b.keys.map((k) => k.key));
		return a.keys.some((k) => keysOfB.has(k.key));
	};

	const possible = new Map<string, Set<string>>();
	const byName = new Map<string, Candidate[]>();
	for (const candidate of candidates) {
		for (const name of new Set(candidate.names.map(normalizeName).filter((n) => n.length > 0))) {
			byName.set(name, [...(byName.get(name) ?? []), candidate]);
		}
	}
	for (const [name, members] of [...byName].sort(([a], [b]) => (a < b ? -1 : 1))) {
		const unique = [...new Map(members.map((m) => [m.id, m])).values()].sort((a, b) =>
			a.id < b.id ? -1 : 1,
		);
		if (unique.length > genericAbove) {
			sharedKeys.push({ key: `name:${name}`, candidates: unique.length, proposed: false });
			continue;
		}
		for (let i = 0; i < unique.length; i++) {
			for (let j = i + 1; j < unique.length; j++) {
				const a = unique[i];
				const b = unique[j];
				if (!a || !b || groupOf(a.id) === groupOf(b.id)) continue;
				const pair = sortedPair(a.id, b.id).join(" ");
				if (shareStrongKey(a, b)) continue;
				const shown = [a.names[0] ?? "", b.names[0] ?? ""].sort()[0];
				possible.set(pair, (possible.get(pair) ?? new Set()).add(`same name "${shown}"`));
			}
		}
	}

	const all: IdentityProposal[] = [];
	for (const [signature, { ids, evidence, against }] of [...strong].sort(([a], [b]) =>
		a < b ? -1 : 1,
	)) {
		if (known.has(`strong_key ${signature}`)) continue;
		all.push({
			ids,
			kind: "strong_key",
			evidenceFor: [...evidence].sort(),
			evidenceAgainst: [...against].sort(),
			proposedAt: input.today,
		});
	}
	for (const [pair, evidence] of [...possible].sort(([a], [b]) => (a < b ? -1 : 1))) {
		if (known.has(`possible ${pair}`)) continue;
		all.push({
			ids: pair.split(" "),
			kind: "possible",
			evidenceFor: [...evidence].sort(),
			evidenceAgainst: ["no shared repository or website domain"],
			proposedAt: input.today,
		});
	}
	const limit = Math.max(0, maxProposals);
	return { proposals: all.slice(0, limit), sharedKeys, omitted: Math.max(0, all.length - limit) };
}

export interface ProjectGroup {
	readonly id: string;
	readonly name: string;
	readonly occurrenceIds: readonly string[];
	readonly registraiSlug: string | null;
	readonly confirmed: boolean;
}

export class AliasCycleError extends Error {
	constructor(readonly id: string) {
		super(`Alias chain has a cycle at ${id}`);
		this.name = "AliasCycleError";
	}
}

export class ProjectIndex {
	private readonly groups = new Map<string, ProjectGroup>();
	private readonly occurrenceToProject = new Map<string, string>();
	private readonly registraiToProject = new Map<string, string>();
	private readonly aliasTargets = new Map<string, string>();
	private readonly uncertain = new Map<string, Set<string>>();

	constructor(input: {
		readonly records: readonly DatasetRecord[];
		readonly projects: readonly ConfirmedProject[];
		readonly aliases: readonly IdAlias[];
		readonly pending: readonly IdentityProposal[];
	}) {
		const recordIds = new Set(input.records.map((record) => record.id));
		for (const project of input.projects) {
			for (const occurrence of project.occurrences) {
				if (!recordIds.has(occurrence)) {
					throw new RangeError(`Project ${project.id} references unknown occurrence ${occurrence}`);
				}
				const owner = this.occurrenceToProject.get(occurrence);
				if (owner !== undefined) {
					throw new RangeError(`Occurrence ${occurrence} belongs to ${owner} and ${project.id}`);
				}
				this.occurrenceToProject.set(occurrence, project.id);
			}
			if (project.registraiSlug) {
				const id = `registrai:${project.registraiSlug}`;
				const owner = this.registraiToProject.get(id);
				if (owner !== undefined) {
					throw new RangeError(`Registrai entry ${id} belongs to ${owner} and ${project.id}`);
				}
				this.registraiToProject.set(id, project.id);
			}
			this.groups.set(project.id, {
				id: project.id,
				name: project.name,
				occurrenceIds: [...project.occurrences],
				registraiSlug: project.registraiSlug,
				confirmed: true,
			});
		}
		for (const record of input.records) {
			if (this.occurrenceToProject.has(record.id)) continue;
			this.occurrenceToProject.set(record.id, record.id);
			this.groups.set(record.id, {
				id: record.id,
				name: record.name,
				occurrenceIds: [record.id],
				registraiSlug: null,
				confirmed: false,
			});
		}
		for (const alias of input.aliases) this.aliasTargets.set(alias.from, alias.to);
		for (const alias of input.aliases) this.followAliases(alias.from);
		for (const proposal of input.pending.filter((p) => p.kind === "possible")) {
			const projectIds = [...new Set(proposal.ids.map((id) => this.projectIdOf(id)))];
			for (const a of projectIds) {
				for (const b of projectIds) {
					if (a !== b) this.uncertain.set(a, (this.uncertain.get(a) ?? new Set()).add(b));
				}
			}
		}
	}

	private followAliases(id: string): string {
		const seen = new Set<string>();
		let current = id;
		while (this.aliasTargets.has(current)) {
			if (seen.has(current)) throw new AliasCycleError(id);
			seen.add(current);
			current = this.aliasTargets.get(current) as string;
		}
		return current;
	}

	projectIdOf(id: string): string {
		const current = this.followAliases(id);
		return this.occurrenceToProject.get(current) ?? this.registraiToProject.get(current) ?? current;
	}

	isReviewed(projectId: string): boolean {
		return this.groups.has(projectId);
	}

	resolve(id: string): ProjectGroup | null {
		return this.groups.get(this.projectIdOf(id)) ?? null;
	}

	projects(): ProjectGroup[] {
		return [...this.groups.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
	}

	possibleSameAs(projectId: string, within?: ReadonlySet<string>): string[] {
		return [...(this.uncertain.get(projectId) ?? [])]
			.filter((other) => within === undefined || within.has(other))
			.sort();
	}
}

export interface RankedOccurrence {
	readonly occurrenceId: string;
	readonly score: number;
}

export interface RankedProject {
	readonly projectId: string;
	readonly score: number;
	readonly matchedOccurrenceIds: readonly string[];
	readonly possibleSameAs: readonly string[];
	readonly directoryOnly: boolean;
}

export function defaultDirectoryQuota(limit: number): number {
	return Math.floor(Math.max(0, limit) / 2);
}

export interface CollapsedResults {
	readonly results: readonly RankedProject[];
	readonly droppedByDirectoryQuota: number;
	readonly directoryQuota: number;
	readonly complete: boolean;
}

export function collapseToProjectsWithReport(
	ranked: readonly RankedOccurrence[],
	index: ProjectIndex,
	limit: number,
	options: { readonly directoryQuota?: number } = {},
): CollapsedResults {
	const best = new Map<string, { score: number; matched: string[] }>();
	for (const { occurrenceId, score } of ranked) {
		const projectId = index.projectIdOf(occurrenceId);
		const current = best.get(projectId);
		if (!current) best.set(projectId, { score, matched: [occurrenceId] });
		else {
			current.matched.push(occurrenceId);
			if (score > current.score) current.score = score;
		}
	}
	const slots = Math.max(0, limit);
	const quota = Math.max(0, options.directoryQuota ?? defaultDirectoryQuota(limit));
	const ordered: [string, { score: number; matched: string[] }][] = [];
	let directoryUsed = 0;
	let dropped = 0;
	for (const entry of [...best].sort(
		([idA, a], [idB, b]) => b.score - a.score || (idA < idB ? -1 : idA > idB ? 1 : 0),
	)) {
		if (ordered.length >= slots) break;
		if (!index.isReviewed(entry[0])) {
			if (directoryUsed >= quota) {
				dropped += 1;
				continue;
			}
			directoryUsed += 1;
		}
		ordered.push(entry);
	}
	const inAnswer = new Set(ordered.map(([projectId]) => projectId));
	return {
		results: ordered.map(([projectId, { score, matched }]) => ({
			projectId,
			score,
			matchedOccurrenceIds: [...new Set(matched)].sort(),
			possibleSameAs: index.possibleSameAs(projectId, inAnswer),
			directoryOnly: !index.isReviewed(projectId),
		})),
		droppedByDirectoryQuota: dropped,
		directoryQuota: quota,
		complete: dropped === 0,
	};
}

export function collapseToProjects(
	ranked: readonly RankedOccurrence[],
	index: ProjectIndex,
	limit: number,
	options: { readonly directoryQuota?: number } = {},
): RankedProject[] {
	return [...collapseToProjectsWithReport(ranked, index, limit, options).results];
}

export function directoryQuotaNote(collapsed: CollapsedResults, limit: number): string | null {
	if (collapsed.droppedByDirectoryQuota === 0) return null;
	return `${collapsed.droppedByDirectoryQuota} more unreviewed Registrai directory matches were left out, because unreviewed entries are limited to ${collapsed.directoryQuota} of ${limit} results.`;
}

export type GapVerdict = "several" | "few" | "none";

export interface GapThresholds {
	readonly several: number;
}

export const PROVISIONAL_GAP_THRESHOLDS: GapThresholds = { several: 5 };

export function gapVerdict(
	count: number,
	thresholds: GapThresholds = PROVISIONAL_GAP_THRESHOLDS,
): GapVerdict {
	if (count <= 0) return "none";
	return count >= thresholds.several ? "several" : "few";
}

export interface ProjectCount {
	readonly projectIds: readonly string[];
	readonly count: number;
	readonly directoryOnlyIds: readonly string[];
	readonly directoryOnlyCount: number;
	readonly minimumIfMerged: number;
	readonly verdict: GapVerdict;
	readonly mayBeLower: boolean;
}

export function countProjects(
	occurrenceIds: readonly string[],
	index: ProjectIndex,
	thresholds: GapThresholds = PROVISIONAL_GAP_THRESHOLDS,
): ProjectCount {
	const all = [...new Set(occurrenceIds.map((id) => index.projectIdOf(id)))].sort();
	const projectIds = all.filter((id) => index.isReviewed(id));
	const directoryOnlyIds = all.filter((id) => !index.isReviewed(id));
	const members = new Set(projectIds);
	const parent = new Map(projectIds.map((id) => [id, id]));
	const find = (id: string): string => {
		let root = id;
		while (parent.get(root) !== root) root = parent.get(root) as string;
		return root;
	};
	for (const id of projectIds) {
		for (const other of index.possibleSameAs(id, members)) parent.set(find(other), find(id));
	}
	const minimumIfMerged = new Set(projectIds.map(find)).size;
	const verdict = gapVerdict(projectIds.length, thresholds);
	return {
		projectIds,
		count: projectIds.length,
		directoryOnlyIds,
		directoryOnlyCount: directoryOnlyIds.length,
		minimumIfMerged,
		verdict,
		mayBeLower: gapVerdict(minimumIfMerged, thresholds) !== verdict,
	};
}

export const GAP_TEXTS = {
	several: "Several projects found in this category.",
	few: "Only a few projects found in this category in the covered sources.",
	none: "No project found in this category in the covered sources. This does not mean that nobody has built something in this area.",
	mayBeLower: "Some of these may be the same project (unconfirmed), so the count may be lower.",
} as const;

export function noneWithDirectoryText(directoryOnlyCount: number): string {
	return `No reviewed project found in this category. ${directoryOnlyCount} Registrai directory entries were found but are not reviewed; they are listed below.`;
}

export function directoryNotCountedText(directoryOnlyCount: number): string {
	return `${directoryOnlyCount} more entries from the Registrai directory are listed but not reviewed, so they are not counted.`;
}

export type GapTextId = "T-04" | "T-05" | "T-06" | "T-19" | "T-21" | "T-22";

export interface GapSummaryLine {
	readonly id: GapTextId;
	readonly text: string;
}

export function gapSummary(count: ProjectCount): GapSummaryLine[] {
	const lines: GapSummaryLine[] = [];
	if (count.verdict === "none") {
		lines.push(
			count.directoryOnlyCount > 0
				? { id: "T-22", text: noneWithDirectoryText(count.directoryOnlyCount) }
				: { id: "T-06", text: GAP_TEXTS.none },
		);
		return lines;
	}
	lines.push(
		count.verdict === "several"
			? { id: "T-04", text: GAP_TEXTS.several }
			: { id: "T-05", text: GAP_TEXTS.few },
	);
	if (count.mayBeLower) lines.push({ id: "T-19", text: GAP_TEXTS.mayBeLower });
	if (count.directoryOnlyCount > 0) {
		lines.push({ id: "T-21", text: directoryNotCountedText(count.directoryOnlyCount) });
	}
	return lines;
}

export interface OccurrenceView {
	readonly id: string;
	readonly kind: "hackathon_project" | "grant_recipient" | "directory_entry";
	readonly context: string | null;
	readonly prizeOrGrant: {
		readonly value: "winner" | "not_winner" | "unknown" | "grant" | "not_applicable";
		readonly grantDate: IsoDate | null;
	};
	readonly source: { readonly name: string; readonly url: string; readonly dataDate: IsoDate };
}

export function recordOccurrence(record: DatasetRecord, sourceName: string): OccurrenceView {
	const context = record.event
		? record.event.track
			? `${record.event.name}, ${record.event.track} track`
			: record.event.name
		: record.grant
			? `${record.grant.program}, ${record.grant.cohort}`
			: null;
	return {
		id: record.id,
		kind: record.kind,
		context,
		prizeOrGrant:
			record.kind === "grant_recipient"
				? { value: "grant", grantDate: record.grant?.date ?? null }
				: { value: record.prize, grantDate: null },
		source: { name: sourceName, url: record.source.url, dataDate: record.source.dataDate },
	};
}

export function directoryOccurrence(entry: DirectoryEntry, fetchedOn: IsoDate): OccurrenceView {
	return {
		id: entry.id,
		kind: "directory_entry",
		context: "Registrai directory",
		prizeOrGrant: { value: "not_applicable", grantDate: null },
		source: { name: "Registrai", url: entry.url, dataDate: fetchedOn },
	};
}

export function projectOccurrences(
	project: ProjectGroup,
	input: {
		readonly records: ReadonlyMap<string, DatasetRecord>;
		readonly sourceNames: ReadonlyMap<string, string>;
		readonly directoryEntry?: DirectoryEntry | null;
		readonly fetchedOn?: IsoDate;
	},
): OccurrenceView[] {
	const views = project.occurrenceIds.flatMap((id) => {
		const record = input.records.get(id);
		if (!record) return [];
		return [recordOccurrence(record, input.sourceNames.get(record.source.id) ?? record.source.id)];
	});
	const entry = input.directoryEntry;
	if (entry && input.fetchedOn) {
		const belongs =
			project.id === entry.id ||
			(project.registraiSlug !== null && entry.id === `registrai:${project.registraiSlug}`);
		if (belongs) views.push(directoryOccurrence(entry, input.fetchedOn));
	}
	return views;
}
