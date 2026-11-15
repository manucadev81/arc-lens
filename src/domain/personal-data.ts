export type PersonalDataKind = "email" | "handle" | "phone";

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/i;
const HANDLE = /(?:^|[^a-z0-9_@.])@[a-z0-9_](?:[a-z0-9_.-]{0,38}[a-z0-9_])?(?![a-z0-9_@/.-])/i;
const PHONE_CANDIDATE = /\+?\(?\d[\d\s().-]{7,}\d/g;

function hasPhone(text: string): boolean {
	for (const match of text.matchAll(PHONE_CANDIDATE)) {
		const candidate = match[0];
		if (/^\d{4}-\d{2}-\d{2}$/.test(candidate.trim())) continue;
		if ((candidate.match(/\d/g) ?? []).length >= 9) return true;
	}
	return false;
}

export function findPersonalData(text: string): PersonalDataKind[] {
	const found: PersonalDataKind[] = [];
	if (EMAIL.test(text)) found.push("email");
	if (HANDLE.test(text.replace(EMAIL, " "))) found.push("handle");
	if (hasPhone(text)) found.push("phone");
	return found;
}

export interface PersonalDataFinding {
	readonly field: string;
	readonly kinds: readonly PersonalDataKind[];
}

export function findPersonalDataInFields(
	fields: Readonly<Record<string, string | readonly string[]>>,
): PersonalDataFinding[] {
	const findings: PersonalDataFinding[] = [];
	for (const [field, value] of Object.entries(fields)) {
		const texts = typeof value === "string" ? [value] : value;
		texts.forEach((text, index) => {
			const kinds = findPersonalData(text);
			if (kinds.length > 0) {
				findings.push({ field: typeof value === "string" ? field : `${field}[${index}]`, kinds });
			}
		});
	}
	return findings;
}
