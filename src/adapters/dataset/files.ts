import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { type DatasetFiles, SCHEMA_NAMES, type SchemaName } from "./validate.js";

function readJson(file: string): unknown {
	return JSON.parse(readFileSync(file, "utf8"));
}

export function readSchemas(directory: string): Record<SchemaName, object> {
	return Object.fromEntries(
		SCHEMA_NAMES.map((name) => [name, readJson(path.join(directory, `${name}.schema.json`))]),
	) as Record<SchemaName, object>;
}

export function readDatasetFiles(directory: string): DatasetFiles {
	const recordsDirectory = path.join(directory, "records");
	const recordFiles = existsSync(recordsDirectory)
		? readdirSync(recordsDirectory)
				.filter((name) => name.endsWith(".json"))
				.sort()
				.map((fileName) => ({ fileName, content: readJson(path.join(recordsDirectory, fileName)) }))
		: [];
	return {
		recordFiles,
		sources: readJson(path.join(directory, "sources.json")),
		categories: readJson(path.join(directory, "categories.json")),
		aliases: readJson(path.join(directory, "aliases.json")),
		projects: readJson(path.join(directory, "projects.json")),
		identityPending: readJson(path.join(directory, "identity-pending.json")),
		manifest: readJson(path.join(directory, "manifest.json")),
	};
}
