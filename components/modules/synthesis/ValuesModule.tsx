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

Write exactly 3 core values for this brand.

What makes a value real vs decorative:
- It changes how decisions get made, not just how they're described
- The brand would hold it even if it became a competitive disadvantage
- A competitor in this category could not claim it without looking dishonest
- You can point to actual behaviour that proves it — decisions made, things refused, things built

What to avoid:
- Values that every brand in every category could claim (Integrity, Excellence, Innovation)
- Values that describe outcomes rather than choices (Growth, Impact, Success)
- Values so broad they can't be violated (Respect, Care, Transparency)

For each value write:
VALUE_1_NAME: [single word or short phrase — the value as a noun, not a gerund]
VALUE_1_DEFINITION: [what this value means specifically for this brand — 1 sentence, names the specific choice or stance]
VALUE_1_BEHAVIOUR: [what it looks like when someone at this brand acts on it — 1 concrete, observable sentence]

VALUE_2_NAME: [single word or short phrase]
VALUE_2_DEFINITION: [1 sentence]
VALUE_2_BEHAVIOUR: [1 concrete sentence]

VALUE_3_NAME: [single word or short phrase]
VALUE_3_DEFINITION: [1 sentence]
VALUE_3_BEHAVIOUR: [1 concrete sentence]

These must be traceable to what was found in the brief. Not aspirational — actual. No em dashes.`

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

  async function rewriteValue(v: Value, feedback: string) {
    const prompt = `${ctx}

This value needs a rewrite:
Name: "${v.name}"
Definition: "${v.definition}"
In practice: "${v.behaviour}"

The stress test found: ${feedback}

Rewrite this value so it passes the competitor test and the decision test. Keep the same spirit but make it more specific to this brand.

Write exactly:
VALUE_NAME: [single word or short phrase]
VALUE_DEFINITION: [what this means specifically for this brand — 1 sentence]
VALUE_BEHAVIOUR: [what it looks like in action — 1 concrete sentence]

No em dashes.`

    // Clear challenge while rewriting
    setChallenges(prev => ({ ...prev, [v.id]: '' }))
    await stream({
      project, mode: 'strategist', module: 'Values', prompt, maxTokens: 200,
      onChunk: () => {},
      onComplete: (text) => {
        const name = text.match(/VALUE_NAME:\s*(.+?)(?=\n|$)/)?.[1]?.trim()
        const definition = text.match(/VALUE_DEFINITION:\s*(.+?)(?=\n|$)/)?.[1]?.trim()
        const behaviour = text.match(/VALUE_BEHAVIOUR:\s*(.+?)(?=\n|$)/)?.[1]?.trim()
        if (name || definition || behaviour) {
          const next = values.map(val => val.id === v.id ? {
            ...val,
            name: name || val.name,
            definition: definition || val.definition,
            behaviour: behaviour || val.behaviour,
          } : val)
          setValues(next)
          save(next)
        }
        // Remove the challenge result — value has been rewritten, stress test is stale
        setChallenges(prev => { const n = { ...prev }; delete n[v.id]; return n })
      },
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-0)' }}>
      <Strip project={project} phase="Synthesis — Values" onAskProof={() => { setSummaryState(null); setDrawerOpen(true) }} />

      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '72px 24px 120px' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 14 }}>Synthesis — 2 of 7</div>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, marginBottom: 48, fontWeight: 300 }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {values.map((v, i) => {
              const challenge = challenges[v.id]
              const isRunning = challenges[v.id] === ''
              const passes = challenge && /^PASSES/i.test(challenge)
              const needsWork = challenge && /^NEEDS WORK/i.test(challenge)
              const pillBg = passes ? 'rgba(34,197,94,0.12)' : needsWork ? 'rgba(251,146,60,0.15)' : challenge ? 'rgba(239,68,68,0.12)' : undefined
              const pillColor = passes ? '#15803d' : needsWork ? '#c2610c' : '#b91c1c'
              const pillLabel = passes ? 'Passes' : needsWork ? 'Needs work' : 'Fails'

              return (
                <motion.div key={v.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  style={{
                    background: 'var(--surface-1)',
                    borderRadius: 14,
                    border: '1px solid rgba(184,179,172,0.25)',
                    borderLeft: passes ? '1.5px solid #15803d' : needsWork ? '1.5px solid #c2610c' : '1.5px solid rgba(184,179,172,0.25)',
                    padding: '24px 28px',
                    boxShadow: '0 1px 3px rgba(26,24,22,0.04)',
                    transition: 'border-color 0.3s',
                  }}>

                  {/* Value number + name */}
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 10 }}>
                    Value {i + 1}
                  </div>
                  <input
                    value={v.name}
                    onChange={e => updateValue(v.id, 'name', e.target.value)}
                    placeholder="The value"
                    style={{ width: '100%', background: 'transparent', border: 'none', padding: '2px 0 12px', fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400, fontStyle: 'italic', color: 'var(--dark)', outline: 'none' }}
                  />

                  {/* Divider */}
                  <div style={{ height: 1, background: 'rgba(184,179,172,0.25)', marginBottom: 18 }} />

                  {/* Definition */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 8 }}>What it means</div>
                    <textarea
                      value={v.definition}
                      onChange={e => updateValue(v.id, 'definition', e.target.value)}
                      placeholder="What this value means specifically for this brand."
                      style={{ width: '100%', background: 'transparent', border: 'none', padding: '4px 0 8px', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 300, color: 'var(--dark)', outline: 'none', resize: 'none', lineHeight: 1.75, minHeight: 44 }}
                    />
                  </div>

                  {/* Behaviour */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 8 }}>What it looks like</div>
                    <textarea
                      value={v.behaviour}
                      onChange={e => updateValue(v.id, 'behaviour', e.target.value)}
                      placeholder="A concrete description of this value in action."
                      style={{ width: '100%', background: 'transparent', border: 'none', padding: '4px 0 8px', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 300, color: 'var(--dark)', outline: 'none', resize: 'none', lineHeight: 1.75, minHeight: 44 }}
                    />
                  </div>

                  {/* Stress test result — inline, always visible if run */}
                  {(challenge || isRunning) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      style={{ marginBottom: 18, padding: '14px 16px', background: 'var(--bg)', borderRadius: 8, border: `1px solid ${pillBg || 'rgba(184,179,172,0.2)'}` }}>
                      {isRunning ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[0,1,2].map(j => <motion.div key={j} style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--mango)' }} animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1, repeat: Infinity, delay: j*0.15 }} />)}
                        </div>
                      ) : (
                        <>
                          {pillBg && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: pillBg, borderRadius: 20, padding: '3px 10px', marginBottom: 10 }}>
                              <span style={{ width: 4, height: 4, borderRadius: '50%', background: pillColor, display: 'inline-block' }} />
                              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: pillColor }}>{pillLabel}</span>
                            </div>
                          )}
                          <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13, color: 'var(--dark)', lineHeight: 1.8, margin: 0 }}>
                            {challenge.replace(/^\*\*[^*]+\*\*:?\s*/i, '').replace(/^(PASSES|NEEDS WORK)[.\s]*/i, '')}
                          </p>
                          {!passes && (
                            <button
                              onClick={() => rewriteValue(v, challenge)}
                              style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--concrete)', background: 'none', border: '1px solid rgba(184,179,172,0.6)', borderRadius: 20, padding: '4px 14px', cursor: 'pointer', marginTop: 12, transition: 'all 0.15s', display: 'inline-block' }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--mango)'; e.currentTarget.style.color = 'var(--mango)' }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(184,179,172,0.6)'; e.currentTarget.style.color = 'var(--concrete)' }}
                            >
                              Ask proof. to rewrite →
                            </button>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* Divider before actions */}
                  <div style={{ height: 1, background: 'rgba(184,179,172,0.2)', marginBottom: 14 }} />

                  {/* Actions inside card */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ProofButton onClick={() => challengeValue(v)} size="sm">
                      {challenge ? 'Re-test →' : 'Stress test →'}
                    </ProofButton>
                  </div>
                </motion.div>
              )
            })}
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
