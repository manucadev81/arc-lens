import { describe, expect, it } from "vitest";
import { findPersonalData, findPersonalDataInFields } from "../../src/domain/index.js";

describe("personal data patterns", () => {
	it.each([
		["Contact alice.smith@example.com for access", ["email"]],
		["Built by @alice_dev during the event", ["handle"]],
		["Follow @john-doe for updates", ["handle"]],
		["@builder shipped it", ["handle"]],
		["Call +1 (415) 555-0134 to join", ["phone"]],
		["Phone 11 98765-4321", ["phone"]],
		["Reach team@example.org or @team", ["email", "handle"]],
	])("finds personal data in %s", (text, kinds) => {
		expect(findPersonalData(text)).toEqual(kinds);
	});

	it.each([
		"Agents pay per request in USDC on 2026-11-10.",
		"Served 1,000,000 requests and $25,000 in volume.",
		"Uses the @circle-fin/w3s-pw-web-sdk package.",
		"Version 1.2.3 runs on Node.js 22.",
		"See https://example.com/@project/page for the demo.",
		"Block 12345678 on Arc testnet.",
	])("does not flag %s", (text) => {
		expect(findPersonalData(text)).toEqual([]);
	});

	it("reports findings per field and list entry", () => {
		expect(
			findPersonalDataInFields({
				name: "Sample",
				aliases: ["Alias", "@someone"],
				description: "Mail a@b.co",
			}),
		).toEqual([
			{ field: "aliases[1]", kinds: ["handle"] },
			{ field: "description", kinds: ["email"] },
		]);
	});
});
