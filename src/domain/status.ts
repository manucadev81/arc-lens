import type { DatasetRecord, IsoDate, ProjectStatusValue, StatusEvidence } from "./records.js";

export interface StatusConfig {
	readonly version: number;
	readonly liveCommitWithinDays: number;
	readonly notLiveCommitOlderThanDays: number;
	readonly demoTimeoutSeconds: number;
	readonly maxRedirects: number;
}

export type RegistraiStatus = "live" | "deployed" | "announced" | "missing" | "unreadable";
export type DemoResult = "responds" | "fails" | "no_demo_link" | "unreadable";
export type RepositoryResult =
	| { readonly kind: "last_commit"; readonly date: IsoDate }
	| { readonly kind: "archived" }
	| { readonly kind: "not_found" }
	| { readonly kind: "no_repository_link" }
	| { readonly kind: "unreadable" };

export interface RegistraiSignal {
	readonly value: RegistraiStatus;
	readonly at: IsoDate;
}

export interface DemoSignal {
	readonly result: DemoResult;
	readonly at: IsoDate;
}

export interface RepositorySignal {
	readonly result: RepositoryResult;
	readonly at: IsoDate;
}

export interface StatusSignals {
	readonly registrai: RegistraiSignal | null;
	readonly demo: DemoSignal | null;
	readonly repository: RepositorySignal | null;
}

export interface OccurrenceEvidence {
	readonly occurrenceId: string;
	readonly evidence: readonly StatusEvidence[];
}

export interface StatusDecision {
	readonly value: ProjectStatusValue;
	readonly rule: 1 | 2 | 3 | 4 | 5;
	readonly evidence: string;
	readonly signals: StatusSignals;
	readonly occurrences: readonly OccurrenceEvidence[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from: IsoDate, to: IsoDate): number {
	return Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export function demoText(result: DemoResult): string {
	switch (result) {
		case "responds":
			return "demo responds";
		case "fails":
			return "demo fails";
		case "no_demo_link":
			return "no demo link";
		case "unreadable":
			return "demo could not be checked";
	}
}

export function repositoryText(result: RepositoryResult): string {
	switch (result.kind) {
		case "last_commit":
			return `last commit ${result.date}`;
		case "archived":
			return "repository archived";
		case "not_found":
			return "repository not found";
		case "no_repository_link":
			return "no repository link";
		case "unreadable":
			return "repository could not be read";
	}
}

export function registraiText(signal: RegistraiSignal): string {
	switch (signal.value) {
		case "live":
			return `Registrai status live, queried ${signal.at}`;
		case "announced":
			return `announced on Registrai, not launched, queried ${signal.at}`;
		case "deployed":
			return `Registrai status deployed, queried ${signal.at}`;
		case "missing":
			return `no Registrai status, queried ${signal.at}`;
		case "unreadable":
			return `Registrai could not be queried ${signal.at}`;
	}
}

export function evidenceText(signals: StatusSignals): string {
	const parts: string[] = [];
	if (signals.registrai) parts.push(registraiText(signals.registrai));
	if (signals.demo) parts.push(`${demoText(signals.demo.result)} ${signals.demo.at}`);
	if (signals.repository) {
		const result = signals.repository.result;
		parts.push(
			result.kind === "last_commit"
				? `${repositoryText(result)} (checked ${signals.repository.at})`
				: `${repositoryText(result)} ${signals.repository.at}`,
		);
	}
	return parts.length > 0 ? parts.join("; ") : "no signal could be read";
}

export function decideStatus(
	signals: StatusSignals,
	today: IsoDate,
	config: StatusConfig,
): StatusDecision {
	const decide = (
		value: ProjectStatusValue,
		rule: StatusDecision["rule"],
		evidence?: string,
	): StatusDecision => ({
		value,
		rule,
		evidence: evidence ?? evidenceText(signals),
		signals,
		occurrences: [],
	});
	if (signals.registrai?.value === "live")
		return decide("live", 1, registraiText(signals.registrai));
	if (signals.registrai?.value === "announced") {
		return decide(
			"not_live",
			2,
			`${registraiText(signals.registrai)}; ${evidenceText({ ...signals, registrai: null })}`,
		);
	}
	const demo = signals.demo?.result;
	const repository = signals.repository?.result;
	const commitAge = repository?.kind === "last_commit" ? daysBetween(repository.date, today) : null;
	if (demo === "responds" && commitAge !== null && commitAge <= config.liveCommitWithinDays) {
		return decide("live", 3);
	}
	const demoDown = demo === "fails" || demo === "no_demo_link";
	const repositoryDead =
		repository?.kind === "archived" ||
		repository?.kind === "not_found" ||
		(commitAge !== null && commitAge > config.notLiveCommitOlderThanDays);
	if (demoDown && repositoryDead) return decide("not_live", 4);
	return decide("unknown", 5);
}

const DEMO_RANK: Record<DemoResult, number> = {
	responds: 3,
	fails: 2,
	no_demo_link: 1,
	unreadable: 0,
};
const REPOSITORY_RANK: Record<RepositoryResult["kind"], number> = {
	last_commit: 4,
	archived: 3,
	not_found: 2,
	no_repository_link: 1,
	unreadable: 0,
};

export function aggregateSignals(
	occurrences: readonly Pick<StatusSignals, "demo" | "repository">[],
	registrai: RegistraiSignal | null,
): StatusSignals {
	let demo: DemoSignal | null = null;
	let repository: RepositorySignal | null = null;
	for (const signals of occurrences) {
		const candidate = signals.demo;
		if (
			candidate &&
			(!demo ||
				DEMO_RANK[candidate.result] > DEMO_RANK[demo.result] ||
				(DEMO_RANK[candidate.result] === DEMO_RANK[demo.result] && candidate.at > demo.at))
		) {
			demo = candidate;
		}
		const repo = signals.repository;
		if (!repo) continue;
		if (!repository) {
			repository = repo;
			continue;
		}
		const current = repository.result;
		const next = repo.result;
		if (next.kind === "last_commit" && current.kind === "last_commit") {
			if (next.date > current.date) repository = repo;
		} else if (REPOSITORY_RANK[next.kind] > REPOSITORY_RANK[current.kind]) {
			repository = repo;
		}
	}
	return { registrai, demo, repository };
}

export function signalsToEvidence(
	signals: Pick<StatusSignals, "demo" | "repository">,
): StatusEvidence[] {
	const evidence: StatusEvidence[] = [];
	if (signals.demo) {
		evidence.push({ signal: "demo", result: demoText(signals.demo.result), at: signals.demo.at });
	}
	if (signals.repository) {
		evidence.push({
			signal: "repository",
			result: repositoryText(signals.repository.result),
			at: signals.repository.at,
		});
	}
	return evidence;
}

const DEMO_BY_TEXT = new Map<string, DemoResult>(
	(["responds", "fails", "no_demo_link", "unreadable"] as const).map((r) => [demoText(r), r]),
);

export function evidenceToSignals(
	evidence: readonly StatusEvidence[],
): Pick<StatusSignals, "demo" | "repository"> {
	let demo: DemoSignal | null = null;
	let repository: RepositorySignal | null = null;
	for (const item of evidence) {
		if (item.signal === "demo") {
			demo = { result: DEMO_BY_TEXT.get(item.result) ?? "unreadable", at: item.at };
		} else if (item.signal === "repository") {
			const commit = /^last commit (\d{4}-\d{2}-\d{2})$/.exec(item.result);
			const result: RepositoryResult = commit?.[1]
				? { kind: "last_commit", date: commit[1] }
				: item.result === "repository archived"
					? { kind: "archived" }
					: item.result === "repository not found"
						? { kind: "not_found" }
						: item.result === "no repository link"
							? { kind: "no_repository_link" }
							: { kind: "unreadable" };
			repository = { result, at: item.at };
		}
	}
	return { demo, repository };
}

export function recordStatus(
	signals: Pick<StatusSignals, "demo" | "repository">,
	today: IsoDate,
	config: StatusConfig,
): DatasetRecord["status"] {
	const decision = decideStatus({ registrai: null, ...signals }, today, config);
	return { value: decision.value, checkedAt: today, evidence: signalsToEvidence(signals) };
}

function occurrenceEvidenceText(occurrence: OccurrenceEvidence): string {
	const read = occurrence.evidence.map((item) => `${item.result} ${item.at}`);
	return `${occurrence.occurrenceId}: ${read.length > 0 ? read.join(", ") : "no signal recorded"}`;
}

export function projectStatus(
	records: readonly DatasetRecord[],
	registrai: RegistraiSignal | null,
	today: IsoDate,
	config: StatusConfig,
): StatusDecision {
	const signals = aggregateSignals(
		records.map((record) => evidenceToSignals(record.status.evidence)),
		registrai,
	);
	const decision = decideStatus(signals, today, config);
	const occurrences = records.map((record) => ({
		occurrenceId: record.id,
		evidence: record.status.evidence.map((item) => ({ ...item })),
	}));
	if (occurrences.length <= 1) return { ...decision, occurrences };
	return {
		...decision,
		occurrences,
		evidence: `${decision.evidence}. Signals by occurrence: ${occurrences.map(occurrenceEvidenceText).join("; ")}`,
	};
}
