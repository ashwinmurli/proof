'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Project, Value } from '@/types'
import { useProofStore } from '@/store'
import { useProofStream } from '@/lib/useProofStream'
import { buildSynthesisContext } from '@/lib/synthesisContext'
import Strip from '@/components/proof/Strip'
import ProofDrawer from '@/components/proof/ProofDrawer'
import ProofButton from '@/components/proof/ProofButton'

const STRESS_TESTS = [
  'Would we hold this value even if it became a competitive disadvantage?',
  'Does this change how we make decisions, or does it just sound good?',
  'Would someone who breached this consistently not belong here?',
]

export default function ValuesModule({ project }: { project: Project }) {
  const router = useRouter()
  const { updateProject } = useProofStore()
  const { stream } = useProofStream()

  const existing = project.synthesis?.values || []
  const [values, setValues] = useState<Value[]>(existing.length ? existing : [
    { id: '1', name: '', definition: '', behaviour: '' },
    { id: '2', name: '', definition: '', behaviour: '' },
    { id: '3', name: '', definition: '', behaviour: '' },
  ])
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(existing.length > 0 && existing[0].name !== '')
  const [challenges, setChallenges] = useState<Record<string, string>>({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [summaryState, setSummaryState] = useState<'thinking' | 'arrived' | null>(null)
  const [summaryText, setSummaryText] = useState('')

  const ctx = buildSynthesisContext(project)
  const allFilled = values.every(v => v.name.trim() && v.definition.trim() && v.behaviour.trim())
  const isSummaryActive = summaryState === 'thinking' || summaryState === 'arrived'

  useEffect(() => {
    if (!generated) generateDraft()
  }, [])

  function save(v: Value[]) {
    updateProject(project.id, { synthesis: { ...project.synthesis, values: v } })
  }

  async function generateDraft() {
    setGenerating(true)
    const prompt = `${ctx}

Write exactly 3 core values for this brand. Each must pass this test: would we hold it even if it became a competitive disadvantage?

For each value write:
VALUE_1_NAME: [single word or short phrase]
VALUE_1_DEFINITION: [what this means for this brand specifically — 1 sentence]
VALUE_1_BEHAVIOUR: [what it looks like in action — 1 concrete sentence]

VALUE_2_NAME: [single word or short phrase]
VALUE_2_DEFINITION: [what this means for this brand specifically — 1 sentence]
VALUE_2_BEHAVIOUR: [what it looks like in action — 1 concrete sentence]

VALUE_3_NAME: [single word or short phrase]
VALUE_3_DEFINITION: [what this means for this brand specifically — 1 sentence]
VALUE_3_BEHAVIOUR: [what it looks like in action — 1 concrete sentence]

These must be real, not aspirational. Not what sounds good — what the brief shows is already true. No em dashes.`

    await stream({
      project, mode: 'strategist', module: 'Values', prompt, maxTokens: 500,
      onChunk: () => {},
      onComplete: (text) => {
        const parsed: Value[] = [1, 2, 3].map(n => ({
          id: String(n),
          name: text.match(new RegExp(`VALUE_${n}_NAME:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '',
          definition: text.match(new RegExp(`VALUE_${n}_DEFINITION:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '',
          behaviour: text.match(new RegExp(`VALUE_${n}_BEHAVIOUR:\\s*(.+?)(?=\\n|$)`))?.[1]?.trim() || '',
        }))
        setValues(parsed)
        save(parsed)
        setGenerating(false)
        setGenerated(true)
      },
    })
  }

  async function challengeValue(v: Value) {
    const prompt = `${ctx}

Core value being tested: "${v.name}"
Definition: "${v.definition}"
In practice: "${v.behaviour}"

Apply these three tests ruthlessly:
1. Would this brand hold this value even if it became a competitive disadvantage?
2. Does this actually change how decisions get made, or does it just sound good?
3. Could a competitor in this category claim exactly this?

Give a clear verdict: PASSES or NEEDS WORK.
If it passes: say why it holds and what makes it specifically theirs.
If it needs work: say exactly which test it fails and give one concrete direction for sharpening it.
3-4 sentences maximum. No em dashes. End with either "This one holds." or a specific rewrite prompt like "Try anchoring this to [specific behaviour]."`

    setChallenges(prev => ({ ...prev, [v.id]: '' }))
    await stream({
      project, mode: 'strategist', module: 'Values', prompt, maxTokens: 200,
      onChunk: (text) => setChallenges(prev => ({ ...prev, [v.id]: text })),
      onComplete: (text) => setChallenges(prev => ({ ...prev, [v.id]: text })),
    })
  }

  function updateValue(id: string, field: keyof Value, val: string) {
    const next = values.map(v => v.id === id ? { ...v, [field]: val } : v)
    setValues(next)
    save(next)
  }

  async function fetchSummary() {
    setSummaryState('thinking')
    setDrawerOpen(true)
    const prompt = `${ctx}

The three core values:
${values.map(v => `${v.name}: ${v.definition}. In practice: ${v.behaviour}`).join('\n')}

Assess in 2 sentences. Do these feel real or aspirational? Is there anything here that a competitor would be embarrassed not to have? No em dashes.`

    await stream({
      project, mode: 'strategist', module: 'Values', prompt, maxTokens: 200,
      onChunk: () => {},
      onComplete: (text) => { setSummaryText(text); setSummaryState('arrived') },
    })
  }

  const summaryStateRef = useRef<'thinking' | 'arrived' | null>(null)
  useEffect(() => { summaryStateRef.current = summaryState }, [summaryState])

  const handleAdvance = useCallback(() => {
    if (!allFilled) { setDrawerOpen(true); return }
    if (!summaryStateRef.current) { fetchSummary(); return }
    router.push(`/project/${project.id}/synthesis/personality`)
  }, [allFilled, fetchSummary, project.id, router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F2EB' }}>
      <Strip project={project} phase="Synthesis — Values" onAskProof={() => { setSummaryState(null); setDrawerOpen(true) }} />

      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '80px 24px 120px' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 16 }}>Synthesis — 2 of 7</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.06, letterSpacing: '-0.015em', marginBottom: 20 }}>What we stand for.</h1>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, marginBottom: 56, fontWeight: 300 }}>
            Three values. Each one needs a definition and a behavioural description — what it looks like in action. Values without teeth are decorations.
          </p>
        </motion.div>

        <AnimatePresence>
          {generating && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0,1,2].map(i => <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }}
                  animate={{ opacity: [0.3,1,0.3], scale: [0.8,1,0.8] }} transition={{ duration: 1.2, repeat: Infinity, delay: i*0.18 }} />)}
              </div>
              <span style={{ fontSize: 13, color: 'var(--stone)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>proof. is finding the real values…</span>
            </motion.div>
          )}
        </AnimatePresence>

        {generated && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {values.map((v, i) => (
              <motion.div key={v.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                style={{ paddingBottom: 48, borderBottom: i < 2 ? '1px solid rgba(213,212,214,0.4)' : 'none' }}>

                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 16 }}>
                  Value {i + 1}
                </div>

                {/* Name */}
                <input
                  value={v.name}
                  onChange={e => updateValue(v.id, 'name', e.target.value)}
                  placeholder="The value"
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(110,107,104,0.3)', padding: '4px 0 10px', fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, fontStyle: 'italic', color: 'var(--dark)', outline: 'none', marginBottom: 20 }}
                />

                {/* Definition */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 8 }}>What it means</div>
                  <textarea
                    value={v.definition}
                    onChange={e => updateValue(v.id, 'definition', e.target.value)}
                    placeholder="What this value means specifically for this brand."
                    style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(213,212,214,0.4)', padding: '6px 0 12px', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 300, color: 'var(--dark)', outline: 'none', resize: 'none', lineHeight: 1.75, minHeight: 52 }}
                  />
                </div>

                {/* Behaviour */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 8 }}>What it looks like</div>
                  <textarea
                    value={v.behaviour}
                    onChange={e => updateValue(v.id, 'behaviour', e.target.value)}
                    placeholder="A concrete description of this value in action."
                    style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(213,212,214,0.4)', padding: '6px 0 12px', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 300, color: 'var(--dark)', outline: 'none', resize: 'none', lineHeight: 1.75, minHeight: 52 }}
                  />
                </div>

                {/* Stress test */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ProofButton onClick={() => challengeValue(v)} size="sm">
                    {challenges[v.id] !== undefined ? 'Re-test this value' : 'Stress test →'}
                  </ProofButton>
                </div>

                {challenges[v.id] && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    style={{ marginTop: 16, paddingLeft: 16, borderLeft: '1.5px solid var(--mango)' }}>
                    <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13, color: 'var(--dark)', lineHeight: 1.8 }}>
                      {challenges[v.id]}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {generated && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 48, marginTop: 16 }}>
            <button onClick={() => router.push(`/project/${project.id}/synthesis/beliefs`)}
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>
              ← Beliefs
            </button>
            <button onClick={handleAdvance}
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, background: allFilled ? 'var(--dark)' : '#D5D4D6', color: allFilled ? '#FDFCFA' : '#8C8780', border: 'none', borderRadius: 5, padding: '12px 22px', cursor: allFilled ? 'pointer' : 'default', transition: 'all 0.2s' }}
              onMouseEnter={e => { if (allFilled) (e.currentTarget.style.background = 'var(--mango)') }}
              onMouseLeave={e => { if (allFilled) (e.currentTarget.style.background = 'var(--dark)') }}>
              Continue to Personality →
            </button>
          </div>
        )}
      </main>

      <ProofDrawer
        project={project} mode="strategist" module="Values"
        open={drawerOpen || isSummaryActive} onClose={() => { setDrawerOpen(false); setSummaryState(null) }}
        summaryMode={isSummaryActive} summaryState={summaryState} summaryText={summaryText}
        summaryThinkingLabel="Stress-testing the values…" summaryContinueLabel="Continue to Personality →"
        onContinue={() => router.push(`/project/${project.id}/synthesis/personality`)}
        onReview={() => { setSummaryState(null); setDrawerOpen(false) }}
      />
      <style>{`textarea::placeholder { color: var(--stone); font-style: italic; } input::placeholder { color: var(--stone); }`}</style>
    </div>
  )
}
