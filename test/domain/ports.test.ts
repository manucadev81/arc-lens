import { describe, expect, it } from "vitest";
import { FixedClock } from "../fakes/fixed-clock.js";
import { FAKE_MODEL, FixedEmbedder, UnavailableEmbedder } from "../fakes/fixed-embedder.js";
import { InMemoryDataset } from "../fakes/in-memory-dataset.js";
import { RecordedDirectory, RequestCancelledError } from "../fakes/recorded-directory.js";
import { SAMPLE_CATEGORY, SAMPLE_MANIFEST, SAMPLE_RECORD } from "../fakes/sample-data.js";

describe("dataset port fake", () => {
	it("returns the same records, categories and manifest on every call", async () => {
		const dataset = new InMemoryDataset([SAMPLE_RECORD], [SAMPLE_CATEGORY], SAMPLE_MANIFEST);
		expect(await dataset.listRecords()).toEqual([SAMPLE_RECORD]);
		expect(await dataset.listRecords()).toEqual(await dataset.listRecords());
		expect(await dataset.listCategories()).toEqual([SAMPLE_CATEGORY]);
		expect(await dataset.getManifest()).toEqual(SAMPLE_MANIFEST);
	});
});

describe("embedder port fakes", () => {
	it("returns fixed vectors for known texts", async () => {
		const embedder = new FixedEmbedder(new Map([["usdc payments", [1, 0, 0, 0]]]));
		const [vector] = await embedder.embed(["usdc payments"]);
		expect(Array.from(vector ?? [])).toEqual([1, 0, 0, 0]);
	});

	it("is deterministic for unknown texts across calls and instances", async () => {
		const first = await new FixedEmbedder().embed(["pagamentos com USDC", "agent market"]);
		const second = await new FixedEmbedder().embed(["pagamentos com USDC", "agent market"]);
		expect(first.map((v) => Array.from(v))).toEqual(second.map((v) => Array.from(v)));
		expect(first[0]).toHaveLength(FAKE_MODEL.dimensions);
		expect(Array.from(first[0] ?? [])).not.toEqual(Array.from(first[1] ?? []));
	});

	it("reports readiness with the pinned model", async () => {
		expect(await new FixedEmbedder().state()).toEqual({ ready: true, model: FAKE_MODEL });
	});

	it("can represent an unavailable model for keyword-only mode", async () => {
		const embedder = new UnavailableEmbedder("model files missing");
		expect(await embedder.state()).toEqual({ ready: false, reason: "model files missing" });
		await expect(embedder.embed(["anything"])).rejects.toThrow("model files missing");
	});
});

describe("ecosystem directory port fake", () => {
	const entry = {
		id: "registrai:sample",
		name: "Sample Directory Entry",
		description: "Synthetic directory entry.",
		categories: ["payments"],
		status: "active",
		url: "https://example.com/directory/sample",
		links: [],
	};

	it("replays recorded answers and honors the limit", async () => {
		const directory = new RecordedDirectory(
			new Map([["payments", [entry, entry]]]),
			new Map([[entry.id, entry]]),
		);
		expect(await directory.searchProjects({ text: "payments", limit: 1 })).toEqual([entry]);
		expect(await directory.searchProjects({ text: "unknown", limit: 5 })).toEqual([]);
		expect(await directory.getProject(entry.id)).toEqual(entry);
		expect(await directory.getProject("missing")).toBeNull();
		expect(directory.calls).toEqual([
			{ text: "payments", limit: 1 },
			{ text: "unknown", limit: 5 },
		]);
	});

	it("rejects when the caller already cancelled", async () => {
		const directory = new RecordedDirectory(new Map());
		const controller = new AbortController();
		controller.abort();
		await expect(
			directory.searchProjects({ text: "payments", limit: 5 }, { signal: controller.signal }),
		).rejects.toBeInstanceOf(RequestCancelledError);
	});
});

describe("clock port fake", () => {
	it("always returns the fixed instant and cannot be mutated by callers", () => {
		const clock = new FixedClock(new Date("2026-11-15T12:00:00.000Z"));
		const first = clock.now();
		first.setUTCFullYear(2000);
		expect(clock.now().toISOString()).toBe("2026-11-15T12:00:00.000Z");
	});
});
