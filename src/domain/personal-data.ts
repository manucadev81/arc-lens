export type PersonalDataKind =
	| "email"
	| "handle"
	| "phone"
	| "profile_link"
	| "discord_tag"
	| "person_name";

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;
const OBFUSCATED_EMAIL =
	/[a-z0-9._%+-]+\s*[[({<]?\s*(?:at|arroba)\s*[\])}>]?\s*[a-z0-9-]+(?:\s*[[({<]?\s*(?:dot|ponto)\s*[\])}>]?\s*[a-z0-9-]+)+/i;
const OBFUSCATION_MARKER =
	/[[({<]\s*(?:at|arroba|dot|ponto)\s*[\])}>]|\s(?:at|arroba)\s.*\s(?:dot|ponto)\s/i;
const HANDLE = /(?:^|[^a-z0-9_@.])@[a-z0-9_](?:[a-z0-9_.-]{0,38}[a-z0-9_])?(?![a-z0-9_@/.-])/i;
const DISCORD_TAG = /(?:^|[^a-z0-9_#])[a-z0-9_.]{2,32}#\d{4}(?![0-9a-z])/i;
const PROFILE_HOST =
	/^(?:www\.|m\.|mobile\.)?(?:x\.com|twitter\.com|t\.me|telegram\.me|telegram\.dog|discord\.gg|discord\.com|discordapp\.com|instagram\.com|facebook\.com|fb\.com|tiktok\.com|threads\.net|linkedin\.com|wa\.me|bsky\.app|warpcast\.com)$/i;
const PROFILE_LINK_IN_TEXT =
	/(?:^|[^a-z0-9.-])(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com|t\.me|telegram\.me|discord\.gg|discord\.com\/users|instagram\.com|facebook\.com|tiktok\.com|threads\.net|linkedin\.com\/in|wa\.me|bsky\.app\/profile|warpcast\.com)\/[a-z0-9_.@-]+/i;
const PERSON_NAME =
	/\b(?:[Bb]uilt|[Mm]ade|[Cc]reated|[Dd]eveloped|[Dd]esigned|[Ff]ounded|[Ll]ed|[Mm]aintained|[Cc]oded)\s+by\s+(?!The\b|A\b|An\b|Our\b|Team\b)[A-Z][\p{Ll}'-]+(?:\s+[A-Z][\p{Ll}'-]+)+/u;
const TEAM_LIST =
	/\b(?:[Tt]eam|[Mm]embers?|[Ff]ounders?|[Aa]uthors?|[Cc]reators?|[Cc]ontributors?)\s*[:-]\s*[A-Z][\p{Ll}'-]+/u;
const PHONE_CANDIDATE = /(?<![\w.+-])(\+?\(?\d[\d\s().-]{6,}\d)(?![\w.-]*\w)/g;

function isYearSequence(groups: readonly string[]): boolean {
	return groups.length > 1 && groups.every((group) => /^(?:19|20)\d{2}$/.test(group));
}

function looksLikePhone(candidate: string): boolean {
	const text = candidate.trim();
	const digits = text.replace(/\D/g, "");
	if (digits.length < 8 || digits.length > 15) return false;
	const groups = text.split(/[\s().-]+/).filter((group) => group.length > 0);
	const hasPlus = text.startsWith("+");
	if (groups.length < 2 && !hasPlus) return false;
	if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
	if (isYearSequence(groups.map((group) => group.replace(/^\+/, "")))) return false;
	const separators = text.replace(/[\d+]/g, "");
	if (/^\.+$/.test(separators) && groups.some((group) => group.length < 3)) return false;
	return (groups.at(-1) ?? "").length >= 4 || hasPlus;
}

function hasPhone(text: string): boolean {
	for (const match of text.matchAll(PHONE_CANDIDATE)) {
		if (looksLikePhone(match[1] ?? "")) return true;
	}
	return false;
}

export function normalizeForScan(text: string): string {
	return text.normalize("NFKC").replace(/[​-‍⁠﻿]/g, "");
}

export function findPersonalData(input: string): PersonalDataKind[] {
	const text = normalizeForScan(input);
	const found: PersonalDataKind[] = [];
	const withoutEmails = text.replace(EMAIL, " ");
	if (EMAIL.test(text) || (OBFUSCATION_MARKER.test(text) && OBFUSCATED_EMAIL.test(text))) {
		found.push("email");
	}
	EMAIL.lastIndex = 0;
	const withoutLinks = withoutEmails.replace(/\bhttps?:\/\/\S+/gi, " ");
	if (HANDLE.test(withoutLinks)) found.push("handle");
	if (hasPhone(withoutLinks.replace(/\b0x[0-9a-f]+\b/gi, " "))) found.push("phone");
	if (PROFILE_LINK_IN_TEXT.test(text)) found.push("profile_link");
	if (DISCORD_TAG.test(withoutLinks)) found.push("discord_tag");
	if (PERSON_NAME.test(text) || TEAM_LIST.test(text)) found.push("person_name");
	return found;
}

export function isPersonalProfileUrl(url: string): boolean {
	const match = /^[a-z][a-z0-9+.-]*:\/\/(?:[^/?#@]*@)?([^/?#:]+)/i.exec(
		normalizeForScan(url).trim(),
	);
	const host = match?.[1]?.toLowerCase().replace(/\.$/, "");
	return host !== undefined && PROFILE_HOST.test(host);
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

export interface TextScanPolicy {
	readonly skip: (path: readonly (string | number)[]) => boolean;
	readonly isUrl: (path: readonly (string | number)[]) => boolean;
}

export function findPersonalDataInValue(
	value: unknown,
	policy: TextScanPolicy,
): PersonalDataFinding[] {
	const findings: PersonalDataFinding[] = [];
	const visit = (current: unknown, path: (string | number)[]) => {
		if (typeof current === "string") {
			if (policy.skip(path)) return;
			const kinds: PersonalDataKind[] = policy.isUrl(path)
				? isPersonalProfileUrl(current)
					? ["profile_link"]
					: []
				: findPersonalData(current);
			if (kinds.length > 0) findings.push({ field: path.join("/"), kinds });
			return;
		}
		if (Array.isArray(current)) {
			for (const [index, item] of current.entries()) visit(item, [...path, index]);
			return;
		}
		if (current !== null && typeof current === "object") {
			for (const [key, item] of Object.entries(current)) visit(item, [...path, key]);
		}
	};
	visit(value, []);
	return findings;
}
