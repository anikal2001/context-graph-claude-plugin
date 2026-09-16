---
description: Edit and manage ontology versions from Claude Code: change one entity, definition, relationship, metric or process and save it as the next draft, read versions, ask the model for a draft, preview exact membership changes, publish, compare versions and set automatic drafting. TRIGGER when the user wants to edit the ontology, change a definition or rule, add or remove an entity, publish the ontology, save or draft an ontology version, see what publishing would change, diff ontology versions, or turn auto-draft on or off, or says 'edit the ontology', 'change this definition', 'publish the ontology', 'new ontology version', 'what would publishing change', 'compare ontology versions'. SKIP when the user wants to edit sections of the context graph or business document (use /context-graph:graph).
argument-hint: "[edit|versions|save|draft|publish|compare|settings]"
allowed-tools: ["Bash", "AskUserQuestion", "Read", "mcp__plugin_context-graph_ContextGraph__get_ontology", "mcp__plugin_context-graph_ContextGraph__get_ontology_version", "mcp__plugin_context-graph_ContextGraph__save_ontology_version", "mcp__plugin_context-graph_ContextGraph__edit_ontology_entry", "mcp__plugin_context-graph_ContextGraph__configure_ontology", "mcp__plugin_context-graph_ContextGraph__request_ontology_draft", "mcp__plugin_context-graph_ContextGraph__preview_ontology_publication", "mcp__plugin_context-graph_ContextGraph__publish_ontology", "mcp__plugin_context-graph_ContextGraph__update_ontology_settings", "mcp__plugin_context-graph_ContextGraph__compare_ontology_versions", "mcp__plugin_context-graph_ContextGraph__get_context_document", "mcp__plugin_context-graph_ContextGraph__list_context_models", "mcp__plugin_context-graph_ContextGraph__list_sources", "mcp__plugin_context-graph_ContextGraph__get_imported_model"]
---

# Context graph: Ontology versions

The ontology is the reviewed model of the business: immutable numbered versions, one of them published. Publishing runs the exact definitions against the imported records, so the preview shows how many records enter or leave each definition before anything changes. The versions menu on the graph and document pages (steps 3 and 4) shows the same versions and marks the published one as live; it refreshes while this plugin works.

Every write takes the ontology **head revision** from `get_ontology` as `expectedRevision`. Read it right before each write.

## Modes

Read `$ARGUMENTS` first. If its first token is one of the modes below, run that mode. Otherwise, when the arguments describe a change, run `edit` with them as the request; with no arguments run `versions`.

| Mode | Trigger | What it does |
|------|---------|--------------|
| `edit` | `edit` or a described change | Change one entry (entity, definition, relationship, metric, process, …) and save it as the next draft version |
| `versions` | `versions` (default without arguments) | List versions and jobs, read one version's markdown |
| `save` | `save` | Save markdown (from a file, the context document, or edits to a version) as the next draft |
| `draft` | `draft` | Ask the model to draft the next version from the configured sources |
| `publish` | `publish` | Preview membership changes, confirm, publish the newest draft |
| `compare` | `compare` | Diff two versions |
| `settings` | `settings` | Automatic drafting and its business questions |

## Edit

1. Call `mcp__plugin_context-graph_ContextGraph__get_ontology` for the head revision, then `mcp__plugin_context-graph_ContextGraph__get_ontology_version` (newest, or the version the user names) and find the entry the user means under its section (`## Entities`, `## Definitions`, `## Relationships`, `## Metrics`, `## Processes`, and so on). When the entry is unclear, list the candidate headings and ask with `AskUserQuestion`.
2. For a rule, call `mcp__plugin_context-graph_ContextGraph__get_imported_model` (with `search` for the type) so the rule uses real type ids, field names and picklist values: `Type where field op value`, operators `=`, `!=`, `>`, `>=`, `<`, `<=`, joined with `and`; `undetermined` when the data cannot decide. For an entity, `Source:` names the imported type.
3. Call `mcp__plugin_context-graph_ContextGraph__edit_ontology_entry` with `expectedRevision`, `section`, `name`, and only what changes: `newName`, `prose`, `properties` (for example `{"rule": "…"}`, `{"source": "…"}`, `{"formula": "…"}`; an empty value removes the line). Use `action: "add"` with `prose` and `properties` for a new entry, `action: "remove"` to drop one. One entry per call; each call saves the next draft version.
   - The tool names the new draft version. Tell the user in one line, for example "Saved draft v15: Customer rule now Account where Type = \"Customer\"." Do not paste the markdown back.
   - On `INVALID_REQUEST`, the server's parser named the bad heading or rule; fix and retry.
   - On `CONFLICT`, re-read `get_ontology` and retry with the new head revision.
4. Ask whether there is another change. When the user is done, offer `publish` (a draft is not live until published).

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
