'use client'

/**
 * SPEC-M57 FR-4 — voice / TTS preferences surfaced on the profile page.
 * ONE source of truth: the SAME localStorage keys the agent panel reads
 * (fo.voiceLang / fo.voiceSpeak — SPEC-M32). This component only
 * reads/writes those keys; the panel reacts on its own next mount (the
 * honest wiring: no duplicated state, no hidden second store).
 */
import { useEffect, useState } from 'react'
import { Languages, Volume2 } from 'lucide-react'
import { VOICE_LANGS, DEFAULT_VOICE_LANG, VOICE_LANG_STORAGE_KEY, VOICE_SPEAK_STORAGE_KEY } from '@/lib/agent/voice'

export function ProfileVoicePrefs() {
  const [voiceLang, setVoiceLang] = useState(DEFAULT_VOICE_LANG)
  const [voiceSpeak, setVoiceSpeak] = useState(false)
  const [ready, setReady] = useState(false)

  // post-hydration read (localStorage is browser-only)
  useEffect(() => {
    const saved = window.localStorage.getItem(VOICE_LANG_STORAGE_KEY)
    if (saved && VOICE_LANGS.some((l) => l.code === saved)) setVoiceLang(saved)
    setVoiceSpeak(window.localStorage.getItem(VOICE_SPEAK_STORAGE_KEY) === '1')
    setReady(true)
  }, [])

  function setLang(code: string) {
    setVoiceLang(code)
    window.localStorage.setItem(VOICE_LANG_STORAGE_KEY, code)
  }
  function setSpeak(on: boolean) {
    setVoiceSpeak(on)
    window.localStorage.setItem(VOICE_SPEAK_STORAGE_KEY, on ? '1' : '0')
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
          <Languages className="h-4 w-4 text-slate-400" /> Voice input language
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          The language the agent panel&apos;s microphone listens in (Tanglish or Tamil script).
        </p>
        <div className="flex gap-2 mt-2">
          {VOICE_LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              title={l.title}
              disabled={!ready}
              onClick={() => setLang(l.code)}
              className={`h-8 px-3 rounded-md border text-sm transition-colors ${
                ready && voiceLang === l.code
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {l.title}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
          <Volume2 className="h-4 w-4 text-slate-400" /> Speak plans aloud
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          When on, the panel reads pending plans and Approve/Reject acknowledgements (browser text-to-speech).
        </p>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            disabled={!ready}
            onClick={() => setSpeak(!voiceSpeak)}
            className={`h-8 px-3 rounded-md border text-sm transition-colors ${
              ready && voiceSpeak
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {ready ? (voiceSpeak ? 'On' : 'Off') : '…'}
          </button>
        </div>
      </div>
    </div>
  )
}
