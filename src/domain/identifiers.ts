export const MAX_ID_LENGTH = 120;

const SEGMENT = "[a-z0-9]+(?:-[a-z0-9]+)*";
const OCCURRENCE_ID = new RegExp(`^(?:hack|grant):${SEGMENT}:${SEGMENT}$`);
const REGISTRAI_ID = new RegExp(`^registrai:${SEGMENT}$`);
const PROJECT_ID = new RegExp(`^proj:${SEGMENT}$`);
const SLUG = new RegExp(`^${SEGMENT}$`);

export type OccurrenceKind = "hack" | "grant";

function withinBound(id: string): boolean {
	return id.length <= MAX_ID_LENGTH;
}

export function isSlug(value: string): boolean {
	return withinBound(value) && SLUG.test(value);
}

export function isOccurrenceId(value: string): boolean {
	return withinBound(value) && OCCURRENCE_ID.test(value);
}

export function isRegistraiId(value: string): boolean {
	return withinBound(value) && REGISTRAI_ID.test(value);
}

export function isProjectId(value: string): boolean {
	return withinBound(value) && PROJECT_ID.test(value);
}

export function isAnyId(value: string): boolean {
	return isOccurrenceId(value) || isRegistraiId(value) || isProjectId(value);
}

export function slugify(text: string): string {
	return text
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function trimSlug(slug: string, maxLength: number): string {
	return slug.slice(0, Math.max(1, maxLength)).replace(/-+$/g, "") || "x";
}

export interface IdAssignmentInput {
	readonly kind: OccurrenceKind;
	readonly scope: string;
	readonly sourceKeys: readonly string[];
	readonly existing: ReadonlyMap<string, string>;
	readonly retired: ReadonlySet<string>;
}

export function assignOccurrenceIds(input: IdAssignmentInput): Map<string, string> {
	const scope = slugify(input.scope);
	if (!scope) throw new RangeError("Scope must contain at least one letter or digit");
	const prefix = `${input.kind}:${scope}:`;
	if (prefix.length + 1 > MAX_ID_LENGTH)
		throw new RangeError("Scope is too long for an identifier");

	const assigned = new Map<string, string>();
	const taken = new Set<string>(input.retired);
	for (const [sourceKey, id] of input.existing) {
		if (!input.sourceKeys.includes(sourceKey)) taken.add(id);
	}
	const owners = new Map<string, string>();
	for (const [sourceKey, id] of input.existing) {
		if (!isOccurrenceId(id)) throw new RangeError(`Existing identifier is invalid: ${id}`);
		if (!id.startsWith(prefix)) {
			throw new RangeError(`Existing identifier ${id} does not belong to ${prefix}`);
		}
		if (input.retired.has(id)) throw new RangeError(`Existing identifier is retired: ${id}`);
		const owner = owners.get(id);
		if (owner !== undefined && owner !== sourceKey) {
			throw new RangeError(`Existing identifier ${id} is mapped to more than one source key`);
		}
		owners.set(id, sourceKey);
	}
	for (const sourceKey of input.sourceKeys) {
		const id = input.existing.get(sourceKey);
		if (id !== undefined) {
			assigned.set(sourceKey, id);
			taken.add(id);
		}
	}

	const pending = [...new Set(input.sourceKeys)]
		.filter((key) => !assigned.has(key))
		.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

	for (const sourceKey of pending) {
		const base = slugify(sourceKey) || "project";
		let attempt = 1;
		let id: string;
		do {
			const suffix = attempt === 1 ? "" : `-${attempt}`;
			id = `${prefix}${trimSlug(base, MAX_ID_LENGTH - prefix.length - suffix.length)}${suffix}`;
			attempt += 1;
		} while (taken.has(id));
		assigned.set(sourceKey, id);
		taken.add(id);
	}
	return assigned;
}
