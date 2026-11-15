import { isIP, Socket } from "node:net";

export class NetworkBlockedError extends Error {
	constructor(readonly target: string) {
		super(`Network access is blocked in unit tests: ${target}`);
		this.name = "NetworkBlockedError";
	}
}

const LOOPBACK_NAMES = new Set(["localhost", "localhost.", "ip6-localhost", "ip6-loopback"]);

export function isLoopbackHost(host: string): boolean {
	const normalized = host.toLowerCase().replace(/^\[(.*)\]$/, "$1");
	if (LOOPBACK_NAMES.has(normalized)) return true;
	if (isIP(normalized) === 4) return normalized.split(".")[0] === "127";
	if (isIP(normalized) === 6) {
		if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;
		const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(normalized);
		return mapped?.[1] !== undefined && mapped[1].split(".")[0] === "127";
	}
	return false;
}

type ConnectTarget = { readonly ipc: true } | { readonly ipc: false; readonly host: string };

function targetOf(args: readonly unknown[]): ConnectTarget {
	const [first, second] = args;
	if (Array.isArray(first)) return targetOf(first);
	if (typeof first === "string" && !/^\d+$/.test(first)) return { ipc: true };
	if (typeof first === "object" && first !== null) {
		const options = first as { path?: unknown; host?: unknown };
		if (typeof options.path === "string") return { ipc: true };
		return { ipc: false, host: typeof options.host === "string" ? options.host : "localhost" };
	}
	return { ipc: false, host: typeof second === "string" ? second : "localhost" };
}

const originalConnect = Socket.prototype.connect;

Socket.prototype.connect = function connect(this: Socket, ...args: unknown[]) {
	const target = targetOf(args);
	if (target.ipc || isLoopbackHost(target.host)) {
		return (originalConnect as (...a: unknown[]) => Socket).apply(this, args);
	}
	process.nextTick(() => this.destroy(new NetworkBlockedError(target.host)));
	return this;
} as typeof Socket.prototype.connect;

globalThis.fetch = ((input: unknown) =>
	Promise.reject(new NetworkBlockedError(String(input)))) as typeof fetch;
