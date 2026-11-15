export interface EmbedderModel {
	readonly id: string;
	readonly revision: string;
	readonly dimensions: number;
}

export type EmbedderState =
	| { readonly ready: true; readonly model: EmbedderModel }
	| { readonly ready: false; readonly reason: string };

export interface EmbedderPort {
	state(): Promise<EmbedderState>;
	embed(texts: readonly string[]): Promise<readonly Float32Array[]>;
}
