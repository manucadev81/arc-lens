import { readdirSync, readFileSync, statSync } from "node:fs";
import { builtinModules } from "node:module";
import path from "node:path";
import { parseSync } from "oxc-parser";

export interface Violation {
	readonly file: string;
	readonly reason: string;
}

export const PURE_DIRECTORIES = ["src/domain", "src/ports"] as const;

export const FORBIDDEN_GLOBALS = new Set([
	"fetch",
	"XMLHttpRequest",
	"WebSocket",
	"EventSource",
	"Request",
	"Response",
	"Headers",
	"require",
	"process",
	"Deno",
	"Bun",
	"globalThis",
	"global",
	"self",
	"window",
	"eval",
	"Function",
]);

const FORBIDDEN_PACKAGES = [
	"@modelcontextprotocol/sdk",
	"@huggingface/transformers",
	"@xenova/transformers",
	"onnxruntime-node",
	"onnxruntime-web",
	"undici",
	"node-fetch",
	"cross-fetch",
	"axios",
	"got",
	"ky",
	"graceful-fs",
	"fs-extra",
];

const NODE_BUILTINS = new Set(builtinModules);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);

function isForbiddenPackage(specifier: string): boolean {
	if (specifier.startsWith("node:")) return true;
	const root = specifier.split("/")[0] ?? specifier;
	if (NODE_BUILTINS.has(root)) return true;
	return FORBIDDEN_PACKAGES.some((name) => specifier === name || specifier.startsWith(`${name}/`));
}

function leavesPureDirectories(file: string, specifier: string): boolean {
	const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
	return !PURE_DIRECTORIES.some((dir) => target === dir || target.startsWith(`${dir}/`));
}

function importViolation(file: string, specifier: string): string | null {
	if (specifier.startsWith(".")) {
		return leavesPureDirectories(file, specifier)
			? `imports "${specifier}", outside ${PURE_DIRECTORIES.join(" and ")}`
			: null;
	}
	if (specifier.startsWith("/")) return `imports absolute path "${specifier}"`;
	return isForbiddenPackage(specifier) ? `imports forbidden module "${specifier}"` : null;
}

type AstNode = { type?: string; [key: string]: unknown };

function isNode(value: unknown): value is AstNode {
	return typeof value === "object" && value !== null && "type" in value;
}

function isReference(parent: AstNode | null, key: string): boolean {
	if (!parent) return true;
	const computed = parent.computed === true;
	switch (parent.type) {
		case "MemberExpression":
			return key !== "property" || computed;
		case "Property":
		case "MethodDefinition":
		case "PropertyDefinition":
		case "TSPropertySignature":
		case "TSMethodSignature":
		case "TSEnumMember":
			return key !== "key" || computed;
		case "TSQualifiedName":
			return key !== "right";
		case "LabeledStatement":
		case "BreakStatement":
		case "ContinueStatement":
			return key !== "label";
		case "ImportSpecifier":
		case "ImportDefaultSpecifier":
		case "ImportNamespaceSpecifier":
		case "ExportSpecifier":
			return false;
		default:
			return true;
	}
}

function walk(
	node: AstNode,
	parent: AstNode | null,
	key: string,
	found: (name: string) => void,
): void {
	if (node.type === "Identifier" && typeof node.name === "string") {
		if (FORBIDDEN_GLOBALS.has(node.name) && isReference(parent, key)) found(node.name);
	}
	for (const [childKey, value] of Object.entries(node)) {
		if (Array.isArray(value)) {
			for (const item of value) if (isNode(item)) walk(item, node, childKey, found);
		} else if (isNode(value)) {
			walk(value, node, childKey, found);
		}
	}
}

export function analyzeSource(file: string, source: string): Violation[] {
	const result = parseSync(file, source);
	const violations: Violation[] = result.errors.map((error) => ({
		file,
		reason: `cannot parse: ${error.message}`,
	}));

	const specifiers: string[] = [];
	for (const item of result.module.staticImports) specifiers.push(item.moduleRequest.value);
	for (const item of result.module.staticExports) {
		for (const entry of item.entries) {
			if (entry.moduleRequest) specifiers.push(entry.moduleRequest.value);
		}
	}
	for (const item of result.module.dynamicImports) {
		const text = source.slice(item.moduleRequest.start, item.moduleRequest.end);
		const literal = /^(["'`])(.*)\1$/.exec(text);
		if (literal?.[2] !== undefined) specifiers.push(literal[2]);
		else violations.push({ file, reason: "dynamic import with a computed path" });
	}

	for (const specifier of specifiers) {
		const reason = importViolation(file, specifier);
		if (reason) violations.push({ file, reason });
	}

	const globals = new Set<string>();
	walk(result.program as unknown as AstNode, null, "", (name) => globals.add(name));
	for (const name of globals) violations.push({ file, reason: `uses the global "${name}"` });

	return violations;
}

function listFiles(root: string, relative: string): string[] {
	let entries: string[];
	try {
		entries = readdirSync(path.join(root, relative));
	} catch {
		return [];
	}
	return entries.flatMap((name) => {
		const file = path.posix.join(relative, name);
		if (statSync(path.join(root, file)).isDirectory()) return listFiles(root, file);
		return SOURCE_EXTENSIONS.has(path.extname(name)) ? [file] : [];
	});
}

export function analyzeProject(root: string): { files: string[]; violations: Violation[] } {
	const files = PURE_DIRECTORIES.flatMap((dir) => listFiles(root, dir));
	const violations = files.flatMap((file) =>
		analyzeSource(file, readFileSync(path.join(root, file), "utf8")),
	);
	return { files, violations };
}
