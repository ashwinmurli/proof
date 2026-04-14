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
  { key: 'dinner', getLabel: (name: string) => `${name} at a dinner party` },
  { key: 'difficult', getLabel: (name: string) => `${name} in a difficult conversation` },
  { key: 'decision', getLabel: (name: string) => `${name} making a decision under pressure` },
]

export default function PersonalityModule({ project }: { project: Project }) {
  const router = useRouter()
  const { updateProject } = useProofStore()
  const { stream } = useProofStream()

  const brandName = project.name && project.name !== 'Untitled project' ? project.name : 'This brand'
  const existing = project.synthesis?.personality
  const [tensions, setTensions] = useState<string[]>(existing?.tensions?.length ? existing.tensions : ['', '', ''])
  const [scenarios, setScenarios] = useState({ dinner: existing?.dinner || '', difficult: existing?.difficult || '', decision: existing?.decision || '' })
  const [examples, setExamples] = useState<Record<string, string>>({})
  const [activeTension, setActiveTension] = useState<number | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(!!(existing?.tensions?.length && existing.tensions[0]))
  const [generatingExample, setGeneratingExample] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [summaryState, setSummaryState] = useState<'thinking' | 'arrived' | null>(null)
  const [summaryText, setSummaryText] = useState('')
  const summaryStateRef = useRef<'thinking' | 'arrived' | null>(null)
  useEffect(() => { summaryStateRef.current = summaryState }, [summaryState])

  const ctx = buildSynthesisContext(project)
  const allFilled = tensions.some(t => t.trim()) && Object.values(scenarios).every(s => s.trim())
  const isSummaryActive = summaryState === 'thinking' || summaryState === 'arrived'

  useEffect(() => { if (!generated) generate() }, [])

  function save(t = tensions, s = scenarios) {
    updateProject(project.id, { synthesis: { ...project.synthesis, personality: { tensions: t, dinner: s.dinner, difficult: s.difficult, decision: s.decision } } })
  }

  async function generate() {
    setGenerating(true)
    const prompt = `${ctx}

Write the brand personality for "${brandName}" using the brand-as-person framework.

TENSION_1: [quality] but never [excess]
TENSION_2: [quality] but never [excess]
TENSION_3: [quality] but never [excess]
DINNER: [${brandName} at a dinner party — 2 sentences. Specific and vivid.]
DINNER_EXAMPLE: [one sentence in ${brandName}'s actual voice at that dinner]
DIFFICULT: [${brandName} in a difficult conversation — 2 sentences.]
DIFFICULT_EXAMPLE: [one sentence in ${brandName}'s voice in that moment]
DECISION: [${brandName} making a decision under pressure — 2 sentences.]
DECISION_EXAMPLE: [one sentence in ${brandName}'s voice making that call]

The tensions must be vivid enough that a designer knows exactly what to make without being told. Use "but never" not em dashes.`

    await stream({
      project, mode: 'strategist', module: 'Personality', prompt, maxTokens: 700,
      onChunk: () => {},
      onComplete: (text) => {
        const t1 = text.match(/TENSION_1:\s*(.+?)(?=\n|$)/)?.[1]?.trim() || ''
        const t2 = text.match(/TENSION_2:\s*(.+?)(?=\n|$)/)?.[1]?.trim() || ''
        const t3 = text.match(/TENSION_3:\s*(.+?)(?=\n|$)/)?.[1]?.trim() || ''
        const dinner = text.match(/DINNER:\s*(.+?)(?=\nDINNER_EXAMPLE:|$)/s)?.[1]?.trim() || ''
        const dinnerEx = text.match(/DINNER_EXAMPLE:\s*(.+?)(?=\n|$)/)?.[1]?.trim() || ''
        const difficult = text.match(/DIFFICULT:\s*(.+?)(?=\nDIFFICULT_EXAMPLE:|$)/s)?.[1]?.trim() || ''
        const difficultEx = text.match(/DIFFICULT_EXAMPLE:\s*(.+?)(?=\n|$)/)?.[1]?.trim() || ''
        const decision = text.match(/DECISION:\s*(.+?)(?=\nDECISION_EXAMPLE:|$)/s)?.[1]?.trim() || ''
        const decisionEx = text.match(/DECISION_EXAMPLE:\s*(.+?)(?=\n|$)/)?.[1]?.trim() || ''
        const newT = [t1, t2, t3]
        const newS = { dinner, difficult, decision }
        setTensions(newT); setScenarios(newS)
        setExamples({ dinner: dinnerEx, difficult: difficultEx, decision: decisionEx })
        save(newT, newS)
        setGenerating(false); setGenerated(true)
      },
    })
  }

  async function regenerateExample(key: string) {
    setGeneratingExample(key)
    const scenario = scenarios[key as keyof typeof scenarios]
    const label = SCENARIO_KEYS.find(s => s.key === key)?.getLabel(brandName) || key
    const prompt = `${ctx}\n\nTensions: ${tensions.filter(t=>t).join(' / ')}\n\nScenario — ${label}: ${scenario}\n\nWrite one sentence in this brand's actual voice for this moment. Not a description. Short and specific. No em dashes.`
    await stream({
      project, mode: 'strategist', module: 'Personality', prompt, maxTokens: 80,
      onChunk: () => {},
      onComplete: (text) => { setExamples(prev => ({ ...prev, [key]: text.trim() })); setGeneratingExample(null) },
    })
  }

  async function fetchSummary() {
    setSummaryState('thinking'); setDrawerOpen(true)
    const prompt = `${ctx}\n\nPersonality:\nTensions: ${tensions.filter(t=>t).join(' / ')}\n${brandName} at dinner: ${scenarios.dinner}\n${brandName} in difficulty: ${scenarios.difficult}\n${brandName} under pressure: ${scenarios.decision}\n\nIn 2 sentences: is this personality distinctive enough to guide creative decisions? Would a designer know what not to make? No em dashes.`
    await stream({
      project, mode: 'strategist', module: 'Personality', prompt, maxTokens: 180,
      onChunk: () => {},
      onComplete: (text) => { setSummaryText(text); setSummaryState('arrived') },
    })
  }

  const handleAdvance = useCallback(() => {
    if (!allFilled) { setDrawerOpen(true); return }
    if (!summaryStateRef.current) { fetchSummary(); return }
    router.push(`/project/${project.id}/synthesis/tone`)
  }, [allFilled, project.id, router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F2EB' }}>
      <Strip project={project} phase="Synthesis — Personality" onAskProof={() => { setSummaryState(null); setDrawerOpen(true) }} />
      <main style={{ flex: 1, maxWidth: 720, width: '100%', margin: '0 auto', padding: '80px 24px 120px' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 16 }}>Synthesis — 3 of 7</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.06, letterSpacing: '-0.015em', marginBottom: 20 }}>Who we are.</h1>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, marginBottom: 56, fontWeight: 300 }}>Brand as a person. Tension pairs replace adjective lists. Click any card to edit.</p>
        </motion.div>

        {generating && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
            <div style={{ display: 'flex', gap: 4 }}>{[0,1,2].map(i => <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }} animate={{ opacity: [0.3,1,0.3], scale: [0.8,1,0.8] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.18 }} />)}</div>
            <span style={{ fontSize: 13, color: 'var(--stone)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>proof. is imagining the person behind the brand…</span>
          </div>
        )}

        {generated && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Tension cards */}
            <div style={{ marginBottom: 64 }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 8 }}>Tension pairs</div>
              <p style={{ fontSize: 13, color: 'var(--stone)', fontWeight: 300, marginBottom: 20, lineHeight: 1.65 }}>The productive contradictions that make this brand interesting. Click to edit.</p>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                {tensions.map((t, i) => (
                  <motion.div key={i} onClick={() => setActiveTension(activeTension === i ? null : i)} whileHover={{ y: -2 }}
                    style={{ flexShrink: 0, minWidth: 220, maxWidth: 260, padding: '20px 22px', background: activeTension === i ? '#FAF8F4' : '#EDE9E2', borderRadius: 10, border: activeTension === i ? '1px solid rgba(255,161,10,0.35)' : '1px solid transparent', cursor: 'pointer', boxShadow: activeTension === i ? '0 4px 16px rgba(26,24,22,0.08), 0 1px 3px rgba(26,24,22,0.06)' : '0 1px 3px rgba(26,24,22,0.04)', transition: 'all 0.2s ease' }}>
                    <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: activeTension === i ? 'var(--mango)' : 'var(--stone)', marginBottom: 10 }}>
                      {['First', 'Second', 'Third'][i]}
                    </div>
                    {activeTension === i ? (
                      <input value={t} onChange={e => { const next = [...tensions]; next[i] = e.target.value; setTensions(next); save(next, scenarios) }}
                        autoFocus onClick={e => e.stopPropagation()} placeholder="Quality but never excess"
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-display)', fontSize: 16, fontStyle: 'italic', color: 'var(--dark)', lineHeight: 1.5, padding: 0 }} />
                    ) : (
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontStyle: 'italic', color: t ? 'var(--dark)' : 'var(--stone)', lineHeight: 1.5, margin: 0 }}>{t || 'Click to write'}</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Scenario cards */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 20 }}>The person</div>
              {SCENARIO_KEYS.map(({ key, getLabel }) => {
                const value = scenarios[key as keyof typeof scenarios]
                const example = examples[key]
                return (
                  <div key={key} style={{ padding: '24px 28px', background: '#FAF8F4', borderRadius: 10, border: '1px solid rgba(184,179,172,0.25)', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--stone)', fontWeight: 400, marginBottom: 14 }}>{getLabel(brandName)}</div>
                    <textarea value={value}
                      onChange={e => { const next = { ...scenarios, [key]: e.target.value }; setScenarios(next); save(tensions, next) }}
                      placeholder={`How does ${brandName} behave here?`}
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 300, color: 'var(--dark)', lineHeight: 1.8, minHeight: 52, marginBottom: 8 }} />
                    {(example || generatingExample === key) && (
                      <div style={{ borderTop: '1px solid rgba(184,179,172,0.3)', paddingTop: 14, marginTop: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mango)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />
                          In their voice
                        </div>
                        {generatingExample === key
                          ? <div style={{ display: 'flex', gap: 4 }}>{[0,1,2].map(i => <motion.div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--mango)' }} animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.18 }} />)}</div>
                          : <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15, color: 'var(--dark)', lineHeight: 1.7, margin: 0 }}>"{example}"</p>}
                      </div>
                    )}
                    {!generatingExample && value.trim() && (
                      <div style={{ marginTop: 12 }}>
                        <ProofButton onClick={() => regenerateExample(key)} size="sm">
                          {example ? 'New example' : 'Generate example →'}
                        </ProofButton>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 48, borderTop: '1px solid rgba(213,212,214,0.4)', marginTop: 32 }}>
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
