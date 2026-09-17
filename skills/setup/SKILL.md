---
description: Connect Claude Code to a Context graph workspace. TRIGGER when the user wants to sign in to Context graph, connect the plugin, check whether it is signed in, point it at another deployment, or sign out, or says 'context graph login', 'connect context graph', 'context graph status'. SKIP when the user wants to edit the context graph or ontology (use /context-graph:graph or /context-graph:ontology) or update the plugin (use /context-graph:update).
argument-hint: "[login|status|logout|url <app-url>]"
allowed-tools: ["Bash", "AskUserQuestion", "mcp__plugin_context-graph_ContextGraph__whoami", "mcp__plugin_context-graph_ContextGraph__list_context_models"]
---

# Context graph Setup

Sign the plugin in to a Context graph workspace from the browser, check its state, or sign out. Sign-in never pastes a secret into chat: the browser approves a one-time ticket and the token is saved under `~/.config/context-graph/`.

**CLI commands** available via Bash (all paths relative to `${CLAUDE_PLUGIN_ROOT}/dist/commands/`):

| Command | Description |
|---------|-------------|
| `login.js [--force] [--url <app-url>] [--label <name>]` | Open the browser sign-in and wait for approval; saves the token |
| `status.js` | Service URL, version and update availability, sign-in state |
| `logout.js` | Revoke this machine's token on the server and forget it |
| `pageLink.js [--page graph\|document] [--context <id>]` | Print a link to the graph (step 3) or document (step 4) page |

## Output

The user wants the result, not the work. Do not narrate what you are about to do, which tool you are calling, or what you are checking; never write "Let me", "I'll", "First I'll" or a summary of your reasoning. Run the steps silently and answer with the outcome only: one or two lines (for example "Committed revision 7: tightened Customer." plus the page link), a fenced diff when a step calls for one, or a single question through `AskUserQuestion`. When something fails, say what failed and the one command that fixes it, nothing else.

## Tool access

When `mcp__plugin_context-graph_ContextGraph__whoami` is not directly callable (Claude Code defers MCP tools when many servers are configured), load it with ToolSearch (`select:mcp__plugin_context-graph_ContextGraph__whoami`) or run `node "${CLAUDE_PLUGIN_ROOT}/dist/commands/tool.js" whoami`. Never read or print files under `~/.config/context-graph`: the token there is a secret. Never invent page links: only `pageLink.js` prints them.

## Modes

Read `$ARGUMENTS` first. If its first token is one of the modes below, run that mode. Otherwise run `login`.

| Mode | Trigger | What it does |
|------|---------|--------------|
| `login` | `login` (default) | Sign in through the browser, then open the graph page |
| `status` | `status` | Report sign-in state, service URL and plugin version |
| `logout` | `logout` | Revoke the token and sign out |
| `url` | `url <app-url>` | Point the plugin at another deployment (local dev server, preview) and sign in there |

## Login

1. Run the status command and read its output:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/commands/status.js"
   ```

   - **`Status: signed in as …`**: already connected. Tell the user who they are signed in as and which workspace, then go to step 3.
   - **`Status: not signed in`** or **`saved token rejected`**: continue with step 2.
   - If the output mentions an update, tell the user in one line that `/context-graph:update` applies it; do not block on it.
2. Run the login command. It prints the sign-in link, opens it in the OS-default browser, and polls until the browser approves the ticket (up to ten minutes):

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/commands/login.js"
   ```

   Relay the link as a clickable URL in case the browser did not open. The browser asks the person to sign in to the app (passphrase or their identity provider) and then shows "Connected". When the command prints `Signed in as …`, continue. If it prints `expired` or `timed out`, ask whether to try again and re-run with `--force`.
3. Call `mcp__plugin_context-graph_ContextGraph__whoami` once to confirm the MCP server sees the token (the server reads the saved token per call, so no restart is needed). If it reports `UNAUTHENTICATED`, the token file was not written: re-run step 2.
4. Call `mcp__plugin_context-graph_ContextGraph__list_context_models`. If there are none, tell the user to connect a source and run discovery in the app (steps 1 and 2) before editing anything. Otherwise print the link to the graph page:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/commands/pageLink.js" --page graph
   ```

   Relay the `url` from the JSON line as a clickable link and stop. Suggest `/context-graph:graph` to start editing.

## Status

1. Run `node "${CLAUDE_PLUGIN_ROOT}/dist/commands/status.js"` and relay every line. If signed in, also call `mcp__plugin_context-graph_ContextGraph__whoami` and report the workspace. Stop.

## Logout

1. Ask the user to confirm with `AskUserQuestion` (one question, options "Sign out" and "Keep signed in"). On confirmation run `node "${CLAUDE_PLUGIN_ROOT}/dist/commands/logout.js"` and relay the result. Stop.

## Url

1. The second token of `$ARGUMENTS` is the app URL (for example `http://localhost:5173` for the Vite dev server, which proxies `/api` to the API). Run:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/commands/login.js" --force --url "<app-url>"
   ```

   Then continue from Login step 3. The URL is saved as the service URL for every later command and MCP call.
