# Items sum in the client as an editing aid, and a hand-set total wins

`CONTEXT.md` says Meal Items "illustrate the meal; they are never summed by the
server", and `shared/src/meals.ts` says the entry-level totals are the source of
truth. Ticket #39 puts the AI preview's items behind editable inputs, which
raises the question that phrasing doesn't answer: when the user fixes one item,
what happens to the meal's totals?

We sum the items **in the client**, and stop the moment the user sets a total by
hand. Concretely: a Parsed Meal arrives showing the totals the model returned,
untouched. Edit, add or delete an item and the four totals re-derive from the
items. Type into a total and the link breaks for good — the badge says so, the
items go back to being illustration, and both are posted exactly as shown.

## Why not the obvious alternatives

**Totals-only editing** — items rendered read-only — is the literal reading of
"never summed", and it was the starting point. It fails the case the feature
exists for: the model gets one of four items wrong, and the user's only recourse
is mental arithmetic against a number they were already unsure of. The preview
step's whole purpose is making a bad parse cheap to correct.

**Flipping the model** — items become the source of truth, the server sums them
— is coherent, and we rejected it for two reasons. Manual entries have no items
at all, so the server would need a "totals given directly" path anyway, and we'd
have two ways to mean the same thing. And it would make the server the arbiter
of a number the user explicitly set, which is backwards: a person who overrides
1 040 kcal to 900 knows something the breakdown doesn't.

**Scaling the items to match an overridden total** fabricates per-item numbers
neither the user nor the model ever stated. Not considered further.

## What this commits us to

A stored Meal Entry whose `items` do not add up to its `totalCalories` is
**valid**, not corrupt. Anything reading meals must take the totals and ignore
the breakdown's arithmetic — which is what the dashboard already does
(ADR-0005), and what the server already does by never checking.

The consequence to watch: if a future feature wants per-item nutrition analysis
across a user's history, those items are of unknown fidelity — some are the
model's, some hand-edited, some orphaned by an override. That feature needs its
own provenance, not a retroactive assumption that items were ever authoritative.

The rule lives in `frontend/src/lib/meal-draft.ts` as pure functions, separate
from the drawer, because it is the one genuinely subtle piece of behaviour in
the flow and it should have a statement that doesn't require reading a
component. There is no frontend test runner yet to exercise it — noted as a gap
when #39 was planned.
