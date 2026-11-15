import type { Category, DatasetManifest, DatasetRecord } from "../../src/domain/index.js";
import type { DatasetPort } from "../../src/ports/index.js";

export class InMemoryDataset implements DatasetPort {
	private readonly records: readonly DatasetRecord[];
	private readonly categories: readonly Category[];
	private readonly manifest: DatasetManifest;

	constructor(
		records: readonly DatasetRecord[],
		categories: readonly Category[],
		manifest: DatasetManifest,
	) {
		this.records = structuredClone(records);
		this.categories = structuredClone(categories);
		this.manifest = structuredClone(manifest);
	}

	async listRecords(): Promise<readonly DatasetRecord[]> {
		return structuredClone(this.records);
	}

	async listCategories(): Promise<readonly Category[]> {
		return structuredClone(this.categories);
	}

	async getManifest(): Promise<DatasetManifest> {
		return structuredClone(this.manifest);
	}
}
