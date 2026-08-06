# A Plan is committed once, and a second attempt 409s

`POST /api/plan` writes a Profile, a first Weight Entry and a Goal in one
transaction. It exists because `POST /goals` derives `startWeightKg` from the
latest weight entry and therefore requires one to exist — an invariant that, until
now, lived in the frontend as a fixed call order the client had to remember.

**It is a POST, not a PUT.** #110 wrote `PUT` as shorthand and never argued the
verb. `PUT` promises idempotence this operation cannot deliver: every call appends
to the append-only weight journal (ADR-0004) and marks the outgoing goal
`replaced`, so the state after two calls is not the state after one.

**A second call is refused with 409, and this deliberately does not copy
ADR-0003.** There, `POST /goals` replaces the active goal and never 409s, because
starting a fresh plan is a gesture a user makes repeatedly and resetting the
baseline is exactly what they asked for. Replacing a _Plan_ is not the same act:
it drags a weight entry along with it, so a double submit — a double click, or a
retry after a timeout — would silently leave a spare journal entry and a
`replaced` goal behind. There is nothing here that a user needs twice. Changing a
plan later already has a home: `PATCH /profile` and `PATCH /goals/current`.

The check runs before the transaction, so it is a guard and not a lock: two
genuinely concurrent calls can both pass it. What stops them then is the partial
unique index on `(userId) WHERE status = 'active'` (ADR-0003) — the loser's whole
transaction rolls back, so it leaves no spare weight entry behind and surfaces as
a 500 rather than a 409. That is the same trade-off ADR-0003 took for
`POST /goals`, and for the same reason: getting SERIALIZABLE retry semantics right
costs more than the case is worth, and the failure mode is a wrong status code on
a request nobody makes deliberately.

The 409 also makes the endpoint say what the routing layer says. `requireNotOnboarded()`
redirects an onboarded user off `/onboarding`; the endpoint refuses the same
request. That duplication is the point rather than a smell: a Server Action is a
public POST endpoint, so the client-side rule proves nothing about what arrives,
and the trust boundary has to hold the rule too.

**It returns a `GoalResponse`,** not a new `PlanResponse`. An active Goal existing
_is_ the definition of "onboarded", so the goal is precisely the fact the caller's
next question asks about — and no schema nobody reads gets minted. The Server
Action redirects to `/dashboard` and never looks at the body; the OpenAPI document
still needs a response shape, and this is one that already exists.

**There is no `GET /api/plan`.** It would collapse `/profile`'s reads into one,
which is tempting and wrong by the rule the whole server-first migration follows:
the backend changes only where that removes a workaround from the frontend. A
fan-out that works is convenience, not a workaround.

**The transaction lives in a `PlanService` that passes its `EntityManager` into
the three existing services**, each of which gained a `manager?` parameter.
Writing through `manager.save(...)` directly would be shorter and would touch
nothing existing, and it would still be wrong: it would duplicate the
`completed` / `replaced` choice in `goals.service.ts`, which is the only place a
goal status is ever set to `completed` and which ADR-0007 exists to protect.
`GoalsService.create` is therefore reused whole. Its replace-the-active-goal
branch is unreachable from onboarding — that is what the 409 guarantees — but the
same method still serves `POST /goals`.

`recordedAt` is not in the request body. The client used to send
`new Date().toISOString()`; the server stamps it instead, because the goal starts
from whichever entry is latest and a skewed client clock would otherwise choose a
different entry altogether. The weight in a Plan means "what I weigh at the moment
of committing", and the server owns that moment.

Profile editing keeps its three non-atomic calls, as #90 chose. This endpoint is
onboarding's only.
