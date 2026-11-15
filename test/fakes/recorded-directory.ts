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

	private readonly searches: ReadonlyMap<string, readonly DirectoryEntry[]>;
	private readonly projects: ReadonlyMap<string, DirectoryEntry>;

	constructor(
		searches: ReadonlyMap<string, readonly DirectoryEntry[]>,
		projects: ReadonlyMap<string, DirectoryEntry> = new Map(),
	) {
		this.searches = new Map(structuredClone([...searches]));
		this.projects = new Map(structuredClone([...projects]));
	}

	async searchProjects(
		query: DirectoryQuery,
		options?: DirectoryRequestOptions,
	): Promise<readonly DirectoryEntry[]> {
		if (options?.signal?.aborted) throw new RequestCancelledError();
		this.calls.push({ ...query });
		return structuredClone((this.searches.get(query.text) ?? []).slice(0, query.limit));
	}

	async getProject(id: string, options?: DirectoryRequestOptions): Promise<DirectoryEntry | null> {
		if (options?.signal?.aborted) throw new RequestCancelledError();
		const project = this.projects.get(id);
		return project ? structuredClone(project) : null;
	}
}
