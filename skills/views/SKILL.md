---
description: Build and edit the views on the Context graph app's Views page (step 5) — whatever UI answers the question, over every imported record: a waterfall for revenue attribution, a funnel for pipeline stages, a trend, a sankey, a heatmap, a KPI row, a sortable table. TRIGGER when the user asks to see, chart, plot, visualize, break down, attribute, compare or trend anything held in the context graph's sources, to change or delete a view they already have, or says 'show me revenue by', 'make a waterfall', 'chart the pipeline', 'how is X distributed', 'dashboard of', 'edit the view', 'update the view', 'list my views'. SKIP when the user wants to change definitions or sections (use /context-graph:graph or /context-graph:ontology) or is not signed in yet (use /context-graph:setup).
argument-hint: "[edit|list|delete] <question, e.g. revenue attribution by lead source as a waterfall>"
allowed-tools: ["Bash", "Read", "Write", "AskUserQuestion", "mcp__plugin_context-graph_ContextGraph__list_sources", "mcp__plugin_context-graph_ContextGraph__get_imported_model", "mcp__plugin_context-graph_ContextGraph__aggregate_records", "mcp__plugin_context-graph_ContextGraph__export_records", "mcp__plugin_context-graph_ContextGraph__search_entities", "mcp__plugin_context-graph_ContextGraph__get_ontology_version", "mcp__plugin_context-graph_ContextGraph__list_context_models", "mcp__plugin_context-graph_ContextGraph__get_context_document", "mcp__plugin_context-graph_ContextGraph__get_view_catalog", "mcp__plugin_context-graph_ContextGraph__save_view", "mcp__plugin_context-graph_ContextGraph__list_views", "mcp__plugin_context-graph_ContextGraph__delete_view", "mcp__plugin_context-graph_ContextGraph__list_organizations", "mcp__plugin_context-graph_ContextGraph__switch_organization", "mcp__plugin_context-graph_ContextGraph__whoami"]
---

# Context graph: Views

Turn a question about the business into the UI that answers it, built from the numbers the app holds, and put it on the app's **Views** page (step 5) where the person and their team see it. The data comes from the workspace's imported records (every row, aggregated on the server), the meaning of business terms comes from the published ontology and the context document, and the view is a composition of the app's own components (the view catalog) chosen to fit the question. The Views page polls the API and shows a "Claude Code" panel, so a view saved here appears on screen within seconds; a view saved again with the same id is replaced in place and its link keeps working.

**Views belong to one organization.** Each organization is its own workspace with its own sources, ontology and views. A view the person remembers but cannot find is very often saved in another one. Before telling anyone a view does not exist, call `list_organizations`; `/context-graph:setup org` moves the plugin.

**CLI commands** available via Bash (all paths relative to `${CLAUDE_PLUGIN_ROOT}/dist/commands/`):

| Command | Description |
|---------|-------------|
| `pageLink.js --page views [--view <id>]` | Link to the Views page, optionally opened on one view |
| `switchOrg.js [<organizationId>]` | List the organizations this person belongs to, or move the plugin to one |
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

## Modes

Read `$ARGUMENTS` first. If its first token is one of the modes below, run that mode and treat the rest as its input. Otherwise run `edit` with the whole of `$ARGUMENTS` as the question.

| Mode | Trigger | What it does |
|------|---------|--------------|
| `edit` | `edit` (default) | Build a view that answers the question, or change one that exists |
| `list` | `list` | Show the views saved in this workspace, with their links |
| `delete` | `delete <id>` | Remove a view from the Views page |

### List

Call `mcp__plugin_context-graph_ContextGraph__list_views`. Report each view on one line (title, form, when it was last saved, its link). When there are none, say so and name the other organizations from `list_organizations` if the person belongs to any. Stop.

### Delete

The id comes from `$ARGUMENTS` or from `list_views`. Unless the person named the view themselves, confirm with `AskUserQuestion` first, naming its title. Then call `mcp__plugin_context-graph_ContextGraph__delete_view` and report it in one line. Stop.

### Edit

Run the steps below. When the person is changing a view that exists, find its id with `list_views` first and pass that `id` to `save_view` so its link keeps working and the page updates in place.

## 1. Read the question

`$ARGUMENTS` is the question. Name, for yourself, the **measure** (a count, a sum of a field, an average), the **dimension** the reader slices it by (a field, a month, an attribute of a related record), the **filter** (which records count), and the **reader's job**: a single number, a comparison, a share of a whole, a trend, how a total is built up or bridged, progression through stages with drop-off, a flow between two dimensions, a distribution, a list. The job picks the form in step 4; do not pick a chart type first.

## 2. Ground every term in the data and the definitions

1. Call `mcp__plugin_context-graph_ContextGraph__get_imported_model` with `search` for the likely type (opportunity, account, order, ticket). Note the type's native name, record count, the exact field names, picklist values, and which fields are references (`→ Account`): a reference field groups by the related record's attribute as `AccountId.Industry`.
2. Call `mcp__plugin_context-graph_ContextGraph__get_ontology_version` (the newest published version). When a word in the question is a defined term (Customer, Open opportunity, Churned account, a metric), use its `Rule:` predicates as the `where` clause and its formula as the measure, and name the definition in the caption. When the rule is `undetermined` or descriptive, the data cannot decide it: ask with `AskUserQuestion`, offering the picklist values the field actually has, or state the assumption you made in the caption. Business terms with no entry in the ontology may be defined in the context document (`get_context_document`); search its sections before assuming.
3. Never compute a total from `search_entities`: it is a sample. Use it only to check that a field holds what you think (a few rows) before aggregating.
4. When the type or the field the question needs is not in this workspace at all, check `list_organizations` before concluding the data does not exist.

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

`where` is `field op value and …` (operators `=`, `!=`, `>`, `>=`, `<`, `<=`; strings in double quotes), the same language as ontology rules. Groups are capped by `limit` (default 50); when the result says groups were left out, fold the tail into "Other" using `totals` minus the returned rows, or raise the limit.

**Ask for every measure the reader might want on the chart, not only the one you will draw.** A single `metrics` list of `["count","sum:Amount"]` costs one call and lets the same chart write the count on the steps, draw the amount behind them with `overlay`, and show both on hover with `tooltip: "detailed"`. Two calls for the same grouping is a mistake.

When the reader needs individual records (a scatter of amount against age, a gallery of the largest deals, a drill-down table), call `mcp__plugin_context-graph_ContextGraph__export_records` with the `fields` the page needs; it writes a JSON file on this machine and reports the path. Read the file and embed the rows; a browser cannot fetch a local file. Keep exports under a few thousand rows and never include fields that look like secrets, emails or phone numbers unless the question is about them.

## 4. Choose the form from the reader's job

| The reader must… | Form | Notes |
|---|---|---|
| Read one current value | Stat tile or KPI row (value, unit, count behind it) | Not a one-bar chart |
| Read it against the period before | **Trend** | Set `goodDirection`: a fall in days-to-close is good news |
| See how far a number has come | **Progress** (value against a target) | Quota, coverage, completeness |
| Judge a value on a scale | **Gauge** with named bands | Days to close, health; never money or counts |
| See the shape of a series beside a number | **Sparkline** | In a Row of tiles, where a LineChart would not fit |
| Compare categories | Bars, sorted, direct labels | Horizontal by default; `orientation: "vertical"` for columns when the labels are short or the reader expects them standing up. More than ~8 bars: fold the tail into "Other" |
| See how a total is built up, bridged or attributed | **Waterfall** | Attribution, revenue bridges, what added and what took away |
| Follow a cohort's progression through ordered stages with drop-off | **Funnel** | Use the picklist's stage order, not the sorted count. Only when each step counts records that also reached the step before it |
| See how many records sit in each stage right now | **BarChart**, `sort: "none"`, stages in process order | A stage snapshot is not a funnel: its steps are disjoint, so "conversion" between them is meaningless and can exceed 100% |
| Follow a trend | Line, one series per category (≤ 4), or small multiples | Buckets from `field:month`; never two y-axes |
| See a share of a whole | Stacked horizontal bar, or **PieChart** when the parts really do sum to one whole | At most six slices; fold the tail into "Other" first |
| See a flow between two dimensions | **Sankey** (`Flow`) | Two groupings; each row is a link |
| Read a grid of two dimensions | Heatmap, one hue light→dark | Bucket × category |
| See a distribution | Histogram over exported rows | Bin in the page |
| Relate two measures per record | Scatter over exported rows | ≤ 3 colored groups |
| Look at particular records | **Cards** | A dozen at most; past that, a table |
| Look values up | Sortable table with totals row | Always also below a chart |

Rules that hold for every form: never two y axes (use two charts), at most about 8 categories (6 slices) before folding the tail into "Other" from the totals, a DataTable under the chart, and the field's unit only when the model states one (otherwise `unit: null`; never an invented currency symbol). A pie is the exception rather than the default: reach for bars unless the reader wants shares of one whole.

**The marks carry their numbers.** Every chart takes `labels` (`value`, `share`, `both`, `none`), `tooltip` (`auto`, `detailed`, `off`) and, where it fits, `overlay` (a second column from the same data drawn behind the marks). The default writes the value on each mark; set `labels: "none"` only when the chart is dense enough that written numbers would collide, and put a DataTable or a Toggle holding one underneath when you do. `overlay` is how one funnel shows the count on the steps and the amount behind them, instead of two charts side by side.

What a chart *means* is the spec's to say, through the presentation props the catalog lists: `labels`, `tooltip`, `overlay`, `orientation`, `palette` (`single`, `category`, `signed`, `sequential`), `emphasis` (the categories the caption argues about, drawn at full strength while the rest fade), `size` and Row `weights`, `annotations` (labelled reference lines) and Page `density`. Reach for one when the question asks for it or the point needs it, and omit it otherwise; there is still no colour, pixel, class or style anywhere in a spec.

## 5. Give a crowded page structure, not more charts

A page that answers more than one question needs parts, not a taller stack:

- **Section** groups panels under a heading with room around them. Past about six panels, a page wants sections.
- **Row** with `weights` puts two panels side by side (`[2,1]` for a chart beside its table); `size` (`small`, `medium`, `full`) says how much width a chart asks for.
- **Toggle** folds detail behind one line: the full table under a summary chart, the rows behind an "Other" bucket.
- **Page** `density: "compact"` tightens a page that stacks several panels.
- **Callout** carries the one thing the reader should take away (one or two a page at most), **Quote** reproduces a definition verbatim, **Checklist** states conditions and whether each holds, **Badges** label the facts behind the numbers, **Divider** separates parts that have no names.

A chart with more than about twelve categories wants a fold into "Other", a Toggle holding the full table, or the horizontal form, which has room for the names. Never answer crowding by dropping the numbers off the marks.

Every word in a Callout, Quote, Note or Checklist comes from a tool result or from the person. Nothing here invents a finding.

## 6. Compose the view from the catalog and save it

A view is not a page you draw: it is a **spec** the app renders with its own components. Call `mcp__plugin_context-graph_ContextGraph__get_view_catalog` once per session and compose a json-render spec from it: a flat tree `{ "root": "page", "elements": { "<key>": { "type": "<Component>", "props": { … }, "children": ["<key>", …] } } }` whose root is a `Page`. Every chart takes `data` as the `{ columns, rows }` block `aggregate_records` returned, copied as is, and names the columns it draws by their headers. Every view is: the Page, then a Caption (type and record count, the `where` clause in words, the definition applied with its ontology version, the snapshot date and coverage, and "exact" or the reason counts are not exact, all copied from the tool result; an assumption goes in a Note with tone `warning` or a Callout with tone `warning`), then the chart or charts, then a DataTable of the same numbers. Nothing in a view identifies the machine: no ids, tokens or paths. Do not write HTML, SVG or scripts anywhere: the catalog is the whole vocabulary, and a spec outside it is refused with the list of problems, which you fix and save again.

Then call `mcp__plugin_context-graph_ContextGraph__save_view` with:

- `title`: two to six words naming the view;
- `question`: the person's words;
- `form`: the main form, one word, such as `waterfall`, `funnel`, `line`, `bar`, `pie`, `table`, `kpi`, `flow`, `heatmap`, `scatter`, `histogram`;
- `caption`: the same text as the Caption;
- `facts`: the machine-readable version, copied from the `aggregate_records` result, for example `{"typeId":"Opportunity","where":"StageName = \"Closed Won\"","records":90,"snapshot":"2026-09-15","coverage":"complete","exact":true,"definition":"none"}`;
- `spec`: the spec;
- `id`: only when replacing a view the person already has (find it with `mcp__plugin_context-graph_ContextGraph__list_views`), so its link keeps working.

The tool answers with the view id and the Views page link. The view is private to the workspace: the person and their teammates see it on step 5, where they can also delete it.

## 7. Answer

One line: what the view shows, the number of records behind it, the snapshot date, and whether the numbers are exact, plus the Views page link from `save_view`. When the user asks for a change (another dimension, a filter, a different form, numbers written differently), rerun from step 3 and save again with the same `id` so the page updates in place.
