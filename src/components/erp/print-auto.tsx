'use client'

/**
 * PrintAuto — SPEC-M8 §3: the auto-print client shim. Fires window.print()
 * ONCE on mount (landing on a /print/… URL means intent to print).
 * ?autoprint=0 skips (preview-only mode). useEffect + a fired guard — React
 * strict-mode double-invoke safe.
 */
import { useEffect, useRef } from 'react'

export function PrintAuto() {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    const skip = new URLSearchParams(window.location.search).get('autoprint') === '0'
    if (!skip) {
      // let the sheet paint first
      const t = setTimeout(() => window.print(), 350)
      return () => clearTimeout(t)
    }
  }, [])
  return null
}
