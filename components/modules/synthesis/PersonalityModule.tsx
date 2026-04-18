'use client'
import { langInstruction, useLang } from '@/lib/i18n'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Project } from '@/types'
import { useProofStore } from '@/store'
import { useProofStream } from '@/lib/useProofStream'
import { buildSynthesisContext } from '@/lib/synthesisContext'
import Strip from '@/components/proof/Strip'
import ProofDrawer from '@/components/proof/ProofDrawer'
import ProofButton from '@/components/proof/ProofButton'

const SCENARIO_KEYS = [
  { key: 'dinner', getLabel: (n: string) => `${n} at a dinner party` },
  { key: 'difficult', getLabel: (n: string) => `${n} in a difficult conversation` },
  { key: 'decision', getLabel: (n: string) => `${n} making a decision under pressure` },
]

interface TensionPair {
  pos: string
  neg: string
  description: string  // what this tension means for this brand
}

export default function PersonalityModule({ project }: { project: Project }) {
  const router = useRouter()
  const t = useLang(project)
  const { updateProject } = useProofStore()
  const { stream } = useProofStream()

  const brandName = project.name && project.name !== 'Untitled project' ? project.name : 'This brand'
  const existing = project.synthesis?.personality

  const [pairs, setPairs] = useState<TensionPair[]>(
    existing?.tensions?.length
      ? existing.tensions.map(t => {
          const m = t.match(/^(.+?)\s+(?:but never|maar nooit)\s+(.+?)(?:\s*[—–-]\s*(.+))?$/)
          const neg = m?.[2]?.trim() || ''
          return {
            pos: m?.[1]?.trim() || t,
            neg: neg.replace(/^never\s+/i, ''),  // strip leading "never" if model included it
            description: m?.[3]?.trim() || ''
          }
        })
      : [
          { pos: '', neg: '', description: '' },
          { pos: '', neg: '', description: '' },
          { pos: '', neg: '', description: '' },
        ]
  )

  // Which pole is open for swapping, plus its alternatives
  const [swapOpen, setSwapOpen] = useState<{ pair: number; side: 'pos' | 'neg'; options: string[]; loading: boolean } | null>(null)

  const [scenarios, setScenarios] = useState({
    dinner: existing?.dinner || '',
    difficult: existing?.difficult || '',
    decision: existing?.decision || '',
  })
  const [examples, setExamples] = useState<Record<string, string>>({})
  const [generatingExample, setGeneratingExample] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(!!(existing?.tensions?.length && existing.tensions[0]))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [summaryState, setSummaryState] = useState<'thinking' | 'arrived' | null>(null)
  const [summaryText, setSummaryText] = useState('')
  const summaryStateRef = useRef<'thinking' | 'arrived' | null>(null)
  useEffect(() => { summaryStateRef.current = summaryState }, [summaryState])

  // Close swap dropdown on click outside
  useEffect(() => {
    if (!swapOpen) return
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('[data-swap-container]')) {
        setSwapOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [swapOpen])

  const ctx = buildSynthesisContext(project)
  const allFilled = pairs.some(p => p.pos && p.neg) && Object.values(scenarios).every(s => s.trim())
  const isSummaryActive = summaryState === 'thinking' || summaryState === 'arrived'

  useEffect(() => { if (!generated) generate() }, [])

  // Auto-generate examples sequentially when first generated (avoids stream abort)
  useEffect(() => {
    if (generated && Object.values(scenarios).some(s => s)) {
      const missing = SCENARIO_KEYS.filter(({ key }) =>
        scenarios[key as keyof typeof scenarios] && !examples[key]
      )
      if (missing.length > 0) {
        // Generate one at a time — each fires after the previous completes
        // via the onComplete chain; just kick off the first
        genExample(missing[0].key)
      }
    }
  }, [generated])

  function save(p = pairs, s = scenarios) {
    updateProject(project.id, {
      synthesis: {
        ...project.synthesis,
        personality: {
          tensions: p.map(pair => {
            let t = pair.pos
            const connector = (project.language || 'en') === 'nl' ? 'maar nooit' : 'but never'
            if (pair.neg) t += ` ${connector} ${pair.neg}`
            if (pair.description) t += ` — ${pair.description}`
            return t
          }),
          dinner: s.dinner,
          difficult: s.difficult,
          decision: s.decision,
        }
      }
    })
  }

  async function generate() {
    setGenerating(true)
    const lang = project.language || "en"
    const prompt = `${langInstruction(lang)}${ctx}

${lang === 'nl' ? 'Alle output moet volledig in het Nederlands zijn — inclusief namen, termen en labels.\n\n' : ''}Write the brand personality for "${brandName}" as three tension pairs and three scenario portraits.

A tension pair is not a balanced adjective list. It's a productive contradiction — the thing that makes this brand interesting rather than generic. The positive quality is what this brand genuinely is. The "never" is not the opposite — it's the excess or the lazy version of that quality that this brand specifically refuses.

${lang === 'nl' ? 'Slecht spanningspaar: "Vriendelijk maar nooit onprofessioneel" — elk merk zou dit claimen.\nGoed spanningspaar: "Direct maar nooit bot" — specifiek genoeg om een echte keuze te beschrijven.\n\nBelangrijk: de woorden in PAIR_X_POS en PAIR_X_NEG moeten Nederlandse woorden zijn.' : 'Bad tension pair: "Friendly but never unprofessional" — every brand would claim this.\nGood tension pair: "Blunt but never cruel" — specific enough to describe a real choice the brand makes.'}

The DESC must start with "${brandName}" and name the specific thing that makes this tension real for this brand — not a general observation about brands with this tension.

PAIR_1_POS: [quality — 1-3 words]
PAIR_1_NEG: [what it refuses to become — 1-3 words]
PAIR_1_DESC: [${brandName} + one sentence on why this specific tension defines them]
PAIR_2_POS: [quality — 1-3 words]
PAIR_2_NEG: [what it refuses to become — 1-3 words]
PAIR_2_DESC: [${brandName} + one sentence]
PAIR_3_POS: [quality — 1-3 words]
PAIR_3_NEG: [what it refuses to become — 1-3 words]
PAIR_3_DESC: [${brandName} + one sentence]

For the scenarios, be specific and concrete. The voice examples should sound like actual sentences this brand would write or say — not descriptions of how they communicate.

DINNER: [${brandName} at a dinner party — 2 sentences describing how they show up]
DINNER_EXAMPLE: [one sentence they'd actually say in that context]
DIFFICULT: [${brandName} in a difficult conversation — 2 sentences]
DIFFICULT_EXAMPLE: [one sentence they'd actually say]
DECISION: [${brandName} making a decision under pressure — 2 sentences]
DECISION_EXAMPLE: [one sentence capturing their voice in that moment]

No em dashes within the PAIR lines.`

    await stream({
      project, mode: 'strategist', module: 'Personality', prompt, maxTokens: 900,
      onChunk: () => {},
      onComplete: (text) => {
        const newPairs: TensionPair[] = [1, 2, 3].map(n => ({
          pos: text.match(new RegExp(`PAIR_${n}_POS:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '',
          neg: (text.match(new RegExp(`PAIR_${n}_NEG:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '').replace(/^never\s+/i, ''),
          description: text.match(new RegExp(`PAIR_${n}_DESC:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '',
        }))

        const dinner = text.match(/DINNER:\s*(.+?)(?=\nDINNER_EXAMPLE:|$)/s)?.[1]?.trim() || ''
        const dinnerEx = text.match(/DINNER_EXAMPLE:\s*(.+?)(?=\n|$)/)?.[1]?.trim() || ''
        const difficult = text.match(/DIFFICULT:\s*(.+?)(?=\nDIFFICULT_EXAMPLE:|$)/s)?.[1]?.trim() || ''
        const difficultEx = text.match(/DIFFICULT_EXAMPLE:\s*(.+?)(?=\n|$)/)?.[1]?.trim() || ''
        const decision = text.match(/DECISION:\s*(.+?)(?=\nDECISION_EXAMPLE:|$)/s)?.[1]?.trim() || ''
        const decisionEx = text.match(/DECISION_EXAMPLE:\s*(.+?)(?=\n|$)/)?.[1]?.trim() || ''

        const newScenarios = { dinner, difficult, decision }
        setPairs(newPairs)
        setScenarios(newScenarios)
        setExamples({ dinner: dinnerEx, difficult: difficultEx, decision: decisionEx })
        save(newPairs, newScenarios)
        setGenerating(false)
        setGenerated(true)
      },
    })
  }

  // When user clicks a pole, ask proof. for 3 alternatives with different nuance
  async function openSwap(pairIdx: number, side: 'pos' | 'neg') {
    if (swapOpen?.pair === pairIdx && swapOpen.side === side) {
      setSwapOpen(null)
      return
    }
    setSwapOpen({ pair: pairIdx, side, options: [], loading: true })

    const current = side === 'pos' ? pairs[pairIdx].pos : pairs[pairIdx].neg
    const other = side === 'pos' ? pairs[pairIdx].neg : pairs[pairIdx].pos
    const direction = side === 'pos' ? 'positive quality' : 'what this brand never becomes'

    const lang = project.language || "en"
    const prompt = `${langInstruction(lang)}${ctx}

${lang === 'nl' ? 'Alle output moet volledig in het Nederlands zijn — inclusief namen, termen en labels.\n\n' : ''}${lang === 'nl' ? 'Alle alternatieven moeten Nederlandse woorden zijn.\n' : ''}For the brand personality pair: "${pairs[pairIdx].pos} ${lang === 'nl' ? 'maar nooit' : 'but never'} ${pairs[pairIdx].neg}"

The strategist wants alternatives for the ${direction}: "${current}"

Give 3 alternatives that are in the same direction but have different nuance. Each should be 1-3 words. They should feel meaningfully different from each other — different register, different emphasis.

ALT_1: [alternative]
ALT_2: [alternative]
ALT_3: [alternative]

No explanations. Just the words.`

    await stream({
      project, mode: 'strategist', module: 'Personality', prompt, maxTokens: 80,
      onChunk: () => {},
      onComplete: (text) => {
        const opts = [1, 2, 3]
          .map(n => text.match(new RegExp(`ALT_${n}:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '')
          .filter(Boolean)
        setSwapOpen(prev => prev ? { ...prev, options: opts, loading: false } : null)
      },
    })
  }

  function selectOption(pairIdx: number, side: 'pos' | 'neg', value: string) {
    const cleanValue = side === 'neg' ? value.replace(/^never\s+/i, '') : value
    const next = pairs.map((p, i) => {
      if (i !== pairIdx) return p
      const updated = { ...p, [side]: cleanValue }
      regenerateDesc(i, updated.pos, updated.neg)
      return updated
    })
    setPairs(next)
    save(next, scenarios)
    setSwapOpen(null)
  }

  async function regenerateDesc(pairIdx: number, pos: string, neg: string) {
    const lang = project.language || "en"
    const prompt = `${langInstruction(lang)}${ctx}\n\nBrand personality pair: "${pos} ${lang === 'nl' ? 'maar nooit' : 'but never'} ${neg}"\n\nWrite one sentence describing what this tension means for ${brandName} specifically. Start with "${brandName}". Be concrete, not generic. No em dashes.`
    await stream({
      project, mode: 'strategist', module: 'Personality', prompt, maxTokens: 80,
      onChunk: () => {},
      onComplete: (text) => {
        setPairs(prev => {
          const next = prev.map((p, i) => i === pairIdx ? { ...p, description: text.trim() } : p)
          save(next, scenarios)
          return next
        })
      },
    })
  }

  async function genExample(key: string) {
    setGeneratingExample(key)
    const scenario = scenarios[key as keyof typeof scenarios]
    const label = SCENARIO_KEYS.find(s => s.key === key)?.getLabel(brandName) || key
    const tensionStr = pairs.filter(p => p.pos && p.neg).map(p => `${p.pos} ${(project.language || 'en') === 'nl' ? 'maar nooit' : 'but never'} ${p.neg}`).join(' / ')
    const lang = project.language || "en"
    const prompt = `${langInstruction(lang)}${ctx}\n\nTensions: ${tensionStr}\n\nScenario — ${label}: ${scenario}\n\nOne sentence in this brand's actual voice. Not a description — something they would actually say or write. Short, specific. No em dashes.`
    await stream({
      project, mode: 'strategist', module: 'Personality', prompt, maxTokens: 80,
      onChunk: () => {},
      onComplete: (t) => {
        const result = t.trim()
        setExamples(prev => {
          const next = { ...prev, [key]: result }
          // Chain to next missing example
          const nextKey = SCENARIO_KEYS.find(s =>
            s.key !== key && scenarios[s.key as keyof typeof scenarios] && !next[s.key]
          )?.key
          if (nextKey) setTimeout(() => genExample(nextKey), 50)
          return next
        })
        setGeneratingExample(null)
      },
    })
  }

  async function fetchSummary() {
    setSummaryState('thinking'); setDrawerOpen(true)
    const tensionStr = pairs.filter(p => p.pos && p.neg).map(p => `${p.pos} ${(project.language || 'en') === 'nl' ? 'maar nooit' : 'but never'} ${p.neg}`).join(' / ')
    const lang = project.language || "en"
    const prompt = `${langInstruction(lang)}${ctx}\n\nPersonality:\nTensions: ${tensionStr}\n${brandName} at dinner: ${scenarios.dinner}\n${brandName} in difficulty: ${scenarios.difficult}\n${brandName} under pressure: ${scenarios.decision}\n\nIn 2 sentences: is this personality distinctive enough to guide creative decisions? No em dashes.`
    await stream({
      project, mode: 'strategist', module: 'Personality', prompt, maxTokens: 180,
      onChunk: () => {},
      onComplete: (t) => { setSummaryText(t); setSummaryState('arrived') },
    })
  }

  const handleAdvance = useCallback(() => {
    if (!allFilled) { setDrawerOpen(true); return }
    if (!summaryStateRef.current) { fetchSummary(); return }
    router.push(`/project/${project.id}/synthesis/tone`)
  }, [allFilled, project.id, router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-0)' }}>
      <Strip project={project} phase="Synthesis — Personality" onAskProof={() => { setSummaryState(null); setDrawerOpen(true) }} />
      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '72px 24px 32px' }}>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 14 }}>{t('personality.phase')}</div>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, marginBottom: 48, fontWeight: 300 }}>{t('personality.description')}</p>
        </motion.div>

        {generating && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
            <div style={{ display: 'flex', gap: 4 }}>{[0,1,2].map(i => <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }} animate={{ opacity: [0.3,1,0.3], scale: [0.8,1,0.8] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.18 }} />)}</div>
            <span style={{ fontSize: 13, color: 'var(--stone)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>t('personality.generating')…</span>
          </div>
        )}

        {generated && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* Tension pair cards */}
            <div style={{ marginBottom: 72 }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 24 }}>{t('personality.pairs')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pairs.map((pair, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    style={{ background: 'var(--surface-1)', borderRadius: 12, padding: '24px 28px', border: '1px solid rgba(184,179,172,0.25)', boxShadow: '0 1px 4px rgba(26,24,22,0.04)' }}>

                    {/* Poles row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>

                      {/* Positive pole */}
                      <div data-swap-container style={{ position: 'relative', flex: 1 }}>
                        <div onClick={() => openSwap(i, 'pos')}
                          style={{ padding: '10px 16px', background: swapOpen?.pair === i && swapOpen.side === 'pos' ? 'var(--dark)' : 'var(--surface-0)', borderRadius: 8, cursor: 'pointer', transition: 'all 0.18s', userSelect: 'none' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: swapOpen?.pair === i && swapOpen.side === 'pos' ? '#FDFCFA' : 'var(--dark)', lineHeight: 1.2, textTransform: 'lowercase' }}>
                            {pair.pos || <span style={{ color: 'var(--stone)', fontSize: 16, textTransform: 'none' }}>Click to set</span>}
                          </div>
                        </div>

                        {/* Swap dropdown */}
                        <AnimatePresence>
                          {swapOpen?.pair === i && swapOpen.side === 'pos' && (
                            <motion.div initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }}
                              transition={{ duration: 0.15, ease: [0.16,1,0.3,1] }}
                              style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, background: 'var(--surface-2)', border: '1px solid rgba(184,179,172,0.5)', borderRadius: 10, overflow: 'hidden', zIndex: 20, boxShadow: '0 8px 24px rgba(26,24,22,0.12)' }}>
                              {swapOpen.loading ? (
                                <div style={{ padding: '14px 16px', display: 'flex', gap: 4 }}>
                                  {[0,1,2].map(j => <motion.div key={j} style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--mango)' }} animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1, repeat: Infinity, delay: j*0.15 }} />)}
                                </div>
                              ) : (
                                <>
                                  {swapOpen.options.map((opt, oi) => (
                                    <div key={oi} onClick={() => selectOption(i, 'pos', opt)}
                                      style={{ padding: '12px 16px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--dark)', borderBottom: oi < swapOpen.options.length - 1 ? '1px solid rgba(213,212,214,0.3)' : 'none', transition: 'background 0.12s' }}
                                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-0)'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                      {opt}
                                    </div>
                                  ))}
                                  <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(213,212,214,0.25)', background: 'var(--surface-1)' }}>
                                    <input autoFocus defaultValue={pair.pos} placeholder="Write your own…"
                                      onKeyDown={e => { if (e.key === 'Enter') selectOption(i, 'pos', (e.target as HTMLInputElement).value) }}
                                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--dark)' }} />
                                  </div>
                                </>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div style={{ fontSize: 12, color: 'var(--stone)', fontWeight: 300, flexShrink: 0, letterSpacing: '0.02em' }}>{t('personality.but_never')}</div>

                      {/* Negative pole */}
                      <div data-swap-container style={{ position: 'relative', flex: 1 }}>
                        <div onClick={() => openSwap(i, 'neg')}
                          style={{ padding: '10px 16px', background: swapOpen?.pair === i && swapOpen.side === 'neg' ? 'var(--dark)' : 'var(--surface-0)', borderRadius: 8, cursor: 'pointer', transition: 'all 0.18s', userSelect: 'none' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: swapOpen?.pair === i && swapOpen.side === 'neg' ? '#FDFCFA' : 'var(--concrete)', lineHeight: 1.2, textTransform: 'lowercase' }}>
                            {pair.neg || <span style={{ color: 'var(--stone)', fontSize: 16, textTransform: 'none' }}>Click to set</span>}
                          </div>
                        </div>

                        <AnimatePresence>
                          {swapOpen?.pair === i && swapOpen.side === 'neg' && (
                            <motion.div initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }}
                              transition={{ duration: 0.15, ease: [0.16,1,0.3,1] }}
                              style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, background: 'var(--surface-2)', border: '1px solid rgba(184,179,172,0.5)', borderRadius: 10, overflow: 'hidden', zIndex: 20, boxShadow: '0 8px 24px rgba(26,24,22,0.12)' }}>
                              {swapOpen.loading ? (
                                <div style={{ padding: '14px 16px', display: 'flex', gap: 4 }}>
                                  {[0,1,2].map(j => <motion.div key={j} style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--mango)' }} animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1, repeat: Infinity, delay: j*0.15 }} />)}
                                </div>
                              ) : (
                                <>
                                  {swapOpen.options.map((opt, oi) => (
                                    <div key={oi} onClick={() => selectOption(i, 'neg', opt)}
                                      style={{ padding: '12px 16px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--dark)', borderBottom: oi < swapOpen.options.length - 1 ? '1px solid rgba(213,212,214,0.3)' : 'none', transition: 'background 0.12s' }}
                                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-0)'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                      {opt}
                                    </div>
                                  ))}
                                  <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(213,212,214,0.25)', background: 'var(--surface-1)' }}>
                                    <input autoFocus defaultValue={pair.neg} placeholder="Write your own…"
                                      onKeyDown={e => { if (e.key === 'Enter') selectOption(i, 'neg', (e.target as HTMLInputElement).value) }}
                                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--dark)' }} />
                                  </div>
                                </>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Description — always visible */}
                    <p style={{ fontSize: 13, color: pair.description ? 'var(--concrete)' : 'var(--aluminum)', fontWeight: 300, lineHeight: 1.7, margin: 0, fontFamily: 'var(--font-sans)', fontStyle: pair.description ? 'normal' : 'italic' }}>
                      {pair.description || 'proof. is writing a description…'}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Tension pairs section ends here */}
          </motion.div>
        )}
      </main>

      {/* Scenario section — vertical stack, inside normal layout flow */}
      {generated && (
        <div style={{ maxWidth: 660, width: '100%', margin: '0 auto', padding: '0 24px 80px' }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 20 }}>{t('personality.person')}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {SCENARIO_KEYS.map(({ key, getLabel }) => {
              const value = scenarios[key as keyof typeof scenarios]
              const example = examples[key]
              return (
                <div key={key} style={{ background: 'var(--surface-1)', borderRadius: 12, border: '1px solid rgba(184,179,172,0.25)', padding: '22px 28px', boxShadow: '0 1px 3px rgba(26,24,22,0.04)' }}>
                  <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                    {/* Scenario description */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: 'var(--stone)', fontWeight: 400, marginBottom: 10, letterSpacing: '0.01em' }}>{getLabel(brandName)}</div>
                      <textarea value={value}
                        onChange={e => { const next = { ...scenarios, [key]: e.target.value }; setScenarios(next); save(pairs, next) }}
                        placeholder={`How does ${brandName} behave here?`}
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 300, color: 'var(--dark)', lineHeight: 1.8, minHeight: 64 }} />
                    </div>

                    {/* Divider */}
                    <div style={{ width: 1, background: 'rgba(184,179,172,0.25)', alignSelf: 'stretch', flexShrink: 0 }} />

                    {/* Voice example */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mango)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />
                        {t('personality.in_voice')}
                      </div>
                      {generatingExample === key ? (
                        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                          {[0,1,2].map(i => <motion.div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--mango)' }} animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.18 }} />)}
                        </div>
                      ) : example ? (
                        <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15, color: 'var(--dark)', lineHeight: 1.65, margin: '0 0 12px' }}>"{example.replace(/^["'"']|["'"']$/g, '')}"</p>
                      ) : (
                        <p style={{ fontSize: 13, color: 'var(--stone)', fontWeight: 300, margin: '0 0 12px', fontStyle: 'italic' }}>Generating…</p>
                      )}
                      {!generatingExample && value.trim() && (
                        <ProofButton onClick={() => genExample(key)} size="sm">{t('action.new_example')}</ProofButton>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Nav footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 48, marginTop: 32, borderTop: '1px solid rgba(213,212,214,0.4)' }}>
            <button onClick={() => router.push(`/project/${project.id}/synthesis/values`)} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>{t('nav.back_values')}</button>
            <button onClick={handleAdvance} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, background: allFilled ? 'var(--dark)' : '#D5D4D6', color: allFilled ? '#FDFCFA' : '#8C8780', border: 'none', borderRadius: 5, padding: '12px 22px', cursor: allFilled ? 'pointer' : 'default', transition: 'all 0.2s' }}
              onMouseEnter={e => { if (allFilled) e.currentTarget.style.background = 'var(--mango)' }}
              onMouseLeave={e => { if (allFilled) e.currentTarget.style.background = 'var(--dark)' }}>
              {t('synthesis.continue_tone')}
            </button>
          </div>
        </div>
      )}

      <ProofDrawer project={project} mode="strategist" module="Personality"
        open={drawerOpen || isSummaryActive} onClose={() => { setDrawerOpen(false); setSummaryState(null) }}
        summaryMode={isSummaryActive} summaryState={summaryState} summaryText={summaryText}
        summaryThinkingLabel="Reading the personality…" summaryContinueLabel="Continue to Tone →"
        summaryLabel="On the personality"
        onContinue={() => router.push(`/project/${project.id}/synthesis/tone`)}
        onReview={() => { setSummaryState(null); setDrawerOpen(false) }} />

      <style>{`textarea::placeholder { color: var(--stone); } input::placeholder { color: var(--stone); } ::-webkit-scrollbar { display: none; }`}</style>
    </div>
  )
}
