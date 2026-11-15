import type { ClockPort } from "../../src/ports/index.js";

export class FixedClock implements ClockPort {
	constructor(private readonly instant: Date) {}

	now(): Date {
		return new Date(this.instant.getTime());
	}
}
