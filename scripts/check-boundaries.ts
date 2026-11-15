import path from "node:path";
import { analyzeProject } from "./boundaries/analyze.js";

const rootFlag = process.argv.indexOf("--root");
const root = path.resolve(rootFlag >= 0 ? (process.argv[rootFlag + 1] ?? ".") : ".");
const { files, violations } = analyzeProject(root);

if (files.length === 0) {
	console.error("No domain or port files found.");
	process.exit(1);
}

if (violations.length > 0) {
	for (const violation of violations) console.error(`${violation.file}: ${violation.reason}`);
	process.exit(1);
}

console.log(`Domain boundaries respected in ${files.length} files.`);
