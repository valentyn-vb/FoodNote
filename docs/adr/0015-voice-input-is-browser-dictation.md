# Voice input is browser dictation, not a server transcription

The mic in the meal drawer uses the browser's own `SpeechRecognition`. It writes
text into the description field and stops there; the field then feeds
`POST /meals/ai-parse` exactly as typed text does. There is no new endpoint, no
new shared schema, and no `CONTRACT.md` row.

The alternative was a `POST /meals/transcribe` route calling OpenAI's
`/v1/audio/transcriptions` (`gpt-4o-mini-transcribe`, $0.003/minute) with the
browser uploading a `MediaRecorder` blob. It was built and then reverted. Both
approaches were about equally good on the thing that matters — the transcript
lands in the field for the user to correct before a parse is spent — so the
decision came down to cost of ownership, and the server route's was much higher:
it needed a second port with a stub, a multipart route (the app's first), a
multer exception filter to turn a size limit into a `413` instead of a `500`, an
OpenAPI entry with a hand-written `multipart/form-data` body, a hoisted OpenAI
client shared by two ports, `rawFetch` taught to withhold its
`Content-Type: application/json` for `FormData`, and unit + e2e specs. Seventeen
files against two.

**The cost is Firefox.** Firefox ships no `SpeechRecognition`, so the mic simply
does not appear there — `supported` is false and the control is not rendered,
rather than rendered and dead. Chrome, Edge and Safari cover it. Typing was and
remains the primary path, so this is a missing shortcut on one browser, not a
missing feature.

**It is not a privacy win.** Chrome's recogniser is a cloud service: the audio
leaves the device, to Google instead of to OpenAI via us. What we gained is that
no audio passes through _our_ server and `OPENAI_API_KEY` is not involved, which
removes a route, a rate limit and a per-clip bill — not a data-flow.

Consequences:

- Dictation is append-only against whatever is already in the field: the hook
  snapshots the field at `start` and composes onto it, so "…and a coffee" works
  as a second pass.
- Interim results are shown beside the mic and never written to the field, so
  the field only ever contains words the recogniser committed.
- A 60-second cap exists because Chrome will hold a `continuous` session open far
  longer than a meal description needs, and a forgotten open mic is the failure
  worth guarding.
- Nothing here is covered by the Playwright suite. Driving `SpeechRecognition`
  needs a fake recogniser injected into the page, and the surface under test
  would be the fake. The mic is therefore verified by hand, per browser.
- If Firefox coverage ever matters, or transcription quality becomes a
  complaint, the reverted server route is the answer and this ADR is the record
  of what it costs.
