import type { DirectoryEntry, DirectoryQuery } from "../../src/domain/index.js";
import type { DirectoryRequestOptions, EcosystemDirectoryPort } from "../../src/ports/index.js";

export class RequestCancelledError extends Error {
	constructor() {
		super("Directory request cancelled");
		this.name = "RequestCancelledError";
	}
}

export class RecordedDirectory implements EcosystemDirectoryPort {
	readonly calls: DirectoryQuery[] = [];

	constructor(
		private readonly searches: ReadonlyMap<string, readonly DirectoryEntry[]>,
		private readonly projects: ReadonlyMap<string, DirectoryEntry> = new Map(),
	) {}

	async searchProjects(
		query: DirectoryQuery,
		options?: DirectoryRequestOptions,
	): Promise<readonly DirectoryEntry[]> {
		if (options?.signal?.aborted) throw new RequestCancelledError();
		this.calls.push(query);
		return (this.searches.get(query.text) ?? []).slice(0, query.limit);
	}

	async getProject(id: string, options?: DirectoryRequestOptions): Promise<DirectoryEntry | null> {
		if (options?.signal?.aborted) throw new RequestCancelledError();
		return this.projects.get(id) ?? null;
	}
}
