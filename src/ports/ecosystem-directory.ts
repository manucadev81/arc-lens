import type { DirectoryEntry, DirectoryQuery } from "../domain/directory.js";

export interface CancellationSignal {
	readonly aborted: boolean;
	addEventListener(
		type: "abort",
		listener: () => void,
		options?: { readonly once?: boolean },
	): void;
}

export interface DirectoryRequestOptions {
	readonly signal?: CancellationSignal;
}

export interface EcosystemDirectoryPort {
	searchProjects(
		query: DirectoryQuery,
		options?: DirectoryRequestOptions,
	): Promise<readonly DirectoryEntry[]>;
	getProject(id: string, options?: DirectoryRequestOptions): Promise<DirectoryEntry | null>;
}
