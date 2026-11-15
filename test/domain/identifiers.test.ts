import { describe, expect, it } from "vitest";
import {
	assignOccurrenceIds,
	isAnyId,
	isOccurrenceId,
	isProjectId,
	isRegistraiId,
	MAX_ID_LENGTH,
	slugify,
} from "../../src/domain/index.js";

function permutations<T>(items: readonly T[]): T[][] {
	if (items.length <= 1) return [[...items]];
	return items.flatMap((item, index) =>
		permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [
			item,
			...rest,
		]),
	);
}

describe("identifier formats", () => {
	it.each([
		"hack:ethglobal-cannes-2026:examplemarket",
		"grant:circle-2026:examplepay",
		"registrai:exampledex",
		"proj:examplemarket",
	])("accepts %s", (id) => {
		expect(isAnyId(id)).toBe(true);
	});

	it.each([
		"hack:examplemarket",
		"grant:circle-2026",
		"registrai:a:b",
		"proj:Example",
		"proj:example--market",
		"proj:-example",
		"team:example",
		"hack:event:slug ",
		"",
	])("rejects %s", (id) => {
		expect(isAnyId(id)).toBe(false);
	});

	it("rejects identifiers longer than 120 characters", () => {
		const atLimit = `proj:${"a".repeat(MAX_ID_LENGTH - 5)}`;
		expect(atLimit).toHaveLength(120);
		expect(isProjectId(atLimit)).toBe(true);
		expect(isProjectId(`${atLimit}a`)).toBe(false);
		expect(isRegistraiId(`registrai:${"b".repeat(111)}`)).toBe(false);
		expect(isOccurrenceId(`hack:e:${"c".repeat(114)}`)).toBe(false);
	});
});

describe("slugify", () => {
	it.each([
		["Example Market", "example-market"],
		["/showcase/ExampleMarket_v2", "showcase-examplemarket-v2"],
		["Pagamentos Instantâneos", "pagamentos-instantaneos"],
		["  --Ünïcode__ Ñame--  ", "unicode-name"],
		["!!!", ""],
	])("%s -> %s", (input, expected) => {
		expect(slugify(input)).toBe(expected);
	});
});

describe("assignOccurrenceIds", () => {
	const base = {
		kind: "hack" as const,
		scope: "Sample Hack 2026",
		existing: new Map(),
		retired: new Set<string>(),
	};

	it("derives the slug from the source key and the scope", () => {
		const ids = assignOccurrenceIds({ ...base, sourceKeys: ["/showcase/example-market"] });
		expect(ids.get("/showcase/example-market")).toBe(
			"hack:sample-hack-2026:showcase-example-market",
		);
	});

	it("resolves collisions with -2, -3 the same way for every input order", () => {
		const keys = ["Example Market", "example-market", "EXAMPLE_MARKET", "other"];
		const expected = assignOccurrenceIds({ ...base, sourceKeys: keys });
		expect([...expected.values()].sort()).toEqual([
			"hack:sample-hack-2026:example-market",
			"hack:sample-hack-2026:example-market-2",
			"hack:sample-hack-2026:example-market-3",
			"hack:sample-hack-2026:other",
		]);
		for (const order of permutations(keys)) {
			expect(assignOccurrenceIds({ ...base, sourceKeys: order })).toEqual(expected);
		}
	});

	it("keeps existing identifiers across refreshes even when a new colliding key arrives first", () => {
		const first = assignOccurrenceIds({ ...base, sourceKeys: ["example-market"] });
		const second = assignOccurrenceIds({
			...base,
			sourceKeys: ["Example Market", "example-market"],
			existing: first,
		});
		expect(second.get("example-market")).toBe("hack:sample-hack-2026:example-market");
		expect(second.get("Example Market")).toBe("hack:sample-hack-2026:example-market-2");
	});

	it("never reuses a retired identifier or one held by a record that left the input", () => {
		const ids = assignOccurrenceIds({
			...base,
			sourceKeys: ["example-market", "new"],
			existing: new Map([["gone", "hack:sample-hack-2026:new"]]),
			retired: new Set(["hack:sample-hack-2026:example-market"]),
		});
		expect(ids.get("example-market")).toBe("hack:sample-hack-2026:example-market-2");
		expect(ids.get("new")).toBe("hack:sample-hack-2026:new-2");
		expect(ids.has("gone")).toBe(false);
	});

	it("truncates long slugs to 120 characters, including the collision suffix", () => {
		const long = "a".repeat(300);
		const ids = assignOccurrenceIds({ ...base, sourceKeys: [long, `${long}!`] });
		for (const id of ids.values()) {
			expect(id.length).toBeLessThanOrEqual(MAX_ID_LENGTH);
			expect(isOccurrenceId(id)).toBe(true);
		}
		expect(new Set(ids.values()).size).toBe(2);
	});

	it("uses a fallback slug for keys without letters or digits", () => {
		expect(assignOccurrenceIds({ ...base, sourceKeys: ["!!!"] }).get("!!!")).toBe(
			"hack:sample-hack-2026:project",
		);
	});

	it("rejects an invalid scope or existing identifier", () => {
		expect(() => assignOccurrenceIds({ ...base, scope: "!!!", sourceKeys: [] })).toThrow(
			RangeError,
		);
		expect(() =>
			assignOccurrenceIds({ ...base, sourceKeys: ["a"], existing: new Map([["a", "proj:a"]]) }),
		).toThrow(RangeError);
	});
});

describe("assignOccurrenceIds rejects unsafe existing mappings", () => {
	const base = { kind: "hack" as const, scope: "Sample Hack 2026", retired: new Set<string>() };

	it("refuses to preserve an existing identifier that is retired", () => {
		expect(() =>
			assignOccurrenceIds({
				...base,
				sourceKeys: ["example-market"],
				existing: new Map([["example-market", "hack:sample-hack-2026:example-market"]]),
				retired: new Set(["hack:sample-hack-2026:example-market"]),
			}),
		).toThrow("Existing identifier is retired: hack:sample-hack-2026:example-market");
	});

	it("refuses a retired identifier even when its key left the input", () => {
		expect(() =>
			assignOccurrenceIds({
				...base,
				sourceKeys: ["other"],
				existing: new Map([["gone", "hack:sample-hack-2026:gone"]]),
				retired: new Set(["hack:sample-hack-2026:gone"]),
			}),
		).toThrow(RangeError);
	});

	it("refuses one identifier mapped to two source keys", () => {
		expect(() =>
			assignOccurrenceIds({
				...base,
				sourceKeys: ["a", "b"],
				existing: new Map([
					["a", "hack:sample-hack-2026:same"],
					["b", "hack:sample-hack-2026:same"],
				]),
			}),
		).toThrow("is mapped to more than one source key");
	});

	it("refuses an existing identifier from another kind or scope", () => {
		for (const id of ["grant:sample-hack-2026:a", "hack:other-event:a"]) {
			expect(() =>
				assignOccurrenceIds({ ...base, sourceKeys: ["a"], existing: new Map([["a", id]]) }),
			).toThrow("does not belong to hack:sample-hack-2026:");
		}
	});

	it("never returns a retired identifier for any input", () => {
		const retired = new Set(["hack:sample-hack-2026:a", "hack:sample-hack-2026:a-2"]);
		const ids = assignOccurrenceIds({
			...base,
			sourceKeys: ["a", "A", "a!"],
			existing: new Map(),
			retired,
		});
		for (const id of ids.values()) expect(retired.has(id)).toBe(false);
	});
});
