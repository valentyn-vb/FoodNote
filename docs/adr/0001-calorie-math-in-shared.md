# Calorie math lives in `shared/`, not the backend

The Mifflin-St Jeor / TDEE / pace / safety-floor calculations (ticket #28) are
pure functions in `@foodnote/shared` (`shared/src/calc.ts`), not in the backend.

The backend recomputes `maintenanceCalories` / `calorieTarget` on every profile
and dashboard read, which alone would argue for a server-side home. But the
onboarding plan-selection screen must show projected calories and dates for each
pace _before_ any goal is persisted, so the frontend needs the identical math.
Putting it server-side would force either an extra round-trip per keystroke or a
duplicated implementation — the latter forbidden by our "never duplicate the
contract" rule. Placing the pure functions in the shared contract package gives
both apps one source of truth. Cost: the calc functions become part of the
frozen contract surface and changes ripple to both apps.
