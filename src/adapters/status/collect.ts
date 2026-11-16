import {
	type DatasetRecord,
	type IsoDate,
	recordStatus,
	type StatusConfig,
	type StatusSignals,
} from "../../domain/index.js";
import { checkDemo, type DemoTransport } from "./demo-check.js";
import { checkRepository, type GitHubClient } from "./repository-check.js";

export interface SignalCollectors {
	readonly demo: DemoTransport;
	readonly github: GitHubClient;
	readonly config: StatusConfig;
}

export async function collectRecordSignals(
	record: DatasetRecord,
	collectors: SignalCollectors,
	today: IsoDate,
): Promise<Pick<StatusSignals, "demo" | "repository">> {
	const [demo, repository] = await Promise.all([
		checkDemo(record.links.demo, collectors.demo, collectors.config, today),
		checkRepository(record.links.repository, collectors.github, today),
	]);
	return { demo, repository };
}

export async function refreshRecordStatus(
	record: DatasetRecord,
	collectors: SignalCollectors,
	today: IsoDate,
): Promise<DatasetRecord> {
	const signals = await collectRecordSignals(record, collectors, today);
	return { ...record, status: recordStatus(signals, today, collectors.config) };
}
