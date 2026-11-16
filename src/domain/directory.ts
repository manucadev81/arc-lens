export interface DirectoryEntry {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly categories: readonly string[];
	readonly status: string | null;
	readonly url: string;
	readonly links: readonly string[];
}

export interface DirectoryQuery {
	readonly text: string;
	readonly limit: number;
}
