import { describe, expect, it } from "vitest";
import type { DatasetRecord } from "../../src/domain/index.js";
import { FixedClock } from "../fakes/fixed-clock.js";
import { FAKE_MODEL, FixedEmbedder } from "../fakes/fixed-embedder.js";
import { InMemoryDataset } from "../fakes/in-memory-dataset.js";
import { RecordedDirectory } from "../fakes/recorded-directory.js";
import { SAMPLE_CATEGORY, SAMPLE_MANIFEST, SAMPLE_RECORD } from "../fakes/sample-data.js";

type Mutable<T> = { -readonly [K in keyof T]: T[K] extends object ? Mutable<T[K]> : T[K] };

describe("fixed clock isolation", () => {
	it("is not affected by mutating the constructor input", () => {
		const input = new Date("2026-11-15T12:00:00.000Z");
		const clock = new FixedClock(input);
		input.setUTCFullYear(1999);
		expect(clock.now().toISOString()).toBe("2026-11-15T12:00:00.000Z");
	});

	it("is not affected by mutating a returned date", () => {
		const clock = new FixedClock(new Date("2026-11-15T12:00:00.000Z"));
		clock.now().setUTCFullYear(2000);
		expect(clock.now().toISOString()).toBe("2026-11-15T12:00:00.000Z");
	});
});

describe("in-memory dataset isolation", () => {
	function build() {
		const records = [structuredClone(SAMPLE_RECORD)] as Mutable<DatasetRecord>[];
		const categories = [structuredClone(SAMPLE_CATEGORY)];
		const manifest = structuredClone(SAMPLE_MANIFEST) as Mutable<typeof SAMPLE_MANIFEST>;
		return {
			records,
			categories,
			manifest,
			dataset: new InMemoryDataset(records, categories, manifest),
		};
	}

	it("is not affected by mutating the constructor inputs", async () => {
		const { records, categories, manifest, dataset } = build();
		(records[0] as Mutable<DatasetRecord>).name = "Changed";
		(records[0] as Mutable<DatasetRecord>).links.demo = "https://changed.example";
		records.push(structuredClone(SAMPLE_RECORD) as Mutable<DatasetRecord>);
		categories.length = 0;
		manifest.datasetVersion = "changed";
		manifest.sources[0] = { sourceId: "x", dataDate: "2000-01-01", recordCount: 9 };
		expect(await dataset.listRecords()).toEqual([SAMPLE_RECORD]);
		expect(await dataset.listCategories()).toEqual([SAMPLE_CATEGORY]);
		expect(await dataset.getManifest()).toEqual(SAMPLE_MANIFEST);
	});

	it("is not affected by mutating returned values", async () => {
		const { dataset } = build();
		const records = (await dataset.listRecords()) as Mutable<DatasetRecord>[];
		(records[0] as Mutable<DatasetRecord>).categories.push("changed");
		records.length = 0;
		const manifest = (await dataset.getManifest()) as Mutable<typeof SAMPLE_MANIFEST>;
		manifest.updatedAt = "2000-01-01";
		const categories = (await dataset.listCategories()) as unknown as { label: string }[];
		(categories[0] as { label: string }).label = "changed";
		expect(await dataset.listRecords()).toEqual([SAMPLE_RECORD]);
		expect(await dataset.getManifest()).toEqual(SAMPLE_MANIFEST);
		expect(await dataset.listCategories()).toEqual([SAMPLE_CATEGORY]);
	});
});

describe("fixed embedder isolation", () => {
	it("is not affected by mutating the constructor map, vectors or model", async () => {
		const vector = [1, 0, 0, 0];
		const vectors = new Map([["usdc", vector]]);
		const model = { ...FAKE_MODEL };
		const embedder = new FixedEmbedder(vectors, model);
		vector[0] = 9;
		vectors.set("usdc", [5, 5, 5, 5]);
		model.revision = "changed";
		expect(Array.from((await embedder.embed(["usdc"]))[0] ?? [])).toEqual([1, 0, 0, 0]);
		expect(await embedder.state()).toEqual({ ready: true, model: FAKE_MODEL });
	});

	it("is not affected by mutating a returned vector or model", async () => {
		const embedder = new FixedEmbedder(new Map([["usdc", [1, 0, 0, 0]]]));
		const [first] = await embedder.embed(["usdc"]);
		first?.fill(7);
		const state = await embedder.state();
		if (state.ready) (state.model as { revision: string }).revision = "changed";
		expect(Array.from((await embedder.embed(["usdc"]))[0] ?? [])).toEqual([1, 0, 0, 0]);
		expect(await embedder.state()).toEqual({ ready: true, model: FAKE_MODEL });
	});
});

describe("recorded directory isolation", () => {
	const entry = {
		id: "registrai:sample",
		name: "Sample",
		description: "Synthetic.",
		categories: ["payments"],
		status: "active",
		url: "https://example.com/sample",
		links: ["https://github.com/example/sample"],
	};

	it("is not affected by mutating the constructor maps or entries", async () => {
		const original = structuredClone(entry);
		const list = [original];
		const searches = new Map([["payments", list]]);
		const projects = new Map([[entry.id, original]]);
		const directory = new RecordedDirectory(searches, projects);
		original.name = "Changed";
		original.categories.push("changed");
		list.push(structuredClone(entry));
		searches.set("payments", []);
		projects.delete(entry.id);
		expect(await directory.searchProjects({ text: "payments", limit: 5 })).toEqual([entry]);
		expect(await directory.getProject(entry.id)).toEqual(entry);
	});

	it("is not affected by mutating returned entries or the recorded query", async () => {
		const directory = new RecordedDirectory(
			new Map([["payments", [entry]]]),
			new Map([[entry.id, entry]]),
		);
		const query = { text: "payments", limit: 5 };
		const [found] = (await directory.searchProjects(query)) as (typeof entry)[];
		if (found) found.name = "Changed";
		const project = (await directory.getProject(entry.id)) as typeof entry;
		project.categories.push("changed");
		query.text = "changed";
		expect(await directory.searchProjects({ text: "payments", limit: 5 })).toEqual([entry]);
		expect(await directory.getProject(entry.id)).toEqual(entry);
		expect(directory.calls[0]).toEqual({ text: "payments", limit: 5 });
	});
});
