---
description: Edit the context graph and business document (steps 3 and 4 of the Context graph app) from Claude Code, revision by revision, while the browser page follows along. TRIGGER when the user wants to change a concept, definition, workflow, rule or section of the context graph or business document, review or comment on sections, compare revisions, roll a section back, or says 'edit the context graph', 'change this definition', 'update the business document', 'what changed in revision'. SKIP when the user wants to publish or draft the ontology (use /context-graph:ontology) or is not signed in yet (use /context-graph:setup).
argument-hint: "[edit|review|history|revert] [context-model-id]"
allowed-tools: ["Bash", "AskUserQuestion", "mcp__plugin_context-graph_ContextGraph__list_context_models", "mcp__plugin_context-graph_ContextGraph__get_context_model", "mcp__plugin_context-graph_ContextGraph__get_context_document", "mcp__plugin_context-graph_ContextGraph__get_context_graph", "mcp__plugin_context-graph_ContextGraph__edit_context_section", "mcp__plugin_context-graph_ContextGraph__save_context_revision", "mcp__plugin_context-graph_ContextGraph__comment_context_section", "mcp__plugin_context-graph_ContextGraph__compare_context_revisions", "mcp__plugin_context-graph_ContextGraph__preview_context_publication", "mcp__plugin_context-graph_ContextGraph__get_imported_model", "mcp__plugin_context-graph_ContextGraph__search_entities", "mcp__plugin_context-graph_ContextGraph__get_plugin_activity"]
---

# Context graph: Graph and document

The context model is one versioned object shown two ways: the **Context graph** page (step 3) draws its concepts, workflows, findings and imported objects; the **Document** page (step 4) shows the same sections as markdown. Every commit creates the next revision. The pages poll the API and show a "Claude Code" activity panel, so a revision committed here appears on screen within a few seconds without a refresh.

Work one section per commit. Read before every write: each write carries the revision you read as `expectedRevision`, and the server refuses (`CONFLICT`) when someone else, or the discovery agent, landed a newer revision first.

**CLI commands** available via Bash (all paths relative to `${CLAUDE_PLUGIN_ROOT}/dist/commands/`):

| Command | Description |
|---------|-------------|
| `pageLink.js --page graph [--context <id>] [--node <id>]` | Link to the graph page, optionally focused on one node |
| `pageLink.js --page document [--context <id>] [--section <id>]` | Link to the document page, optionally focused on one section |

## Modes

Read `$ARGUMENTS` first. If its first token is one of the modes below, run that mode. Otherwise run `edit` and treat `$ARGUMENTS` as the request. A second token that looks like a context model id (`business-context` or `ontology:<connectionId>`) selects the model; otherwise pick it in step 1.

| Mode | Trigger | What it does |
|------|---------|--------------|
| `edit` | `edit` (default) | Change headings, prose or rules of sections and commit each as a revision |
| `review` | `review` | Read sections, approve them or request changes with comments |
| `history` | `history` | List revisions, diff two of them, open an old one on the page |
| `revert` | `revert` | Put a section back to the text it had in an earlier revision (as a new revision) |

## Pick the model and open the page

1. Call `mcp__plugin_context-graph_ContextGraph__list_context_models`. With one model, use it. With several, ask with `AskUserQuestion`: the discovery model (`business-context`) holds what the agent found; an `ontology:<connectionId>` model is the bridged view of a published ontology. If none exist, tell the user to run discovery in the app first and stop.
2. Call `mcp__plugin_context-graph_ContextGraph__get_context_model` with the chosen `proposalId`. Note the **revision** and the section list (id, heading, rule, review state). Print the page link so the user can watch:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/commands/pageLink.js" --page graph --context <proposalId>
   ```

   Relay the `url` from the JSON line as a clickable link. The page shows an "agent active" indicator while this plugin is writing.

## Edit

3. Find out what the user wants changed. When it is unclear which section they mean, list the candidate headings and ask with `AskUserQuestion`. When the change is a rule, call `mcp__plugin_context-graph_ContextGraph__get_imported_model` (with `search` for the type) to use real field names and picklist values, and `mcp__plugin_context-graph_ContextGraph__search_entities` to check a few rows. A rule is `Type where field op value`, operators `=`, `!=`, `>`, `>=`, `<`, `<=`, joined with `and`; anything the data cannot decide stays `undetermined`.
4. Call `mcp__plugin_context-graph_ContextGraph__edit_context_section` with `proposalId`, the `expectedRevision` you read, `sectionId` (preferred) or `heading`, and only the fields that change (`newHeading`, `body`, `rule`) plus a short `note`. One section per call.
   - On success the tool names the new revision. Tell the user in one line, for example "Committed revision 7: tightened Customer." Do not paste the document back.
   - On `CONFLICT`, re-read with `get_context_model`, tell the user what changed, and retry with the new revision.
   - On `INVALID_REQUEST`, the server rejected the rule or heading; read the reason, fix it (usually the type or field name), and retry. Duplicated headings are repaired by the tool itself in the same commit (later duplicates get a numbered suffix); it says so in its result.
   - Only for edits that touch several sections at once, call `get_context_document`, apply every change to the markdown keeping each section and its `Context section`, `Evidence`, `Answers`, `Questions` and `Review` lines exactly, and commit once with `save_context_revision` (the frontmatter must keep the revision you read).
5. Ask whether there is another change. Continue until the user says they are done, then go to Wrap up.

## Review

3. Call `mcp__plugin_context-graph_ContextGraph__get_context_document` and walk the sections the user cares about (all of them when they say "review everything"). For each, summarize the prose and rule in one line and ask with `AskUserQuestion` whether to approve, request changes, or skip.
4. For "approve" call `mcp__plugin_context-graph_ContextGraph__comment_context_section` with `decision: "approve"` and a short body. For "request changes" ask what is wrong, then call it with `decision: "request_changes"` and that text as the body. Each call creates the next revision, so re-read the revision from the tool result before the next call.
5. When done, remind the user that "Ask agent to revise" on the page sends the open comments to the discovery agent. Go to Wrap up.

## History

3. The current revision number from step 2 is the newest; revisions run from 1 to it. Ask which two to compare when the user did not say (default: previous and current). Call `mcp__plugin_context-graph_ContextGraph__compare_context_revisions` with `from` and `to` and relay the diff in a fenced block, trimming hunks the user did not ask about.
4. To show an old revision on the page, the user opens the versions menu on the graph or document page and picks it; there is no link parameter for a past revision. Offer the document link for the current revision with `pageLink.js --page document --context <proposalId>`.

## Revert

3. Call `mcp__plugin_context-graph_ContextGraph__get_context_document` twice: once for the current revision and once with `revision` set to the revision the user wants to go back to. Find the section in both by its `Context section` id.
4. Show the before/after prose and rule in a short fenced block and confirm with `AskUserQuestion`. Then call `mcp__plugin_context-graph_ContextGraph__edit_context_section` on the current revision with the old `newHeading`, `body` and `rule` and a note like "revert Customer to r4". This lands as a new revision; history is never rewritten.

## Wrap up

6. Call `mcp__plugin_context-graph_ContextGraph__get_plugin_activity` with `limit: 5` and list what this session committed (one line per revision). If the user wants the reviewed model to become the live ontology, point them to `/context-graph:ontology publish`.
