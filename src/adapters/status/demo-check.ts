import { lookup as dnsLookup } from "node:dns";
import https from "node:https";
import { isIP, type LookupFunction } from "node:net";
import type { DemoSignal, IsoDate, StatusConfig } from "../../domain/index.js";
import { isPublicAddress } from "./address.js";

export class BlockedTargetError extends Error {
	constructor(readonly reason: string) {
		super(`Demo check target blocked: ${reason}`);
		this.name = "BlockedTargetError";
	}
}

export interface DemoResponse {
	readonly status: number;
	readonly location: string | null;
}

export interface DemoTransport {
	request(url: URL, timeoutMs: number): Promise<DemoResponse>;
}

export function parseSafeHttpsUrl(value: string): URL | null {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return null;
	}
	if (url.protocol !== "https:" || url.username || url.password) return null;
	if (url.port && url.port !== "443") return null;
	if (isIP(url.hostname.replace(/^\[(.*)\]$/, "$1")) !== 0) return null;
	return url;
}

export async function checkDemo(
	link: string | null,
	transport: DemoTransport,
	config: Pick<StatusConfig, "demoTimeoutSeconds" | "maxRedirects">,
	today: IsoDate,
	now: () => number = Date.now,
): Promise<DemoSignal> {
	if (!link) return { result: "no_demo_link", at: today };
	let url = parseSafeHttpsUrl(link);
	if (!url) return { result: "unreadable", at: today };
	const deadline = now() + config.demoTimeoutSeconds * 1000;
	for (let hop = 0; hop <= config.maxRedirects; hop++) {
		const remaining = deadline - now();
		if (remaining <= 0) return { result: "fails", at: today };
		let response: DemoResponse;
		try {
			response = await transport.request(url, remaining);
		} catch (error) {
			return { result: error instanceof BlockedTargetError ? "unreadable" : "fails", at: today };
		}
		if (response.status >= 200 && response.status < 300) return { result: "responds", at: today };
		if (response.status >= 300 && response.status < 400 && response.location) {
			let next: URL;
			try {
				next = new URL(response.location, url);
			} catch {
				return { result: "fails", at: today };
			}
			const safe = parseSafeHttpsUrl(next.toString());
			if (!safe) return { result: "unreadable", at: today };
			url = safe;
			continue;
		}
		return { result: "fails", at: today };
	}
	return { result: "fails", at: today };
}

export const publicOnlyLookup: LookupFunction = (hostname, options, callback) => {
	dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
		if (error) {
			callback(error, "", 0);
			return;
		}
		const list = Array.isArray(addresses) ? addresses : [];
		const blocked = list.find((entry) => !isPublicAddress(entry.address));
		if (list.length === 0 || blocked) {
			callback(new BlockedTargetError(`non-public address for ${hostname}`), "", 0);
			return;
		}
		if (options.all) {
			(callback as unknown as (e: null, a: typeof list) => void)(null, list);
			return;
		}
		const first = list[0];
		callback(null, first?.address ?? "", first?.family ?? 4);
	});
};

export function createHttpsDemoTransport(lookup: LookupFunction = publicOnlyLookup): DemoTransport {
	return {
		request: (url, timeoutMs) =>
			new Promise<DemoResponse>((resolve, reject) => {
				const host = url.hostname.replace(/^\[(.*)\]$/, "$1");
				if (isIP(host) !== 0 && !isPublicAddress(host)) {
					reject(new BlockedTargetError(`non-public address ${host}`));
					return;
				}
				let settled = false;
				const finish = (action: () => void) => {
					if (settled) return;
					settled = true;
					clearTimeout(timer);
					action();
				};
				const request = https.request(
					url,
					{
						method: "GET",
						lookup,
						timeout: timeoutMs,
						headers: { "user-agent": "arc-lens-status-check", accept: "text/html,*/*" },
					},
					(response) => {
						const location = response.headers.location;
						finish(() =>
							resolve({
								status: response.statusCode ?? 0,
								location: typeof location === "string" ? location : null,
							}),
						);
						response.destroy();
						request.destroy();
					},
				);
				const timer = setTimeout(
					() => {
						request.destroy(new Error("Demo check deadline reached"));
					},
					Math.max(0, timeoutMs),
				);
				request.on("timeout", () => request.destroy(new Error("Demo check timed out")));
				request.on("error", (error) => {
					const cause = (error as { cause?: unknown }).cause;
					finish(() => reject(cause instanceof BlockedTargetError ? cause : error));
				});
				request.end();
			}),
	};
}
