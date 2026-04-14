'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Project } from '@/types'
import { useProofStore } from '@/store'
import { useProofStream } from '@/lib/useProofStream'
import { buildSynthesisContext } from '@/lib/synthesisContext'
import Strip from '@/components/proof/Strip'
import ProofDrawer from '@/components/proof/ProofDrawer'
import ProofButton from '@/components/proof/ProofButton'

export default function PersonalityModule({ project }: { project: Project }) {
  const router = useRouter()
  const { updateProject } = useProofStore()
  const { stream } = useProofStream()

  const existing = project.synthesis?.personality
  const [tensions, setTensions] = useState<string[]>(existing?.tensions || ['', '', ''])
  const [dinner, setDinner] = useState(existing?.dinner || '')
  const [difficult, setDifficult] = useState(existing?.difficult || '')
  const [decision, setDecision] = useState(existing?.decision || '')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(!!existing?.tensions?.length)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [summaryState, setSummaryState] = useState<'thinking' | 'arrived' | null>(null)
  const [summaryText, setSummaryText] = useState('')

  const ctx = buildSynthesisContext(project)
  const allFilled = tensions.some(t => t.trim()) && dinner.trim() && difficult.trim() && decision.trim()
  const isSummaryActive = summaryState === 'thinking' || summaryState === 'arrived'

  useEffect(() => { if (!generated) generate() }, [])

  function save(t = tensions, d = dinner, di = difficult, de = decision) {
    updateProject(project.id, { synthesis: { ...project.synthesis, personality: { tensions: t, dinner: d, difficult: di, decision: de } } })
  }

  async function generate() {
    setGenerating(true)
    const prompt = `${ctx}

Write the brand personality for this brand using the brand-as-person framework.

Write exactly:
TENSION_1: [quality] but never [excess] — e.g. "Rigorous but never cold"
TENSION_2: [quality] but never [excess]
TENSION_3: [quality] but never [excess]
DINNER: [Describe this brand as a person at a dinner party — 2 sentences. Specific. What do they talk about, how do they hold themselves?]
DIFFICULT: [This same person in a difficult conversation — 2 sentences. How do they handle disagreement?]
DECISION: [This same person making a decision under pressure — 2 sentences. What do they prioritise?]

The tensions should be vivid enough that a designer knows exactly what to make without being told. No generic adjectives. No em dashes.`

    await stream({
      project, mode: 'strategist', module: 'Personality', prompt, maxTokens: 500,
      onChunk: () => {},
      onComplete: (text) => {
        const t1 = text.match(/TENSION_1:\s*(.+?)(?=\n|$)/)?.[1]?.trim() || ''
        const t2 = text.match(/TENSION_2:\s*(.+?)(?=\n|$)/)?.[1]?.trim() || ''
        const t3 = text.match(/TENSION_3:\s*(.+?)(?=\n|$)/)?.[1]?.trim() || ''
        const d = text.match(/DINNER:\s*(.+?)(?=\nDIFFICULT:|$)/s)?.[1]?.trim() || ''
        const di = text.match(/DIFFICULT:\s*(.+?)(?=\nDECISION:|$)/s)?.[1]?.trim() || ''
        const de = text.match(/DECISION:\s*(.+?)$/s)?.[1]?.trim() || ''
        const newTensions = [t1, t2, t3]
        setTensions(newTensions); setDinner(d); setDifficult(di); setDecision(de)
        save(newTensions, d, di, de)
        setGenerating(false); setGenerated(true)
      },
    })
  }

  async function fetchSummary() {
    setSummaryState('thinking'); setDrawerOpen(true)
    const prompt = `${ctx}

Brand personality:
Tensions: ${tensions.filter(t=>t).join(' / ')}
At dinner: ${dinner}
In difficulty: ${difficult}
Under pressure: ${decision}

In 2 sentences: is this personality distinctive enough to guide creative decisions? Would a designer know what not to make from this? No em dashes.`

    await stream({
      project, mode: 'strategist', module: 'Personality', prompt, maxTokens: 180,
      onChunk: () => {},
      onComplete: (text) => { setSummaryText(text); setSummaryState('arrived') },
    })
  }

  const handleAdvance = useCallback(() => {
    if (!allFilled) { setDrawerOpen(true); return }
    if (!summaryState) { fetchSummary(); return }
    router.push(`/project/${project.id}/synthesis/tone`)
  }, [allFilled, summaryState, project.id, router])

  const fieldStyle = { width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(213,212,214,0.4)', padding: '6px 0 12px', fontFamily: 'var(--font-sans)' as const, fontSize: 15, fontWeight: 300 as const, color: 'var(--dark)', outline: 'none', resize: 'none' as const, lineHeight: 1.8, minHeight: 68 }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F2EB' }}>
      <Strip project={project} phase="Synthesis — Personality" onAskProof={() => { setSummaryState(null); setDrawerOpen(true) }} />
      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '80px 24px 120px' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 16 }}>Synthesis — 3 of 7</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.06, letterSpacing: '-0.015em', marginBottom: 20 }}>Who we are.</h1>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, marginBottom: 56, fontWeight: 300 }}>
            Brand as a person. Tension pairs replace adjective lists. The result should be vivid enough that a designer knows exactly what to make — and what not to.
          </p>
        </motion.div>

        <AnimatePresence>
          {generating && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0,1,2].map(i => <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }} animate={{ opacity: [0.3,1,0.3], scale: [0.8,1,0.8] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.18 }} />)}
              </div>
              <span style={{ fontSize: 13, color: 'var(--stone)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>proof. is imagining the person behind the brand…</span>
            </motion.div>
          )}
        </AnimatePresence>

        {generated && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Tensions */}
            <div style={{ marginBottom: 56 }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 20 }}>Tension pairs</div>
              <p style={{ fontSize: 13, color: 'var(--concrete)', marginBottom: 20, fontWeight: 300, lineHeight: 1.65 }}>
                The productive contradictions that make this brand interesting. Each one is a creative brief in itself.
              </p>
              {tensions.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <span style={{ fontSize: 13, color: 'var(--stone)', fontWeight: 300, width: 56, flexShrink: 0 }}>{['First', 'Second', 'Third'][i]}</span>
                  <input
                    value={t}
                    onChange={e => { const next = [...tensions]; next[i] = e.target.value; setTensions(next); save(next) }}
                    placeholder={`e.g. Rigorous but never cold`}
                    style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(213,212,214,0.4)', padding: '6px 0 8px', fontFamily: 'var(--font-display)', fontSize: 16, fontStyle: 'italic', fontWeight: 400, color: 'var(--dark)', outline: 'none' }}
                  />
                </div>
              ))}
            </div>

            {/* Scenarios */}
            <div style={{ marginBottom: 56 }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 20 }}>The person</div>
              {[
                { label: 'At a dinner party', value: dinner, set: (v: string) => { setDinner(v); save(tensions, v, difficult, decision) }, placeholder: 'What do they talk about? How do they hold themselves?' },
                { label: 'In a difficult conversation', value: difficult, set: (v: string) => { setDifficult(v); save(tensions, dinner, v, decision) }, placeholder: 'How do they handle disagreement?' },
                { label: 'Making a decision under pressure', value: decision, set: (v: string) => { setDecision(v); save(tensions, dinner, difficult, v) }, placeholder: 'What do they prioritise when it costs them?' },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label} style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 12, color: 'var(--stone)', fontWeight: 300, marginBottom: 10 }}>{label}</div>
                  <textarea value={value} onChange={e => set(e.target.value)} placeholder={placeholder} style={fieldStyle} />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 32, borderTop: '1px solid rgba(213,212,214,0.4)' }}>
              <button onClick={() => router.push(`/project/${project.id}/synthesis/values`)} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>← Values</button>
              <button onClick={handleAdvance} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, background: allFilled ? 'var(--dark)' : '#D5D4D6', color: allFilled ? '#FDFCFA' : '#8C8780', border: 'none', borderRadius: 5, padding: '12px 22px', cursor: allFilled ? 'pointer' : 'default', transition: 'all 0.2s' }}
                onMouseEnter={e => { if (allFilled) (e.currentTarget.style.background = 'var(--mango)') }}
                onMouseLeave={e => { if (allFilled) (e.currentTarget.style.background = 'var(--dark)') }}>
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
        onContinue={() => router.push(`/project/${project.id}/synthesis/tone`)}
        onReview={() => { setSummaryState(null); setDrawerOpen(false) }} />
      <style>{`textarea::placeholder { color: var(--stone); font-style: italic; } input::placeholder { color: var(--stone); }`}</style>
    </div>
  )
}
