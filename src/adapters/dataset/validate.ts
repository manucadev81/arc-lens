import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import formatsPlugin from "ajv-formats";
import {
	findPersonalDataInFields,
	isOccurrenceId,
	isProjectId,
	isRegistraiId,
} from "../../domain/index.js";

export const SCHEMA_NAMES = [
	"common",
	"record",
	"record-file",
	"sources",
	"categories",
	"aliases",
	"projects",
	"identity-pending",
	"manifest",
] as const;

export type SchemaName = (typeof SCHEMA_NAMES)[number];

export interface DatasetFiles {
	readonly recordFiles: readonly { readonly fileName: string; readonly content: unknown }[];
	readonly sources: unknown;
	readonly categories: unknown;
	readonly aliases: unknown;
	readonly projects: unknown;
	readonly identityPending: unknown;
	readonly manifest: unknown;
}

export interface DatasetIssue {
	readonly file: string;
	readonly path: string;
	readonly message: string;
}

type Validators = Readonly<Record<Exclude<SchemaName, "common" | "record">, ValidateFunction>>;

type AnyRecord = {
	id: string;
	name: string;
	aliases: string[];
	description: string;
	categories: string[];
	source: { id: string };
};

const addFormats = ((formatsPlugin as unknown as { default?: unknown }).default ??
	formatsPlugin) as unknown as (ajv: Ajv2020) => Ajv2020;

export function createDatasetValidator(schemas: Readonly<Record<SchemaName, object>>) {
	const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
	addFormats(ajv);
	for (const name of SCHEMA_NAMES) ajv.addSchema(schemas[name]);
	const compile = (name: SchemaName) => {
		const validator = ajv.getSchema(`urn:arc-lens:schema:${name}`);
		if (!validator) throw new Error(`Schema not registered: ${name}`);
		return validator;
	};
	const validators: Validators = {
		"record-file": compile("record-file"),
		sources: compile("sources"),
		categories: compile("categories"),
		aliases: compile("aliases"),
		projects: compile("projects"),
		"identity-pending": compile("identity-pending"),
		manifest: compile("manifest"),
	};
	return (files: DatasetFiles) => validateDataset(validators, files);
}

function schemaIssues(file: string, errors: ErrorObject[] | null | undefined): DatasetIssue[] {
	return (errors ?? []).map((error) => ({
		file,
		path: error.instancePath || "/",
		message:
			error.keyword === "additionalProperties"
				? `unknown property "${String(error.params.additionalProperty)}"`
				: (error.message ?? error.keyword),
	}));
}

function check(
	validator: ValidateFunction,
	file: string,
	content: unknown,
	issues: DatasetIssue[],
): boolean {
	if (validator(content)) return true;
	issues.push(...schemaIssues(file, validator.errors));
	return false;
}

function validateDataset(validators: Validators, files: DatasetFiles): DatasetIssue[] {
	const issues: DatasetIssue[] = [];
	const add = (file: string, path: string, message: string) => issues.push({ file, path, message });

	const sourcesOk = check(validators.sources, "sources.json", files.sources, issues);
	const categoriesOk = check(validators.categories, "categories.json", files.categories, issues);
	const aliasesOk = check(validators.aliases, "aliases.json", files.aliases, issues);
	const projectsOk = check(validators.projects, "projects.json", files.projects, issues);
	const pendingOk = check(
		validators["identity-pending"],
		"identity-pending.json",
		files.identityPending,
		issues,
	);
	const manifestOk = check(validators.manifest, "manifest.json", files.manifest, issues);

	const sourceIds = new Set(
		sourcesOk ? (files.sources as { id: string }[]).map((source) => source.id) : [],
	);
	if (sourcesOk && sourceIds.size !== (files.sources as unknown[]).length) {
		add("sources.json", "/", "duplicate source id");
	}
	const categoryIds = new Set(
		categoriesOk
			? (files.categories as { categories: { id: string }[] }).categories.map((c) => c.id)
			: [],
	);
	if (categoriesOk) {
		const declared = (files.categories as { categories: unknown[] }).categories.length;
		if (categoryIds.size !== declared)
			add("categories.json", "/categories", "duplicate category id");
		for (const [key, target] of Object.entries(
			(files.categories as { registraiCategories: Record<string, string> }).registraiCategories,
		)) {
			if (!categoryIds.has(target)) {
				add("categories.json", `/registraiCategories/${key}`, `unknown category "${target}"`);
			}
		}
	}

	const recordIds = new Set<string>();
	const recordCounts = new Map<string, number>();
	for (const { fileName, content } of files.recordFiles) {
		const file = `records/${fileName}`;
		if (!check(validators["record-file"], file, content, issues)) continue;
		const { sourceId, records } = content as { sourceId: string; records: AnyRecord[] };
		if (fileName !== `${sourceId}.json`) add(file, "/sourceId", `must match the file name`);
		if (sourcesOk && !sourceIds.has(sourceId))
			add(file, "/sourceId", `unknown source "${sourceId}"`);
		recordCounts.set(sourceId, records.length);
		records.forEach((record, index) => {
			const path = `/records/${index}`;
			if (recordIds.has(record.id)) add(file, `${path}/id`, `duplicate id "${record.id}"`);
			recordIds.add(record.id);
			if (record.source.id !== sourceId)
				add(file, `${path}/source/id`, "must match the file source");
			if (categoriesOk) {
				for (const category of record.categories) {
					if (!categoryIds.has(category)) {
						add(file, `${path}/categories`, `unknown category "${category}"`);
					}
				}
			}
			for (const finding of findPersonalDataInFields({
				name: record.name,
				aliases: record.aliases,
				description: record.description,
			})) {
				add(file, `${path}/${finding.field}`, `personal data pattern: ${finding.kinds.join(", ")}`);
			}
		});
	}

	const projectIds = new Set<string>();
	if (projectsOk) {
		const owner = new Map<string, string>();
		(files.projects as { id: string; occurrences: string[] }[]).forEach((project, index) => {
			const path = `/${index}`;
			if (projectIds.has(project.id))
				add("projects.json", `${path}/id`, `duplicate id "${project.id}"`);
			projectIds.add(project.id);
			for (const occurrence of project.occurrences) {
				if (!recordIds.has(occurrence)) {
					add("projects.json", `${path}/occurrences`, `unknown occurrence "${occurrence}"`);
				}
				const other = owner.get(occurrence);
				if (other && other !== project.id) {
					add(
						"projects.json",
						`${path}/occurrences`,
						`"${occurrence}" already belongs to "${other}"`,
					);
				}
				owner.set(occurrence, project.id);
			}
		});
	}

	const currentIds = new Set([...recordIds, ...projectIds]);
	const resolvable = (id: string) => currentIds.has(id) || isRegistraiId(id);

	if (aliasesOk) {
		const aliases = files.aliases as { from: string; to: string }[];
		const targets = new Map<string, string>();
		aliases.forEach((alias, index) => {
			const path = `/${index}`;
			if (targets.has(alias.from))
				add("aliases.json", `${path}/from`, `duplicate alias "${alias.from}"`);
			targets.set(alias.from, alias.to);
			if (currentIds.has(alias.from)) {
				add(
					"aliases.json",
					`${path}/from`,
					`retired id "${alias.from}" is reused by a current record or project`,
				);
			}
		});
		aliases.forEach((alias, index) => {
			const seen = new Set<string>([alias.from]);
			let target = alias.to;
			while (targets.has(target) && !seen.has(target)) {
				seen.add(target);
				target = targets.get(target) as string;
			}
			if (seen.has(target)) add("aliases.json", `/${index}/to`, "alias chain has a cycle");
			else if (!resolvable(target))
				add("aliases.json", `/${index}/to`, `unknown target "${target}"`);
		});
	}

	if (pendingOk) {
		(files.identityPending as { ids: string[] }[]).forEach((proposal, index) => {
			for (const id of proposal.ids) {
				if (!resolvable(id)) add("identity-pending.json", `/${index}/ids`, `unknown id "${id}"`);
			}
		});
	}

	if (manifestOk) {
		const manifest = files.manifest as {
			sources: { sourceId: string; recordCount: number }[];
		};
		const listed = new Set<string>();
		manifest.sources.forEach((entry, index) => {
			const path = `/sources/${index}`;
			if (listed.has(entry.sourceId))
				add("manifest.json", path, `duplicate source "${entry.sourceId}"`);
			listed.add(entry.sourceId);
			const actual = recordCounts.get(entry.sourceId);
			if (actual === undefined)
				add("manifest.json", path, `no record file for "${entry.sourceId}"`);
			else if (actual !== entry.recordCount) {
				add("manifest.json", `${path}/recordCount`, `is ${entry.recordCount}, file has ${actual}`);
			}
		});
		for (const sourceId of recordCounts.keys()) {
			if (!listed.has(sourceId)) add("manifest.json", "/sources", `missing source "${sourceId}"`);
		}
	}

	for (const id of currentIds) {
		if (!isOccurrenceId(id) && !isProjectId(id)) add("dataset", "/", `invalid id "${id}"`);
	}

	return issues;
}
