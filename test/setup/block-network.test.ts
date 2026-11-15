import { once } from "node:events";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import { describe, expect, it } from "vitest";
import { isLoopbackHost, NetworkBlockedError } from "./block-network.js";

function errorOf(emitter: NodeJS.EventEmitter): Promise<Error> {
	return once(emitter, "error").then(([error]) => error as Error);
}

describe("network block for unit tests", () => {
	it("rejects fetch", async () => {
		await expect(fetch("https://builder.registrai.cc/api/v1")).rejects.toBeInstanceOf(
			NetworkBlockedError,
		);
	});

	it.each([
		["net.connect with options", () => net.connect({ host: "203.0.113.10", port: 80 })],
		["net.connect with port and host", () => net.connect(443, "example.com")],
		["new Socket().connect", () => new net.Socket().connect({ host: "198.51.100.7", port: 22 })],
		[
			"tls.connect",
			() => tls.connect({ host: "example.com", port: 443, servername: "example.com" }),
		],
	])("blocks %s to a remote host", async (_name, open) => {
		const error = await errorOf(open());
		expect(error).toBeInstanceOf(NetworkBlockedError);
	});

	it.each([
		["http.get", () => http.get("http://203.0.113.10/")],
		["https.get", () => https.get("https://example.com/")],
	])("blocks %s to a remote host", async (_name, open) => {
		const error = await errorOf(open());
		expect(error).toBeInstanceOf(NetworkBlockedError);
		expect((error as NetworkBlockedError).target).toMatch(/203\.0\.113\.10|example\.com/);
	});

	it("still allows loopback connections", async () => {
		const server = http.createServer((_request, response) => response.end("ok"));
		server.listen(0, "127.0.0.1");
		await once(server, "listening");
		const { port } = server.address() as net.AddressInfo;
		try {
			for (const host of ["127.0.0.1", "localhost"]) {
				const response = await new Promise<http.IncomingMessage>((resolve, reject) =>
					http.get({ host, port, path: "/", family: 4 }, resolve).on("error", reject),
				);
				const body = await new Promise<string>((resolve) => {
					let text = "";
					response.on("data", (chunk) => {
						text += chunk;
					});
					response.on("end", () => resolve(text));
				});
				expect(body).toBe("ok");
			}
		} finally {
			server.close();
		}
	});

	it.each([
		["127.0.0.1", true],
		["127.10.0.5", true],
		["localhost", true],
		["::1", true],
		["[::1]", true],
		["::ffff:127.0.0.1", true],
		["10.0.0.1", false],
		["169.254.169.254", false],
		["192.168.0.10", false],
		["example.com", false],
		["127.0.0.1.example.com", false],
		["::ffff:10.0.0.1", false],
	])("treats %s as loopback: %s", (host, expected) => {
		expect(isLoopbackHost(host)).toBe(expected);
	});
});
