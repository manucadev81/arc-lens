export class NetworkBlockedError extends Error {
	constructor() {
		super("Network access is blocked in unit tests");
		this.name = "NetworkBlockedError";
	}
}

globalThis.fetch = (() => Promise.reject(new NetworkBlockedError())) as typeof fetch;
