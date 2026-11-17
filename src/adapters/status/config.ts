import { readFileSync } from "node:fs";
import type { StatusConfig } from "../../domain/index.js";

const POSITIVE_INTEGER_FIELDS = [
	"version",
	"liveCommitWithinDays",
	"notLiveCommitOlderThanDays",
	"demoTimeoutSeconds",
	"maxRedirects",
] as const;

export class StatusConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "StatusConfigError";
	}
}

export function parseStatusConfig(value: unknown): StatusConfig {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new StatusConfigError("Status config must be an object");
	}
	const record = value as Record<string, unknown>;
	const unknown = Object.keys(record).filter(
		(key) => !(POSITIVE_INTEGER_FIELDS as readonly string[]).includes(key),
	);
	if (unknown.length > 0)
		throw new StatusConfigError(`Unknown status config fields: ${unknown.join(", ")}`);
	for (const field of POSITIVE_INTEGER_FIELDS) {
		const item = record[field];
		if (typeof item !== "number" || !Number.isSafeInteger(item) || item < 1) {
			throw new StatusConfigError(`Status config field ${field} must be a positive integer`);
		}
	}
	const config = record as unknown as StatusConfig;
	if (config.notLiveCommitOlderThanDays <= config.liveCommitWithinDays) {
		throw new StatusConfigError(
			"notLiveCommitOlderThanDays must be greater than liveCommitWithinDays",
		);
	}
	return config;
}

export function loadStatusConfig(path: string): StatusConfig {
	return parseStatusConfig(JSON.parse(readFileSync(path, "utf8")));
}
