import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);

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

// src/config.ts
import fs2 from "node:fs";
import os from "node:os";
import path2 from "node:path";
var DEFAULT_SERVICE_URL = "https://context-graph-geoff-yuens-projects.vercel.app";
var CONFIG_DIR = path2.join(os.homedir(), ".config", "context-graph");
var CONFIG_FILE = path2.join(CONFIG_DIR, "config.json");
var CREDENTIALS_FILE = path2.join(CONFIG_DIR, "credentials.json");
var PROJECT_CONFIG = path2.join(".context-graph", "config.local.json");
function readJson(file) {
  try {
    const parsed = JSON.parse(fs2.readFileSync(file, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
function findProjectConfig(start = process.cwd()) {
  let dir = path2.resolve(start);
  for (; ; ) {
    const candidate = readJson(path2.join(dir, PROJECT_CONFIG));
    if (candidate) return candidate;
    const parent = path2.dirname(dir);
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

// src/installScope.ts
import fs3 from "node:fs";
import os2 from "node:os";
import path3 from "node:path";
var INSTALL_SCOPES = ["user", "project", "local", "managed"];
function pluginUpdateScopes(scopes) {
  return scopes.length > 0 ? [...scopes] : ["user"];
}
function canonical(target) {
  try {
    return fs3.realpathSync(path3.resolve(target));
  } catch {
    return path3.resolve(target);
  }
}
function installScopeAppliesToProject(projectPath, projectDir) {
  if (typeof projectPath !== "string" || projectPath.trim() === "") return true;
  const project = canonical(projectPath);
  const current = canonical(projectDir);
  return current === project || current.startsWith(`${project}${path3.sep}`);
}
function detectClaudeInstallScopes(pluginKey, homeDir = os2.homedir(), projectDir = process.cwd()) {
  try {
    const parsed = JSON.parse(fs3.readFileSync(path3.join(homeDir, ".claude", "plugins", "installed_plugins.json"), "utf8"));
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
import fs4 from "node:fs";
import path4 from "node:path";
import { fileURLToPath } from "node:url";
function findRoot(start) {
  let dir = start;
  for (let depth = 0; depth < 5; depth++) {
    if (fs4.existsSync(path4.join(dir, "package.json")) && fs4.existsSync(path4.join(dir, ".claude-plugin"))) return dir;
    dir = path4.dirname(dir);
  }
  return path4.resolve(start, "..");
}
var PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT ?? findRoot(path4.dirname(fileURLToPath(import.meta.url)));

// src/updates.ts
import fs5 from "node:fs";
import os3 from "node:os";
import path5 from "node:path";
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
function isAutoUpdateEnabled(platform2, homeDir = os3.homedir()) {
  try {
    const data = JSON.parse(fs5.readFileSync(path5.join(homeDir, ".claude", "plugins", "known_marketplaces.json"), "utf8"));
    const byName = data[platform2.marketplaceName];
    if (byName) return byName.autoUpdate === true;
    return Object.values(data).some((item) => item.source?.repo === platform2.repo && item.autoUpdate === true);
  } catch {
    return false;
  }
}
async function checkForUpdate(currentVersion, platform2, localBuildSha, fetcher = fetch, homeDir = os3.homedir()) {
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

// src/version.ts
import fs6 from "node:fs";
import path6 from "node:path";
var PLUGIN_VERSION = JSON.parse(fs6.readFileSync(path6.join(PLUGIN_ROOT, "package.json"), "utf8")).version;
function getVersion() {
  return PLUGIN_VERSION;
}

// src/hooks/sessionStart.ts
async function sessionStartMessages(now = () => checkForUpdate(getVersion(), platform, readBuildInfo(PLUGIN_ROOT)?.gitSha)) {
  const messages = [];
  try {
    if (!getConfig().token) messages.push(`[Context graph] Not signed in. Run ${platform.loginHint} to connect the plugin to your workspace.`);
  } catch {
  }
  try {
    const update = await now();
    if (update.updateAvailable) {
      const first = update.staleSameVersion ? `[Context graph] The cached plugin build is behind the published v${update.current}.` : `[Context graph] Update available: v${update.current} \u2192 v${update.latest}.`;
      messages.push(`${first}
          ${update.autoUpdateEnabled ? "Auto-update is enabled, restart to apply." : `Run ${platform.updateHint} to update, or enable auto-update: /plugin \u2192 Marketplaces \u2192 ${platform.marketplaceName} \u2192 Enable auto-update`}`);
    }
  } catch {
  }
  return messages;
}
if (process.env.VITEST === void 0) {
  sessionStartMessages().then((messages) => {
    if (messages.length) process.stdout.write(JSON.stringify({ systemMessage: `
${messages.join("\n")}` }));
  }).catch(() => void 0);
}
export {
  sessionStartMessages
};
