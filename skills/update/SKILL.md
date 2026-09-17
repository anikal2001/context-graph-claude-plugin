---
description: Update the Context graph plugin to the latest published version. TRIGGER when the user wants to update or upgrade the Context graph plugin, get its latest version, or the session banner said an update is available. SKIP when the user wants to sign in (use /context-graph:setup) or edit the graph or ontology.
argument-hint: "[check]"
allowed-tools: ["Bash"]
---

# Context graph Update

Update the Claude Code plugin to the latest version published to the plugin's public repository.

**CLI commands** available via Bash (all paths relative to `${CLAUDE_PLUGIN_ROOT}/dist/commands/`):

| Command | Description |
|---------|-------------|
| `update.js [--check]` | Compare the installed version and build with the published release and apply the update through `claude plugin` |

## Output

The user wants the result, not the work. Do not narrate what you are about to do, which tool you are calling, or what you are checking; never write "Let me", "I'll", "First I'll" or a summary of your reasoning. Run the steps silently and answer with the outcome only: one or two lines (for example "Committed revision 7: tightened Customer." plus the page link), a fenced diff when a step calls for one, or a single question through `AskUserQuestion`. When something fails, say what failed and the one command that fixes it, nothing else.

## Modes

Read `$ARGUMENTS` first.

| Mode | Trigger | What it does |
|------|---------|--------------|
| `apply` | (default) | Apply the update when one is available |
| `check` | `check` | Only report whether an update is available |

## Steps

1. Run the update command, passing `--check` in check mode:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/commands/update.js"
   ```

   The command reads the published `package.json` and `dist/buildInfo.json` from the release repository. It reports "up to date", a newer version, or a stale cached build of the same version (the marketplace served older bytes than the release). In apply mode it runs `claude plugin marketplace update context-graph` followed by `claude plugin update context-graph@context-graph --scope <scope>` for every scope the plugin is installed at (user, project, local, managed).
2. Relay the outcome. If the plugin was updated, remind the user to restart Claude Code so the new build loads. If a command failed because the marketplace is not registered, tell the user to run `claude plugin marketplace add anikal2001/context-graph-claude-plugin` once and then retry.
