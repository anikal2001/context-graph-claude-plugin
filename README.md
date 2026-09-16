# Context graph for Claude Code

Edit context graph revisions and ontology versions from Claude Code while the browser page follows along.

The plugin talks to the Context graph app's API with a token bound to you, so every change it makes is a normal revision: it appears in the versions menu on the Context graph (step 3) and Document (step 4) pages, marked "Claude Code", and those pages refresh within seconds while the plugin is working.

## Install

```sh
claude plugin marketplace add anikal2001/context-graph-claude-plugin
claude plugin install context-graph@context-graph
```

Then, inside Claude Code:

```
/context-graph:setup
```

This opens a sign-in page in your browser. Approve it and the plugin is connected. Point it at another deployment (a local dev server, a preview) with `/context-graph:setup url http://localhost:5173`.

## Skills

| Skill | What it does |
|---|---|
| `/context-graph:setup [login\|status\|logout\|url <app-url>]` | Sign in from the browser, check the connection, sign out, or switch deployments |
| `/context-graph:graph [edit\|review\|history\|revert]` | Change section headings, prose and rules of the context model one revision at a time; review sections; diff revisions; revert a section |
| `/context-graph:ontology [versions\|save\|draft\|publish\|compare\|settings]` | List versions, save a draft, ask the model for a draft, preview exact membership changes and publish, diff versions, set automatic drafting |
| `/context-graph:update [check]` | Update the plugin to the latest published version |

## MCP tools

The plugin registers an MCP server named `ContextGraph`; tools appear as `mcp__plugin_context-graph_ContextGraph__<tool>`.

Context model: `list_context_models`, `get_context_model`, `get_context_document`, `get_context_graph`, `edit_context_section`, `save_context_revision`, `comment_context_section`, `compare_context_revisions`, `preview_context_publication`.

Ontology: `get_ontology`, `get_ontology_version`, `save_ontology_version`, `configure_ontology`, `request_ontology_draft`, `preview_ontology_publication`, `publish_ontology`, `update_ontology_settings`, `compare_ontology_versions`.

Sources and identity: `list_sources`, `get_imported_model`, `search_entities`, `whoami`, `get_plugin_activity`.

Every write takes the revision you read as `expectedRevision` and is refused when a newer revision landed first, the same rule the browser follows.

## Commands

Every `dist/commands/*.js` answers `-h`:

| Command | Purpose |
|---|---|
| `login.js [--force] [--url <app-url>] [--label <name>]` | Browser sign-in through a one-time ticket (PKCE); saves the token |
| `logout.js` | Revoke the token on the server and forget it |
| `status.js` | Service URL, version, build, update availability, sign-in state |
| `update.js [--check]` | Apply the latest published version through `claude plugin` |
| `pageLink.js [path] [--page graph\|document] [--context <id>] [--section <id>] [--node <id>]` | Print a link into the app |

## Configuration

| Location | Holds |
|---|---|
| `~/.config/context-graph/config.json` | `serviceUrl`, an anonymous `installId` |
| `~/.config/context-graph/credentials.json` | `token` |
| `.context-graph/config.local.json` (searched upward from the working directory) | Per-project `serviceUrl` |
| `CONTEXT_GRAPH_URL`, `CONTEXT_GRAPH_TOKEN` | Environment overrides |

Sign an installation out from the "Claude Code" panel on the graph or document page at any time.

## Development

The plugin lives in `plugin/` of the [context-graph](https://github.com/yuengeoff/context-graph) repository and is bundled with esbuild into `dist/` (the shared contracts and the MCP SDK are inlined, so the published plugin has no dependencies).

```sh
cd plugin
bun run typecheck && bun run test && bun run build
node ../scripts/check-plugin-command-surface.mjs
```

To try a local build in Claude Code: `claude plugin marketplace add ./plugin` from the repository root, then `claude plugin install context-graph@context-graph`.
