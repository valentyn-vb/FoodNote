# The weight journal is append-only, not one-entry-per-day

The contract (#26), the data model (#27), and the weights API ticket (#31) all
originally specified **one Weight Entry per user per Tracking Day** — `POST
/weights` was to upsert-or-409 against a `(userId, day)` unique index. Building
the API we changed this to an **append-only journal**: `POST` always inserts a
new entry (201), any number per day; entries are corrected via `PATCH
/weights/:id` and `DELETE /weights/:id`. The `(userId, day)` unique index and
the redundant `day` column are gone from `weight_entries` (see the InitialSchema
migration).

Reason: nothing in the domain actually needs a canonical daily weight. **Current
Weight** is already defined as "the most recent Weight Entry" — ordered by
`recordedAt`, not grouped by day — so a plain time-ordered list serves it
directly, and the dashboard trend chart just plots the list. One-per-day, by
contrast, forced three costs the model didn't want: a redundant stored `day`
column purely to back the unique index (it had no migration and was flagged as
owed tech debt in its own entity comment); a 409/upsert branch on `POST` whose
"saving again silently replaces today's weight" UX the log drawer had to
apologise for in copy; and a uniqueness rule that had to pick a day boundary,
entangling it with the UTC-only timezone trade-off. Append-only + edit/delete by
id removes all three: the user edits or deletes a specific entry instead of the
server overwriting one, and `recordedAt` alone defines ordering.

#26/#27/#31 had already been written (and #26 merged) against the one-per-day
model, so this is a **forward amendment**. It surfaced twice: #29 (Profile &
Goals API) collapsed the two clashing `WeightEntry` classes onto the single
migration-matching entity and made `POST /weights` a plain append as a fix "in
scope by necessity"; #31 (Weights API) then settled append-only as the model —
adding the full `PATCH`/`DELETE`/range-`GET` surface and the e2e tests — and is
the ticket that owns this decision. Both go the same direction (plain list,
`weights/` dir). The change is reflected in `shared/src/weights.ts` (the frozen
contract) and the `weight_entries` schema, not a silent edit to the historical
tickets. A future reader seeing `POST` return 201 unconditionally, and no
per-day constraint anywhere, would otherwise wonder why the plan's "one entry
per day, editable" became a plain journal. `Tracking Day` still governs
dashboard totals and the `from`/`to` range bounds on `GET /weights`; it just no
longer governs weight uniqueness, because there is none.
