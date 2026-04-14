'use client'

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

interface TensionPair { pos: string; neg: string; posAlts: string[]; negAlts: string[] }

export default function PersonalityModule({ project }: { project: Project }) {
  const router = useRouter()
  const { updateProject } = useProofStore()
  const { stream } = useProofStream()

  const brandName = project.name && project.name !== 'Untitled project' ? project.name : 'This brand'
  const existing = project.synthesis?.personality

  const [pairs, setPairs] = useState<TensionPair[]>(
    existing?.tensions?.length
      ? existing.tensions.map(t => {
          const m = t.match(/^(.+?)\s+but never\s+(.+)$/i)
          return { pos: m?.[1]?.trim() || t, neg: m?.[2]?.trim() || '', posAlts: [], negAlts: [] }
        })
      : [
          { pos: '', neg: '', posAlts: [], negAlts: [] },
          { pos: '', neg: '', posAlts: [], negAlts: [] },
          { pos: '', neg: '', posAlts: [], negAlts: [] },
        ]
  )
  const [activePole, setActivePole] = useState<{ pair: number; side: 'pos' | 'neg' } | null>(null)
  const [scenarios, setScenarios] = useState({ dinner: existing?.dinner || '', difficult: existing?.difficult || '', decision: existing?.decision || '' })
  const [examples, setExamples] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(!!(existing?.tensions?.length && existing.tensions[0]))
  const [generatingExample, setGeneratingExample] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [summaryState, setSummaryState] = useState<'thinking' | 'arrived' | null>(null)
  const [summaryText, setSummaryText] = useState('')
  const summaryStateRef = useRef<'thinking' | 'arrived' | null>(null)
  useEffect(() => { summaryStateRef.current = summaryState }, [summaryState])

  const ctx = buildSynthesisContext(project)
  const allFilled = pairs.some(p => p.pos && p.neg) && Object.values(scenarios).every(s => s.trim())
  const isSummaryActive = summaryState === 'thinking' || summaryState === 'arrived'

  useEffect(() => { if (!generated) generate() }, [])

  // Auto-generate examples for all scenarios on load
  useEffect(() => {
    if (generated && Object.values(scenarios).some(s => s)) {
      SCENARIO_KEYS.forEach(({ key }) => {
        if (scenarios[key as keyof typeof scenarios] && !examples[key]) {
          genExample(key)
        }
      })
    }
  }, [generated])

  function save(p = pairs, s = scenarios) {
    updateProject(project.id, {
      synthesis: {
        ...project.synthesis,
        personality: {
          tensions: p.map(pair => pair.pos && pair.neg ? `${pair.pos} but never ${pair.neg}` : pair.pos),
          dinner: s.dinner, difficult: s.difficult, decision: s.decision,
        }
      }
    })
  }

  async function generate() {
    setGenerating(true)
    const prompt = `${ctx}

Write the brand personality for "${brandName}".

For each tension pair, give the positive quality, its "never" counterpart, and 2 alternatives for each so the strategist can swap.

PAIR_1_POS: [positive quality — 1-2 words, e.g. "Direct"]
PAIR_1_NEG: [what it never becomes — 1-2 words, e.g. "Clinical"]
PAIR_1_POS_ALT1: [alternative positive]
PAIR_1_POS_ALT2: [another alternative positive]
PAIR_1_NEG_ALT1: [alternative negative]
PAIR_1_NEG_ALT2: [another alternative negative]
PAIR_2_POS: [positive quality]
PAIR_2_NEG: [what it never becomes]
PAIR_2_POS_ALT1: [alternative]
PAIR_2_POS_ALT2: [alternative]
PAIR_2_NEG_ALT1: [alternative]
PAIR_2_NEG_ALT2: [alternative]
PAIR_3_POS: [positive quality]
PAIR_3_NEG: [what it never becomes]
PAIR_3_POS_ALT1: [alternative]
PAIR_3_POS_ALT2: [alternative]
PAIR_3_NEG_ALT1: [alternative]
PAIR_3_NEG_ALT2: [alternative]

DINNER: [${brandName} at a dinner party — 2 sentences]
DINNER_EXAMPLE: [one sentence in ${brandName}'s actual voice at that dinner]
DIFFICULT: [${brandName} in a difficult conversation — 2 sentences]
DIFFICULT_EXAMPLE: [one sentence in ${brandName}'s voice]
DECISION: [${brandName} making a decision under pressure — 2 sentences]
DECISION_EXAMPLE: [one sentence in ${brandName}'s voice]`

    await stream({
      project, mode: 'strategist', module: 'Personality', prompt, maxTokens: 800,
      onChunk: () => {},
      onComplete: (text) => {
        const newPairs: TensionPair[] = [1, 2, 3].map(n => ({
          pos: text.match(new RegExp(`PAIR_${n}_POS:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '',
          neg: text.match(new RegExp(`PAIR_${n}_NEG:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '',
          posAlts: [
            text.match(new RegExp(`PAIR_${n}_POS_ALT1:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '',
            text.match(new RegExp(`PAIR_${n}_POS_ALT2:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '',
          ].filter(Boolean),
          negAlts: [
            text.match(new RegExp(`PAIR_${n}_NEG_ALT1:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '',
            text.match(new RegExp(`PAIR_${n}_NEG_ALT2:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '',
          ].filter(Boolean),
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

  async function genExample(key: string) {
    setGeneratingExample(key)
    const scenario = scenarios[key as keyof typeof scenarios]
    const label = SCENARIO_KEYS.find(s => s.key === key)?.getLabel(brandName) || key
    const prompt = `${ctx}\n\nTensions: ${pairs.filter(p=>p.pos&&p.neg).map(p=>`${p.pos} but never ${p.neg}`).join(' / ')}\n\nScenario — ${label}: ${scenario}\n\nOne sentence in this brand's actual voice. Not a description — something they would actually say. Short, specific. No em dashes.`
    await stream({
      project, mode: 'strategist', module: 'Personality', prompt, maxTokens: 80,
      onChunk: () => {},
      onComplete: (t) => { setExamples(prev => ({ ...prev, [key]: t.trim() })); setGeneratingExample(null) },
    })
  }

  async function fetchSummary() {
    setSummaryState('thinking'); setDrawerOpen(true)
    const tensionStr = pairs.filter(p=>p.pos&&p.neg).map(p=>`${p.pos} but never ${p.neg}`).join(' / ')
    const prompt = `${ctx}\n\nPersonality:\nTensions: ${tensionStr}\n${brandName} at dinner: ${scenarios.dinner}\n${brandName} in difficulty: ${scenarios.difficult}\n${brandName} under pressure: ${scenarios.decision}\n\nIn 2 sentences: is this personality distinctive enough to guide creative decisions? No em dashes.`
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

  function updatePole(pairIdx: number, side: 'pos' | 'neg', value: string) {
    const next = pairs.map((p, i) => i === pairIdx ? { ...p, [side]: value } : p)
    setPairs(next); save(next, scenarios)
    setActivePole(null)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F2EB' }}>
      <Strip project={project} phase="Synthesis — Personality" onAskProof={() => { setSummaryState(null); setDrawerOpen(true) }} />
      <main style={{ flex: 1, maxWidth: 720, width: '100%', margin: '0 auto', padding: '80px 24px 120px' }}>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 16 }}>Synthesis — 3 of 7</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.06, letterSpacing: '-0.015em', marginBottom: 20 }}>Who we are.</h1>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, marginBottom: 56, fontWeight: 300 }}>Brand as a person. Click either side of a tension to swap it for an alternative.</p>
        </motion.div>

        {generating && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
            <div style={{ display: 'flex', gap: 4 }}>{[0,1,2].map(i => <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }} animate={{ opacity: [0.3,1,0.3], scale: [0.8,1,0.8] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.18 }} />)}</div>
            <span style={{ fontSize: 13, color: 'var(--stone)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>proof. is imagining the person behind the brand…</span>
          </div>
        )}

        {generated && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* Tension pair cards */}
            <div style={{ marginBottom: 72 }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 20 }}>Tension pairs</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pairs.map((pair, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    style={{ background: '#FAF8F4', borderRadius: 12, padding: '24px 28px', border: '1px solid rgba(184,179,172,0.25)', boxShadow: '0 1px 4px rgba(26,24,22,0.04)' }}>

                    {/* The tension display */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: pair.posAlts.length || pair.negAlts.length ? 16 : 0 }}>
                      {/* Positive pole */}
                      <div style={{ position: 'relative', flex: 1 }}>
                        <div onClick={() => setActivePole(activePole?.pair === i && activePole.side === 'pos' ? null : { pair: i, side: 'pos' })}
                          style={{ padding: '10px 16px', background: activePole?.pair === i && activePole.side === 'pos' ? 'var(--dark)' : '#EDE9E2', borderRadius: 8, cursor: 'pointer', transition: 'all 0.18s' }}>
                          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: activePole?.pair === i && activePole.side === 'pos' ? 'rgba(255,255,255,0.5)' : 'var(--stone)', marginBottom: 4 }}>Quality</div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: activePole?.pair === i && activePole.side === 'pos' ? '#FDFCFA' : 'var(--dark)' }}>
                            {pair.pos || 'Click to set'}
                          </div>
                        </div>
                        {/* Alternatives dropdown */}
                        <AnimatePresence>
                          {activePole?.pair === i && activePole.side === 'pos' && (
                            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                              style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#FDFCFA', border: '1px solid rgba(184,179,172,0.4)', borderRadius: 8, overflow: 'hidden', zIndex: 10, boxShadow: '0 4px 16px rgba(26,24,22,0.1)' }}>
                              {pair.posAlts.map((alt, ai) => (
                                <div key={ai} onClick={() => updatePole(i, 'pos', alt)}
                                  style={{ padding: '10px 14px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--dark)', borderBottom: ai < pair.posAlts.length - 1 ? '1px solid rgba(213,212,214,0.3)' : 'none', transition: 'background 0.12s' }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#F5F2EB'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                  {alt}
                                </div>
                              ))}
                              <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(213,212,214,0.3)' }}>
                                <input autoFocus defaultValue={pair.pos}
                                  onKeyDown={e => { if (e.key === 'Enter') updatePole(i, 'pos', (e.target as HTMLInputElement).value) }}
                                  placeholder="Or write your own…"
                                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--dark)' }} />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div style={{ fontSize: 12, color: 'var(--stone)', fontWeight: 300, flexShrink: 0 }}>but never</div>

                      {/* Negative pole */}
                      <div style={{ position: 'relative', flex: 1 }}>
                        <div onClick={() => setActivePole(activePole?.pair === i && activePole.side === 'neg' ? null : { pair: i, side: 'neg' })}
                          style={{ padding: '10px 16px', background: activePole?.pair === i && activePole.side === 'neg' ? 'var(--dark)' : '#EDE9E2', borderRadius: 8, cursor: 'pointer', transition: 'all 0.18s' }}>
                          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: activePole?.pair === i && activePole.side === 'neg' ? 'rgba(255,255,255,0.5)' : 'var(--stone)', marginBottom: 4 }}>Never</div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: activePole?.pair === i && activePole.side === 'neg' ? '#FDFCFA' : 'var(--concrete)' }}>
                            {pair.neg || 'Click to set'}
                          </div>
                        </div>
                        <AnimatePresence>
                          {activePole?.pair === i && activePole.side === 'neg' && (
                            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                              style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#FDFCFA', border: '1px solid rgba(184,179,172,0.4)', borderRadius: 8, overflow: 'hidden', zIndex: 10, boxShadow: '0 4px 16px rgba(26,24,22,0.1)' }}>
                              {pair.negAlts.map((alt, ai) => (
                                <div key={ai} onClick={() => updatePole(i, 'neg', alt)}
                                  style={{ padding: '10px 14px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--dark)', borderBottom: ai < pair.negAlts.length - 1 ? '1px solid rgba(213,212,214,0.3)' : 'none', transition: 'background 0.12s' }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#F5F2EB'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                  {alt}
                                </div>
                              ))}
                              <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(213,212,214,0.3)' }}>
                                <input autoFocus defaultValue={pair.neg}
                                  onKeyDown={e => { if (e.key === 'Enter') updatePole(i, 'neg', (e.target as HTMLInputElement).value) }}
                                  placeholder="Or write your own…"
                                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--dark)' }} />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Scenario carousel */}
            <div style={{ marginBottom: 48 }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 20 }}>The person</div>
              <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
                {SCENARIO_KEYS.map(({ key, getLabel }) => {
                  const value = scenarios[key as keyof typeof scenarios]
                  const example = examples[key]
                  return (
                    <div key={key} style={{ flexShrink: 0, width: 320, background: '#FAF8F4', borderRadius: 12, border: '1px solid rgba(184,179,172,0.25)', padding: '24px 26px', boxShadow: '0 2px 8px rgba(26,24,22,0.05)' }}>
                      <div style={{ fontSize: 12, color: 'var(--stone)', fontWeight: 400, marginBottom: 14, letterSpacing: '0.01em' }}>{getLabel(brandName)}</div>
                      <textarea value={value}
                        onChange={e => { const next = { ...scenarios, [key]: e.target.value }; setScenarios(next); save(pairs, next) }}
                        placeholder={`How does ${brandName} behave here?`}
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 300, color: 'var(--dark)', lineHeight: 1.8, minHeight: 80, marginBottom: 0 }} />

                      {/* Voice example */}
                      <div style={{ borderTop: '1px solid rgba(184,179,172,0.25)', paddingTop: 16, marginTop: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mango)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />
                          In their voice
                        </div>
                        {generatingExample === key ? (
                          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>{[0,1,2].map(i => <motion.div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--mango)' }} animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.18 }} />)}</div>
                        ) : example ? (
                          <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15, color: 'var(--dark)', lineHeight: 1.7, margin: '0 0 12px' }}>"{example}"</p>
                        ) : null}
                        {!generatingExample && value.trim() && (
                          <ProofButton onClick={() => genExample(key)} size="sm">
                            {example ? 'New example' : 'Generate example →'}
                          </ProofButton>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 32, borderTop: '1px solid rgba(213,212,214,0.4)' }}>
              <button onClick={() => router.push(`/project/${project.id}/synthesis/values`)} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>← Values</button>
              <button onClick={handleAdvance} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, background: allFilled ? 'var(--dark)' : '#D5D4D6', color: allFilled ? '#FDFCFA' : '#8C8780', border: 'none', borderRadius: 5, padding: '12px 22px', cursor: allFilled ? 'pointer' : 'default', transition: 'all 0.2s' }}
                onMouseEnter={e => { if (allFilled) e.currentTarget.style.background = 'var(--mango)' }}
                onMouseLeave={e => { if (allFilled) e.currentTarget.style.background = 'var(--dark)' }}>
                Continue to Tone →
              </button>
            </div>
          </motion.div>
        )}
      </main>

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
