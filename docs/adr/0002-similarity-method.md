# ADR-0002: Hybrid similarity with local multilingual embeddings and BM25

- Status: proposed
- Date: 2026-11-15
- Owner: Architecture
- Requirements: US-04, US-05, NFR-02, NFR-06, Q9, Q11, Q12

## Context

A false "nothing similar exists" is the worst error (NFR-02). Ideas are described in free text with different words than the records ("agents paying each other" against "machine-to-machine USDC settlement"). Many records have short descriptions. The team may ask in Portuguese (Q12). The server runs on the user's machine (ADR-0001), so it cannot depend on a paid API key.

## Options

1. **Keyword search only (BM25).** Fast and explainable; misses paraphrases, which is exactly the false negative to avoid.
2. **Embeddings through a hosted API (OpenAI, Voyage, others).** Good quality; every user would need a key and pay per query.
3. **Local sentence embeddings** with `@huggingface/transformers` on CPU. No key, works offline after the model download; quality below the best hosted models.
4. **Hybrid: local embeddings plus BM25, fused.** Embeddings catch paraphrases; BM25 catches exact names and rare terms (protocol names, standards such as ERC-8004) that small embedding models blur.

## Decision

Option 4.

- **Model**: a quantized multilingual MiniLM sentence-embedding model (for example `paraphrase-multilingual-MiniLM-L12-v2` in ONNX form), 384 dimensions, pinned by revision. Multilingual, so a Portuguese idea matches English records. Downloaded on first use and cached by `transformers.js`; file hashes checked. The exact model and its download size are confirmed by Engineering against the eval set.
- **Record text embedded**: `name`, `description`, category labels and event or cohort name.
- **Keyword index**: BM25 over `name`, `aliases`, `description` and category labels, with an in-memory library such as MiniSearch.
- **Fusion**: reciprocal rank fusion of the semantic and keyword rankings, `score = Σ 1 / (60 + rank)`. The order of results follows the fused score.
- **Labels** (Product: High, Medium, Low), from the cosine similarity of the semantic part, with provisional thresholds calibrated on the eval set:
  - High: cosine ≥ 0.60
  - Medium: 0.45 to below 0.60
  - Low: below 0.45, down to the noise floor
  - A result that enters the top `limit` only through an exact name or alias match is labeled at least Medium.
- **Noise floor (Q9)**: results whose cosine is below 0.25 **and** that have no keyword hit are not shown. Everything above the floor within `limit` is shown and labeled, never hidden (US-05). The floor is set as the highest value that keeps recall at 10 at or above 0.90 on the eval set.
- **Default and maximum (Q11)**: 5 results by default, 10 at most.
- **Registrai entries** are ranked with the same method, using their name and summary, embedded at query time and cached in memory (ADR-0005).
- **Thresholds live in a versioned config file** (`config/similarity.json`), not in code, and change only with an eval run attached to the pull request.

## Consequences

- Good: no key, no per-query cost, works offline for the dataset part, multilingual by default, explainable through the keyword part.
- Bad: first use needs a model download; CPU embedding adds tens of milliseconds per text; Registrai summaries not seen before must be embedded at query time (cached afterwards).
- Keyword matching is English-centric, so a Portuguese query relies on the semantic part alone.
- The eval set becomes part of the product: without it, the thresholds are guesses. Building it is a task for Engineering with the team's weekly research as input.
