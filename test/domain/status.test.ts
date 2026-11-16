import { describe, expect, it } from "vitest";
import {
	aggregateSignals,
	type DatasetRecord,
	decideStatus,
	evidenceToSignals,
	projectStatus,
	type RepositoryResult,
	recordStatus,
	type StatusConfig,
	type StatusSignals,
	signalsToEvidence,
} from "../../src/domain/index.js";
import { SAMPLE_RECORD } from "../fakes/sample-data.js";

const TODAY = "2026-11-16";
const CONFIG: StatusConfig = {
	version: 1,
	liveCommitWithinDays: 180,
	notLiveCommitOlderThanDays: 365,
	demoTimeoutSeconds: 10,
	maxRedirects: 5,
};

function daysAgo(days: number): string {
	return new Date(Date.parse(`${TODAY}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);
}

function signals(
	demo: StatusSignals["demo"] extends infer D
		? (D extends { result: infer R } ? R : never) | null
		: never,
	repository: RepositoryResult | null,
	registrai: StatusSignals["registrai"] = null,
): StatusSignals {
	return {
		registrai,
		demo: demo ? { result: demo, at: TODAY } : null,
		repository: repository ? { result: repository, at: TODAY } : null,
	};
}

const commit = (days: number): RepositoryResult => ({ kind: "last_commit", date: daysAgo(days) });

describe("ADR-0006 precedence", () => {
	it("1. Registrai live decides live, whatever the other signals say", () => {
		const decision = decideStatus(
			signals("fails", { kind: "archived" }, { value: "live", at: "2026-11-15" }),
			TODAY,
			CONFIG,
		);
		expect(decision).toMatchObject({
			value: "live",
			rule: 1,
			evidence: "Registrai status live, queried 2026-11-15",
		});
	});

	it("2. Registrai announced decides not live, even with a responding demo and a recent commit", () => {
		const decision = decideStatus(
			signals("responds", commit(1), { value: "announced", at: TODAY }),
			TODAY,
			CONFIG,
		);
		expect(decision.value).toBe("not_live");
		expect(decision.rule).toBe(2);
		expect(decision.evidence.startsWith("announced on Registrai, not launched")).toBe(true);
	});

	it.each([
		[0, "live", 3],
		[180, "live", 3],
		[181, "unknown", 5],
	])("3. demo responds with a commit %s days old is %s", (days, value, rule) => {
		expect(decideStatus(signals("responds", commit(days)), TODAY, CONFIG)).toMatchObject({
			value,
			rule,
		});
	});

	it.each([
		["fails", { kind: "archived" }],
		["fails", { kind: "not_found" }],
		["no_demo_link", { kind: "archived" }],
		["no_demo_link", { kind: "not_found" }],
		["fails", commit(366)],
		["no_demo_link", commit(400)],
	] as const)("4. demo %s with repository %j is not live", (demo, repository) => {
		expect(decideStatus(signals(demo, repository), TODAY, CONFIG)).toMatchObject({
			value: "not_live",
			rule: 4,
		});
	});

	it.each([
		["fails", commit(365)],
		["fails", commit(200)],
		["unreadable", { kind: "archived" }],
		["fails", { kind: "unreadable" }],
		["fails", { kind: "no_repository_link" }],
		["responds", { kind: "archived" }],
		["responds", { kind: "unreadable" }],
	] as const)("5. demo %s with repository %j is unknown", (demo, repository) => {
		expect(decideStatus(signals(demo, repository), TODAY, CONFIG)).toMatchObject({
			value: "unknown",
			rule: 5,
		});
	});

	it("5. Registrai deployed without other signals is unknown", () => {
		expect(
			decideStatus(signals(null, null, { value: "deployed", at: TODAY }), TODAY, CONFIG),
		).toMatchObject({
			value: "unknown",
			evidence: "Registrai status deployed, queried 2026-11-16",
		});
	});

	it("no signal at all is unknown and says so", () => {
		expect(decideStatus(signals(null, null), TODAY, CONFIG)).toMatchObject({
			value: "unknown",
			evidence: "no signal could be read",
		});
	});

	it("uses the configured windows", () => {
		const tight = { ...CONFIG, liveCommitWithinDays: 30, notLiveCommitOlderThanDays: 60 };
		expect(decideStatus(signals("responds", commit(31)), TODAY, tight).value).toBe("unknown");
		expect(decideStatus(signals("fails", commit(61)), TODAY, tight).value).toBe("not_live");
	});
});

describe("evidence text", () => {
	it("lists every signal read with its date, including failures", () => {
		const decision = decideStatus(
			{
				registrai: { value: "unreadable", at: TODAY },
				demo: { result: "unreadable", at: "2026-11-10" },
				repository: { result: { kind: "unreadable" }, at: "2026-11-10" },
			},
			TODAY,
			CONFIG,
		);
		expect(decision.evidence).toBe(
			"Registrai could not be queried 2026-11-16; demo could not be checked 2026-11-10; repository could not be read 2026-11-10",
		);
		expect(decideStatus(signals("responds", commit(8)), TODAY, CONFIG).evidence).toBe(
			`demo responds ${TODAY}; last commit ${daysAgo(8)} (checked ${TODAY})`,
		);
	});
});

describe("project aggregation", () => {
	function record(
		id: string,
		demo: StatusSignals["demo"],
		repository: StatusSignals["repository"],
	): DatasetRecord {
		return {
			...SAMPLE_RECORD,
			id,
			status: {
				value: "unknown",
				checkedAt: TODAY,
				evidence: signalsToEvidence({ demo, repository }),
			},
		};
	}

	it("uses the best demo, the most recent commit and the project Registrai status", () => {
		const records = [
			record(
				"hack:e1:a",
				{ result: "fails", at: "2026-11-10" },
				{ result: commit(400), at: "2026-11-10" },
			),
			record(
				"hack:e2:a",
				{ result: "responds", at: "2026-11-09" },
				{ result: { kind: "archived" }, at: "2026-11-09" },
			),
			record(
				"grant:c1:a",
				{ result: "no_demo_link", at: "2026-11-11" },
				{ result: commit(20), at: "2026-11-11" },
			),
		];
		const copy = structuredClone(records);
		const aggregated = aggregateSignals(
			records.map((r) => evidenceToSignals(r.status.evidence)),
			null,
		);
		expect(aggregated.demo).toEqual({ result: "responds", at: "2026-11-09" });
		expect(aggregated.repository).toEqual({
			result: { kind: "last_commit", date: daysAgo(20) },
			at: "2026-11-11",
		});
		expect(projectStatus(records, null, TODAY, CONFIG)).toMatchObject({ value: "live", rule: 3 });
		expect(projectStatus(records, { value: "announced", at: TODAY }, TODAY, CONFIG).value).toBe(
			"not_live",
		);
		expect(records).toEqual(copy);
	});

	it("prefers a known repository state over an unreadable one", () => {
		const aggregated = aggregateSignals(
			[
				{ demo: null, repository: { result: { kind: "unreadable" }, at: TODAY } },
				{ demo: null, repository: { result: { kind: "not_found" }, at: TODAY } },
			],
			null,
		);
		expect(aggregated.repository?.result.kind).toBe("not_found");
	});
});

describe("record status round trip", () => {
	it.each([
		{ kind: "last_commit", date: "2026-11-02" },
		{ kind: "archived" },
		{ kind: "not_found" },
		{ kind: "no_repository_link" },
		{ kind: "unreadable" },
	] as const)("keeps repository %j through stored evidence", (result) => {
		for (const demo of ["responds", "fails", "no_demo_link", "unreadable"] as const) {
			const original = { demo: { result: demo, at: TODAY }, repository: { result, at: TODAY } };
			expect(evidenceToSignals(signalsToEvidence(original))).toEqual(original);
		}
	});

	it("builds the stored record status with the check date", () => {
		expect(
			recordStatus(
				{ demo: { result: "responds", at: TODAY }, repository: { result: commit(2), at: TODAY } },
				TODAY,
				CONFIG,
			),
		).toEqual({
			value: "live",
			checkedAt: TODAY,
			evidence: [
				{ signal: "demo", result: "demo responds", at: TODAY },
				{ signal: "repository", result: `last commit ${daysAgo(2)}`, at: TODAY },
			],
		});
	});
});
