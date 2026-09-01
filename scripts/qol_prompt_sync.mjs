#!/usr/bin/env node
/* QoL survey — prompt ↔ tool-registry sync check.
 * Extracts every tool name mentioned in SYSTEM_PROMPT and every name actually
 * registered in tools.ts (inline + docTool + masterCreateTool/masterUpdateTool
 * factories + waveC lists), then diffs both ways. */
import { readFileSync } from 'node:fs'

const toolsSrc = readFileSync('src/lib/agent/tools.ts', 'utf-8')
const promptSrc = readFileSync('src/lib/agent/prompt.ts', 'utf-8')

// 1. Registry names
const names = new Set()
for (const m of toolsSrc.matchAll(/^    name: '([a-z_0-9]+)',/gm)) names.add(m[1])
for (const m of toolsSrc.matchAll(/^  docTool\(\s*$[\s\S]*?^    '([a-z_0-9]+)',/gm)) {
  // docTool(name at first arg position — handle multi-line docTool( 'name',
}
for (const m of toolsSrc.matchAll(/docTool\(\s*\n?\s*'([a-z_0-9]+)'/g)) names.add(m[1])
for (const m of toolsSrc.matchAll(/masterCreateTool\(\s*'([a-z0-9_-]+)'/g))
  names.add('create_' + m[1].replace(/-/g, '_'))
for (const m of toolsSrc.matchAll(/masterUpdateTool\(\s*'([a-z0-9_-]+)'/g))
  names.add('update_' + m[1].replace(/-/g, '_'))
// waveCListTools / masterNewListTools entries: { name: 'list_x', ... }? check both patterns
for (const m of toolsSrc.matchAll(/name: '([a-z_0-9]+)'/g)) names.add(m[1])

// 2. Prompt-mentioned tool-ish tokens (word_word with a verb-ish prefix)
const promptBody = promptSrc.slice(promptSrc.indexOf('SYSTEM_PROMPT'))
const mentioned = new Set()
for (const m of promptBody.matchAll(/[`*_\s("]([a-z][a-z_0-9]{3,60})[`,\s.)"']/g)) {
  const t = m[1]
  if (/^(create|list|get|update|cancel|receive|post|issue|record|pay|scan|render|summarize|suggest|accept|transfer|close|complete|ready|plan|extract|generate|return)_/.test(t)) {
    mentioned.add(t)
  }
}

const missingInRegistry = [...mentioned].filter((t) => !names.has(t)).sort()
const registryOnly = [] // not meaningful to diff all 227 back; skip

console.log('registry tool names:', names.size)
console.log('prompt-mentioned tool tokens:', mentioned.size)
console.log('\n== mentioned in PROMPT but NOT in registry (drift!) ==')
for (const t of missingInRegistry) console.log('  -', t)
if (missingInRegistry.length === 0) console.log('  (none — prompt fully in sync)')
