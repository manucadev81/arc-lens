export type IsoDate = string;

export type RecordKind = "hackathon_project" | "grant_recipient";

export type PrizeOutcome = "winner" | "not_winner" | "unknown";

export type ProjectStatusValue = "live" | "inactive" | "unknown";

export interface StatusEvidence {
	readonly signal: string;
	readonly result: string;
	readonly at: IsoDate;
}

export interface DatasetRecord {
	readonly id: string;
	readonly kind: RecordKind;
	readonly name: string;
	readonly aliases: readonly string[];
	readonly description: string;
	readonly categories: readonly string[];
	readonly event: {
		readonly id: string;
		readonly name: string;
		readonly track: string | null;
	} | null;
	readonly grant: {
		readonly program: string;
		readonly cohort: string;
		readonly date: IsoDate;
	} | null;
	readonly prize: PrizeOutcome;
	readonly links: {
		readonly demo: string | null;
		readonly repository: string | null;
		readonly website: string | null;
	};
	readonly source: { readonly id: string; readonly url: string; readonly dataDate: IsoDate };
	readonly status: {
		readonly value: ProjectStatusValue;
		readonly checkedAt: IsoDate;
		readonly evidence: readonly StatusEvidence[];
	};
	readonly firstSeen: IsoDate;
	readonly updatedAt: IsoDate;
}

export interface Category {
	readonly id: string;
	readonly label: string;
	readonly description: string;
}

export interface SourceDataDate {
	readonly sourceId: string;
	readonly dataDate: IsoDate;
	readonly recordCount: number;
}

export interface DatasetManifest {
	readonly datasetVersion: string;
	readonly schemaVersion: string;
	readonly updatedAt: IsoDate;
	readonly sources: readonly SourceDataDate[];
}
