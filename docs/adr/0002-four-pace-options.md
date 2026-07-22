# Re-froze the pace set to four options (added 1.0 kg/week)

The API contract (#26) originally froze three paces — 0.25 / 0.5 / 0.75 kg/week.
Building the calorie module (#28) we added a fourth, **1.0 kg/week**, changing
`paceSchema` to `z.literal([0.25, 0.5, 0.75, 1.0])`.

Reason: #28 requires a safety floor that "hides violating options." With a
0.75 max, the floor almost never binds for realistic users, making the
hide logic dead code. A 1.0 kg/week option produces an ~1100 kcal/day deficit
that genuinely drops below the 1200/1500 floor for many users, so hiding
becomes load-bearing and the feature coheres. 1.0 also serves as
`MAX_SAFE_PACE_KG` — the medical ceiling and the top preset are the same number.

#26 had already merged to `main`, so this is a **forward amendment** to
`goals.ts` carried on the #28 branch and announced to the team as a deliberate
re-freeze — not an edit to the (now historical) #26 branch. A future reader
seeing four paces (and 1.0 doubling as both a preset and the ceiling) would
otherwise wonder why the earlier three-pace plan changed.
