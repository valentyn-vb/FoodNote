# One active goal: POST replaces, PATCH mutates, enforced by a partial unique index

A user has at most one `active` Goal. #29 wires the two write paths that act on
it, and they behave differently on purpose:

- **`POST /goals`** always creates a new `active` goal and, in the same
  transaction, flips the previous active one to `replaced`. It never returns
  409 — re-running it is the "start a fresh plan" gesture. `startWeightKg` and
  `startDate` are captured server-side from Current Weight at creation and are
  immutable thereafter.
- **`PATCH /goals/current`** mutates the _existing_ active row in place —
  `targetWeightKg` and/or `preferredWeeklyChangeKg` only. The `id`, `status`,
  and the `startWeightKg`/`startDate` baseline are untouched. `404` when no
  active goal exists.

The distinction is load-bearing, not incidental. A plan tweak from Settings
(PATCH) must not reset the progress baseline or mint a new goal id, or the
dashboard's "since you started" framing and any client holding the goal id
would break. Starting over (POST) is exactly when resetting the baseline is
correct. Two verbs, two intents.

At most one `active` per user is enforced by the database, not just the service
logic: this ticket's migration adds a **partial unique index** —
`CREATE UNIQUE INDEX ... ON goals (userId) WHERE status = 'active'`. The
replace-then-insert runs in a transaction; the index is the backstop that makes
a duplicate-active state unrepresentable even under a logic bug. We deliberately
did **not** add retry/serialization for the rare concurrent double-`POST`: the
index rejects the loser and it surfaces as a 500, which is acceptable for the
MVP and cheaper than getting SERIALIZABLE retry semantics right. Adding a
graceful 409 would contradict the contract's "no 409 on `POST /goals`", so we
leave it.

The index ships here, in #29, rather than with the entity in #27: the
constraint is only meaningful alongside the logic that relies on it, and
bundling them keeps the "why" in one place. A future reader seeing two ways to
change a goal — one that resets the baseline and one that doesn't — would
otherwise wonder which is authoritative and why the partial index lives apart
from the table definition.
