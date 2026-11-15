import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeProject, analyzeSource } from "../../scripts/boundaries/analyze.js";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const file = "src/domain/search.ts";

function reasons(source: string): string[] {
	return analyzeSource(file, source).map((violation) => violation.reason);
}

describe("domain boundary analysis", () => {
	it("the current domain and ports respect the boundary", () => {
		const { files, violations } = analyzeProject(repositoryRoot);
		expect(files.length).toBeGreaterThan(0);
		expect(violations).toEqual([]);
	});

	it.each([
		[
			'import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";',
			"@modelcontextprotocol/sdk/server/mcp.js",
		],
		['import { pipeline } from "@huggingface/transformers";', "@huggingface/transformers"],
		['import { readFile } from "node:fs/promises";', "node:fs/promises"],
		['import fs from "fs";', "fs"],
		['import { readFile } from "fs/promises";', "fs/promises"],
		['export { join } from "node:path";', "node:path"],
		['const m = await import("@huggingface/transformers");', "@huggingface/transformers"],
		['import { request } from "undici";', "undici"],
	])("rejects %s", (source, specifier) => {
		expect(reasons(source)).toContain(`imports forbidden module "${specifier}"`);
	});

	it.each([
		'import { FileDataset } from "../adapters/dataset/files.js";',
		'import { createServer } from "../server.js";',
	])("rejects relative imports that leave the domain: %s", (source) => {
		expect(reasons(source).some((r) => r.includes("outside src/domain and src/ports"))).toBe(true);
	});

	it.each([
		["fetch", 'export const load = () => fetch("https://builder.registrai.cc/api/v1");'],
		["process", "export const key = process.env.KEY;"],
		["require", 'export const fs = require("fs");'],
		["XMLHttpRequest", "export const xhr = new XMLHttpRequest();"],
	])("rejects the global %s", (name, source) => {
		expect(reasons(source)).toContain(`uses the global "${name}"`);
	});

	it("rejects a dynamic import with a computed path", () => {
		expect(reasons("const name = 'fs'; export const m = await import(name);")).toContain(
			"dynamic import with a computed path",
		);
	});

	it("accepts imports between domain and ports and plain logic", () => {
		const source = [
			'import type { DatasetPort } from "../ports/dataset.js";',
			'import type { DatasetRecord } from "./records.js";',
			"export const count = (records: readonly DatasetRecord[]) => records.length;",
			"export type Uses = DatasetPort;",
		].join("\n");
		expect(reasons(source)).toEqual([]);
	});

	it("does not confuse property names with globals", () => {
		const source = [
			"type Client = { fetch(): Promise<void>; process: number };",
			"export const options = { fetch: true, require: false };",
			"export const run = (c: Client) => c.fetch() && c.process;",
		].join("\n");
		expect(reasons(source)).toEqual([]);
	});

	it("the command fails with a non-zero exit code when the domain breaks the rule", () => {
		const root = mkdtempSync(path.join(tmpdir(), "arc-lens-boundary-"));
		try {
			mkdirSync(path.join(root, "src/domain"), { recursive: true });
			writeFileSync(
				path.join(root, "src/domain/bad.ts"),
				'import fs from "node:fs";\nexport const f = fs;\n',
			);
			const run = spawnSync(
				process.execPath,
				[
					"--import",
					"tsx",
					path.join(repositoryRoot, "scripts/check-boundaries.ts"),
					"--root",
					root,
				],
				{ cwd: repositoryRoot, encoding: "utf8" },
			);
			expect(run.status).toBe(1);
			expect(run.stderr).toContain('src/domain/bad.ts: imports forbidden module "node:fs"');
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
