/**
 * SPEC-M24 — Voice entry: the pure module contract (lang map, capability
 * probe, session wiring incl. interim-vs-final routing + end-once detach +
 * guarded start/stop) and the agent-panel wiring source-pins (the M22
 * readFileSync precedent).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  VOICE_LANGS,
  DEFAULT_VOICE_LANG,
  VOICE_LANG_STORAGE_KEY,
  nextVoiceLang,
  getSpeechRecognition,
  createVoiceSession,
} from '@/lib/agent/voice'

/* ---- a fake browser SpeechRecognition ctor for wiring tests ---- */
class FakeRecognition {
  static last: FakeRecognition | null = null
  continuous = false
  interimResults = false
  lang = ''
  onresult: ((e: any) => void) | null = null
  onend: (() => void) | null = null
  onerror: ((e: any) => void) | null = null
  start = vi.fn()
  stop = vi.fn()
  constructor() {
    ;(FakeRecognition as any).last = this
  }
}

describe('SPEC-M24 §3 — VOICE_LANGS shape', () => {
  it('exactly two languages: en-IN + ta-IN, each with code/label/title', () => {
    expect(VOICE_LANGS.map((l) => l.code)).toEqual(['en-IN', 'ta-IN'])
    for (const l of VOICE_LANGS) {
      expect(l.label.length).toBeGreaterThan(0)
      expect(l.title.length).toBeGreaterThan(5)
    }
    expect(DEFAULT_VOICE_LANG).toBe('en-IN') // Tanglish default — Latin script
    expect(VOICE_LANG_STORAGE_KEY).toBe('fo.voiceLang')
  })

  it('nextVoiceLang cycles en-IN → ta-IN → en-IN and survives garbage', () => {
    expect(nextVoiceLang('en-IN')).toBe('ta-IN')
    expect(nextVoiceLang('ta-IN')).toBe('en-IN')
    expect(nextVoiceLang('xx-XX')).toBe('en-IN') // findIndex -1 → [0]
  })
})

describe('SPEC-M24 §3 — getSpeechRecognition probe', () => {
  const g = globalThis as any
  beforeEach(() => {
    delete g.window
  })
  afterEach(() => {
    delete g.window
  })

  it('returns null when the globals are absent (SSR / unsupported browser)', () => {
    g.window = {}
    expect(getSpeechRecognition()).toBeNull()
  })

  it('returns the ctor when the browser exposes it (either spelling)', () => {
    g.window = { SpeechRecognition: FakeRecognition }
    expect(getSpeechRecognition()).toBe(FakeRecognition)
    g.window = { webkitSpeechRecognition: FakeRecognition }
    expect(getSpeechRecognition()).toBe(FakeRecognition)
  })

  it('ignores non-function global values (defensive)', () => {
    g.window = { SpeechRecognition: 'nope' }
    expect(getSpeechRecognition()).toBeNull()
  })
})

describe('SPEC-M24 §3 — createVoiceSession wiring', () => {
  const g = globalThis as any
  let fired: { interim: string[]; final: string[]; ends: (string | undefined)[] }
  let session: ReturnType<typeof createVoiceSession>

  beforeEach(() => {
    g.window = { SpeechRecognition: FakeRecognition }
    fired = { interim: [], final: [], ends: [] }
  })
  afterEach(() => {
    session?.stop()
    delete g.window
  })

  it('null session when unsupported — start/stop must never be needed', () => {
    g.window = {}
    expect(createVoiceSession('en-IN', {})).toBeNull()
  })

  it('continuous + interim + lang set; interim and final results route correctly', () => {
    session = createVoiceSession('ta-IN', {
      onInterim: (t) => fired.interim.push(t),
      onFinal: (t) => fired.final.push(t),
      onEnd: (r) => fired.ends.push(r),
    })!
    expect(session).not.toBeNull()
    session!.start()
    // reach into the recognition the session created via the ctor
    const rec = captureInstance()
    expect(rec.continuous).toBe(true)
    expect(rec.interimResults).toBe(true)
    expect(rec.lang).toBe('ta-IN')

    rec.onresult!({
      resultIndex: 0,
      results: [
        { isFinal: false, 0: { transcript: 'ஐந்து ஆயிரம் ' }, length: 1 },
        { isFinal: true, 0: { transcript: ' பீஸ் despatch SO-1042' }, length: 1 },
      ],
    })
    expect(fired.interim).toEqual(['ஐந்து ஆயிரம்'])
    expect(fired.final).toEqual(['பீஸ் despatch SO-1042'])
  })

  it('onend fires onEnd exactly ONCE — handlers DETACH so a late duplicate is structurally impossible', () => {
    const onEnd = vi.fn()
    session = createVoiceSession('en-IN', { onEnd })!
    session.start()
    const rec = captureInstance()
    rec.onend!()
    expect(onEnd).toHaveBeenCalledTimes(1)
    // Detached: the handlers are null, so a late browser event has nothing to call.
    expect(rec.onend).toBeNull()
    expect(rec.onerror).toBeNull()
    expect(rec.onresult).toBeNull()
  })

  it('onerror maps to onEnd with the reason (mic-denied = graceful stop, no throw)', () => {
    const onEnd = vi.fn()
    session = createVoiceSession('en-IN', { onEnd })!
    session.start()
    captureInstance().onerror!({ error: 'not-allowed' })
    expect(onEnd).toHaveBeenCalledWith('not-allowed')
  })

  it('guards: stop before start is a no-op; double start never throws', () => {
    session = createVoiceSession('en-IN', {})!
    expect(() => session!.stop()).not.toThrow()
    session!.start()
    session!.start() // second start guarded by the session flag
    const rec = captureInstance()
    expect(rec.start).toHaveBeenCalledTimes(1)
  })

  it('a throwing underlying start() degrades to onEnd("start-failed"), never throws out', () => {
    // NOTE: parent's `start` is an INSTANCE FIELD — the override must be a field too.
    class ThrowingStart extends FakeRecognition {
      start = () => {
        throw new Error('already started')
      }
    }
    g.window = { SpeechRecognition: ThrowingStart }
    const onEnd = vi.fn()
    session = createVoiceSession('en-IN', { onEnd })!
    expect(() => session!.start()).not.toThrow()
    expect(onEnd).toHaveBeenCalledWith('start-failed')
  })
})

/* The FakeRecognition ctor records its newest instance (see class). */
function captureInstance(): FakeRecognition {
  const inst = (FakeRecognition as any).last as FakeRecognition | undefined
  if (inst) return inst
  throw new Error('no instance captured')
}

describe('SPEC-M24 §3 — agent-panel wiring source pins', () => {
  const panel = readFileSync(
    join(__dirname, '../../src/components/agent/agent-panel.tsx'),
    'utf8',
  )

  it('imports the voice module and renders the mic + lang chip', () => {
    expect(panel).toContain("@/lib/agent/voice'")
    expect(panel).toContain('<Mic')
    expect(panel).toContain('toggleVoice')
    expect(panel).toContain('cycleVoiceLang')
    expect(panel).toContain('VOICE_LANG_STORAGE_KEY') // the persisted lang pref
    expect(panel).toContain('Speech recognition not supported in this browser')
  })

  it('voice text NEVER auto-sends — no sendPrompt call inside the voice callbacks', () => {
    const voiceBlock = panel.slice(
      panel.indexOf('const toggleVoice'),
      panel.indexOf('const cycleVoiceLang'),
    )
    expect(voiceBlock).toContain('onInterim')
    expect(voiceBlock).toContain('onFinal')
    expect(voiceBlock).not.toContain('sendPrompt') // two-door principle: review then Send
  })

  it('voice.ts is a single-surface module — no other component imports it', () => {
    const dir = join(__dirname, '../../src')
    const offenders: string[] = []
    const walk = (d: string) => {
      for (const e of require('node:fs').readdirSync(d, { withFileTypes: true }) as any[]) {
        const p = join(d, e.name)
        if (e.isDirectory()) walk(p)
        else if (/\.(tsx?|mjs)$/.test(e.name)) {
          if (p.endsWith('agent-panel.tsx') || p.endsWith('voice.ts')) continue
          if (readFileSync(p, 'utf8').includes('@/lib/agent/voice')) offenders.push(p)
        }
      }
    }
    walk(dir)
    expect(offenders).toEqual([])
  })
})

// ===========================================================================
// SPEC-M32 — the TTS confirm loop (planSpeechText + speak + stopSpeaking)
// ===========================================================================
import {
  VOICE_SPEAK_STORAGE_KEY,
  PLAN_SPEECH_CAP,
  getSpeechSynthesis,
  planSpeechText,
  speak,
  stopSpeaking,
} from '@/lib/agent/voice'

describe('SPEC-M32 §3 — planSpeechText (PURE, the speakable read-back)', () => {
  it('the full shape: summary + creates + updates + side effects', () => {
    const text = planSpeechText({
      summary: 'Create sales order SO-1042 for buyer LPP',
      creates: [{}, {}, {}],
      updates: [{}],
      sideEffects: ['Stock ledger out-row', 'Party balance update'],
    })
    expect(text).toContain('Plan awaiting your approval.')
    expect(text).toContain('Create sales order SO-1042 for buyer LPP')
    expect(text).toContain('Creates 3 records.')
    expect(text).toContain('Updates 1 record.')
    expect(text).toContain('Side effects: Stock ledger out-row; Party balance update.')
  })

  it('singular/plural: one record is "record", not "records"', () => {
    expect(planSpeechText({ summary: 'S', creates: [{}] })).toContain('Creates 1 record.')
    expect(planSpeechText({ summary: 'S', creates: [{}, {}] })).toContain('Creates 2 records.')
  })

  it('summary-only plan speaks the summary; at most 3 side effects listed', () => {
    expect(planSpeechText({ summary: 'Cancel PO-001' })).toBe('Plan awaiting your approval. Cancel PO-001')
    expect(
      planSpeechText({ summary: 'S', sideEffects: ['a', 'b', 'c', 'd', 'e'] }),
    ).toContain('Side effects: a; b; c.')
  })

  it('the 320-char cap clips long summaries (the shop floor needs the gist)', () => {
    const text = planSpeechText({ summary: 'x'.repeat(500) })
    expect(text.length).toBeLessThanOrEqual(PLAN_SPEECH_CAP)
    expect(text.endsWith('...')).toBe(true)
  })

  it('null / empty / silent plans → empty string (the panel stays silent)', () => {
    expect(planSpeechText(null)).toBe('')
    expect(planSpeechText(undefined)).toBe('')
    expect(planSpeechText({})).toBe('')
    expect(planSpeechText({ summary: '', creates: [], updates: [], sideEffects: [] })).toBe('')
  })
})

describe('SPEC-M32 §3 — speak / stopSpeaking (mocked speechSynthesis)', () => {
  const g = globalThis as any
  let spoken: any[]
  let cancelled: number
  const makeSynth = (voices: any[] = []) => ({
    speak: (u: any) => spoken.push(u),
    cancel: () => {
      cancelled++
    },
    getVoices: () => voices,
  })
  const makeCtor = () =>
    class FakeUtterance {
      text: string
      lang = ''
      rate = 1
      voice: any = null
      onend: any = null
      onerror: any = null
      constructor(text: string) {
        this.text = text
      }
    }

  beforeEach(() => {
    spoken = []
    cancelled = 0
    g.window = { speechSynthesis: makeSynth(), SpeechSynthesisUtterance: makeCtor() }
  })
  afterEach(() => {
    delete g.window
  })

  it('getSpeechSynthesis probes the engine; absent → null', () => {
    expect(getSpeechSynthesis()).toBe(g.window.speechSynthesis)
    g.window = {}
    expect(getSpeechSynthesis()).toBeNull()
    delete g.window
    expect(getSpeechSynthesis()).toBeNull()
  })

  it('speak queues an utterance with lang en-IN + rate 0.95', () => {
    expect(speak('hello')).toBe(true)
    expect(spoken.length).toBe(1)
    expect(spoken[0].text).toBe('hello')
    expect(spoken[0].lang).toBe('en-IN')
    expect(spoken[0].rate).toBe(0.95)
  })

  it('CANCELS the in-flight utterance first — reads never stack (newest wins)', () => {
    speak('first')
    speak('second')
    expect(cancelled).toBe(2) // one per speak() call
    expect(spoken.map((u) => u.text)).toEqual(['first', 'second'])
  })

  it('picks a voice matching the lang prefix when the browser has one', () => {
    g.window.speechSynthesis = makeSynth([
      { lang: 'ta-IN', name: 'Tamil' },
      { lang: 'en-IN', name: 'Indian English' },
    ])
    speak('hello')
    expect(spoken[0].voice?.name).toBe('Indian English')
  })

  it('no matching voice → utterance still queued with voice null', () => {
    g.window.speechSynthesis = makeSynth([{ lang: 'ja-JP', name: 'Japanese' }])
    speak('hello')
    expect(spoken[0].voice).toBeNull()
  })

  it('empty text / unsupported engine / missing Utterance ctor → false, no throw', () => {
    expect(speak('   ')).toBe(false)
    g.window = {}
    expect(speak('hello')).toBe(false)
    g.window = { speechSynthesis: makeSynth() } // no SpeechSynthesisUtterance
    expect(speak('hello')).toBe(false)
  })

  it('stopSpeaking cancels; no-throw when unsupported', () => {
    stopSpeaking()
    expect(cancelled).toBe(1)
    g.window = {}
    expect(() => stopSpeaking()).not.toThrow()
    delete g.window
    expect(() => stopSpeaking()).not.toThrow()
  })
})

describe('SPEC-M32 §3 — the panel wiring (source pins)', () => {
  const panel = readFileSync(join(__dirname, '../../src/components/agent/agent-panel.tsx'), 'utf8')

  it('the toggle persists fo.voiceSpeak and silences on OFF', () => {
    expect(VOICE_SPEAK_STORAGE_KEY).toBe('fo.voiceSpeak')
    expect(panel).toContain("VOICE_SPEAK_STORAGE_KEY, next ? '1' : '0'")
    expect(panel).toContain('voice-speak-toggle')
    expect(panel).toContain('if (!next) stopSpeaking()')
  })

  it('a pending plan speaks when the toggle is on (the ref mirror — never stale)', () => {
    expect(panel).toContain('if (voiceSpeakRef.current) {')
    expect(panel).toContain('speak(planSpeechText(output.plan))')
    expect(panel).toContain('voiceSpeakRef.current = voiceSpeak')
  })

  it('approve/reject speak their acks; panel close stops the audio', () => {
    expect(panel).toContain("speak('Committed.')")
    expect(panel).toContain("speak('Rejected.')")
    expect(panel).toContain('stopSpeaking()') // the unmount/close twin of the mic stop
  })
})
