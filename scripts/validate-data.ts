import path from "node:path";
import { readDatasetFiles, readSchemas } from "../src/adapters/dataset/files.js";
import { createDatasetValidator } from "../src/adapters/dataset/validate.js";

const flag = process.argv.indexOf("--data");
const dataDirectory = path.resolve(flag >= 0 ? (process.argv[flag + 1] ?? "data") : "data");
const validate = createDatasetValidator(readSchemas(path.resolve("schemas")));
const issues = validate(readDatasetFiles(dataDirectory));

if (issues.length > 0) {
	for (const issue of issues) console.error(`${issue.file}${issue.path}: ${issue.message}`);
	process.exit(1);
}

console.log(`Dataset valid: ${dataDirectory}`);
