import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();

function fail(message) {
  console.error(`check:mcp failed: ${message}`);
  process.exit(1);
}

function readRequiredFile(relativePath) {
  const absolutePath = resolve(rootDir, relativePath);

  if (!existsSync(absolutePath)) {
    fail(`Missing required file: ${relativePath}`);
  }

  return readFileSync(absolutePath, "utf8");
}

const serverSource = readRequiredFile("src/server.ts");
const toolsSource = readRequiredFile("src/tools/index.ts");

const serverChecks = [
  {
    label: "FastMCP server creation",
    pattern: /new\s+FastMCP\s*\(/
  },
  {
    label: "tool registration hookup",
    pattern: /registerTools\s*\(\s*server\s*\)/
  },
  {
    label: "server startup call",
    pattern: /server\.start\s*\(/
  }
];

for (const check of serverChecks) {
  if (!check.pattern.test(serverSource)) {
    fail(`src/server.ts is missing ${check.label}.`);
  }
}

const importedToolNames = Array.from(
  toolsSource.matchAll(/import\s+\{\s*([A-Za-z0-9_]+)\s*\}\s+from\s+"\.\/.+?\.tool\.js";/g),
  (match) => match[1]
);
const registeredToolNames = Array.from(
  toolsSource.matchAll(/server\.addTool\s*\(\s*([A-Za-z0-9_]+)\s*\)/g),
  (match) => match[1]
);

if (importedToolNames.length === 0) {
  fail("No tool imports were found in src/tools/index.ts.");
}

if (registeredToolNames.length === 0) {
  fail("No server.addTool(...) calls were found in src/tools/index.ts.");
}

const missingRegistrations = importedToolNames.filter((toolName) => !registeredToolNames.includes(toolName));

if (missingRegistrations.length > 0) {
  fail(`Imported tools are not registered: ${missingRegistrations.join(", ")}`);
}

const duplicateRegistrations = registeredToolNames.filter(
  (toolName, index) => registeredToolNames.indexOf(toolName) !== index
);

if (duplicateRegistrations.length > 0) {
  fail(`Duplicate tool registrations detected: ${Array.from(new Set(duplicateRegistrations)).join(", ")}`);
}

console.log(
  `check:mcp passed: ${registeredToolNames.length} tools registered and server wiring looks ready for build.`
);
