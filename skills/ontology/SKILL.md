---
description: Manage ontology versions from Claude Code: read versions, save a draft, ask the model for a draft, preview exact membership changes, publish, compare versions and set automatic drafting. TRIGGER when the user wants to publish the ontology, save or draft an ontology version, see what publishing would change, diff ontology versions, or turn auto-draft on or off, or says 'publish the ontology', 'new ontology version', 'what would publishing change', 'compare ontology versions'. SKIP when the user wants to edit sections of the context graph or business document (use /context-graph:graph).
argument-hint: "[versions|save|draft|publish|compare|settings]"
allowed-tools: ["Bash", "AskUserQuestion", "Read", "mcp__plugin_context-graph_ContextGraph__get_ontology", "mcp__plugin_context-graph_ContextGraph__get_ontology_version", "mcp__plugin_context-graph_ContextGraph__save_ontology_version", "mcp__plugin_context-graph_ContextGraph__configure_ontology", "mcp__plugin_context-graph_ContextGraph__request_ontology_draft", "mcp__plugin_context-graph_ContextGraph__preview_ontology_publication", "mcp__plugin_context-graph_ContextGraph__publish_ontology", "mcp__plugin_context-graph_ContextGraph__update_ontology_settings", "mcp__plugin_context-graph_ContextGraph__compare_ontology_versions", "mcp__plugin_context-graph_ContextGraph__get_context_document", "mcp__plugin_context-graph_ContextGraph__list_context_models", "mcp__plugin_context-graph_ContextGraph__list_sources", "mcp__plugin_context-graph_ContextGraph__get_imported_model"]
---

# Context graph: Ontology versions

The ontology is the reviewed model of the business: immutable numbered versions, one of them published. Publishing runs the exact definitions against the imported records, so the preview shows how many records enter or leave each definition before anything changes. The versions menu on the graph and document pages (steps 3 and 4) shows the same versions and marks the published one as live; it refreshes while this plugin works.

Every write takes the ontology **head revision** from `get_ontology` as `expectedRevision`. Read it right before each write.

## Modes

Read `$ARGUMENTS` first. If its first token is one of the modes below, run that mode. Otherwise run `versions`.

| Mode | Trigger | What it does |
|------|---------|--------------|
| `versions` | `versions` (default) | List versions and jobs, read one version's markdown |
| `save` | `save` | Save markdown (from a file, the context document, or edits to a version) as the next draft |
| `draft` | `draft` | Ask the model to draft the next version from the configured sources |
| `publish` | `publish` | Preview membership changes, confirm, publish the newest draft |
| `compare` | `compare` | Diff two versions |
| `settings` | `settings` | Automatic drafting and its business questions |

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
