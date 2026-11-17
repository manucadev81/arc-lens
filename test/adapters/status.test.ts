import { once } from "node:events";
import net, { type LookupFunction } from "node:net";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readDatasetFiles, readSchemas } from "../../src/adapters/dataset/files.js";
import { createDatasetValidator } from "../../src/adapters/dataset/validate.js";
import { isPublicAddress } from "../../src/adapters/status/address.js";
import { refreshRecordStatus } from "../../src/adapters/status/collect.js";
import {
	loadStatusConfig,
	parseStatusConfig,
	StatusConfigError,
} from "../../src/adapters/status/config.js";
import {
	BlockedTargetError,
	checkDemo,
	createHttpsDemoTransport,
	type DemoResponse,
	type DemoTransport,
	parseSafeHttpsUrl,
} from "../../src/adapters/status/demo-check.js";
import {
	checkRepository,
	type GitHubClient,
	parseGitHubRepository,
} from "../../src/adapters/status/repository-check.js";

const root = path.resolve(import.meta.dirname, "../..");
const TODAY = "2026-11-16";
const CONFIG = loadStatusConfig(path.join(root, "config/status.json"));

function transport(responses: (DemoResponse | Error)[]): DemoTransport & { urls: string[] } {
	const urls: string[] = [];
	return {
		urls,
		request: async (url) => {
			urls.push(url.toString());
			const next = responses.shift();
			if (!next) throw new Error("no more responses");
			if (next instanceof Error) throw next;
			return next;
		},
	};
}

describe("status configuration", () => {
	it("loads the versioned provisional windows", () => {
		expect(CONFIG).toEqual({
			version: 1,
			liveCommitWithinDays: 180,
			notLiveCommitOlderThanDays: 365,
			demoTimeoutSeconds: 10,
			maxRedirects: 5,
		});
	});

	it.each([
		[{ ...CONFIG, liveCommitWithinDays: 0 }],
		[{ ...CONFIG, liveCommitWithinDays: 1.5 }],
		[{ ...CONFIG, notLiveCommitOlderThanDays: 180 }],
		[{ ...CONFIG, extra: 1 }],
		[[]],
	])("rejects %j", (value) => {
		expect(() => parseStatusConfig(value)).toThrow(StatusConfigError);
	});
});

describe("public address filter", () => {
	it.each([
		["8.8.8.8", true],
		["2606:4700:4700::1111", true],
		["127.0.0.1", false],
		["10.1.2.3", false],
		["172.16.0.1", false],
		["172.31.255.255", false],
		["172.32.0.1", true],
		["192.168.1.1", false],
		["169.254.169.254", false],
		["100.64.0.1", false],
		["0.0.0.0", false],
		["224.0.0.1", false],
		["::1", false],
		["::", false],
		["fd00:ec2::254", false],
		["fe80::1", false],
		["::ffff:127.0.0.1", false],
		["::ffff:8.8.8.8", true],
		["not-an-ip", false],
	])("%s is public: %s", (ip, expected) => {
		expect(isPublicAddress(ip)).toBe(expected);
	});
});

describe("demo check", () => {
	it("no link and unsafe links are reported distinctly", async () => {
		const unused = transport([]);
		expect(await checkDemo(null, unused, CONFIG, TODAY)).toEqual({
			result: "no_demo_link",
			at: TODAY,
		});
		for (const link of [
			"http://example.com",
			"https://user:pass@example.com",
			"https://example.com:8443",
			"javascript:alert(1)",
		]) {
			expect(await checkDemo(link, unused, CONFIG, TODAY)).toEqual({
				result: "unreadable",
				at: TODAY,
			});
		}
		expect(unused.urls).toEqual([]);
	});

	it("responds on 2xx, directly or after redirects to a final 2xx", async () => {
		expect(
			(
				await checkDemo(
					"https://example.com",
					transport([{ status: 200, location: null }]),
					CONFIG,
					TODAY,
				)
			).result,
		).toBe("responds");
		const redirects = transport([
			{ status: 301, location: "/app" },
			{ status: 302, location: "https://app.example.com/start" },
			{ status: 204, location: null },
		]);
		expect((await checkDemo("https://example.com", redirects, CONFIG, TODAY)).result).toBe(
			"responds",
		);
		expect(redirects.urls).toEqual([
			"https://example.com/",
			"https://example.com/app",
			"https://app.example.com/start",
		]);
	});

	it("does not follow a redirect to http or to a blocked target", async () => {
		expect(
			(
				await checkDemo(
					"https://example.com",
					transport([{ status: 301, location: "http://example.com" }]),
					CONFIG,
					TODAY,
				)
			).result,
		).toBe("unreadable");
		expect(
			(
				await checkDemo(
					"https://example.com",
					transport([new BlockedTargetError("private")]),
					CONFIG,
					TODAY,
				)
			).result,
		).toBe("unreadable");
	});

	it("fails on errors, too many redirects and the deadline", async () => {
		expect(
			(
				await checkDemo(
					"https://example.com",
					transport([{ status: 404, location: null }]),
					CONFIG,
					TODAY,
				)
			).result,
		).toBe("fails");
		expect(
			(await checkDemo("https://example.com", transport([new Error("ECONNRESET")]), CONFIG, TODAY))
				.result,
		).toBe("fails");
		const loop = transport(Array.from({ length: 10 }, () => ({ status: 302, location: "/again" })));
		expect((await checkDemo("https://example.com", loop, CONFIG, TODAY)).result).toBe("fails");
		expect(loop.urls).toHaveLength(CONFIG.maxRedirects + 1);
		let clock = 0;
		const slow: DemoTransport = {
			request: async () => {
				clock += 6000;
				return { status: 302, location: "/next" };
			},
		};
		expect((await checkDemo("https://example.com", slow, CONFIG, TODAY, () => clock)).result).toBe(
			"fails",
		);
	});

	it("a 2xx that arrives after the overall deadline fails", async () => {
		let clock = 0;
		const late: DemoTransport = {
			request: async () => {
				clock += 11_000;
				return { status: 200, location: null };
			},
		};
		expect((await checkDemo("https://example.com", late, CONFIG, TODAY, () => clock)).result).toBe(
			"fails",
		);
	});

	it("the real transport refuses a host that resolves to loopback before connecting", async () => {
		expect(
			await checkDemo("https://localhost/", createHttpsDemoTransport(), CONFIG, TODAY),
		).toEqual({
			result: "unreadable",
			at: TODAY,
		});
	});
});

describe("repository check", () => {
	function client(
		map: Record<string, { status: number; body: unknown } | Error>,
	): GitHubClient & { paths: string[] } {
		const paths: string[] = [];
		return {
			paths,
			get: async (p) => {
				paths.push(p);
				const value = map[p];
				if (!value) return { status: 500, body: null };
				if (value instanceof Error) throw value;
				return value;
			},
		};
	}

	it.each([
		["https://github.com/Org/Repo.git", { owner: "Org", repository: "Repo" }],
		["https://github.com/org/repo", { owner: "org", repository: "repo" }],
		["https://github.com/org/repo/", { owner: "org", repository: "repo" }],
		["https://www.github.com/org/repo", null],
		["https://github.com/org/repo/tree/main", null],
		["https://github.com/org/repo?tab=readme", null],
		["https://github.com/org/repo#readme", null],
		["https://gitlab.com/org/repo", null],
		["http://github.com/org/repo", null],
		["https://user@github.com/org/repo", null],
		["https://github.com/org", null],
		["https://github.com/org/..", null],
	])("accepts only https://github.com/<owner>/<repo>: %s", (link, expected) => {
		expect(parseGitHubRepository(link)).toEqual(expected);
	});

	it("reports missing link, unsupported host, not found, archived and last commit", async () => {
		const github = client({
			"/repos/org/gone": { status: 404, body: null },
			"/repos/org/old": { status: 200, body: { archived: true } },
			"/repos/org/app": { status: 200, body: { archived: false } },
			"/repos/org/app/commits?per_page=1": {
				status: 200,
				body: [{ commit: { committer: { date: "2026-11-02T10:00:00Z" } } }],
			},
		});
		expect((await checkRepository(null, github, TODAY)).result).toEqual({
			kind: "no_repository_link",
		});
		expect((await checkRepository("https://gitlab.com/org/app", github, TODAY)).result).toEqual({
			kind: "unreadable",
		});
		expect((await checkRepository("https://github.com/org/gone", github, TODAY)).result).toEqual({
			kind: "not_found",
		});
		expect((await checkRepository("https://github.com/org/old", github, TODAY)).result).toEqual({
			kind: "archived",
		});
		expect(await checkRepository("https://github.com/org/app", github, TODAY)).toEqual({
			result: { kind: "last_commit", date: "2026-11-02" },
			at: TODAY,
		});
	});

	it("treats an invalid commit date or a non-boolean archived flag as unreadable", async () => {
		const github = client({
			"/repos/org/baddate": { status: 200, body: { archived: false } },
			"/repos/org/baddate/commits?per_page=1": {
				status: 200,
				body: [{ commit: { committer: { date: "2026-02-30T10:00:00Z" } } }],
			},
			"/repos/org/noflag": { status: 200, body: { name: "noflag" } },
			"/repos/org/textflag": { status: 200, body: { archived: "true" } },
		});
		for (const name of ["baddate", "noflag", "textflag"]) {
			expect(
				(await checkRepository(`https://github.com/org/${name}`, github, TODAY)).result,
			).toEqual({ kind: "unreadable" });
		}
	});

	it("reports rate limits, errors and malformed answers as unreadable, not as not found", async () => {
		const github = client({
			"/repos/org/limited": { status: 403, body: { message: "rate limit" } },
			"/repos/org/down": new Error("network"),
			"/repos/org/odd": { status: 200, body: { archived: false } },
			"/repos/org/odd/commits?per_page=1": { status: 200, body: [{}] },
			"/repos/org/empty": { status: 200, body: { archived: false } },
			"/repos/org/empty/commits?per_page=1": { status: 409, body: null },
		});
		for (const name of ["limited", "down", "odd", "empty"]) {
			expect(
				(await checkRepository(`https://github.com/org/${name}`, github, TODAY)).result,
			).toEqual({ kind: "unreadable" });
		}
	});
});

describe("refresh record status", () => {
	it("writes a schema-valid status with evidence and dates", async () => {
		const valid = path.join(root, "test/fixtures/dataset/valid");
		const files = structuredClone(readDatasetFiles(valid));
		const file = files.recordFiles.find((f) => f.fileName === "sample-showcase.json") as
			| { fileName: string; content: { records: unknown[] } }
			| undefined;
		const record = file?.content.records[0] as Parameters<typeof refreshRecordStatus>[0];
		const refreshed = await refreshRecordStatus(
			record,
			{
				demo: transport([{ status: 200, location: null }]),
				github: {
					get: async (p) =>
						p.endsWith("commits?per_page=1")
							? { status: 200, body: [{ commit: { committer: { date: "2026-11-10T00:00:00Z" } } }] }
							: { status: 200, body: { archived: false } },
				},
				config: CONFIG,
			},
			TODAY,
		);
		expect(refreshed.status).toEqual({
			value: "live",
			checkedAt: TODAY,
			evidence: [
				{ signal: "demo", result: "demo responds", at: TODAY },
				{ signal: "repository", result: "last commit 2026-11-10", at: TODAY },
			],
		});
		if (file) file.content.records[0] = refreshed;
		const validate = createDatasetValidator(readSchemas(path.join(root, "schemas")));
		expect(validate(files)).toEqual([]);
	});
});

describe("SSRF through IP literals", () => {
	it.each([
		"https://127.0.0.1/",
		"https://2130706433/",
		"https://0x7f.1/",
		"https://[::1]/",
		"https://10.0.0.1/",
		"https://169.254.169.254/latest/meta-data/",
		"https://8.8.8.8/",
		"https://[2606:4700:4700::1111]/",
	])("rejects the IP literal %s before any request", async (link) => {
		expect(parseSafeHttpsUrl(link)).toBeNull();
		const unused: DemoTransport = {
			request: async () => {
				throw new Error("must not be called");
			},
		};
		expect(await checkDemo(link, unused, CONFIG, TODAY)).toEqual({
			result: "unreadable",
			at: TODAY,
		});
	});

	it("rejects a redirect to an IP literal", async () => {
		const redirect = transport([{ status: 302, location: "https://169.254.169.254/latest/" }]);
		expect((await checkDemo("https://example.com/", redirect, CONFIG, TODAY)).result).toBe(
			"unreadable",
		);
		expect(redirect.urls).toEqual(["https://example.com/"]);
	});

	it("the real transport never opens a connection to a private IP literal", async () => {
		let connections = 0;
		const spy = net.createServer((socket) => {
			connections += 1;
			socket.destroy();
		});
		spy.listen(0, "127.0.0.1");
		await once(spy, "listening");
		const { port } = spy.address() as net.AddressInfo;
		try {
			await expect(
				createHttpsDemoTransport().request(new URL(`https://127.0.0.1:${port}/`), 1000),
			).rejects.toBeInstanceOf(BlockedTargetError);
			expect(
				await checkDemo("https://127.0.0.1/", createHttpsDemoTransport(), CONFIG, TODAY),
			).toEqual({
				result: "unreadable",
				at: TODAY,
			});
			expect(connections).toBe(0);
		} finally {
			spy.close();
		}
	});
});

describe("total deadline", () => {
	it("aborts a server that keeps the connection alive by sending bytes slowly", async () => {
		const sockets: net.Socket[] = [];
		const slow = net.createServer((socket) => {
			sockets.push(socket);
			socket.write(Buffer.from([0x16, 0x03, 0x01, 0x40, 0x00]));
			const drip = setInterval(() => {
				if (!socket.destroyed) socket.write(Buffer.from([0x00]));
			}, 50);
			socket.on("close", () => clearInterval(drip));
			socket.on("error", () => clearInterval(drip));
		});
		slow.listen(0, "127.0.0.1");
		await once(slow, "listening");
		const { port } = slow.address() as net.AddressInfo;
		const loopbackLookup: LookupFunction = (_host, options, callback) => {
			if (options.all) {
				(callback as unknown as (e: null, a: { address: string; family: number }[]) => void)(null, [
					{ address: "127.0.0.1", family: 4 },
				]);
				return;
			}
			callback(null, "127.0.0.1", 4);
		};
		const started = Date.now();
		try {
			await expect(
				createHttpsDemoTransport(loopbackLookup).request(
					new URL(`https://localhost:${port}/`),
					300,
				),
			).rejects.toThrow("Demo check deadline reached");
			expect(Date.now() - started).toBeLessThan(1500);
		} finally {
			for (const socket of sockets) socket.destroy();
			slow.close();
		}
	});
});

describe("IPv6 addresses that embed IPv4", () => {
	it.each([
		["::127.0.0.1", false],
		["::a00:1", false],
		["64:ff9b::7f00:1", false],
		["64:ff9b::a9fe:a9fe", false],
		["2002:7f00:1::", false],
		["2002:a00:1::1", false],
		["64:ff9b::808:808", true],
		["2002:808:808::1", true],
	])("%s is public: %s", (ip, expected) => {
		expect(isPublicAddress(ip)).toBe(expected);
	});
});
