---
description: Edit and manage ontology versions from Claude Code: stage changes to entities, definitions, relationships, metrics or processes, show the diff against the original, and save them as the next draft only when the user says save; read versions, ask the model for a draft, preview exact membership changes, publish, compare versions and set automatic drafting. TRIGGER when the user wants to edit the ontology, change a definition or rule, add or remove an entity, publish the ontology, save or draft an ontology version, see what publishing would change, diff ontology versions, or turn auto-draft on or off, or says 'edit the ontology', 'change this definition', 'publish the ontology', 'new ontology version', 'what would publishing change', 'compare ontology versions'. SKIP when the user wants to edit sections of the context graph or business document (use /context-graph:graph).
argument-hint: "[edit|versions|save|draft|publish|compare|settings]"
allowed-tools: ["Bash", "AskUserQuestion", "Read", "mcp__plugin_context-graph_ContextGraph__get_ontology", "mcp__plugin_context-graph_ContextGraph__get_ontology_version", "mcp__plugin_context-graph_ContextGraph__save_ontology_version", "mcp__plugin_context-graph_ContextGraph__edit_ontology_entry", "mcp__plugin_context-graph_ContextGraph__show_ontology_changes", "mcp__plugin_context-graph_ContextGraph__save_ontology_changes", "mcp__plugin_context-graph_ContextGraph__discard_ontology_changes", "mcp__plugin_context-graph_ContextGraph__configure_ontology", "mcp__plugin_context-graph_ContextGraph__request_ontology_draft", "mcp__plugin_context-graph_ContextGraph__preview_ontology_publication", "mcp__plugin_context-graph_ContextGraph__publish_ontology", "mcp__plugin_context-graph_ContextGraph__update_ontology_settings", "mcp__plugin_context-graph_ContextGraph__compare_ontology_versions", "mcp__plugin_context-graph_ContextGraph__get_context_document", "mcp__plugin_context-graph_ContextGraph__list_context_models", "mcp__plugin_context-graph_ContextGraph__list_sources", "mcp__plugin_context-graph_ContextGraph__get_imported_model"]
---

# Context graph: Ontology versions

The ontology is the reviewed model of the business: immutable numbered versions, one of them published. Publishing runs the exact definitions against the imported records, so the preview shows how many records enter or leave each definition before anything changes. The versions menu on the graph and document pages (steps 3 and 4) shows the same versions and marks the published one as live; it refreshes while this plugin works.

Every write takes the ontology **head revision** from `get_ontology` as `expectedRevision`. Read it right before each write.

## Output

The user wants the result, not the work. Do not narrate what you are about to do, which tool you are calling, or what you are checking; never write "Let me", "I'll", "First I'll" or a summary of your reasoning. Run the steps silently and answer with the outcome only: one or two lines (for example "Committed revision 7: tightened Customer." plus the page link), a fenced diff when a step calls for one, or a single question through `AskUserQuestion`. When something fails, say what failed and the one command that fixes it, nothing else.

## Tool access

The `mcp__plugin_context-graph_ContextGraph__*` tools come from this plugin's MCP server. When one is not directly callable (Claude Code defers MCP tools when many servers are configured), load it with ToolSearch, for example `select:mcp__plugin_context-graph_ContextGraph__list_context_models`, then call it. If the tools still cannot be called, run the same tool from Bash; it prints the same result:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/commands/tool.js" list_context_models
node "${CLAUDE_PLUGIN_ROOT}/dist/commands/tool.js" get_context_model '{"proposalId":"business-context"}'
```

`tool.js --list` prints every tool. Never substitute curl, hand-written API calls, or files under `~/.config/context-graph` (the token there is a secret: do not read or print it). Never invent page links: only `pageLink.js` prints them. If neither route works, tell the user to run `/mcp`, check that the ContextGraph server is connected, and restart Claude Code, then stop.

## Modes

Read `$ARGUMENTS` first. If its first token is one of the modes below, run that mode. Otherwise, when the arguments describe a change, run `edit` with them as the request; with no arguments run `versions`.

| Mode | Trigger | What it does |
|------|---------|--------------|
| `edit` | `edit` or a described change | Stage changes to entries (entity, definition, relationship, metric, process, …), show the diff against the original, save as the next draft only when the user says save |
| `versions` | `versions` (default without arguments) | List versions and jobs, read one version's markdown |
| `save` | `save` | Save markdown (from a file, the context document, or edits to a version) as the next draft |
| `draft` | `draft` | Ask the model to draft the next version from the configured sources |
| `publish` | `publish` | Preview membership changes, confirm, publish the newest draft |
| `compare` | `compare` | Diff two versions |
| `settings` | `settings` | Automatic drafting and its business questions |

## Edit

Edits are **staged, never saved on their own**. Every staged edit is diffed against the original version; the draft is written only when the user says save, and only after they have seen the diff.

1. Call `mcp__plugin_context-graph_ContextGraph__show_ontology_changes`. If changes are already staged, tell the user and ask with `AskUserQuestion` whether to continue on top of them, save them, or discard them first.
2. Call `mcp__plugin_context-graph_ContextGraph__get_ontology` for the head revision, then `mcp__plugin_context-graph_ContextGraph__get_ontology_version` (newest) and find the entry the user means under its section (`## Entities`, `## Definitions`, `## Relationships`, `## Metrics`, `## Processes`, and so on). When the entry is unclear, list the candidate headings and ask with `AskUserQuestion`.
3. For a rule, call `mcp__plugin_context-graph_ContextGraph__get_imported_model` (with `search` for the type) so the rule uses real type ids, field names and picklist values: `Type where field op value`, operators `=`, `!=`, `>`, `>=`, `<`, `<=`, joined with `and`; `undetermined` when the data cannot decide. For an entity, `Source:` names the imported type.
4. Call `mcp__plugin_context-graph_ContextGraph__edit_ontology_entry` with `section`, `name`, and only what changes: `newName`, `prose`, `properties` (for example `{"rule": "…"}`, `{"source": "…"}`, `{"formula": "…"}`; an empty value removes the line). Use `action: "add"` with `prose` and `properties` for a new entry, `action: "remove"` to drop one. The tool stages the change and returns the diff of everything staged against the original version. Relay the diff to the user in a fenced block (trim unrelated hunks) and say clearly that nothing is saved yet.
5. Ask whether there is another change; stage each the same way. When the user says they are done, show the full diff once more (`show_ontology_changes`) and ask with `AskUserQuestion`: "Save these N changes as draft vN+1?" with options "Save", "Keep editing", "Discard".
   - **Save**: call `mcp__plugin_context-graph_ContextGraph__save_ontology_changes` with the head revision from a fresh `get_ontology`. If it reports that a newer version was saved meanwhile, show `compare_ontology_versions` between the original and the newest version, and ask whether to replay the edits onto it (`rebase: true`) or discard. Report the new draft version in one line and offer `publish` (a draft is not live until published).
   - **Discard**: call `mcp__plugin_context-graph_ContextGraph__discard_ontology_changes`.
   - On `INVALID_REQUEST` from save, the server's parser named the bad heading or rule; stage a correcting edit and save again.

## Versions

1. Call `mcp__plugin_context-graph_ContextGraph__get_ontology`. Relay the head revision, the published version, and the version list (number, draft or published, author, date, definition counts). When the user names a version, call `mcp__plugin_context-graph_ContextGraph__get_ontology_version` with it and show the markdown in a fenced block. When the selection is empty, say that `configure_ontology` (or the app's Connect step) must pick sources first. Stop.

## Save

1. Call `get_ontology` for the head revision. Decide where the markdown comes from:
   - **A file the user names**: Read it.
   - **The reviewed context document**: call `mcp__plugin_context-graph_ContextGraph__get_context_document` for the model the user means (default `business-context`) and use its markdown verbatim; this is what the page's "Preview publication" does.
   - **An edit to an existing version**: call `get_ontology_version`, apply the requested change to the markdown, and show the changed lines in a fenced block for confirmation with `AskUserQuestion`.
2. Call `mcp__plugin_context-graph_ContextGraph__save_ontology_version` with the head revision and the markdown. On `INVALID_REQUEST` the parser named the bad heading or rule: fix it (rules target only imported types; use `get_imported_model` for names) and retry. Report the new draft version number in one line and offer `publish`.

## Draft

1. Call `get_ontology`. If the selection is empty, ask which sources and objects to include (`list_sources` and `get_imported_model` list them) and which business questions the draft should answer, then call `mcp__plugin_context-graph_ContextGraph__configure_ontology`.
2. Call `mcp__plugin_context-graph_ContextGraph__request_ontology_draft` with the head revision. It queues a background job; `CONFLICT` means a draft is already running. Tell the user drafts usually take a few minutes and that the versions menu on the page shows the new version when it lands. Poll `get_ontology` at most every 30 seconds for up to ten minutes only when the user asks you to wait; otherwise stop and let them come back.

## Publish

1. Call `get_ontology`. The newest version must be a draft; if the newest is already published, say so and stop. If the user just edited the context document (`/context-graph:graph`), run Save from the context document first so the draft matches what they reviewed.
2. Call `mcp__plugin_context-graph_ContextGraph__preview_ontology_publication` with the head revision. Relay the membership table (definition, before, after, entered, left) and the context changes. On `CONFLICT` ("Source data changed"), the sources were re-imported since the draft: run Save again, then preview again.
3. Publishing is irreversible (a new version is created, the old one stays). Confirm with `AskUserQuestion`: "Publish version N with these changes?" with options "Publish" and "Not now". Only on "Publish", call `mcp__plugin_context-graph_ContextGraph__publish_ontology` with the same `expectedRevision` and the `previewToken` from the preview. A `CONFLICT` here means the draft or the data changed after the preview: preview again and re-confirm.
4. Report the published version in one line. The versions menu on the graph and document pages now shows it as live, and a bridged context model appears per source (`list_context_models`).

## Compare

1. Call `get_ontology` for the version list. Ask which two versions when the user did not say (default: published and newest). Call `mcp__plugin_context-graph_ContextGraph__compare_ontology_versions` with `from` and `to` and relay the diff in a fenced block.

## Settings

1. Call `get_ontology` and report `autoDraft`, the questions, and whether a source change is waiting on a person. Apply what the user asks with `mcp__plugin_context-graph_ContextGraph__update_ontology_settings` (`autoDraft` and/or `questions`). When `pendingSourceChange` is set and they want the redraft, run Draft.
