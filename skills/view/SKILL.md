---
description: Show what the workspace's data represents on the Context graph app's Views page (step 5), as whatever UI fits the question, over every imported record: a waterfall for revenue attribution, a funnel for pipeline stages, a timeline, a sankey, a heatmap, a sortable table, a KPI row. TRIGGER when the user asks to see, chart, plot, visualize, break down, attribute, compare or trend anything held in the context graph's sources, or says 'show me revenue by', 'make a waterfall', 'chart the pipeline', 'how is X distributed', 'dashboard of', 'update the view'. SKIP when the user wants to change definitions or sections (use /context-graph:graph or /context-graph:ontology) or is not signed in yet (use /context-graph:setup).
argument-hint: "<question, e.g. revenue attribution by lead source as a waterfall>"
allowed-tools: ["Bash", "Read", "Write", "AskUserQuestion", "mcp__plugin_context-graph_ContextGraph__list_sources", "mcp__plugin_context-graph_ContextGraph__get_imported_model", "mcp__plugin_context-graph_ContextGraph__aggregate_records", "mcp__plugin_context-graph_ContextGraph__export_records", "mcp__plugin_context-graph_ContextGraph__search_entities", "mcp__plugin_context-graph_ContextGraph__get_ontology_version", "mcp__plugin_context-graph_ContextGraph__list_context_models", "mcp__plugin_context-graph_ContextGraph__get_context_document", "mcp__plugin_context-graph_ContextGraph__get_view_catalog", "mcp__plugin_context-graph_ContextGraph__save_view", "mcp__plugin_context-graph_ContextGraph__list_views", "mcp__plugin_context-graph_ContextGraph__whoami"]
---

# Context graph: View

Turn a question about the business into the UI that answers it, built from the numbers the app holds, and put it on the app's **Views** page (step 5) where the person and their team see it. The data comes from the workspace's imported records (every row, aggregated on the server), the meaning of business terms comes from the published ontology and the context document, and the view is a composition of the app's own chart components (the view catalog: KPI tiles, bars, lines, waterfalls, funnels, heatmaps, scatters, histograms, flows, tables) chosen to fit the question. The Views page polls the API and shows a "Claude Code" panel, so a view saved here appears on screen within seconds; a view saved again with the same id is replaced in place and its link keeps working.

**CLI commands** available via Bash (all paths relative to `${CLAUDE_PLUGIN_ROOT}/dist/commands/`):

| Command | Description |
|---------|-------------|
| `pageLink.js --page views [--view <id>]` | Link to the Views page, optionally opened on one view |
| `tool.js <tool> ['<json args>']` | Run any of the plugin's MCP tools from Bash when they cannot be called directly (`tool.js --list` shows them) |

## Output

The user wants the result, not the work. Do not narrate what you are about to do, which tool you are calling, or what you are checking; never write "Let me", "I'll", "First I'll" or a summary of your reasoning. Run the steps silently and answer with the outcome only: the Views page link from `save_view` plus one line saying what the view shows and what it is based on (type, filter, snapshot date, whether counts are exact), or a single question through `AskUserQuestion`. Never paste the spec into the chat. When something fails, say what failed and the one command that fixes it, nothing else.

## Tool access

The `mcp__plugin_context-graph_ContextGraph__*` tools come from this plugin's MCP server. When one is not directly callable (Claude Code defers MCP tools when many servers are configured), load it with ToolSearch, for example `select:mcp__plugin_context-graph_ContextGraph__aggregate_records`, then call it. If the tools still cannot be called, run the same tool from Bash; it prints the same result:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/commands/tool.js" get_imported_model '{"search":"opportunity"}'
node "${CLAUDE_PLUGIN_ROOT}/dist/commands/tool.js" aggregate_records '{"typeId":"Opportunity","where":"StageName = \"Closed Won\"","groupBy":["LeadSource"],"metrics":["sum:Amount","count"]}'
```

Never substitute curl, hand-written API calls, or files under `~/.config/context-graph` (the token there is a secret: do not read or print it). Never invent page links: only `save_view`, `list_views` and `pageLink.js` print them. If neither route works, tell the user to run `/mcp`, check that the ContextGraph server is connected, and restart Claude Code, then stop.

## 1. Read the question

`$ARGUMENTS` is the question. Name, for yourself, the **measure** (a count, a sum of a field, an average), the **dimension** the reader slices it by (a field, a month, an attribute of a related record), the **filter** (which records count), and the **reader's job**: a single number, a comparison, a share of a whole, a trend, how a total is built up or bridged, progression through stages with drop-off, a flow between two dimensions, a distribution, a list. The job picks the form in step 4; do not pick a chart type first.

## 2. Ground every term in the data and the definitions

1. Call `mcp__plugin_context-graph_ContextGraph__get_imported_model` with `search` for the likely type (opportunity, account, order, ticket). Note the type's native name, record count, the exact field names, picklist values, and which fields are references (`→ Account`): a reference field groups by the related record's attribute as `AccountId.Industry`.
2. Call `mcp__plugin_context-graph_ContextGraph__get_ontology_version` (the newest published version). When a word in the question is a defined term (Customer, Open opportunity, Churned account, a metric), use its `Rule:` predicates as the `where` clause and its formula as the measure, and name the definition in the caption. When the rule is `undetermined` or descriptive, the data cannot decide it: ask with `AskUserQuestion`, offering the picklist values the field actually has, or state the assumption you made in the caption. Business terms with no entry in the ontology may be defined in the context document (`get_context_document`); search its sections before assuming.
3. Never compute a total from `search_entities`: it is a sample. Use it only to check that a field holds what you think (a few rows) before aggregating.

## 3. Pull the numbers

Call `mcp__plugin_context-graph_ContextGraph__aggregate_records` once per series or panel. It groups every record of the type on the server and returns a caption line, the snapshot and coverage, and a JSON block (`columns`, `rows`, `totals`, `count`) to embed as is.

| Question shape | Call |
|---|---|
| Revenue attribution by source | `{"typeId":"Opportunity","where":"StageName = \"Closed Won\"","groupBy":["LeadSource"],"metrics":["sum:Amount","count"]}` |
| Pipeline by stage | `{"typeId":"Opportunity","where":"StageName != \"Closed Lost\"","groupBy":["StageName"],"metrics":["count","sum:Amount"]}` |
| Bookings per quarter | `{"typeId":"Opportunity","where":"StageName = \"Closed Won\"","groupBy":["CloseDate:quarter"],"metrics":["sum:Amount"]}` |
| Revenue by the account's industry | `{"typeId":"Opportunity","groupBy":["AccountId.Industry"],"metrics":["sum:Amount","distinct:AccountId"]}` |
| Stage × month grid, or a flow between two dimensions | `groupBy` with two entries: `["CloseDate:month","StageName"]` or `["LeadSource","StageName"]` |
| One headline number | no `groupBy`; `metrics` such as `["count","sum:Amount","avg:Amount"]` |

`where` is `field op value and …` (operators `=`, `!=`, `>`, `>=`, `<`, `<=`; strings in double quotes), the same language as ontology rules. Groups are capped by `limit` (default 50); when the result says groups were left out, fold the tail into "Other" using `totals` minus the returned rows, or raise the limit. When the reader needs individual records (a scatter of amount against age, a timeline of deals, a drill-down table), call `mcp__plugin_context-graph_ContextGraph__export_records` with the `fields` the page needs; it writes a JSON file on this machine and reports the path. Read the file and embed the rows; a browser cannot fetch a local file. Keep exports under a few thousand rows and never include fields that look like secrets, emails or phone numbers unless the question is about them.

## 4. Choose the form from the reader's job

| The reader must… | Form | Notes |
|---|---|---|
| Read one current value | Stat tile or KPI row (value, unit, count behind it) | Not a one-bar chart |
| Compare categories | Horizontal bars, sorted, direct labels | More than ~8 bars: fold the tail into "Other" |
| See how a total is built up, bridged or attributed | **Waterfall**: floating bars from zero to the total, one per contributor, a final total bar | Attribution, revenue bridges, what added and what took away |
| Follow progression through ordered stages with drop-off | **Funnel**: ordered bars with the conversion between steps written on them | Use the picklist's stage order, not the sorted count |
| Follow a trend | Line, one series per category (≤ 4), or small multiples | Buckets from `field:month`; never two y-axes |
| See a share of a whole | Stacked horizontal bar | Not a pie |
| See a flow between two dimensions | **Sankey** | Two groupings; each row is a link |
| Read a grid of two dimensions | Heatmap, one hue light→dark | Bucket × category |
| See a distribution | Histogram over exported rows | Bin in the page |
| Relate two measures per record | Scatter over exported rows | ≤ 3 colored groups |
| Look values up | Sortable table with totals row | Always also below a chart |

Rules that hold for every form: no pie, never two y axes (use two charts), at most about 8 categories before folding the tail into "Other" from the totals, a DataTable under the chart, and the field's unit only when the model states one (otherwise `unit: null`; never an invented currency symbol). Colour, labels, tooltips, legends and the dark scheme belong to the app's components, not to the spec.

## 5. Compose the view from the catalog and save it

A view is not a page you draw: it is a **spec** the app renders with its own components. Call `mcp__plugin_context-graph_ContextGraph__get_view_catalog` once per session and compose a json-render spec from it: a flat tree `{ "root": "page", "elements": { "<key>": { "type": "<Component>", "props": { … }, "children": ["<key>", …] } } }` whose root is a `Page`. The catalog has one component per form (Kpi, BarChart, LineChart, Waterfall, Funnel, Heatmap, Scatter, Histogram, Flow, DataTable) plus Page, Caption, Note and Row; every chart takes `data` as the `{ columns, rows }` block `aggregate_records` returned, copied as is, and names the columns it draws by their headers. Every view is: the Page, then a Caption (type and record count, the `where` clause in words, the definition applied with its ontology version, the snapshot date and coverage, and "exact" or the reason counts are not exact, all copied from the tool result; an assumption goes in a Note with tone `warning`), then the chart or charts, then a DataTable of the same numbers. Nothing in a view identifies the machine: no ids, tokens or paths. Do not write HTML, SVG or scripts anywhere: the catalog is the whole vocabulary, and a spec outside it is refused with the list of problems, which you fix and save again.

Then call `mcp__plugin_context-graph_ContextGraph__save_view` with:

- `title`: two to six words naming the view;
- `question`: the person's words;
- `form`: the main form, one word, such as `waterfall`, `funnel`, `line`, `bar`, `table`, `kpi`, `flow`, `heatmap`, `scatter`, `histogram`;
- `caption`: the same text as the Caption;
- `facts`: the machine-readable version, copied from the `aggregate_records` result, for example `{"typeId":"Opportunity","where":"StageName = \"Closed Won\"","records":90,"snapshot":"2026-09-15","coverage":"complete","exact":true,"definition":"none"}`;
- `spec`: the spec;
- `id`: only when replacing a view the person already has (find it with `mcp__plugin_context-graph_ContextGraph__list_views`), so its link keeps working.

The tool answers with the view id and the Views page link. The view is private to the workspace: the person and their teammates see it on step 5, where they can also delete it.

## 6. Answer

One line: what the view shows, the number of records behind it, the snapshot date, and whether the numbers are exact, plus the Views page link from `save_view`. When the user asks for a change (another dimension, a filter, a different form), rerun from step 3 and save again with the same `id` so the page updates in place.
