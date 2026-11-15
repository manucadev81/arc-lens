import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readDatasetFiles, readSchemas } from "../../src/adapters/dataset/files.js";
import { createDatasetValidator, type DatasetFiles } from "../../src/adapters/dataset/validate.js";

const root = path.resolve(import.meta.dirname, "../..");
const validFixture = path.join(root, "test/fixtures/dataset/valid");
const validate = createDatasetValidator(readSchemas(path.join(root, "schemas")));

type Json = Record<string, any>;

function fixture(): DatasetFiles & { recordFiles: { fileName: string; content: Json }[] } {
	return structuredClone(readDatasetFiles(validFixture)) as never;
}

function firstRecord(files: ReturnType<typeof fixture>): Json {
	const file = files.recordFiles.find((f) => f.fileName === "sample-showcase.json");
	if (!file) throw new Error("fixture file missing");
	return (file.content as Json).records[0];
}

function messages(files: DatasetFiles): string[] {
	return validate(files).map((issue) => `${issue.file}${issue.path}: ${issue.message}`);
}

describe("dataset validation", () => {
	it("accepts the synthetic valid dataset and the repository dataset", () => {
		expect(messages(fixture())).toEqual([]);
		expect(messages(readDatasetFiles(path.join(root, "data")))).toEqual([]);
	});

	it.each([
		["team", [{ name: "Someone" }]],
		["contact", "someone@example.com"],
		["members", ["Someone"]],
		["registraiSlug", "sample-market"],
	])("rejects the unknown record property %s", (property, value) => {
		const files = fixture();
		firstRecord(files)[property] = value;
		expect(messages(files)).toContain(
			`records/sample-showcase.json/records/0: unknown property "${property}"`,
		);
	});

	it("rejects unknown nested properties", () => {
		const files = fixture();
		firstRecord(files).links.email = "someone@example.com";
		firstRecord(files).source.author = "Someone";
		const found = messages(files);
		expect(found).toContain(
			'records/sample-showcase.json/records/0/links: unknown property "email"',
		);
		expect(found).toContain(
			'records/sample-showcase.json/records/0/source: unknown property "author"',
		);
	});

	it.each([
		["description", "Reach the builder at someone@example.com", "email"],
		["description", "Made by @someone at the hackathon", "handle"],
		["description", "Call +55 11 98765-4321 for the demo", "phone"],
		["name", "@someone", "handle"],
	])("rejects personal data in %s (%s)", (field, text, kind) => {
		const files = fixture();
		firstRecord(files)[field] = text;
		expect(messages(files)).toContain(
			`records/sample-showcase.json/records/0/${field}: personal data pattern: ${kind}`,
		);
	});

	it("rejects a description over 400 characters and accepts exactly 400", () => {
		const files = fixture();
		firstRecord(files).description = "a".repeat(400);
		expect(messages(files)).toEqual([]);
		firstRecord(files).description = "a".repeat(401);
		expect(messages(files).some((m) => m.includes("/records/0/description"))).toBe(true);
	});

	it.each([
		["id", `hack:sample:${"x".repeat(110)}`],
		["id", "hack:Sample:Market"],
		["id", "grant:sample-hack-2026:sample-market"],
		["prize", "first_place"],
		["kind", "directory_entry"],
	])("rejects an invalid %s", (field, value) => {
		const files = fixture();
		firstRecord(files)[field] = value;
		expect(messages(files).length).toBeGreaterThan(0);
	});

	it.each(["description", "source", "event", "prize", "firstSeen"])(
		"requires the retained field %s",
		(field) => {
			const files = fixture();
			delete firstRecord(files)[field];
			expect(messages(files).some((m) => m.includes("must have required property"))).toBe(true);
		},
	);

	it("requires the source URL and data date, and a grant date for grant recipients", () => {
		const files = fixture();
		delete firstRecord(files).source.dataDate;
		const grants = files.recordFiles.find((f) => f.fileName === "sample-grants.json")
			?.content as Json;
		delete grants.records[0].grant.date;
		const found = messages(files);
		expect(found).toContain(
			"records/sample-showcase.json/records/0/source: must have required property 'dataDate'",
		);
		expect(found).toContain(
			"records/sample-grants.json/records/0/grant: must have required property 'date'",
		);
	});

	it("rejects a hackathon record with a grant and a grant record with an event", () => {
		const files = fixture();
		firstRecord(files).grant = { program: "P", cohort: "C", date: "2026-01-01" };
		const grants = files.recordFiles.find((f) => f.fileName === "sample-grants.json")
			?.content as Json;
		grants.records[0].event = { id: "e", name: "E", track: null };
		const found = messages(files);
		expect(found.some((m) => m.startsWith("records/sample-showcase.json/records/0/grant"))).toBe(
			true,
		);
		expect(found.some((m) => m.startsWith("records/sample-grants.json/records/0/event"))).toBe(
			true,
		);
	});

	it("rejects duplicate ids, unknown categories, unknown sources and mismatched file names", () => {
		const files = fixture();
		const showcase = files.recordFiles.find((f) => f.fileName === "sample-showcase.json")
			?.content as Json;
		showcase.records[1].id = showcase.records[0].id;
		showcase.records[1].categories = ["unknown-category"];
		files.recordFiles.push({
			fileName: "renamed.json",
			content: { sourceId: "missing-source", records: [] },
		});
		const found = messages(files);
		expect(found).toContain(
			'records/sample-showcase.json/records/1/id: duplicate id "hack:sample-hack-2026:sample-market"',
		);
		expect(found).toContain(
			'records/sample-showcase.json/records/1/categories: unknown category "unknown-category"',
		);
		expect(found).toContain("records/renamed.json/sourceId: must match the file name");
		expect(found).toContain('records/renamed.json/sourceId: unknown source "missing-source"');
	});

	it("checks project references and single ownership of occurrences", () => {
		const files = fixture();
		const projects = files.projects as Json[];
		(projects[0] as Json).occurrences.push("hack:sample-hack-2026:missing");
		projects.push({
			...structuredClone(projects[0]),
			id: "proj:another",
			occurrences: ["hack:sample-hack-2026:sample-market"],
		});
		const found = messages(files);
		expect(found).toContain(
			'projects.json/0/occurrences: unknown occurrence "hack:sample-hack-2026:missing"',
		);
		expect(found).toContain(
			'projects.json/1/occurrences: "hack:sample-hack-2026:sample-market" already belongs to "proj:sample-market"',
		);
	});

	it("rejects reusing a retired identifier", () => {
		const files = fixture();
		firstRecord(files).id = "hack:sample-hack-2026:samplemarket";
		((files.projects as Json[])[0] as Json).occurrences[0] = "hack:sample-hack-2026:samplemarket";
		expect(messages(files)).toContain(
			'aliases.json/0/from: retired id "hack:sample-hack-2026:samplemarket" is reused by a current record or project',
		);
	});

	it("rejects aliases to unknown ids and alias cycles", () => {
		const files = fixture();
		const aliases = files.aliases as Json[];
		aliases.push({ from: "proj:a", to: "proj:b", reason: "merged", at: "2026-11-12" });
		aliases.push({ from: "proj:b", to: "proj:a", reason: "merged", at: "2026-11-12" });
		aliases.push({ from: "proj:c", to: "proj:nowhere", reason: "renamed", at: "2026-11-12" });
		const found = messages(files);
		expect(found).toContain("aliases.json/2/to: alias chain has a cycle");
		expect(found).toContain('aliases.json/4/to: unknown target "proj:nowhere"');
	});

	it("rejects identity proposals with unknown ids", () => {
		const files = fixture();
		((files.identityPending as Json[])[0] as Json).ids.push("proj:unknown");
		expect(messages(files)).toContain('identity-pending.json/0/ids: unknown id "proj:unknown"');
	});

	it("rejects a manifest that does not match the record files", () => {
		const files = fixture();
		const manifest = files.manifest as Json;
		manifest.sources[1].recordCount = 5;
		manifest.sources.splice(0, 1);
		const found = messages(files);
		expect(found).toContain("manifest.json/sources/0/recordCount: is 5, file has 2");
		expect(found).toContain('manifest.json/sources: missing source "sample-grants"');
	});

	it.each([
		["sources", (f: Json) => (f.sources[0].owner = "Someone")],
		["categories", (f: Json) => (f.categories.categories[0].curator = "Someone")],
		["manifest", (f: Json) => (f.manifest.maintainer = "Someone")],
		["projects", (f: Json) => (f.projects[0].team = ["Someone"])],
	])("rejects unknown properties in %s", (_file, mutate) => {
		const files = fixture();
		mutate(files as unknown as Json);
		expect(messages(files).some((m) => m.includes("unknown property"))).toBe(true);
	});
});

describe("validate-data command", () => {
	function run(dataDirectory: string) {
		return spawnSync(
			process.execPath,
			["--import", "tsx", path.join(root, "scripts/validate-data.ts"), "--data", dataDirectory],
			{ cwd: root, encoding: "utf8" },
		);
	}

	it("exits 0 for the valid fixture and 1 for a fixture with a team field", () => {
		expect(run(validFixture).status).toBe(0);
		const copy = mkdtempSync(path.join(tmpdir(), "arc-lens-data-"));
		try {
			cpSync(validFixture, copy, { recursive: true });
			const file = path.join(copy, "records/sample-showcase.json");
			const content = readDatasetFiles(copy).recordFiles.find(
				(f) => f.fileName === "sample-showcase.json",
			)?.content as Json;
			content.records[0].team = [{ name: "Someone", email: "someone@example.com" }];
			writeFileSync(file, JSON.stringify(content));
			const result = run(copy);
			expect(result.status).toBe(1);
			expect(result.stderr).toContain('unknown property "team"');
		} finally {
			rmSync(copy, { recursive: true, force: true });
		}
	});
});
