import type { EmbedderModel, EmbedderPort, EmbedderState } from "../../src/ports/index.js";

export const FAKE_MODEL: EmbedderModel = {
	id: "fake/fixed-vectors",
	revision: "test",
	dimensions: 4,
};

function hashVector(text: string, dimensions: number): Float32Array {
	const vector = new Float32Array(dimensions);
	for (let i = 0; i < text.length; i++) {
		const slot = i % dimensions;
		vector[slot] = ((vector[slot] ?? 0) * 31 + text.charCodeAt(i)) % 1000;
	}
	return vector;
}

export class FixedEmbedder implements EmbedderPort {
	constructor(
		private readonly vectors: ReadonlyMap<string, readonly number[]> = new Map(),
		private readonly model: EmbedderModel = FAKE_MODEL,
	) {}

	async state(): Promise<EmbedderState> {
		return { ready: true, model: this.model };
	}

	async embed(texts: readonly string[]): Promise<readonly Float32Array[]> {
		return texts.map((text) => {
			const fixed = this.vectors.get(text);
			return fixed ? Float32Array.from(fixed) : hashVector(text, this.model.dimensions);
		});
	}
}

export class UnavailableEmbedder implements EmbedderPort {
	constructor(private readonly reason: string) {}

	async state(): Promise<EmbedderState> {
		return { ready: false, reason: this.reason };
	}

	async embed(_texts: readonly string[]): Promise<readonly Float32Array[]> {
		throw new Error(this.reason);
	}
}
