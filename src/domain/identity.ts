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

export function websiteDomain(url: string): string | null {
	const parsed = parseUrl(url);
	if (!parsed || SHARED_HOSTS.has(parsed.host)) return null;
	return parsed.host;
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
	return keysFromUrls(entry.links);
}

interface Candidate {
	readonly id: string;
	readonly names: readonly string[];
	readonly keys: readonly StrongKey[];
}

function sortedPair(a: string, b: string): [string, string] {
	return a < b ? [a, b] : [b, a];
}

export function proposeIdentityLinks(input: {
	readonly records: readonly DatasetRecord[];
	readonly directoryEntries: readonly DirectoryEntry[];
	readonly projects: readonly ConfirmedProject[];
	readonly pending: readonly IdentityProposal[];
	readonly today: IsoDate;
}): IdentityProposal[] {
	const group = new Map<string, string>();
	for (const project of input.projects) {
		for (const occurrence of project.occurrences) group.set(occurrence, project.id);
		if (project.registraiSlug) group.set(`registrai:${project.registraiSlug}`, project.id);
	}
	const sameGroup = (a: string, b: string) => {
		const groupA = group.get(a);
		return groupA !== undefined && groupA === group.get(b);
	};

	const candidates: Candidate[] = [
		...input.records.map((record) => ({
			id: record.id,
			names: [record.name, ...record.aliases],
			keys: recordStrongKeys(record),
		})),
		...input.directoryEntries.map((entry) => ({
			id: entry.id,
			names: [entry.name],
			keys: directoryStrongKeys(entry),
		})),
	];

	const strong = new Map<string, Set<string>>();
	const byKey = new Map<string, Candidate[]>();
	for (const candidate of candidates) {
		for (const { key } of candidate.keys) byKey.set(key, [...(byKey.get(key) ?? []), candidate]);
	}
	for (const [key, members] of byKey) {
		const evidence = members[0]?.keys.find((k) => k.key === key)?.evidence ?? key;
		for (let i = 0; i < members.length; i++) {
			for (let j = i + 1; j < members.length; j++) {
				const a = members[i];
				const b = members[j];
				if (!a || !b || a.id === b.id || sameGroup(a.id, b.id)) continue;
				const pair = sortedPair(a.id, b.id).join(" ");
				strong.set(pair, (strong.get(pair) ?? new Set()).add(evidence));
			}
		}
	}

	const possible = new Map<string, Set<string>>();
	const byName = new Map<string, Candidate[]>();
	for (const candidate of candidates) {
		for (const name of new Set(candidate.names.map(normalizeName).filter((n) => n.length > 0))) {
			byName.set(name, [...(byName.get(name) ?? []), candidate]);
		}
	}
	for (const members of byName.values()) {
		for (let i = 0; i < members.length; i++) {
			for (let j = i + 1; j < members.length; j++) {
				const a = members[i];
				const b = members[j];
				if (!a || !b || a.id === b.id || sameGroup(a.id, b.id)) continue;
				const pair = sortedPair(a.id, b.id).join(" ");
				if (strong.has(pair)) continue;
				const shown = [a.names[0] ?? "", b.names[0] ?? ""].sort()[0];
				possible.set(pair, (possible.get(pair) ?? new Set()).add(`same name "${shown}"`));
			}
		}
	}

	const known = new Set(input.pending.map((p) => `${p.kind} ${[...p.ids].sort().join(" ")}`));
	const proposals: IdentityProposal[] = [];
	const push = (kind: IdentityProposal["kind"], pair: string, evidence: Set<string>) => {
		if (known.has(`${kind} ${pair}`)) return;
		proposals.push({
			ids: pair.split(" "),
			kind,
			evidenceFor: [...evidence].sort(),
			evidenceAgainst: kind === "possible" ? ["no shared repository or website domain"] : [],
			proposedAt: input.today,
		});
	};
	for (const [pair, evidence] of [...strong].sort(([a], [b]) => (a < b ? -1 : 1))) {
		push("strong_key", pair, evidence);
	}
	for (const [pair, evidence] of [...possible].sort(([a], [b]) => (a < b ? -1 : 1))) {
		push("possible", pair, evidence);
	}
	return proposals;
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
		for (const proposal of input.pending) {
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
}

export function collapseToProjects(
	ranked: readonly RankedOccurrence[],
	index: ProjectIndex,
	limit: number,
): RankedProject[] {
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
	const ordered = [...best]
		.sort(([idA, a], [idB, b]) => b.score - a.score || (idA < idB ? -1 : idA > idB ? 1 : 0))
		.slice(0, Math.max(0, limit));
	const inAnswer = new Set(ordered.map(([projectId]) => projectId));
	return ordered.map(([projectId, { score, matched }]) => ({
		projectId,
		score,
		matchedOccurrenceIds: [...new Set(matched)],
		possibleSameAs: index.possibleSameAs(projectId, inAnswer),
	}));
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
	readonly minimumIfMerged: number;
	readonly verdict: GapVerdict;
	readonly mayBeLower: boolean;
}

export function countProjects(
	occurrenceIds: readonly string[],
	index: ProjectIndex,
	thresholds: GapThresholds = PROVISIONAL_GAP_THRESHOLDS,
): ProjectCount {
	const projectIds = [...new Set(occurrenceIds.map((id) => index.projectIdOf(id)))].sort();
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
		minimumIfMerged,
		verdict,
		mayBeLower: gapVerdict(minimumIfMerged, thresholds) !== verdict,
	};
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
