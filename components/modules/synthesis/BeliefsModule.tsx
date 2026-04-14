'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Project } from '@/types'
import { useProofStore } from '@/store'
import { useProofStream } from '@/lib/useProofStream'
import { buildSynthesisContext } from '@/lib/synthesisContext'
import Strip from '@/components/proof/Strip'
import ProofDrawer from '@/components/proof/ProofDrawer'
import ProofButton from '@/components/proof/ProofButton'

const FIELDS = [
  {
    id: 'belief' as const,
    label: 'What we believe',
    question: 'Why does this brand exist beyond making money?',
    placeholder: 'Start with a strong verb. If a competitor could say it, it isn\'t the conviction.',
    hint: 'The why. A specific, arguable belief. Should make you slightly uncomfortable.',
    refinePrompt: (current: string, feedback: string, ctx: string) =>
      `Context:\n${ctx}\n\nCurrent "What we believe" statement:\n"${current}"\n\nFeedback:\n"${feedback}"\n\nRewrite it. Start with a strong verb. Specific enough to exclude competitors. Should give a chill — uncomfortable enough to mean something. 1-2 sentences. No em dashes.`,
  },
  {
    id: 'building' as const,
    label: 'What we\'re building',
    question: 'What picture of the future does this brand aspire to create?',
    placeholder: 'We see a world where… What changes if this brand succeeds?',
    hint: 'The what. The future state. Should feel ambitious but traceable to the conviction.',
    refinePrompt: (current: string, feedback: string, ctx: string) =>
      `Context:\n${ctx}\n\nCurrent "What we're building" statement:\n"${current}"\n\nFeedback:\n"${feedback}"\n\nRewrite it. A picture of the future — aspirational but grounded in what was found in the brief. 1-2 sentences. No em dashes.`,
  },
  {
    id: 'working' as const,
    label: 'How we work',
    question: 'How does this brand bring its conviction into reality?',
    placeholder: 'The daily doing. Specific actions, not principles.',
    hint: 'The how. The mission. What the brand actually does to move toward the vision.',
    refinePrompt: (current: string, feedback: string, ctx: string) =>
      `Context:\n${ctx}\n\nCurrent "How we work" statement:\n"${current}"\n\nFeedback:\n"${feedback}"\n\nRewrite it. Specific operational actions — what the brand does daily to realise the conviction. Not principles. 1-2 sentences. No em dashes.`,
  },
]

type FieldId = 'belief' | 'building' | 'working'

export default function BeliefsModule({ project }: { project: Project }) {
  const router = useRouter()
  const { updateProject } = useProofStore()
  const { stream } = useProofStream()

  const existing = project.synthesis?.beliefs
  const [values, setValues] = useState({
    belief: existing?.belief || '',
    building: existing?.building || '',
    working: existing?.working || '',
  })
  const [activeId, setActiveId] = useState<FieldId | null>(null)
  const [generateState, setGenerateState] = useState<'idle' | 'generating' | 'done'>(existing?.belief ? 'done' : 'idle')
  const [streamingId, setStreamingId] = useState<FieldId | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState<FieldId | null>(null)
  const [feedbackText, setFeedbackText] = useState<Record<FieldId, string>>({ belief: '', building: '', working: '' })
  const [refining, setRefining] = useState<FieldId | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [summaryState, setSummaryState] = useState<'thinking' | 'arrived' | null>(null)
  const [summaryText, setSummaryText] = useState('')

  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const feedbackRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const ctx = buildSynthesisContext(project)
  const allFilled = values.belief.trim().length > 10 && values.building.trim().length > 10 && values.working.trim().length > 10
  const answeredCount = [values.belief, values.building, values.working].filter(v => v.trim().length > 10).length
  const isSummaryActive = summaryState === 'thinking' || summaryState === 'arrived'

  useEffect(() => {
    if (!existing?.belief && generateState === 'idle') generateAll()
  }, [])

  function save(v: typeof values) {
    updateProject(project.id, {
      synthesis: { ...project.synthesis, beliefs: { ...v } }
    })
  }

  async function generateAll() {
    setGenerateState('generating')
    const prompt = `${ctx}

Now write the three belief statements for this brand. Be direct. Be specific. Start each with a strong verb.

Write exactly:
BELIEF: [What this brand believes — the conviction. 1-2 sentences. Specific enough to exclude competitors.]
BUILDING: [What future the brand is creating — the vision. 1-2 sentences. Aspirational but grounded.]
WORKING: [How the brand actually operates — the mission. 1-2 sentences. Specific actions, not principles.]

No em dashes. No flattery. Make the BELIEF uncomfortable enough to mean something.`

    await stream({
      project, mode: 'strategist', module: 'Beliefs', prompt, maxTokens: 400,
      onChunk: (text) => {
        const b = text.match(/BELIEF:\s*(.+?)(?=\nBUILDING:|$)/s)?.[1]?.trim()
        const bu = text.match(/BUILDING:\s*(.+?)(?=\nWORKING:|$)/s)?.[1]?.trim()
        const w = text.match(/WORKING:\s*(.+?)$/s)?.[1]?.trim()
        const next = { belief: b || values.belief, building: bu || values.building, working: w || values.working }
        setValues(next)
      },
      onComplete: (text) => {
        const b = text.match(/BELIEF:\s*(.+?)(?=\nBUILDING:|$)/s)?.[1]?.trim() || values.belief
        const bu = text.match(/BUILDING:\s*(.+?)(?=\nWORKING:|$)/s)?.[1]?.trim() || values.building
        const w = text.match(/WORKING:\s*(.+?)$/s)?.[1]?.trim() || values.working
        const final = { belief: b, building: bu, working: w }
        setValues(final)
        save(final)
        setGenerateState('done')
      },
    })
  }

  function handleInput(id: FieldId, value: string) {
    const next = { ...values, [id]: value }
    setValues(next)
    save(next)
  }

  async function submitFeedback(id: FieldId) {
    const feedback = feedbackText[id]?.trim()
    if (!feedback) return
    const field = FIELDS.find(f => f.id === id)
    if (!field) return
    setRefining(id)
    setStreamingId(id)

    await stream({
      project, mode: 'strategist', module: 'Beliefs',
      prompt: field.refinePrompt(values[id], feedback, ctx),
      maxTokens: 200,
      onChunk: (text) => setValues(prev => ({ ...prev, [id]: text })),
      onComplete: (text) => {
        const next = { ...values, [id]: text }
        setValues(next)
        save(next)
        setStreamingId(null)
        setRefining(null)
        setFeedbackOpen(null)
        setFeedbackText(prev => ({ ...prev, [id]: '' }))
      },
    })
  }

  async function fetchSummary() {
    setSummaryState('thinking')
    setDrawerOpen(true)
    const prompt = `${ctx}

They've written their belief statements:
What we believe: ${values.belief}
What we're building: ${values.building}
How we work: ${values.working}

Assess these in 2-3 sentences. Does the conviction pass the competitor test? Is there a genuine through-line from belief to vision to practice? What's the strongest thing here and what risks becoming generic if they're not careful? No em dashes. No flattery.`

    await stream({
      project, mode: 'strategist', module: 'Beliefs', prompt, maxTokens: 250,
      onChunk: () => {},
      onComplete: (text) => {
        setSummaryText(text)
        setSummaryState('arrived')
        updateProject(project.id, {
          synthesis: { ...project.synthesis, beliefs: { ...values, proofSummary: text } }
        })
      },
    })
  }

  function handleKeyDown(e: React.KeyboardEvent, id: FieldId) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      const idx = FIELDS.findIndex(f => f.id === id)
      const isLast = idx === FIELDS.length - 1
      if (isLast) { if (allFilled && !summaryState) fetchSummary() }
      else { setActiveId(FIELDS[idx + 1].id) }
    }
  }

  const handleScroll = useCallback((id: string) => {
    setActiveId(id as FieldId)
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => textareaRefs.current[id]?.focus(), 400)
  }, [])

  const summaryStateRef = useRef<'thinking' | 'arrived' | null>(null)

  // Keep ref in sync
  useEffect(() => { summaryStateRef.current = summaryState }, [summaryState])

  const handleAdvance = useCallback(() => {
    if (!allFilled) { setDrawerOpen(true); return }
    if (!summaryStateRef.current) { fetchSummary(); return }
    router.push(`/project/${project.id}/synthesis/values`)
  }, [allFilled, fetchSummary, project.id, router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F2EB' }}>
      <Strip
        project={project} phase="Synthesis — Beliefs"
        onAskProof={() => { setSummaryState(null); setDrawerOpen(true) }}
        answeredCount={answeredCount} totalCount={3}
      />

      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '80px 24px 120px' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 16 }}>
            Synthesis — 1 of 7
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.06, letterSpacing: '-0.015em', marginBottom: 20 }}>
            What we believe.
          </h1>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, marginBottom: 56, fontWeight: 300 }}>
            Three statements that define the brand's foundation. The why must be uncomfortable enough to mean something. If a competitor could say it, it isn't the conviction.
          </p>
        </motion.div>

        {/* Generating */}
        <AnimatePresence>
          {generateState === 'generating' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 56, padding: '16px 0' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0,1,2].map(i => (
                  <motion.div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }} />
                ))}
              </div>
              <span style={{ fontSize: 13, color: 'var(--stone)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                proof. is writing a first draft…
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fields */}
        <div>
          {FIELDS.map((field, index) => {
            const isActive = activeId === field.id
            const value = values[field.id]
            const isLast = index === FIELDS.length - 1
            const isStreaming = streamingId === field.id
            const fb = feedbackOpen === field.id
            const isRefining = refining === field.id
            const isVisible = generateState === 'done' || value.length > 0

            return (
              <AnimatePresence key={field.id}>
                {isVisible && (
                  <motion.div
                    ref={el => { sectionRefs.current[field.id] = el }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: activeId === null || isActive ? 1 : 0.38 }}
                    transition={{ duration: 0.35, delay: index * 0.06 }}
                    style={{
                      marginBottom: isActive ? 36 : 64,
                      position: 'relative',
                      ...(isActive ? {
                        background: '#FAF8F4',
                        borderRadius: 12,
                        padding: '28px 32px',
                        marginLeft: -32,
                        marginRight: -32,
                        boxShadow: '0 1px 2px rgba(26,24,22,0.04), 0 4px 8px rgba(26,24,22,0.06), 0 16px 32px rgba(26,24,22,0.08), 0 0 0 0.5px rgba(26,24,22,0.05)',
                      } : {}),
                    }}
                  >
                    {/* Active rule */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} exit={{ scaleY: 0 }}
                          transition={{ duration: 0.3, ease: [0.16,1,0.3,1] }}
                          style={{ position: 'absolute', left: -20, top: 0, bottom: 0, width: 1.5, background: 'var(--mango)', borderRadius: 1, transformOrigin: 'top' }} />
                      )}
                    </AnimatePresence>

                    {/* Label + hint */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: isActive ? 'var(--concrete)' : 'var(--stone)', transition: 'color 0.3s', marginBottom: 4 }}>
                          {field.label}
                        </div>
                        {isActive && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ fontSize: 12, color: 'var(--stone)', fontWeight: 300, fontStyle: 'italic' }}>
                            {field.hint}
                          </motion.div>
                        )}
                      </div>
                      {isStreaming && (
                        <div style={{ display: 'flex', gap: 3, paddingTop: 2 }}>
                          {[0,1,2].map(i => (
                            <motion.div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--mango)' }}
                              animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i*0.15 }} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Question */}
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: isActive ? 24 : 19, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.4, marginBottom: 16, transition: 'font-size 0.35s cubic-bezier(0.16,1,0.3,1)', letterSpacing: '-0.005em' }}>
                      {field.question}
                    </div>

                    {/* Content — read or edit */}
                    {isActive ? (
                      <textarea
                        ref={el => { textareaRefs.current[field.id] = el }}
                        value={value}
                        onChange={e => handleInput(field.id, e.target.value)}
                        onKeyDown={e => handleKeyDown(e, field.id)}
                        placeholder={field.placeholder}
                        autoFocus
                        style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(110,107,104,0.4)', padding: '8px 0 16px', fontFamily: 'var(--font-display)', fontStyle: value ? 'italic' : 'normal', fontSize: 16, fontWeight: 400, color: 'var(--dark)', outline: 'none', resize: 'none', lineHeight: 1.85, minHeight: 60, display: 'block' }}
                      />
                    ) : (
                      <div onClick={() => setActiveId(field.id)} style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16, color: 'var(--dark)', lineHeight: 1.85, paddingBottom: 16, cursor: 'text', borderBottom: '1px solid transparent' }}>
                        {value || <span style={{ color: 'var(--stone)', fontStyle: 'italic' }}>{field.placeholder}</span>}
                      </div>
                    )}

                    {/* Action row */}
                    <AnimatePresence>
                      {value.trim().length > 10 && !fb && !isRefining && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ delay: 0.2 }}
                          style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {!isActive ? (
                            <>
                              <button onClick={() => setActiveId(field.id)}
                                style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--concrete)', background: 'none', border: '1px solid rgba(184,179,172,0.6)', borderRadius: 20, padding: '4px 14px', cursor: 'pointer', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--concrete)'; e.currentTarget.style.color = 'var(--dark)' }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(184,179,172,0.6)'; e.currentTarget.style.color = 'var(--concrete)' }}>
                                Edit
                              </button>
                              <ProofButton onClick={() => setFeedbackOpen(field.id)}>Ask proof. to revise</ProofButton>
                            </>
                          ) : (
                            <>
                              <button onClick={() => setActiveId(null)}
                                style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--concrete)', background: 'none', border: '1px solid rgba(184,179,172,0.6)', borderRadius: 20, padding: '4px 14px', cursor: 'pointer', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--concrete)'; e.currentTarget.style.color = 'var(--dark)' }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(184,179,172,0.6)'; e.currentTarget.style.color = 'var(--concrete)' }}>
                                Done
                              </button>
                              <span style={{ fontSize: 11, color: 'var(--stone)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <kbd style={{ fontFamily: 'var(--font-sans)', fontSize: 10, background: '#EFECE5', border: '1px solid #D5D4D6', borderRadius: 3, padding: '2px 5px', color: 'var(--concrete)' }}>⌘ Enter</kbd>
                                {isLast ? 'to finish' : 'to continue'}
                              </span>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Feedback */}
                    <AnimatePresence>
                      {(fb || isRefining) && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: [0.16,1,0.3,1] }} style={{ overflow: 'hidden', marginTop: 16 }}>
                          <div style={{ padding: '16px 18px', background: '#FAF8F4', border: '1px solid rgba(184,179,172,0.35)', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mango)', marginBottom: 10 }}>
                              proof. will rewrite this
                            </div>
                            <textarea
                              ref={el => { feedbackRefs.current[field.id] = el }}
                              value={feedbackText[field.id]}
                              onChange={e => setFeedbackText(prev => ({ ...prev, [field.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitFeedback(field.id) } }}
                              placeholder="What's wrong? A competitor could say it / Too vague / The real conviction is…"
                              disabled={isRefining}
                              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(184,179,172,0.5)', padding: '4px 0 10px', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--dark)', outline: 'none', resize: 'none', lineHeight: 1.7, minHeight: 44 }}
                            />
                            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                              <ProofButton onClick={() => submitFeedback(field.id)} disabled={!feedbackText[field.id]?.trim() || isRefining} variant="solid" size="sm" style={{ borderRadius: 5 }}>
                                {isRefining ? 'Revising…' : 'Revise →'}
                              </ProofButton>
                              {!isRefining && (
                                <button onClick={() => { setFeedbackOpen(null); setFeedbackText(prev => ({ ...prev, [field.id]: '' })) }}
                                  style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 0' }}>
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            )
          })}
        </div>

        {/* Nav */}
        {generateState === 'done' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 32, borderTop: '1px solid rgba(213,212,214,0.4)' }}>
            <button onClick={() => router.push(`/project/${project.id}/synthesis`)}
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>
              ← Synthesis
            </button>
            <button onClick={handleAdvance}
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, letterSpacing: '0.05em', background: allFilled ? 'var(--dark)' : '#D5D4D6', color: allFilled ? '#FDFCFA' : '#8C8780', border: 'none', borderRadius: 5, padding: '12px 22px', cursor: allFilled ? 'pointer' : 'default', transition: 'all 0.2s' }}
              onMouseEnter={e => { if (allFilled) (e.currentTarget.style.background = 'var(--mango)') }}
              onMouseLeave={e => { if (allFilled) (e.currentTarget.style.background = 'var(--dark)') }}>
              Continue to Values →
            </button>
          </div>
        )}
      </main>

      <ProofDrawer
        project={project} mode="strategist" module="Beliefs"
        open={drawerOpen || isSummaryActive}
        onClose={() => { setDrawerOpen(false); setSummaryState(null) }}
        summaryMode={isSummaryActive} summaryState={summaryState} summaryText={summaryText}
        summaryThinkingLabel="Reviewing the beliefs…" summaryContinueLabel="Continue to Values →"
        summaryLabel="On the beliefs"
        onContinue={() => router.push(`/project/${project.id}/synthesis/values`)}
        onReview={() => { setSummaryState(null); setDrawerOpen(false) }}
        onScrollToQuestion={handleScroll}
      />

      <style>{`textarea::placeholder { color: var(--stone); font-style: italic; }`}</style>
    </div>
  )
}
