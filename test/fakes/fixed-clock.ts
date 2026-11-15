import type { ClockPort } from "../../src/ports/index.js";

export class FixedClock implements ClockPort {
	private readonly epochMilliseconds: number;

	constructor(instant: Date) {
		this.epochMilliseconds = instant.getTime();
	}

	now(): Date {
		return new Date(this.epochMilliseconds);
	}
}
