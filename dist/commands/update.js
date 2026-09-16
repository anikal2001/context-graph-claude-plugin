import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

// src/commands/update.ts
import { execSync } from "node:child_process";

// src/buildInfo.ts
import fs from "node:fs";
import path from "node:path";
function readBuildInfo(pluginRoot) {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(pluginRoot, "dist", "buildInfo.json"), "utf8"));
    return typeof parsed.gitSha === "string" && typeof parsed.builtAt === "string" && typeof parsed.version === "string" ? { gitSha: parsed.gitSha, builtAt: parsed.builtAt, version: parsed.version } : null;
  } catch {
    return null;
  }
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

// src/installScope.ts
import fs2 from "node:fs";
import os from "node:os";
import path2 from "node:path";
var INSTALL_SCOPES = ["user", "project", "local", "managed"];
function pluginUpdateScopes(scopes) {
  return scopes.length > 0 ? [...scopes] : ["user"];
}
function canonical(target) {
  try {
    return fs2.realpathSync(path2.resolve(target));
  } catch {
    return path2.resolve(target);
  }
}
function installScopeAppliesToProject(projectPath, projectDir) {
  if (typeof projectPath !== "string" || projectPath.trim() === "") return true;
  const project = canonical(projectPath);
  const current = canonical(projectDir);
  return current === project || current.startsWith(`${project}${path2.sep}`);
}
function detectClaudeInstallScopes(pluginKey, homeDir = os.homedir(), projectDir = process.cwd()) {
  try {
    const parsed = JSON.parse(fs2.readFileSync(path2.join(homeDir, ".claude", "plugins", "installed_plugins.json"), "utf8"));
    const scopes = /* @__PURE__ */ new Set();
    for (const entry of parsed.plugins?.[pluginKey] ?? []) {
      if (entry.scope && INSTALL_SCOPES.includes(entry.scope) && installScopeAppliesToProject(entry.projectPath, projectDir)) scopes.add(entry.scope);
    }
    return [...scopes];
  } catch {
    return [];
  }
}

// src/platform.ts
var PLUGIN_KEY = "context-graph@context-graph";
var platform = {
  authPath: "claude",
  displayName: "Claude Code",
  cliBinary: "claude",
  loginHint: "/context-graph:setup login",
  setupHint: "/context-graph:setup",
  updateHint: "/context-graph:update",
  repo: "anikal2001/context-graph-claude-plugin",
  marketplaceName: "context-graph",
  pluginName: "context-graph",
  detectInstallScopes: () => detectClaudeInstallScopes(PLUGIN_KEY),
  buildPluginUpdateCommands: (scopes) => [
    "claude plugin marketplace update context-graph",
    ...pluginUpdateScopes(scopes).map((scope) => `claude plugin update ${PLUGIN_KEY} --scope ${scope}`)
  ]
};

// src/pluginRoot.ts
import fs3 from "node:fs";
import path3 from "node:path";
import { fileURLToPath } from "node:url";
function findRoot(start) {
  let dir = start;
  for (let depth = 0; depth < 5; depth++) {
    if (fs3.existsSync(path3.join(dir, "package.json")) && fs3.existsSync(path3.join(dir, ".claude-plugin"))) return dir;
    dir = path3.dirname(dir);
  }
  return path3.resolve(start, "..");
}
var PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT ?? findRoot(path3.dirname(fileURLToPath(import.meta.url)));

// src/updates.ts
import fs4 from "node:fs";
import os2 from "node:os";
import path4 from "node:path";
async function readRaw(platform2, file, fetcher) {
  try {
    const response = await fetcher(`https://raw.githubusercontent.com/${platform2.repo}/main/${file}`, { signal: AbortSignal.timeout(3e3) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}
function isNewer(latest, current) {
  const a = latest.split(".").map(Number);
  const b = current.split(".").map(Number);
  for (let index = 0; index < 3; index++) {
    if ((a[index] ?? 0) !== (b[index] ?? 0)) return (a[index] ?? 0) > (b[index] ?? 0);
  }
  return false;
}
function isAutoUpdateEnabled(platform2, homeDir = os2.homedir()) {
  try {
    const data = JSON.parse(fs4.readFileSync(path4.join(homeDir, ".claude", "plugins", "known_marketplaces.json"), "utf8"));
    const byName = data[platform2.marketplaceName];
    if (byName) return byName.autoUpdate === true;
    return Object.values(data).some((item) => item.source?.repo === platform2.repo && item.autoUpdate === true);
  } catch {
    return false;
  }
}
async function checkForUpdate(currentVersion, platform2, localBuildSha, fetcher = fetch, homeDir = os2.homedir()) {
  const pkg = await readRaw(platform2, "package.json", fetcher);
  const latest = typeof pkg?.version === "string" ? pkg.version : null;
  const versionNewer = latest !== null && isNewer(latest, currentVersion);
  let staleSameVersion = false;
  if (!versionNewer && latest === currentVersion && localBuildSha) {
    const info = await readRaw(platform2, "dist/buildInfo.json", fetcher);
    staleSameVersion = typeof info?.gitSha === "string" && info.gitSha !== localBuildSha;
  }
  return { current: currentVersion, latest, updateAvailable: versionNewer || staleSameVersion, autoUpdateEnabled: isAutoUpdateEnabled(platform2, homeDir), staleSameVersion };
}
function runUpdateCommands(commands, run) {
  const failed = [];
  for (const command of commands) {
    console.log(`
$ ${command}`);
    try {
      run(command);
    } catch {
      failed.push(command);
      console.error(`
Command failed: ${command}`);
    }
  }
  return failed;
}

// src/version.ts
import fs5 from "node:fs";
import path5 from "node:path";
var PLUGIN_VERSION = JSON.parse(fs5.readFileSync(path5.join(PLUGIN_ROOT, "package.json"), "utf8")).version;
function getVersion() {
  return PLUGIN_VERSION;
}

// src/commands/update.ts
async function runUpdate(options) {
  const build = readBuildInfo(PLUGIN_ROOT);
  const status = await checkForUpdate(getVersion(), platform, build?.gitSha);
  if (!status.updateAvailable) {
    console.log(`Context graph plugin v${status.current} is up to date${status.latest ? "" : " (could not reach the release repo to confirm)"}.`);
    return;
  }
  console.log(status.staleSameVersion ? `Cached build of v${status.current} is behind the published release.` : `Plugin update available: v${status.current} \u2192 v${status.latest}`);
  if (options.check) {
    console.log(`Run ${platform.updateHint} to apply it.`);
    return;
  }
  const commands = platform.buildPluginUpdateCommands(platform.detectInstallScopes());
  const failed = runUpdateCommands(commands, options.run ?? ((command) => {
    execSync(command, { stdio: "inherit" });
  }));
  if (failed.length) {
    console.error(`If the marketplace is not registered yet, add it first: ${platform.cliBinary} plugin marketplace add ${platform.repo}`);
    process.exit(1);
  }
  console.log(`
Context graph plugin updated to v${status.latest ?? status.current}. Restart ${platform.displayName} to apply it.`);
}
if (process.env.VITEST === void 0) {
  void runCommand({
    description: "Update the Context graph plugin to the latest published version through the Claude Code plugin CLI.",
    flags: [{ name: "check", boolean: true, description: "Only report whether an update is available." }]
  }, ({ flags }) => runUpdate({ check: flags.check === true }));
}
export {
  runUpdate
};
