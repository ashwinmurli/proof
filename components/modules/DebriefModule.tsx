'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Project } from '@/types'
import { useProofStore } from '@/store'
import { useProofStream } from '@/lib/useProofStream'
import { BRIEF_QUESTIONS } from '@/lib/questions'
import Strip from '@/components/proof/Strip'
import ProofDrawer from '@/components/proof/ProofDrawer'

const SECTIONS = [
  {
    id: 'situation' as const,
    label: 'The Situation',
    question: 'What is actually going on with this brand right now?',
    placeholder: 'Edit proof\'s read, or write your own.',
    refinePrompt: (current: string, feedback: string, brief: string) =>
      `You wrote this situation statement for a brand debrief:\n"${current}"\n\nThe strategist pushed back:\n"${feedback}"\n\nBrief context:\n${brief}\n\nRevise the situation statement. Keep it honest and specific. 1-2 sentences. No em dashes.`,
  },
  {
    id: 'challenge' as const,
    label: 'The Challenge',
    question: 'What is the real strategic problem to solve?',
    placeholder: 'Edit proof\'s read, or write your own.',
    refinePrompt: (current: string, feedback: string, brief: string) =>
      `You wrote this challenge statement:\n"${current}"\n\nThe strategist pushed back:\n"${feedback}"\n\nBrief context:\n${brief}\n\nRevise the challenge. Make it more precise. 1 sentence. Apply the competitor test. No em dashes.`,
  },
  {
    id: 'angle' as const,
    label: 'Our Angle',
    question: 'What is your point of view on how to approach this?',
    placeholder: 'Edit proof\'s read, or write your own.',
    refinePrompt: (current: string, feedback: string, brief: string) =>
      `You wrote this strategic angle:\n"${current}"\n\nThe strategist pushed back:\n"${feedback}"\n\nBrief context:\n${brief}\n\nRevise the angle. A real angle is a bet. If a competitor could say it, it fails. 1-2 sentences. No em dashes.`,
  },
]

type SectionId = 'situation' | 'challenge' | 'angle'
type GenerateState = 'idle' | 'generating' | 'done'
type FeedbackState = Record<SectionId, 'idle' | 'open' | 'refining'>

export default function DebriefModule({ project }: { project: Project }) {
  const router = useRouter()
  const { updateProject } = useProofStore()
  const { stream } = useProofStream()

  const briefSummary = BRIEF_QUESTIONS
    .filter(q => project.brief?.answers?.[q.id]?.value?.trim())
    .map(q => `${q.cat}: ${project.brief?.answers?.[q.id]?.value}`)
    .join('\n\n')

  const hasExisting = !!(project.debrief?.situation || project.debrief?.challenge || project.debrief?.angle)

  const [values, setValues] = useState({
    situation: project.debrief?.situation || '',
    challenge: project.debrief?.challenge || '',
    angle: project.debrief?.angle || '',
  })
  const [generateState, setGenerateState] = useState<GenerateState>(hasExisting ? 'done' : 'idle')
  const [streamingSection, setStreamingSection] = useState<SectionId | null>(null)
  const [feedbackState, setFeedbackState] = useState<FeedbackState>({ situation: 'idle', challenge: 'idle', angle: 'idle' })
  const [feedbackText, setFeedbackText] = useState<Record<SectionId, string>>({ situation: '', challenge: '', angle: '' })
  const [activeId, setActiveId] = useState<SectionId | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [thoughts, setThoughts] = useState<Record<string, string>>({})

  // Summary state
  const [summaryText, setSummaryText] = useState('')
  const [summaryState, setSummaryState] = useState<'thinking' | 'arrived' | null>(null)
  const briefProofSummary = project.brief?.proofSummary || ''

  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const feedbackRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  const allFilled = values.situation.trim().length > 10 &&
    values.challenge.trim().length > 10 &&
    values.angle.trim().length > 10

  const answeredCount = [values.situation, values.challenge, values.angle].filter(v => v.trim().length > 10).length
  const isSummaryActive = summaryState === 'thinking' || summaryState === 'arrived'

  function saveDebrief(v: typeof values) {
    updateProject(project.id, { debrief: { situation: v.situation, challenge: v.challenge, angle: v.angle } })
  }

  // Auto-generate on mount if brief exists and nothing written yet
  useEffect(() => {
    if (briefSummary && !hasExisting && generateState === 'idle') {
      generateAll()
    }
  }, [])

  async function generateAll() {
    setGenerateState('generating')

    const prompt = `You have read this brand brief. Write a debrief — your interpretation, not a summary.

Brief:
${briefSummary}

Write three sections, each labeled exactly:
SITUATION: [1-2 sentences on what is actually going on — honest enough to be uncomfortable. Not flattering.]
CHALLENGE: [1 sentence — the real strategic problem, often different from what the client stated. Specific enough to guide creative decisions.]
ANGLE: [1-2 sentences — your point of view on how to approach this. A real bet, not a process description. Must fail the competitor test.]

Be direct. Be specific. No em dashes. No flattery.`

    await stream({
      project, mode: 'strategist', module: 'Debrief', prompt, maxTokens: 500,
      onChunk: (text) => {
        // Parse and stream each section as it arrives
        const sitMatch = text.match(/SITUATION:\s*(.+?)(?=\nCHALLENGE:|$)/s)
        const chalMatch = text.match(/CHALLENGE:\s*(.+?)(?=\nANGLE:|$)/s)
        const angMatch = text.match(/ANGLE:\s*(.+?)$/s)

        const next = {
          situation: sitMatch?.[1]?.trim() || values.situation,
          challenge: chalMatch?.[1]?.trim() || values.challenge,
          angle: angMatch?.[1]?.trim() || values.angle,
        }
        setValues(next)
      },
      onComplete: (text) => {
        const sitMatch = text.match(/SITUATION:\s*(.+?)(?=\nCHALLENGE:|$)/s)
        const chalMatch = text.match(/CHALLENGE:\s*(.+?)(?=\nANGLE:|$)/s)
        const angMatch = text.match(/ANGLE:\s*(.+?)$/s)

        const final = {
          situation: sitMatch?.[1]?.trim() || values.situation,
          challenge: chalMatch?.[1]?.trim() || values.challenge,
          angle: angMatch?.[1]?.trim() || values.angle,
        }
        setValues(final)
        saveDebrief(final)
        setGenerateState('done')
      },
    })
  }

  function handleInput(id: SectionId, value: string) {
    const next = { ...values, [id]: value }
    setValues(next)
    saveDebrief(next)
  }

  function openFeedback(id: SectionId) {
    setFeedbackState(prev => ({ ...prev, [id]: 'open' }))
    setTimeout(() => feedbackRefs.current[id]?.focus(), 80)
  }

  function closeFeedback(id: SectionId) {
    setFeedbackState(prev => ({ ...prev, [id]: 'idle' }))
    setFeedbackText(prev => ({ ...prev, [id]: '' }))
  }

  async function submitFeedback(id: SectionId) {
    const feedback = feedbackText[id]?.trim()
    if (!feedback) return

    const section = SECTIONS.find(s => s.id === id)
    if (!section) return

    setFeedbackState(prev => ({ ...prev, [id]: 'refining' }))
    setStreamingSection(id)

    const prompt = section.refinePrompt(values[id], feedback, briefSummary)

    await stream({
      project, mode: 'strategist', module: 'Debrief', prompt, maxTokens: 200,
      onChunk: (text) => {
        setValues(prev => ({ ...prev, [id]: text }))
      },
      onComplete: (text) => {
        const next = { ...values, [id]: text }
        setValues(next)
        saveDebrief(next)
        setStreamingSection(null)
        setFeedbackState(prev => ({ ...prev, [id]: 'idle' }))
        setFeedbackText(prev => ({ ...prev, [id]: '' }))
        // Add to thoughts so it shows in the drawer
        setThoughts(prev => ({ ...prev, [id]: `Refined based on: "${feedback}"` }))
      },
    })
  }

  function handleKeyDown(e: React.KeyboardEvent, id: SectionId | null) {
    if (!id) return
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      const idx = SECTIONS.findIndex(s => s.id === id)
      const isLast = idx === SECTIONS.length - 1
      if (isLast) {
        if (allFilled && !summaryState) fetchSummary()
      } else {
        setActiveId(SECTIONS[idx + 1].id)
        setTimeout(() => textareaRefs.current[SECTIONS[idx + 1].id]?.focus(), 80)
      }
    }
  }

  async function fetchSummary() {
    setSummaryState('thinking')
    setDrawerOpen(true)

    const prompt = `You've written a debrief for "${project.name}".

Situation: ${values.situation}
Challenge: ${values.challenge}
Angle: ${values.angle}

Brief context:
${briefSummary}

Write 2-3 sentences. Is the angle a genuine bet? Is there productive tension between the situation and the angle? What does the strategist need to be careful not to lose as they move into Synthesis? Be direct. No flattery. No em dashes.`

    await stream({
      project, mode: 'strategist', module: 'Debrief', prompt, maxTokens: 220,
      onChunk: () => {},
      onComplete: (text) => {
        setSummaryText(text)
        setSummaryState('arrived')
        updateProject(project.id, {
          debrief: { ...values, proofSummary: text }
        })
      },
    })
  }

  const handleScrollToSection = useCallback((id: string) => {
    setActiveId(id as SectionId)
    const el = sectionRefs.current[id]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => textareaRefs.current[id]?.focus(), 400)
    }
  }, [])

  const handleAdvance = useCallback(() => {
    if (!allFilled) { setDrawerOpen(true); return }
    updateProject(project.id, { status: 'synthesis' })
    router.push(`/project/${project.id}/synthesis`)
  }, [allFilled, project.id, updateProject, router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F2EB' }}>
      <Strip
        project={project}
        phase="Discovery — Debrief"
        onAskProof={() => { setSummaryState(null); setDrawerOpen(true) }}
        answeredCount={answeredCount}
        totalCount={SECTIONS.length}
      />

      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '80px 24px 120px' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 16 }}>
            Discovery — Stage 2 of 4
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.06, letterSpacing: '-0.015em', marginBottom: 20 }}>
            The Debrief
          </h1>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, marginBottom: 56, fontWeight: 300 }}>
            This is proof.'s read of your brief. Not a summary — an interpretation. Push back where it's wrong.
          </p>
        </motion.div>

        {/* Generating state */}
        <AnimatePresence>
          {generateState === 'generating' && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 56, padding: '16px 0' }}
            >
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <motion.div key={i}
                    style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 13, color: 'var(--stone)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                proof. is reading the brief…
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* proof.'s read on the brief — reference card */}
        {briefProofSummary && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{
              marginBottom: 48,
              padding: '20px 24px',
              background: '#FAF8F4',
              border: '1px solid rgba(184,179,172,0.35)',
              borderLeft: '1.5px solid var(--mango)',
              borderRadius: '0 8px 8px 0',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mango)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />
              proof. on the brief
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: 'var(--concrete)', lineHeight: 1.85 }}>
              {briefProofSummary}
            </p>
          </motion.div>
        )}

        {/* No brief warning */}
        {!briefSummary && generateState === 'idle' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ padding: '18px 22px', marginBottom: 48, background: '#FAF8F4', border: '1px solid rgba(184,179,172,0.4)', borderLeft: '2px solid var(--mango)', borderRadius: '0 8px 8px 0' }}
          >
            <p style={{ fontSize: 13, color: 'var(--concrete)', lineHeight: 1.65, fontWeight: 300 }}>
              No brief found. Complete the Brief first, or write the debrief manually below.
            </p>
          </motion.div>
        )}

        {/* Sections */}
        <div>
          {SECTIONS.map((section, index) => {
            const isActive = activeId === section.id && generateState === 'done'
            const value = values[section.id]
            const isLast = index === SECTIONS.length - 1
            const isStreaming = streamingSection === section.id
            const fb = feedbackState[section.id]
            const isVisible = generateState === 'done' || hasExisting || value.length > 0

            return (
              <AnimatePresence key={section.id}>
                {isVisible && (
                  <motion.div
                    ref={el => { sectionRefs.current[section.id] = el }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: activeId === null || isActive ? 1 : 0.42 }}
                    transition={{ duration: 0.35, delay: index * 0.08 }}
                    onClick={() => !isActive && setActiveId(section.id)}
                    style={{ marginBottom: 68, cursor: 'default', position: 'relative' }}
                  >
                    {/* Active left rule */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} exit={{ scaleY: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          style={{ position: 'absolute', left: -20, top: 0, bottom: 0, width: 1.5, background: 'var(--mango)', borderRadius: 1, transformOrigin: 'top' }}
                        />
                      )}
                    </AnimatePresence>

                    {/* Label row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: isActive ? 'var(--concrete)' : 'var(--stone)', transition: 'color 0.3s' }}>
                        {section.label}
                      </div>
                      {isStreaming && (
                        <div style={{ display: 'flex', gap: 3 }}>
                          {[0,1,2].map(i => (
                            <motion.div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--mango)' }}
                              animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Question */}
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: isActive ? 22 : 18, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.45, marginBottom: 16, transition: 'font-size 0.35s cubic-bezier(0.16,1,0.3,1)', letterSpacing: '-0.005em' }}>
                      {section.question}
                    </div>

                    {/* proof.'s interpretation — read mode until clicked */}
                    {isActive ? (
                      <textarea
                        ref={el => { textareaRefs.current[section.id] = el }}
                        value={value}
                        onChange={e => handleInput(section.id, e.target.value)}
                        onKeyDown={e => handleKeyDown(e, section.id)}
                        placeholder={section.placeholder}
                        autoFocus
                        style={{
                          width: '100%', background: 'transparent', border: 'none',
                          borderBottom: '1px solid rgba(110,107,104,0.4)',
                          padding: '8px 0 16px', fontFamily: 'var(--font-display)',
                          fontStyle: value ? 'italic' : 'normal',
                          fontSize: 16, fontWeight: 400, color: 'var(--dark)',
                          outline: 'none', resize: 'none', lineHeight: 1.85,
                          minHeight: 60, display: 'block',
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => setActiveId(section.id)}
                        style={{
                          fontFamily: 'var(--font-display)', fontStyle: 'italic',
                          fontSize: 16, fontWeight: 400, color: 'var(--dark)',
                          lineHeight: 1.85, paddingBottom: 16, cursor: 'text',
                          borderBottom: '1px solid transparent',
                        }}
                      >
                        {value || <span style={{ color: 'var(--stone)', fontStyle: 'italic' }}>{section.placeholder}</span>}
                      </div>
                    )}

                    {/* Action row — changes based on edit state */}
                    <AnimatePresence>
                      {value.trim().length > 10 && fb === 'idle' && !isStreaming && (
                        <motion.div
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ delay: 0.2 }}
                          style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                          {!isActive ? (
                            <>
                              <button
                                onClick={e => { e.stopPropagation(); setActiveId(section.id) }}
                                style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--concrete)', background: 'none', border: '1px solid rgba(184,179,172,0.6)', borderRadius: 20, padding: '4px 14px', cursor: 'pointer', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--concrete)'; e.currentTarget.style.color = 'var(--dark)' }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(184,179,172,0.6)'; e.currentTarget.style.color = 'var(--concrete)' }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); openFeedback(section.id) }}
                                style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--concrete)', background: 'none', border: '1px solid rgba(184,179,172,0.6)', borderRadius: 20, padding: '4px 14px 4px 9px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,161,10,0.5)'; e.currentTarget.style.color = 'var(--dark)' }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(184,179,172,0.6)'; e.currentTarget.style.color = 'var(--concrete)' }}
                              >
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block', flexShrink: 0 }} />
                                <span style={{ fontStyle: 'italic', fontFamily: 'var(--font-display)', fontSize: 12 }}>Ask proof. to revise</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={e => { e.stopPropagation(); setActiveId(null) }}
                                style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500, color: 'var(--concrete)', background: 'none', border: '1px solid rgba(184,179,172,0.6)', borderRadius: 20, padding: '4px 14px', cursor: 'pointer', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--concrete)'; e.currentTarget.style.color = 'var(--dark)' }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(184,179,172,0.6)'; e.currentTarget.style.color = 'var(--concrete)' }}
                              >
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

                    {/* Push back input */}
                    <AnimatePresence>
                      {(fb === 'open' || fb === 'refining') && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          style={{ overflow: 'hidden', marginTop: 16 }}
                        >
                          <div style={{ padding: '16px 18px', background: '#FAF8F4', border: '1px solid rgba(184,179,172,0.35)', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mango)', marginBottom: 10 }}>
                              proof. will rewrite this
                            </div>
                            <textarea
                              ref={el => { feedbackRefs.current[section.id] = el }}
                              value={feedbackText[section.id]}
                              onChange={e => setFeedbackText(prev => ({ ...prev, [section.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitFeedback(section.id) } }}
                              placeholder="What's wrong with this? A competitor could say it / The real tension is / This misses…"
                              disabled={fb === 'refining'}
                              style={{
                                width: '100%', background: 'transparent', border: 'none',
                                borderBottom: '1px solid rgba(184,179,172,0.5)', padding: '4px 0 10px',
                                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--dark)',
                                outline: 'none', resize: 'none', lineHeight: 1.7, minHeight: 44,
                              }}
                            />
                            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                              <button
                                onClick={() => submitFeedback(section.id)}
                                disabled={!feedbackText[section.id]?.trim() || fb === 'refining'}
                                style={{
                                  fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
                                  background: !feedbackText[section.id]?.trim() || fb === 'refining' ? '#D5D4D6' : 'var(--dark)',
                                  color: '#FDFCFA', border: 'none', borderRadius: 4, padding: '7px 16px',
                                  cursor: !feedbackText[section.id]?.trim() || fb === 'refining' ? 'default' : 'pointer',
                                  transition: 'background 0.18s',
                                }}
                                onMouseEnter={e => { if (feedbackText[section.id]?.trim() && fb !== 'refining') (e.currentTarget.style.background = 'var(--mango)') }}
                                onMouseLeave={e => { if (feedbackText[section.id]?.trim() && fb !== 'refining') (e.currentTarget.style.background = 'var(--dark)') }}
                              >
                                {fb === 'refining' ? 'Refining…' : 'Refine →'}
                              </button>
                              {fb === 'open' && (
                                <button
                                  onClick={() => closeFeedback(section.id)}
                                  style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 0' }}
                                >
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
            <button
              onClick={() => router.push(`/project/${project.id}/brief`)}
              style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ← Brief
            </button>
            <button
              onClick={handleAdvance}
              style={{
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, letterSpacing: '0.05em',
                background: allFilled ? 'var(--dark)' : '#D5D4D6',
                color: allFilled ? '#FDFCFA' : '#8C8780',
                border: 'none', borderRadius: 5, padding: '12px 22px',
                cursor: allFilled ? 'pointer' : 'default', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (allFilled) (e.currentTarget.style.background = 'var(--mango)') }}
              onMouseLeave={e => { if (allFilled) (e.currentTarget.style.background = 'var(--dark)') }}
            >
              Continue to Synthesis →
            </button>
          </div>
        )}
      </main>

      <ProofDrawer
        project={project} mode="strategist" module="Debrief"
        open={drawerOpen || isSummaryActive}
        onClose={() => { setDrawerOpen(false); setSummaryState(null) }}
        thoughts={thoughts}
        answers={values}
        questionLabels={{ situation: 'The Situation', challenge: 'The Challenge', angle: 'Our Angle' }}
        onScrollToQuestion={handleScrollToSection}
        summaryMode={isSummaryActive}
        summaryState={summaryState}
        summaryText={summaryText}
        onContinue={handleAdvance}
        onReview={() => { setSummaryState(null); setDrawerOpen(false) }}
        summaryThinkingLabel="Reading the debrief…"
        summaryContinueLabel="Continue to Synthesis →"
      />

      <style>{`textarea::placeholder { color: var(--stone); font-style: italic; } @keyframes blink { 50%{opacity:0} }`}</style>
    </div>
  )
}
