import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// src/config.ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
var DEFAULT_SERVICE_URL = "https://context-graph-geoff-yuens-projects.vercel.app";
var CONFIG_DIR = path.join(os.homedir(), ".config", "context-graph");
var CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
var CREDENTIALS_FILE = path.join(CONFIG_DIR, "credentials.json");
var PROJECT_CONFIG = path.join(".context-graph", "config.local.json");
function readJson(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
function findProjectConfig(start = process.cwd()) {
  let dir = path.resolve(start);
  for (; ; ) {
    const candidate = readJson(path.join(dir, PROJECT_CONFIG));
    if (candidate) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
function normalizeServiceUrl(value) {
  const url = new URL(value.trim());
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error("Use an http(s) URL without credentials, query, or fragment.");
  return url.href.replace(/\/$/, "");
}
function getConfig(env = process.env) {
  const project = findProjectConfig();
  const global = readJson(CONFIG_FILE) ?? {};
  const credentials = readJson(CREDENTIALS_FILE) ?? {};
  const fromEnv = env.CONTEXT_GRAPH_URL;
  const serviceUrl = fromEnv ?? (typeof project?.serviceUrl === "string" ? project.serviceUrl : typeof global.serviceUrl === "string" ? global.serviceUrl : DEFAULT_SERVICE_URL);
  const token = env.CONTEXT_GRAPH_TOKEN ?? (typeof credentials.token === "string" ? credentials.token : null);
  return { serviceUrl: normalizeServiceUrl(serviceUrl), token, verbose: env.CONTEXT_GRAPH_VERBOSE === "1" || global.verbose === true };
}

// src/output.ts
function emitJson(event) {
  process.stdout.write(`${JSON.stringify(event)}
`);
}
function emitPageLink(serviceUrl, pagePath) {
  emitJson({ event: "link", url: `${serviceUrl.replace(/\/$/, "")}${pagePath}` });
}

// src/parseArgs.ts
var label = (spec) => spec.required !== false ? `<${spec.name}>` : `[${spec.name}]`;
var flagLabel = (spec) => spec.boolean ? `[--${spec.name}]` : `[--${spec.name} <${spec.name}>${spec.default !== void 0 ? ` (default: ${spec.default})` : ""}]`;
function commandName(argv) {
  return argv[1]?.replace(/.*[\\/]/, "").replace(/\.[jt]s$/, "") ?? "command";
}
function buildHelp(command, spec) {
  const positional = spec.positional ?? [];
  const flags = spec.flags ?? [];
  const lines = [`Usage: ${[command, ...positional.map(label), ...flags.map(flagLabel)].join(" ")}`, "", spec.description];
  const width = Math.max(0, ...positional.map((item) => item.name.length), ...flags.map((item) => item.name.length + 2));
  const described = positional.filter((item) => item.description);
  if (described.length) {
    lines.push("", "Arguments:");
    for (const item of described) lines.push(`  ${item.name.padEnd(width)}  ${item.description}`);
  }
  if (flags.length) {
    lines.push("", "Flags:");
    for (const item of flags) lines.push(`  ${`--${item.name}`.padEnd(width)}  ${[item.description, item.default !== void 0 ? `(default: ${item.default})` : ""].filter(Boolean).join(" ")}`.trimEnd());
  }
  return lines.join("\n");
}
function printHelpIfRequested(spec) {
  const argv = spec.argv ?? process.argv;
  if (!argv.slice(2).some((token) => token === "-h" || token === "--help")) return;
  console.log(buildHelp(commandName(argv), spec));
  process.exit(0);
}
var UsageError = class extends Error {
};
function parseArgs(spec) {
  const argv = spec.argv ?? process.argv;
  printHelpIfRequested(spec);
  const positional = [];
  const flags = {};
  for (const flag of spec.flags ?? []) if (flag.default !== void 0) flags[flag.name] = flag.default;
  const raw = argv.slice(2);
  for (let index = 0; index < raw.length; index++) {
    const token = raw[index];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const flag = (spec.flags ?? []).find((item) => `--${item.name}` === token);
    if (!flag) throw new UsageError(`Unknown flag: ${token}`);
    if (flag.boolean) {
      flags[flag.name] = true;
      continue;
    }
    const value = raw[index + 1];
    if (value === void 0 || value.startsWith("--")) throw new UsageError(`Flag ${token} requires a value.`);
    flags[flag.name] = value;
    index += 1;
  }
  const required = (spec.positional ?? []).filter((item) => item.required !== false).length;
  if (positional.length < required) throw new UsageError(`Expected at least ${required} argument${required === 1 ? "" : "s"}, got ${positional.length}.`);
  if (positional.length > (spec.positional ?? []).length) throw new UsageError(`Expected at most ${(spec.positional ?? []).length} argument${(spec.positional ?? []).length === 1 ? "" : "s"}, got ${positional.length}.`);
  return { positional, flags };
}
async function runCommand(spec, work) {
  try {
    await work(parseArgs(spec));
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(buildHelp(commandName(spec.argv ?? process.argv), spec));
      console.error(error.message);
      process.exit(1);
    }
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// src/commands/pageLink.ts
function buildPagePath(page, options = {}) {
  const params = new URLSearchParams({ stage: page });
  if (options.contextId) params.set("context", options.contextId);
  if (options.sectionId) params.set("section", options.sectionId);
  if (options.nodeId) params.set("node", options.nodeId);
  return `/?${params}`;
}
function validateRelativePath(path2) {
  const url = new URL(path2, "https://context-graph.invalid");
  if (!path2.startsWith("/") || path2.startsWith("//") || path2.includes("\\") || url.origin !== "https://context-graph.invalid" || url.pathname.startsWith("/api/")) throw new Error("Provide an app page path such as /?stage=graph.");
  return path2;
}
if (process.env.VITEST === void 0) {
  void runCommand({
    description: "Print a link to an app page and exit. With no path, links the context graph page.",
    positional: [{ name: "path", required: false, description: "Relative app path, e.g. /?stage=document&context=business-context." }],
    flags: [
      { name: "page", description: "graph (step 3) or document (step 4) when no path is given.", default: "graph" },
      { name: "context", description: "Context model id to open." },
      { name: "section", description: "Section id to focus on the document page." },
      { name: "node", description: "Node id to focus on the graph page." }
    ]
  }, ({ positional, flags }) => {
    const page = flags.page === "document" ? "document" : "graph";
    const path2 = positional[0] ? validateRelativePath(positional[0]) : buildPagePath(page, { contextId: typeof flags.context === "string" ? flags.context : void 0, sectionId: typeof flags.section === "string" ? flags.section : void 0, nodeId: typeof flags.node === "string" ? flags.node : void 0 });
    emitPageLink(getConfig().serviceUrl, path2);
  });
}
export {
  buildPagePath,
  validateRelativePath
};
