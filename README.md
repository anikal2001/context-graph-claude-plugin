# Context graph for Claude Code

Edit context graph revisions and ontology versions from Claude Code while the browser page follows along.

The plugin talks to the Context graph app's API with a token bound to you, so every change it makes is a normal revision: it appears in the versions menu on the Context graph (step 3) and Document (step 4) pages, marked "Claude Code", and those pages refresh within seconds while the plugin is working.

The app's own setup guide is at `<your app>/plugin`.

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
| `/context-graph:setup [login\|status\|org\|logout\|url <app-url>]` | Sign in from the browser, check the connection, move the plugin to another organization, sign out, or switch deployments |
| `/context-graph:graph [edit\|review\|history\|revert]` | Change section headings, prose and rules of the context model one revision at a time; review sections; diff revisions; revert a section |
| `/context-graph:ontology [edit\|versions\|save\|draft\|publish\|compare\|settings]` | Stage edits to entities, definitions, relationships, metrics or processes, see the diff against the original, and save them as the next draft only when you say save; list versions; ask the model for a draft; preview exact membership changes and publish; diff versions; set automatic drafting |
| `/context-graph:views [edit\|list\|delete] <question>` | Show what the data represents on the app's Views page (step 5) as whatever UI the question needs (a waterfall for revenue attribution, a funnel for pipeline stages, a trend, a pie, a sankey, a heatmap, cards, a table, a KPI row), computed over every imported record with the published definitions applied; the page opens in the app within seconds and is replaced in place when you ask for a change. Charts write their numbers on the marks and can draw a second measure behind them, so a funnel shows the count on each step and the amount behind it |
| `/context-graph:update [check]` | Report the version state, or apply an update the automatic one could not. Updates are not offered: the plugin applies an available one when a session starts and the banner tells you to restart |

## MCP tools

The plugin registers an MCP server named `ContextGraph`; tools appear as `mcp__plugin_context-graph_ContextGraph__<tool>`.

Context model: `list_context_models`, `get_context_model`, `get_context_document`, `get_context_graph`, `edit_context_section`, `save_context_revision`, `comment_context_section`, `compare_context_revisions`, `preview_context_publication`.

Ontology: `get_ontology`, `get_ontology_version`, `edit_ontology_entry` (stages), `show_ontology_changes`, `save_ontology_changes`, `discard_ontology_changes`, `save_ontology_version`, `configure_ontology`, `request_ontology_draft`, `preview_ontology_publication`, `publish_ontology`, `update_ontology_settings`, `compare_ontology_versions`.

Sources and identity: `list_sources`, `get_imported_model`, `search_entities`, `whoami`, `list_organizations`, `switch_organization`, `get_plugin_activity`.

Views: `aggregate_records` (group and total every record of a type on the server: fields, date buckets such as `CloseDate:month`, or a referenced record's attribute such as `AccountId.Industry`, filtered with the rule language `StageName != "Closed Lost" and Amount > 0`), `export_records` (every record of a type, up to 5,000, to a JSON file on this machine for row-level charts), `get_view_catalog` (the components a view may use), `save_view` (validate a json-render spec against that catalog and put it on the app's Views page with its caption and facts, or replace one by id) , `list_views` and `delete_view`.

Every write takes the revision you read as `expectedRevision` and is refused when a newer revision landed first, the same rule the browser follows.

## Organizations

Every organization is its own workspace, with its own sources, ontology, context models and views. The plugin signs in to one of them — whichever was active in your browser at the time — so a view or a source you cannot find is often one organization away. `/context-graph:setup org` lists the organizations you belong to and moves the plugin to one without a browser sign-in; the app's own organization switcher moves the browser.

## Telemetry

The plugin reports how it went — which skill ran, which tool was called, how long it took, whether it failed and with which code, and which version applied an update — to your own workspace, so the rough edges are visible to you. It never sends anything you wrote: no prompt text, no file paths, no record values, no view specs, no tokens. Turn it off with `CONTEXT_GRAPH_TELEMETRY=0`, or permanently:

```json
// ~/.config/context-graph/config.json
{ "telemetry": false }
```

## Commands

Every `dist/commands/*.js` answers `-h`:

| Command | Purpose |
|---|---|
| `login.js [--force] [--url <app-url>] [--label <name>]` | Browser sign-in through a one-time ticket (PKCE); saves the token |
| `logout.js` | Revoke the token on the server and forget it |
| `status.js` | Service URL, version, build, update availability, sign-in state |
| `update.js [--check]` | Apply the latest published version through `claude plugin` |
| `pageLink.js [path] [--page graph\|document\|views] [--context <id>] [--section <id>] [--node <id>] [--view <id>]` | Print a link into the app |

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
