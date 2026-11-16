import { isIP } from "node:net";

function ipv4ToNumber(ip: string): number {
	return ip.split(".").reduce((total, part) => total * 256 + Number(part), 0);
}

const BLOCKED_V4: readonly [string, number][] = [
	["0.0.0.0", 8],
	["10.0.0.0", 8],
	["100.64.0.0", 10],
	["127.0.0.0", 8],
	["169.254.0.0", 16],
	["172.16.0.0", 12],
	["192.0.0.0", 24],
	["192.0.2.0", 24],
	["192.168.0.0", 16],
	["198.18.0.0", 15],
	["198.51.100.0", 24],
	["203.0.113.0", 24],
	["224.0.0.0", 4],
	["240.0.0.0", 4],
];

function isPublicIpv4(ip: string): boolean {
	const value = ipv4ToNumber(ip);
	return !BLOCKED_V4.some(([base, bits]) => {
		const size = 2 ** (32 - bits);
		const start = ipv4ToNumber(base);
		return value >= start && value < start + size;
	});
}

function expandIpv6(ip: string): number[] | null {
	const [head = "", tail] = ip.toLowerCase().split("::");
	const parse = (part: string) => (part ? part.split(":") : []);
	let left = parse(head);
	let right = tail === undefined ? [] : parse(tail);
	const last = (right.length > 0 ? right : left).at(-1);
	const embedded: number[] = [];
	if (last?.includes(".")) {
		if (isIP(last) !== 4) return null;
		const value = ipv4ToNumber(last);
		embedded.push(Math.floor(value / 65536), value % 65536);
		if (right.length > 0) right = right.slice(0, -1);
		else left = left.slice(0, -1);
	}
	const groups = [...left, ...right].map((group) => Number.parseInt(group, 16));
	const missing = 8 - groups.length - embedded.length;
	if (tail === undefined && missing !== 0) return null;
	const full = [
		...left.map((g) => Number.parseInt(g, 16)),
		...Array.from({ length: Math.max(0, missing) }, () => 0),
		...right.map((g) => Number.parseInt(g, 16)),
		...embedded,
	];
	return full.length === 8 && full.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff)
		? full
		: null;
}

function isPublicIpv6(ip: string): boolean {
	const groups = expandIpv6(ip);
	if (!groups) return false;
	const [first = 0] = groups;
	if (groups.every((g) => g === 0)) return false;
	if (groups.slice(0, 7).every((g) => g === 0) && groups[7] === 1) return false;
	if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) {
		return isPublicIpv4(
			`${(groups[6] ?? 0) >> 8}.${(groups[6] ?? 0) & 255}.${(groups[7] ?? 0) >> 8}.${(groups[7] ?? 0) & 255}`,
		);
	}
	const embedded = (high: number, low: number) =>
		`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
	if (groups.slice(0, 6).every((g) => g === 0)) {
		return isPublicIpv4(embedded(groups[6] ?? 0, groups[7] ?? 0));
	}
	if (first === 0x0064 && groups[1] === 0xff9b && groups.slice(2, 6).every((g) => g === 0)) {
		return isPublicIpv4(embedded(groups[6] ?? 0, groups[7] ?? 0));
	}
	if (first === 0x2002) return isPublicIpv4(embedded(groups[1] ?? 0, groups[2] ?? 0));
	if ((first & 0xfe00) === 0xfc00) return false;
	if ((first & 0xffc0) === 0xfe80) return false;
	if ((first & 0xff00) === 0xff00) return false;
	if (first === 0x2001 && groups[1] === 0x0db8) return false;
	return true;
}

export function isPublicAddress(ip: string): boolean {
	const version = isIP(ip);
	if (version === 4) return isPublicIpv4(ip);
	if (version === 6) return isPublicIpv6(ip);
	return false;
}
