/**
 * SPEC-M24 — Voice entry (gap-audit §7-V): the pure speech-to-text session
 * module for the agent panel. BROWSER SpeechRecognition API only (the STT
 * decision — zero server dependency, zero npm packages, the M13 precedent).
 *
 * The panel is the thin surface; ALL logic lives here so it is testable:
 * capability probe, language map, session wiring (interim vs final routing,
 * end-once detach, graceful error→end), and guarded start/stop.
 */

export interface VoiceLang {
  code: string
  label: string
  title: string
}

/** The two shipped languages (BCP-47). Tanglish speakers stay on en-IN
 * (Latin-script transliteration); pure-Tamil speakers switch to ta-IN. */
export const VOICE_LANGS: VoiceLang[] = [
  { code: 'en-IN', label: 'EN', title: 'English / Tanglish (en-IN)' },
  { code: 'ta-IN', label: 'த', title: 'தமிழ் (ta-IN) — Tamil script' },
]

export const DEFAULT_VOICE_LANG = 'en-IN'
export const VOICE_LANG_STORAGE_KEY = 'fo.voiceLang'

/** Cycle en-IN → ta-IN → en-IN (the chip toggle). */
export function nextVoiceLang(code: string): string {
  const i = VOICE_LANGS.findIndex((l) => l.code === code)
  return VOICE_LANGS[(i + 1) % VOICE_LANGS.length]?.code ?? DEFAULT_VOICE_LANG
}

/* Minimal structural types for the browser API (no DOM lib dependency). */
interface SpeechResultAlternativeLike { transcript: string }
interface SpeechResultLike {
  isFinal: boolean
  0: SpeechResultAlternativeLike
  length: number
}
interface SpeechEventLike {
  resultIndex: number
  results: { length: number; [i: number]: SpeechResultLike }
}
interface RecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: SpeechEventLike) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error?: string }) => void) | null
  start: () => void
  stop: () => void
}
type RecognitionCtor = new () => RecognitionLike

/** SSR-safe capability probe: the ctor when the browser exposes it, else null. */
export function getSpeechRecognition(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as Record<string, unknown>
  const ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | RecognitionCtor
    | undefined
  return typeof ctor === 'function' ? ctor : null
}

export interface VoiceSessionCallbacks {
  onInterim?: (text: string) => void
  onFinal?: (text: string) => void
  /** Fires exactly once per session (end OR error — mic-denied ends gracefully). */
  onEnd?: (reason?: string) => void
}

export interface VoiceSession {
  start: () => void
  stop: () => void
}

/**
 * Wire a continuous+interim recognition session. Returns null when the
 * browser has no SpeechRecognition (the caller renders the disabled state).
 * onend detaches after the first fire so late events after stop() are no-ops.
 */
export function createVoiceSession(
  lang: string,
  cb: VoiceSessionCallbacks,
): VoiceSession | null {
  const Ctor = getSpeechRecognition()
  if (!Ctor) return null
  const rec = new Ctor()
  rec.continuous = true
  rec.interimResults = true
  rec.lang = lang

  let ended = false
  const finish = (reason?: string) => {
    if (ended) return
    ended = true
    // Detach handlers so a late browser event after stop() is a no-op.
    rec.onresult = null
    rec.onend = null
    rec.onerror = null
    cb.onEnd?.(reason)
  }

  rec.onresult = (e) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      const text = r[0]?.transcript ?? ''
      if (r.isFinal) cb.onFinal?.(text.trim())
      else interim += text
    }
    if (interim.trim()) cb.onInterim?.(interim.trim())
  }
  rec.onend = () => finish()
  rec.onerror = (e) => finish(e?.error ?? 'error')

  let started = false
  return {
    start: () => {
      if (started || ended) return
      started = true
      try {
        rec.start()
      } catch {
        // Double-start races (browser quirk) degrade to a graceful end.
        finish('start-failed')
      }
    },
    stop: () => {
      if (ended) return
      try {
        rec.stop()
      } catch {
        finish('stop-failed')
      }
    },
  }
}
