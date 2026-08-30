# SPEC-M32 — Voice TTS Confirm Loop (the M24 OUT promise)

> Fourth six-task run, task 3. M24 §OUT: "a dedicated numeric-confirm TTS
> loop (the legacy 'voice confirm' was read-back; GLM's review card already
> covers confirmation visually)". Frozen before code (2026-08-30).

## 1. Scope

**In:**
- `src/lib/agent/voice.ts` extended (the M24 pure-module pattern — the panel
  stays the thin surface):
  - `getSpeechSynthesis()` — SSR-safe probe.
  - PURE `planSpeechText(plan)` — the speakable read-back from a pending
    plan: "Plan awaiting your approval. <summary>. Creates N records.
    Updates N records. <side effects, clipped>." Hard cap ~320 chars (the
    shop floor needs the gist, not the ledger). Numbers spoken verbatim.
  - `speak(text, {lang='en-IN', rate=0.95})` — utterance wiring; CANCELS
    any in-flight utterance first (overlapping reads never stack); resolves
    a voice matching the lang prefix when the browser exposes one.
  - `stopSpeaking()` — cancel (the orphaned-audio twin of the mic stop).
- `agent-panel.tsx`:
  - The speaker toggle (Volume2/VolumeX beside the lang chip, localStorage
    `fo.voiceSpeak`, **default OFF** — never surprise audio; the operator
    opts into the talking panel).
  - When a tool-call result turns `isPending` AND the toggle is on →
    `speak(planSpeechText(result.plan))` — the review card now TALKS.
  - Approve → `speak('Committed.')`; Reject → `speak('Rejected.')` (on).
  - Panel close → `stopSpeaking()` (mirrors the M24 orphaned-mic stop).
- Tests: planSpeechText shapes (summary only / creates / updates / side
  effects / the cap), speak wiring against a mocked speechSynthesis
  (cancel-before-speak, lang/rate, no-voices fallback), panel source pins
  (toggle key, isPending speak, approve/reject acks, close stop).

**Out (deferred, documented):** server TTS · localized (ta-IN) plan speech
(plan summaries are English; the lang chip governs STT only) · voice
COMMAND approval (the "yes" keyword — a wake-word-class feature) ·
read-back of agent TEXT answers (plans are THE confirm moment; general
chat stays visual) · rate/pitch settings UI.

## 2. Design

- Plans speak ENGLISH at lang 'en-IN' (every plan summary is English;
  speaking English text with a Tamil voice is worse than useless). The
  rate 0.95 — slightly slow for shop-floor noise.
- The toggle is OFF by default and persists in localStorage — the panel
  must never make noise the operator didn't ask for.
- `speak` is fire-and-forget with cancel-first: a second pending plan
  REPLACES the first read-back (the newest confirm moment wins).

## 3. Tests

1. planSpeechText: summary-only plan; creates/updates counts spoken; side
   effects listed and clipped; the 320-char cap; null/empty plan → ''.
2. speak: cancels in-flight first; sets lang+rate; voice picked by lang
   prefix when present; graceful when no voices (utterance still queued);
   no-op when unsupported.
3. stopSpeaking: cancel called, no-throw when unsupported.
4. Panel source pins: `fo.voiceSpeak` key, the isPending → speak wiring,
   the approve/reject acks, the unmount stopSpeaking.

## 4. Acceptance gates

tsc src/ 0 · vitest (1057+N) · eval --static PASS · context_check NO DRIFT
(+SPEC-M32.md pin) · zero tools/menu/routes/schema change (228/132/165/78
stay) · LIVE browser-verified (toggle persists; a pending plan speaks —
or degrades honestly when the headless browser has no TTS voices).

## 5. Implementation record (filled at ship time)

- voice.ts extended as specced: getSpeechSynthesis probe, PLAN_SPEECH_CAP
  320, PURE planSpeechText (summary + creates/updates counts + ≤3 side
  effects, singular/plural), speak (cancel-first, en-IN, rate 0.95,
  voice-by-lang-prefix, graceful no-ctor), stopSpeaking.
- agent-panel: the 🔇/🔊 toggle (data-testid=voice-speak-toggle) beside the
  lang chip; voiceSpeak state + voiceSpeakRef mirror (the SSE closure never
  goes stale); pending-plan speak at the isPending moment; approve →
  'Committed.', reject → 'Rejected.'; panel close → stopSpeaking() (the
  orphaned-audio twin of the M24 mic stop).
- LIVE (scripts/m32_live_check.sh — the sandbox kills background processes
  between commands, so the whole flow runs in one script): login → panel
  Voice/EN/🔇 → toggle ON → 🔊 + localStorage fo.voiceSpeak=1 → toggle OFF
  → 0 → zero console errors; screenshot m32-voice-confirm.png. The
  headless browser HAS speechSynthesis (the toggle rendered = probe true).
- Tests: voice.test +15 (planSpeechText ×5, speak/stopSpeaking ×7 vs a
  mocked engine, panel source pins ×3) → 1072 vitest; the M24
  single-surface invariant still holds.
- Gates: tsc src/ 0 · 1072 vitest · eval --static PASS · context_check
  564→565/565 NO DRIFT (+SPEC-M32.md pin) · zero tools/menu/routes/schema
  change (228/132/165/78 stay).
