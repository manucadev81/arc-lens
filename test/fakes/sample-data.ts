import type { Category, DatasetManifest, DatasetRecord } from "../../src/domain/index.js";

export const SAMPLE_RECORD: DatasetRecord = {
	id: "hack:sample-event-2026:sample-market",
	kind: "hackathon_project",
	name: "Sample Market",
	aliases: [],
	description: "Synthetic record: agents buy datasets and pay per request.",
	categories: ["agent-payments"],
	event: { id: "sample-event-2026", name: "Sample Event 2026", track: "Arc" },
	grant: null,
	prize: "unknown",
	links: { demo: null, repository: null, website: null },
	source: { id: "sample-source", url: "https://example.com/sample", dataDate: "2026-11-10" },
	status: { value: "unknown", checkedAt: "2026-11-10", evidence: [] },
	firstSeen: "2026-11-10",
	updatedAt: "2026-11-10",
};

export const SAMPLE_CATEGORY: Category = {
	id: "agent-payments",
	label: "Agent payments",
	description: "Synthetic category for tests.",
};

export const SAMPLE_MANIFEST: DatasetManifest = {
	datasetVersion: "0.0.0-test",
	schemaVersion: "1",
	updatedAt: "2026-11-10",
	sources: [{ sourceId: "sample-source", dataDate: "2026-11-10", recordCount: 1 }],
};
