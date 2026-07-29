# "Not food" is a successful AI Parse outcome, and 502s are terminal

`POST /meals/ai-parse` answers `200` with a discriminated union on `parsed`: a
Parsed Meal (`parsed: true`) or a verdict (`parsed: false, reason`). "That isn't
food" is therefore **not** an error. Ticket #38's "Done when" says the opposite —
"garbage input → 400" — so this ADR records why the frozen contract (#26,
`shared/src/meals.ts`) wins.

Reason: whether a description names food is a _recognition judgment the model
makes_, not a property of the request the server can assert. `"asdfghjkl"` is a
well-formed request; we processed it and the answer was no. A `4xx` would claim
the client sent something malformed, and the server can only reach that verdict
_after_ paying OpenAI — so the status code would depend on the model's opinion.
It also collapses two different frontend states ("fix your input" vs "that isn't
food") into one, when only the second carries a `reason` worth showing. `400` is
reserved for what `aiParseRequestSchema` rejects — empty, under 3 or over 500
characters — which never reaches the model and so costs nothing.

**Two schemas, deliberately.** Strict Structured Outputs require that "the root
level object of a schema must be an object, and not use `anyOf`", so
`aiParseResponseSchema` cannot be the model's output schema. The model-facing
schema (nested union under one `result` key, `backend/src/meals/openai-meal-parser.ts`)
is a provider implementation detail and stays in the backend; the wire union
stays in `shared/`. The adapter maps between them and re-validates the mapping
against the frozen schema before responding, so a model that drifts produces a
`502` rather than a contract violation.

**502s are terminal — no retry.** The contract originally said "invalid JSON
after retry". We do not retry, because strict decoding only fails for three
documented reasons and none is fixed by re-issuing the same request: a safety
refusal is input-deterministic, truncation recurs identically at the same
`max_output_tokens`, and the content filter is likewise input-determined. The
failures that _are_ transient — connection errors, 429s, 5xx — are retried by
the OpenAI SDK below our seam (its default is two attempts; we configure one, see
`meals.module.ts`). So a retry here would double the bill
and the latency on a path that is already lost. `max_output_tokens` is set
loosely (2000) precisely because truncation has no second chance; the failure
kind is logged so the mix can prove or disprove this reasoning later.

**Two tightenings to the frozen contract.** `aiParsedMealSchema.confidenceNote`
gained `.min(1)` and `mealName` gained `.trim().min(1).max(200)`. Both are
narrowings, and we are the only producer. `mealName` was a genuine defect: a
Parsed Meal is confirmed by posting it to `POST /meals`, whose `mealName` is
capped at 200, so an unbounded name previewed at `200` and then failed with `400`
on confirm. Note that strict mode cannot express string lengths (its supported
string keywords are `pattern` and `format` only), so these bounds are enforced by
the re-validation, not by the decoder — the prompt asks for a short name so the
common case never reaches that check.

Consequences: nothing is stored by a parse, so there is no cleanup path and no
partial state; the client owns the confirm step. The per-user rate limit shares
its number with the unsuppressible per-IP limit, so users behind one NAT still
share a bucket — see `common/per-user-throttler.guard.ts`. Meal descriptions are
never logged (they are dietary data about an identified user); only outcome,
failure kind, latency, token counts, `userId` and the OpenAI request ID are.
