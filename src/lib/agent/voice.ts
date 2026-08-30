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
/** SPEC-M32 — the talking-panel toggle ('1' = read pending plans aloud). */
export const VOICE_SPEAK_STORAGE_KEY = 'fo.voiceSpeak'

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

/* =========================================================================
 * SPEC-M32 — the TTS confirm loop (the M24 OUT promise): the legacy voice
 * confirm was READ-BACK. When a write plan awaits approval and the operator
 * enabled the speaker, the panel speaks the plan — eyes-busy/hands-busy.
 * Browser speechSynthesis only (the M24 browser-first ADR); default OFF.
 * ========================================================================= */

/** SSR-safe probe for the browser TTS engine. */
export function getSpeechSynthesis(): SpeechSynthesisLike | null {
  if (typeof window === 'undefined') return null
  const s = (window as unknown as { speechSynthesis?: SpeechSynthesisLike }).speechSynthesis
  return s && typeof s.speak === 'function' ? s : null
}

/* Minimal structural types (no DOM lib dependency — the M24 pattern). */
export interface SpeechSynthesisUtteranceLike {
  text: string
  lang: string
  rate: number
  voice: SpeechSynthesisVoiceLike | null
  onend: (() => void) | null
  onerror: (() => void) | null
}
export interface SpeechSynthesisVoiceLike {
  lang: string
  name: string
}
export interface SpeechSynthesisLike {
  speak: (u: SpeechSynthesisUtteranceLike) => void
  cancel: () => void
  getVoices?: () => SpeechSynthesisVoiceLike[]
}

/** The max spoken length — the shop floor needs the gist, not the ledger. */
export const PLAN_SPEECH_CAP = 320

/** The pending-plan shape the panel renders (result.plan). */
export interface PendingPlanLike {
  summary?: string | null
  creates?: unknown[] | null
  updates?: unknown[] | null
  sideEffects?: string[] | null
}

/**
 * PURE — the speakable read-back: "Plan awaiting your approval. <summary>.
 * Creates N record(s). Updates N record(s). Side effects: a; b." Clipped to
 * PLAN_SPEECH_CAP. An empty plan → '' (the caller stays silent).
 */
export function planSpeechText(plan: PendingPlanLike | null | undefined): string {
  if (!plan) return ''
  const parts: string[] = []
  const summary = (plan.summary ?? '').trim()
  if (summary) parts.push(summary.replace(/\s+/g, ' '))
  const creates = plan.creates?.length ?? 0
  const updates = plan.updates?.length ?? 0
  if (creates > 0) parts.push(`Creates ${creates} record${creates > 1 ? 's' : ''}.`)
  if (updates > 0) parts.push(`Updates ${updates} record${updates > 1 ? 's' : ''}.`)
  const effects = (plan.sideEffects ?? []).filter(Boolean).slice(0, 3)
  if (effects.length > 0) parts.push(`Side effects: ${effects.join('; ')}.`)
  if (parts.length === 0) return ''
  const text = `Plan awaiting your approval. ${parts.join(' ')}`
  return text.length > PLAN_SPEECH_CAP ? `${text.slice(0, PLAN_SPEECH_CAP - 3).trimEnd()}...` : text
}

export interface SpeakOpts {
  /** Plans are English — 'en-IN' default (SPEC-M32 §2). */
  lang?: string
  /** 0.95 default — slightly slow for shop-floor noise. */
  rate?: number
}

/**
 * Speak text through the browser TTS. Cancels any in-flight utterance
 * first (the newest confirm moment wins — reads never stack). No-op when
 * unsupported. Returns true when an utterance was queued.
 */
export function speak(text: string, opts: SpeakOpts = {}): boolean {
  const synth = getSpeechSynthesis()
  if (!synth || !text.trim()) return false
  const lang = opts.lang ?? 'en-IN'
  const rate = opts.rate ?? 0.95
  try {
    synth.cancel()
    const w = window as unknown as {
      SpeechSynthesisUtterance?: new (text: string) => SpeechSynthesisUtteranceLike
    }
    const Ctor = w.SpeechSynthesisUtterance
    if (!Ctor) return false
    const u = new Ctor(text)
    u.lang = lang
    u.rate = rate
    // Pick a voice matching the lang prefix when the browser exposes one.
    const voices = typeof synth.getVoices === 'function' ? synth.getVoices() : []
    u.voice = voices.find((v) => v.lang?.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase())) ?? null
    synth.speak(u)
    return true
  } catch {
    return false
  }
}

/** Cancel any in-flight speech (the orphaned-audio twin of the mic stop). */
export function stopSpeaking(): void {
  try {
    getSpeechSynthesis()?.cancel()
  } catch {
    // unsupported browsers stay silent
  }
}
