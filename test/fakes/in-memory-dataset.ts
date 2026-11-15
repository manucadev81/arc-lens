import type { Category, DatasetManifest, DatasetRecord } from "../../src/domain/index.js";
import type { DatasetPort } from "../../src/ports/index.js";

export class InMemoryDataset implements DatasetPort {
	constructor(
		private readonly records: readonly DatasetRecord[],
		private readonly categories: readonly Category[],
		private readonly manifest: DatasetManifest,
	) {}

	async listRecords(): Promise<readonly DatasetRecord[]> {
		return this.records;
	}

	async listCategories(): Promise<readonly Category[]> {
		return this.categories;
	}

	async getManifest(): Promise<DatasetManifest> {
		return this.manifest;
	}
}
