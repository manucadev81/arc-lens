import type { Category, DatasetManifest, DatasetRecord } from "../domain/records.js";

export interface DatasetPort {
	listRecords(): Promise<readonly DatasetRecord[]>;
	listCategories(): Promise<readonly Category[]>;
	getManifest(): Promise<DatasetManifest>;
}
