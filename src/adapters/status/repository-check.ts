import type { IsoDate, RepositorySignal } from "../../domain/index.js";

export interface GitHubResponse {
	readonly status: number;
	readonly body: unknown;
}

export interface GitHubClient {
	get(path: string): Promise<GitHubResponse>;
}

const SEGMENT = /^[A-Za-z0-9_.-]{1,100}$/;

export function parseGitHubRepository(link: string): { owner: string; repository: string } | null {
	let url: URL;
	try {
		url = new URL(link);
	} catch {
		return null;
	}
	const host = url.hostname.toLowerCase().replace(/^www\./, "");
	if (url.protocol !== "https:" || host !== "github.com" || url.username || url.password)
		return null;
	const [owner, raw] = url.pathname.split("/").filter((part) => part.length > 0);
	const repository = raw?.replace(/\.git$/, "");
	if (!owner || !repository || !SEGMENT.test(owner) || !SEGMENT.test(repository)) return null;
	if (repository === "." || repository === "..") return null;
	return { owner, repository };
}

function isoDate(value: unknown): IsoDate | null {
	return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) ? value.slice(0, 10) : null;
}

export async function checkRepository(
	link: string | null,
	client: GitHubClient,
	today: IsoDate,
): Promise<RepositorySignal> {
	if (!link) return { result: { kind: "no_repository_link" }, at: today };
	const parsed = parseGitHubRepository(link);
	if (!parsed) return { result: { kind: "unreadable" }, at: today };
	const base = `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repository)}`;
	try {
		const repository = await client.get(base);
		if (repository.status === 404) return { result: { kind: "not_found" }, at: today };
		if (
			repository.status !== 200 ||
			typeof repository.body !== "object" ||
			repository.body === null
		) {
			return { result: { kind: "unreadable" }, at: today };
		}
		if ((repository.body as { archived?: unknown }).archived === true) {
			return { result: { kind: "archived" }, at: today };
		}
		const commits = await client.get(`${base}/commits?per_page=1`);
		if (commits.status !== 200 || !Array.isArray(commits.body)) {
			return { result: { kind: "unreadable" }, at: today };
		}
		const first = commits.body[0] as { commit?: { committer?: { date?: unknown } } } | undefined;
		const date = isoDate(first?.commit?.committer?.date);
		return date
			? { result: { kind: "last_commit", date }, at: today }
			: { result: { kind: "unreadable" }, at: today };
	} catch {
		return { result: { kind: "unreadable" }, at: today };
	}
}

export function createGitHubClient(
	options: { readonly token?: string; readonly timeoutMs?: number } = {},
): GitHubClient {
	return {
		get: async (path) => {
			const response = await fetch(`https://api.github.com${path}`, {
				headers: {
					accept: "application/vnd.github+json",
					"user-agent": "arc-lens-status-check",
					...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
				},
				redirect: "error",
				signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
			});
			const text = await response.text();
			let body: unknown = null;
			try {
				body = text ? JSON.parse(text) : null;
			} catch {
				body = null;
			}
			return { status: response.status, body };
		},
	};
}
