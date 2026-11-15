import { describe, expect, it } from "vitest";
import {
	findPersonalData,
	findPersonalDataInFields,
	isPersonalProfileUrl,
} from "../../src/domain/index.js";

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

describe("personal data evasion forms", () => {
	it.each([
		["fulano [at] dominio [dot] com", "email"],
		["fulano (at) dominio (dot) com (dot) br", "email"],
		["write to fulano at dominio dot com", "email"],
		["fulano arroba dominio ponto com", "email"],
		["fulano＠example.com", "email"],
		["ali​ce@example.com", "email"],
		["Follow x.com/alice_dev", "profile_link"],
		["Chat at https://t.me/alice", "profile_link"],
		["linkedin.com/in/alice-silva", "profile_link"],
		["Ping john#1234 on Discord", "discord_tag"],
		["Ligue 3456-7890", "phone"],
		["+5511987654321", "phone"],
		["Built by Alice Silva at the event", "person_name"],
		["Made by João Pereira", "person_name"],
		["Team: Alice, Bob", "person_name"],
	])("flags %s as %s", (text, kind) => {
		expect(findPersonalData(text)).toContain(kind);
	});
});

describe("no false positives on common project text", () => {
	it.each([
		"Contract at 0x8f3a2b1c4d5e6f708192a3b4c5d6e7f8091a2b3c on Arc testnet.",
		"Deployed 0x1234567890abcdef1234567890abcdef12345678 and 0x0000000000000000000000000000000000000001.",
		"Ran in the 2023 2024 2025 editions.",
		"Active during 2024-2025.",
		"Tested on v1.2.3, 22.20.5 and 10.30.3.",
		"Block 12345678 confirmed in 400ms.",
		"Built by the Circle team at ETHGlobal.",
		"Built by Circle for builders.",
		"Built at ETHGlobal Cannes 2026.",
		"Repository github.com/example/sample-market",
		"Tx hash 0xabc123def4567890abc123def4567890abc123def4567890abc123def4567890",
		"Version 2026.11.15 released",
	])("does not flag %s", (text) => {
		expect(findPersonalData(text)).toEqual([]);
	});
});

describe("personal profile URLs", () => {
	it.each([
		["https://x.com/alice", true],
		["https://twitter.com/alice", true],
		["https://www.linkedin.com/in/alice", true],
		["https://t.me/alice", true],
		["https://discord.gg/invite", true],
		["https://discord.com/users/123", true],
		["https://user@x.com/alice", true],
		["https://github.com/example/repo", false],
		["https://example.com/demo", false],
		["https://xx.com/alice", false],
		["https://x.com.example.org/page", false],
	])("%s is a personal profile: %s", (url, expected) => {
		expect(isPersonalProfileUrl(url)).toBe(expected);
	});
});
