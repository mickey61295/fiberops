# SPEC-M24 — Voice Entry (gap-audit §7-V, P3 lane)

> Third six-task run, task 1. "Wire speech-to-text into the agent panel
> (Tamil + Tanglish). 'ஐந்து ஆயிரம் பீஸ் டெஸ்பாட்ச் SO-1042' → parsed to a
> reviewed plan. This is the deepest muscle there is: speech." Frozen
> before code (2026-08-30).

## 1. Scope

**In:** a mic button in the agent-panel composer that dictates into the
prompt textarea via the browser SpeechRecognition API (the STT decision
from STATE next-actions #28: BROWSER API, zero server dependency, zero new
npm packages — the M13 "no external dependency beyond fetch" precedent).
Language toggle `en-IN ⇄ ta-IN` (persisted in localStorage
`fo.voiceLang`, default `en-IN` — Tanglish speakers get Latin-script
transliteration from the en-IN model; pure-Tamil speakers switch to
ta-IN for Tamil script; both land in the SAME agent panel where GLM
already parses mixed-script input).

Mechanics: continuous + interimResults; interim transcript renders live
in the textarea tail (replaced as it firms up); final results append to
the input with a leading space; toggling the mic off STOPS the session;
an `onend` (browser auto-stop after silence) clears the listening state
without losing text. Unsupported browser → the button renders disabled
with an honest title (`Speech recognition not supported in this browser`)
— no polyfill, no server fallback.

**Out (deferred, documented):** server-side STT (whisper-class) · a
dedicated numeric-confirm TTS loop (the legacy "voice confirm" was
read-back; GLM's review card already covers confirmation visually) ·
dictation into DocScreens/keypad surfaces (the agent panel IS the voice
surface — everything flows through it per C3) · wake-word.

## 2. Design

- `src/lib/agent/voice.ts` — PURE module (no React): `VOICE_LANGS`
  (the two BCP-47 codes + labels), `getSpeechRecognition()` capability
  probe (window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
  — SSR-safe, typeof-window-guarded), `createVoiceSession({ lang,
  onInterim, onFinal, onEnd })` → `{ start, stop } | null`: wires
  continuous=true, interimResults=true, lang; onresult routes
  isFinal→onFinal(finalTranscript) else onInterim(interimTranscript);
  onend→onEnd (once — the handler detaches so a late event after stop()
  is a no-op); start()/stop() guard against null-recognition and double
  starts; recognition errors map to onEnd (graceful — mic permission
  denied just ends the session, never throws into the panel).
- `src/components/agent/agent-panel.tsx` — the thin surface: Mic button
  beside Attach (lucide `Mic` / listening = `MicOff` + pulsing-red
  styling + "Stop" label), the lang toggle chip (cycles
  en-IN→ta-IN→en-IN, shows the label, title carries the full language
  name), `listening`/`voiceLang` state, the session effect wires
  onInterim → textarea tail, onFinal → append, onEnd → clear listening.
  Voice text NEVER auto-sends (the two-door principle: the operator
  reviews the transcript, then presses Send — same as typed input).
- Zero schema/menu/route/tool changes. ADR-001 untouched (voice is an
  INPUT channel, not a write path).

## 3. Tests

`tests/unit/voice.test.ts`:
1. VOICE_LANGS shape: exactly en-IN + ta-IN with labels.
2. getSpeechRecognition(): null when the globals are absent (simulated
   by deleting both — the SSR/unsupported case); the ctor when present.
3. createVoiceSession wiring: continuous/interimResults/lang set;
   onresult routes interim vs final; onend fires onEnd exactly once
   (late second end is a no-op after detach).
4. start/stop guards: start on a null-recognition environment returns
   the null session shape and never throws; stop() before start() is a
   no-op.
5. Component contract pins (the M22 readFileSync precedent): the panel
   source imports the voice module, carries the mic button + lang chip +
   localStorage key; no OTHER component imports voice.ts (single surface).

## 4. Acceptance gates

tsc src/ 0 errors · vitest (968+N) · eval_routing --static PASS ·
context_check pins bumped (+ voice.ts + voice.test.ts file pins) → NO
DRIFT · route_smoke_m22 regression (the agent panel surface is shared)
· LIVE browser-verified: mic button renders, lang chip toggles, the
unsupported-environment title degrades honestly (headless Chromium has
no SpeechRecognition — the disabled state is the verifiable surface
there), zero console errors.

## 5. Implementation record (filled at ship time)

- voice.ts shipped as specced; the session's onend detach also guards
  onerror (mic-denied maps to onEnd — graceful stop, toast carries the
  honest reason in the panel).
- agent-panel: Mic button + lang chip + session effect; listening pulse
  via `animate-pulse`; interim text rendered into the textarea tail with
  the pre-voice base preserved (base kept in a ref; Interim =
  baseRef + interim).
- Tests 5 (lang shape / probe null+ctor / wiring interim+final+once-end
  / guards / panel source pins) → 973 vitest.
- Gates: tsc src 0 · 973 vitest · eval --static PASS · context_check
  545→547/547 NO DRIFT · m22 smoke 19/19 · m9 38/38 regression · LIVE
  browser check on the panel (mic disabled-state title + lang chip +
  zero console errors), screenshot download/m24-voice-panel.png.
