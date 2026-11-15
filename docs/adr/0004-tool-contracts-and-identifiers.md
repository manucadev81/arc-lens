# ADR-0004: Tool contracts and stable identifiers

- Status: proposed
- Date: 2026-11-15
- Owner: Architecture
- Requirements: US-04, US-05, US-06, US-07, US-08, US-09, US-15, BR2, BR4, Q11

## Context

Product proposed three tools (`search_similar_projects`, `get_category_gaps`, `lookup_project`), the answer structure and the texts. Agents pick tools from their names and descriptions, and need stable identifiers to choose among several matches (F3). A person and an agent must get the same facts (US-08). One project can appear in several sources, and answers count projects, not appearances (`03-architecture.md` section 5.6).

## Decision

### Tool names

The Product names are final: `search_similar_projects`, `get_category_gaps`, `lookup_project`. Snake case, verb first, no server prefix (MCP clients already namespace tools by server). The descriptions are the Product texts in `02-product.md` section 3.4, fixed strings in the code.

All three tools have the annotations `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true` (they may call Registrai).

### Identifiers

Two levels:

- **Occurrence id**: one hackathon record, one grant record or one Registrai entry.
- **Project id**: a confirmed group of occurrences (`data/projects.json`). An occurrence in no confirmed project is a project on its own, and its project id is its occurrence id.

| Kind | Level | Example |
|---|---|---|
| `hack` | occurrence | `hack:ethglobal-cannes-2026:examplemarket` |
| `grant` | occurrence | `grant:circle-2026:examplepay` |
| `registrai` | occurrence | `registrai:exampledex` |
| `proj` | project | `proj:examplemarket` |

- Each segment matches `[a-z0-9]+(-[a-z0-9]+)*`; the whole id is at most 120 characters.
- The slug of an occurrence comes from the source's own identifier for the project (the path of its page), not from its position in a list, so it survives a refresh.
- A duplicate slug in the same scope gets `-2`, `-3`.
- An id is never reused. A renamed or merged record or project keeps a line in `data/aliases.json` from the old id to the new one.
- `registrai:` ids use Registrai's own slug and are as stable as Registrai keeps them.
- `lookup_project` accepts any of these ids. An occurrence id that belongs to a confirmed project returns the project card.

Regex: `^(hack|grant):[a-z0-9]+(-[a-z0-9]+)*:[a-z0-9]+(-[a-z0-9]+)*$|^(registrai|proj):[a-z0-9]+(-[a-z0-9]+)*$`

### Shared output types

```json
{
  "$defs": {
    "occurrence": {
      "type": "object",
      "required": ["id", "kind", "prizeOrGrant", "source"],
      "additionalProperties": false,
      "properties": {
        "id": { "type": "string" },
        "kind": { "enum": ["hackathon_project", "grant_recipient", "directory_entry"] },
        "context": { "type": ["string", "null"] },
        "prizeOrGrant": {
          "type": "object",
          "required": ["value"],
          "additionalProperties": false,
          "properties": {
            "value": { "enum": ["winner", "not_winner", "unknown", "grant", "not_applicable"] },
            "grantDate": { "type": ["string", "null"] }
          }
        },
        "source": {
          "type": "object",
          "required": ["name", "url", "dataDate"],
          "additionalProperties": false,
          "properties": {
            "name": { "type": "string" },
            "url": { "type": "string", "format": "uri" },
            "dataDate": { "type": "string", "format": "date" }
          }
        }
      }
    },
    "projectCard": {
      "type": "object",
      "required": ["id", "name", "occurrences", "status", "description"],
      "additionalProperties": false,
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "similarity": { "enum": ["high", "medium", "low", "keyword_match"] },
        "exactName": { "type": "boolean" },
        "occurrences": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/occurrence" } },
        "possibleSameAs": { "type": "array", "items": { "type": "string" } },
        "status": {
          "type": "object",
          "required": ["value", "evidence"],
          "additionalProperties": false,
          "properties": {
            "value": { "enum": ["live", "not_live", "unknown"] },
            "evidence": { "type": "string" }
          }
        },
        "description": { "type": "string", "maxLength": 400 },
        "categories": { "type": "array", "items": { "type": "string" } },
        "onchainVolume": {
          "type": ["object", "null"],
          "additionalProperties": false,
          "properties": {
            "usdLast7Days": { "type": "number" },
            "fromRegistrai": { "const": true }
          }
        }
      }
    },
    "coverage": {
      "type": "object",
      "required": ["searched", "partiallySearched", "notSearched", "datasetUpdated", "stale"],
      "additionalProperties": false,
      "properties": {
        "searched": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["source"],
            "additionalProperties": false,
            "properties": {
              "source": { "type": "string" },
              "dataDate": { "type": "string", "format": "date" },
              "fetchedAt": { "type": "string", "format": "date-time" },
              "fromCache": { "type": "boolean" },
              "stale": { "type": "boolean" }
            }
          }
        },
        "partiallySearched": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["source", "reason"],
            "properties": {
              "source": { "type": "string" },
              "reason": { "enum": ["deadline"] },
              "notComparedByMeaning": { "type": "integer", "minimum": 0 }
            }
          }
        },
        "notSearched": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["source", "reason"],
            "properties": {
              "source": { "type": "string" },
              "reason": { "enum": ["unavailable", "rate_limited", "timeout", "model_unavailable"] }
            }
          }
        },
        "datasetUpdated": { "type": "string", "format": "date" },
        "stale": { "type": "boolean" }
      }
    },
    "attribution": {
      "type": ["object", "null"],
      "required": ["text", "url", "license"],
      "properties": {
        "text": { "const": "Registrai, builder.registrai.cc, CC BY 4.0" },
        "url": { "const": "https://builder.registrai.cc" },
        "license": { "const": "CC BY 4.0" }
      }
    }
  }
}
```

- Dataset sources in `searched` carry `dataDate` (and `stale: true` when that source is more than 14 days older than the dataset); Registrai carries `fetchedAt` and `fromCache`.
- Semantic matching unavailable appears as `{ "source": "semantic matching", "reason": "model_unavailable" }` in `notSearched`.
- `attribution` is an object whenever any card, occurrence or count in the answer came from Registrai, and `null` otherwise (BR2).
- `possibleSameAs` lists other project ids in the same answer that may be the same project (unconfirmed link).

### `search_similar_projects`

Input:

```json
{
  "type": "object",
  "required": ["idea"],
  "additionalProperties": false,
  "properties": {
    "idea": { "type": "string", "minLength": 10, "maxLength": 2000 },
    "limit": { "type": "integer", "minimum": 1, "maximum": 10, "default": 5 }
  }
}
```

Output `structuredContent`: `{ "summary": string, "searchMode": "hybrid" | "keyword_only", "complete": boolean, "results": projectCard[], "coverage": coverage, "attribution": attribution }`.

- Every card has `similarity`. In hybrid mode: `high`, `medium` or `low` for results with a cosine value, and `keyword_match` for Registrai entries that the deadline left without an embedding (`03-architecture.md` section 6.1). In keyword-only mode: `keyword_match` for every result. A `keyword_match` card never carries an invented cosine value.
- `complete` is `false` when semantic matching was unavailable or Registrai was not or only partially searched.
- `limit` counts projects; directory-only projects take at most `floor(limit / 2)` of them, and any left out are reported in the summary with `complete: false`. Order: fused rank, ties by id (ADR-0002).

### `get_category_gaps`

Input:

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "category": { "type": "string", "minLength": 2, "maxLength": 200 }
  }
}
```

Output without `category`: `{ "summary": string, "categories": [{ "id", "label", "projectCount" }], "coverage", "attribution" }`.

Output with `category`: `{ "summary": string, "category": { "id": string | null, "label": string, "matchedBy": "known" | "free_text" | "unresolved" }, "verdict": "several" | "few" | "none" | null, "projectCount": integer, "directoryOnlyCount": integer, "directoryOnlyIds": string[], "uncertainLinks": integer, "results": projectCard[], "categories": [...], "coverage", "attribution" }`.

- `projectCount` counts reviewed projects only (sections 5.6 and 6.2 of `03-architecture.md`); `directoryOnlyCount` and `directoryOnlyIds` list unreviewed Registrai directory entries, which never change the verdict; `uncertainLinks` is the number of `possible` pairs among them.
- `summary` is T-04, T-05 or T-06, plus T-19 when merging the uncertain pairs would change the verdict and T-21 when there are directory-only entries. With no reviewed project but directory-only entries, `summary` is T-22, never T-06.
- `verdict` is `null` and `matchedBy` is `unresolved` when a free-text category cannot be resolved because semantic matching is unavailable; the answer then lists the known categories with T-18.
- At most 20 cards are returned, ordered by name.

### `lookup_project`

Input:

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "name": { "type": "string", "minLength": 1, "maxLength": 200 },
    "id": { "type": "string", "maxLength": 120 }
  },
  "anyOf": [ { "required": ["name"] }, { "required": ["id"] } ]
}
```

When both are given, `id` wins.

Output: `{ "summary": string, "match": "one" | "several" | "none", "results": projectCard[], "candidates": [{ "id", "name", "occurrenceCount", "firstSourceName" }], "statusEvidence": [{ "signal", "result", "at" }], "coverage", "attribution" }`. `results` has one card when `match` is `one`; `candidates` is filled when `match` is `several`, one per project.

### Errors

Input that fails the schema, an idea under 10 characters, or an unknown id are returned as a tool result with `isError: true` and the Product text (T-14 or T-15). The server never returns a stack trace or an internal code.

### Text content

Each result also has one text content block with the answer in the Product format (sections 4 and 6 of `02-product.md`), built from the same object as `structuredContent`. A project with several occurrences shows one `Type` line per occurrence, each with its prize or grant and source; the final layout is a Product decision (A-07 in `03-architecture.md`). A snapshot test per Product example (6.1 to 6.4) and per new case (keyword-only, partial hybrid with `keyword_match` entries and T-20, unresolved category, possible duplicate) guards the format.

## Consequences

- Good: agents get typed, validated data; people get the same facts as text; ids survive refreshes, renames and the grouping of occurrences into projects.
- Bad: two renderings of every answer must stay in sync; mitigated by building the text from the structured object only.
- The card changes from one source per card to a list of occurrences; Product must confirm the text layout (A-07).
- If a future MCP revision changes how `structuredContent` or `outputSchema` work, only the MCP adapter changes.
