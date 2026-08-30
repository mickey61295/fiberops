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
