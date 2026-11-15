# ADR-0004: Tool contracts and stable identifiers

- Status: proposed
- Date: 2026-11-15
- Owner: Architecture
- Requirements: US-04, US-05, US-06, US-07, US-08, US-09, US-15, BR2, BR4, Q11

## Context

Product proposed three tools (`search_similar_projects`, `get_category_gaps`, `lookup_project`), the answer structure and the texts. Agents pick tools from their names and descriptions, and need stable identifiers to choose among several matches (F3). A person and an agent must get the same facts (US-08).

## Decision

### Tool names

The Product names are final: `search_similar_projects`, `get_category_gaps`, `lookup_project`. Snake case, verb first, no server prefix (MCP clients already namespace tools by server). The descriptions are the Product texts in `02-product.md` section 3.4, fixed strings in the code.

All three tools have the annotations `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: true` (they may call Registrai).

### Identifiers

Format: `<kind>:<scope>:<slug>` for dataset records and `registrai:<slug>` for directory entries.

| Kind | Scope | Example |
|---|---|---|
| `hack` | event id | `hack:ethglobal-cannes-2026:examplemarket` |
| `grant` | program and cohort | `grant:circle-2026:examplepay` |
| `registrai` | none | `registrai:exampledex` |

- Each segment matches `[a-z0-9]+(-[a-z0-9]+)*`; the whole id is at most 120 characters.
- The slug comes from the source's own identifier for the project (the path of its page), not from its position in a list, so it survives a refresh.
- A duplicate slug in the same scope gets `-2`, `-3`.
- An id is never reused. A renamed or merged record keeps a line in `data/aliases.json` from the old id to the new one; `lookup_project` resolves it.
- `registrai:` ids use Registrai's own slug and are as stable as Registrai keeps them.

Full regex: `^(hack|grant):[a-z0-9]+(-[a-z0-9]+)*:[a-z0-9]+(-[a-z0-9]+)*$|^registrai:[a-z0-9]+(-[a-z0-9]+)*$`

### Shared output types

```json
{
  "$defs": {
    "projectCard": {
      "type": "object",
      "required": ["id", "name", "type", "prizeOrGrant", "status", "description", "source"],
      "additionalProperties": false,
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "similarity": { "enum": ["high", "medium", "low"] },
        "type": {
          "type": "object",
          "required": ["kind"],
          "additionalProperties": false,
          "properties": {
            "kind": { "enum": ["hackathon_project", "grant_recipient", "directory_entry"] },
            "context": { "type": ["string", "null"] }
          }
        },
        "prizeOrGrant": {
          "type": "object",
          "required": ["value"],
          "additionalProperties": false,
          "properties": {
            "value": { "enum": ["winner", "not_winner", "unknown", "grant"] },
            "grantDate": { "type": ["string", "null"] }
          }
        },
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
    "coverage": {
      "type": "object",
      "required": ["searched", "notSearched", "datasetUpdated", "stale"],
      "additionalProperties": false,
      "properties": {
        "searched": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["source", "date"],
            "properties": { "source": { "type": "string" }, "date": { "type": "string", "format": "date" } }
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

`attribution` is an object whenever any card or count in the answer came from Registrai, and `null` otherwise (BR2).

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

Output `structuredContent`: `{ "summary": string, "results": projectCard[], "coverage": coverage, "attribution": attribution }`. Every card has `similarity`. Order: fused rank (ADR-0002).

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

Output with `category`: `{ "summary": string, "category": { "id": string | null, "label": string, "matchedBy": "known" | "free_text" }, "verdict": "several" | "few" | "none", "results": projectCard[], "coverage", "attribution" }`. `summary` is exactly T-04, T-05 or T-06.

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

Output: `{ "summary": string, "match": "one" | "several" | "none", "results": projectCard[], "candidates": [{ "id", "name", "type", "sourceName" }], "statusEvidence": [{ "signal", "result", "at" }], "coverage", "attribution" }`. `results` has one card when `match` is `one`; `candidates` is filled when `match` is `several`.

### Errors

Input that fails the schema, an idea under 10 characters, or an unknown id are returned as a tool result with `isError: true` and the Product text (T-14 or T-15). The server never returns a stack trace or an internal code.

### Text content

Each result also has one text content block with the answer in the Product format (sections 4 and 6 of `02-product.md`), built from the same object as `structuredContent`. A snapshot test per Product example (6.1 to 6.4) guards the format.

## Consequences

- Good: agents get typed, validated data; people get the same facts as text; ids survive refreshes and renames.
- Bad: two renderings of every answer must stay in sync; mitigated by building the text from the structured object only.
- If a future MCP revision changes how `structuredContent` or `outputSchema` work, only the MCP adapter changes.
