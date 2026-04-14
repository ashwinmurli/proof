'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Project } from '@/types'
import { BRIEF_QUESTIONS } from '@/lib/questions'
import { useProofStore } from '@/store'
import { useProofStream } from '@/lib/useProofStream'
import Strip from '@/components/proof/Strip'
import ProofDrawer from '@/components/proof/ProofDrawer'

interface BriefModuleProps {
  project: Project
  mode?: 'strategist' | 'client'
}

export default function BriefModule({ project, mode = 'strategist' }: BriefModuleProps) {
  const router = useRouter()
  const { saveAnswer, saveProofThought, updateProject } = useProofStore()
  const { stream } = useProofStream()

  const [activeId, setActiveId] = useState<string>(BRIEF_QUESTIONS[0].id)
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>(() => {
    const existing = project.brief?.answers || {}
    return Object.fromEntries(BRIEF_QUESTIONS.map(q => [q.id, existing[q.id]?.value || '']))
  })
  const [proofThoughts, setProofThoughts] = useState<Record<string, string>>(() => {
    const existing = project.brief?.answers || {}
    return Object.fromEntries(
      BRIEF_QUESTIONS.filter(q => existing[q.id]?.proofThought).map(q => [q.id, existing[q.id].proofThought!])
    )
  })
  const [fetchedIds, setFetchedIds] = useState<Set<string>>(new Set(
    Object.entries(project.brief?.answers || {}).filter(([, a]) => a.proofThought).map(([id]) => id)
  ))
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState<string>('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [summaryText, setSummaryText] = useState('')
  const [summaryState, setSummaryState] = useState<'thinking' | 'arrived' | null>(null)

  const blurTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const answeredCount = Object.values(localAnswers).filter(v => v.trim().length > 20).length
  const thoughtCount = Object.keys(proofThoughts).length
  const questionLabels = Object.fromEntries(BRIEF_QUESTIONS.map(q => [q.id, q.cat]))

  useEffect(() => {
    setTimeout(() => textareaRefs.current[activeId]?.focus(), 400)
  }, [activeId])

  const prevAnswers = useRef<Record<string, string>>({})

  const handleInput = useCallback((id: string, value: string) => {
    setLocalAnswers(prev => ({ ...prev, [id]: value }))
    saveAnswer(id, value)
    // If the answer has changed substantially from when we last generated a thought,
    // invalidate so blur will trigger a fresh note
    const prev = prevAnswers.current[id] || ''
    const lengthDiff = Math.abs(value.length - prev.length)
    if (lengthDiff > 40 && fetchedIds.has(id)) {
      setFetchedIds(s => { const next = new Set(s); next.delete(id); return next })
    }
  }, [saveAnswer, fetchedIds])

  // Record answer at time of proof. note generation
  const handleBlur = useCallback((id: string) => {
    const value = localAnswers[id]?.trim()
    if (!value || value.length < 28 || fetchedIds.has(id)) return
    clearTimeout(blurTimers.current[id])
    blurTimers.current[id] = setTimeout(() => {
      prevAnswers.current[id] = value
      fetchThought(id, value)
    }, 800)
  }, [localAnswers, fetchedIds])

  const fetchThought = useCallback(async (id: string, answer: string) => {
    const q = BRIEF_QUESTIONS.find(q => q.id === id)
    if (!q) return
    setStreamingId(id)
    setStreamingText('')
    const allAnswers = BRIEF_QUESTIONS.filter(q => localAnswers[q.id]?.trim().length > 10).map(q => `${q.cat}: ${localAnswers[q.id]}`).join('\n\n')
    const prompt = mode === 'strategist'
      ? `Brief for "${project.name}" (${project.description}).\nContext:\n${allAnswers}\nThey answered "${q.cat}": "${answer}"\nInterpret what this reveals. Show you understood it. Push on the one thing still needing sharpening. Do not ask for what you can infer. 2 sentences max. No em dashes. No flattery.`
      : `Client answered: "${q.clientText}"\nAnswer: "${answer}"\nRespond warmly. Acknowledge specifically. 1-2 sentences.`

    await stream({
      project, mode, module: 'Brief', prompt, maxTokens: 180,
      onChunk: (text) => { setStreamingText(text) },
      onComplete: (text) => {
        setProofThoughts(prev => ({ ...prev, [id]: text }))
        saveProofThought(id, text)
        setFetchedIds(prev => new Set([...prev, id]))
        setStreamingId(null)
        setStreamingText('')
      },
    })
  }, [localAnswers, project, mode, stream, saveProofThought])

  const fetchBriefSummary = useCallback(async () => {
    setSummaryState('thinking')
    setDrawerOpen(true)
    const allAnswers = BRIEF_QUESTIONS.filter(q => localAnswers[q.id]?.trim()).map(q => `${q.cat}: ${localAnswers[q.id]}`).join('\n\n')
    const prompt = `Complete brief for "${project.name}" (${project.description}):\n${allAnswers}\nWrite 3-4 sentences. Synthesise what you heard across all five answers. Name the thread that connects them. Name the tension at the heart of this brand. End with the real strategic question. Not a summary — an interpretation. No flattery. No em dashes.`
    await stream({
      project, mode: 'strategist', module: 'Brief', prompt, maxTokens: 300,
      onChunk: () => {},
      onComplete: (text) => {
        setSummaryText(text)
        setSummaryState('arrived')
        updateProject(project.id, {
          brief: { ...project.brief, answers: project.brief?.answers || {}, proofSummary: text }
        })
      },
    })
  }, [localAnswers, project, stream, updateProject])

  const handleScrollToQuestion = useCallback((id: string) => {
    setActiveId(id)
    const el = questionRefs.current[id]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => textareaRefs.current[id]?.focus(), 400)
    }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      const currentIndex = BRIEF_QUESTIONS.findIndex(q => q.id === id)
      const isLast = currentIndex === BRIEF_QUESTIONS.length - 1
      if (isLast) {
        if (answeredCount >= 3 && !summaryState) fetchBriefSummary()
      } else {
        const next = BRIEF_QUESTIONS[currentIndex + 1]
        setActiveId(next.id)
        setTimeout(() => textareaRefs.current[next.id]?.focus(), 80)
      }
    }
  }, [answeredCount, summaryState, fetchBriefSummary])

  const handleAdvance = useCallback(() => {
    if (answeredCount < 2) { setDrawerOpen(true); return }
    if (answeredCount >= 3 && !summaryState) {
      fetchBriefSummary()
      return
    }
    updateProject(project.id, { status: 'debrief' })
    router.push(`/project/${project.id}/debrief`)
  }, [answeredCount, summaryState, fetchBriefSummary, project.id, updateProject, router])

  const isSummaryActive = summaryState === 'thinking' || summaryState === 'arrived'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-0)' }}>
      <Strip
        project={project}
        phase="Brief"
        onAskProof={() => { setSummaryState(null); setDrawerOpen(true) }}
        thoughtCount={thoughtCount}
        answeredCount={answeredCount}
        totalCount={BRIEF_QUESTIONS.length}
      />

      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '72px 24px 120px' }}>

        {/* Compact header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: 64 }}
        >
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 14 }}>
            {mode === 'client' ? `Brief — ${project.name}` : 'Discovery — 1 of 4'}
          </div>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.8, maxWidth: 440, fontWeight: 300 }}>
            {mode === 'client'
              ? 'Your strategist asked us to gather some background. There are no wrong answers — just honest ones.'
              : 'The real answer is almost always underneath the first one.'}
          </p>
        </motion.div>

        {/* Questions */}
        <div>
          {BRIEF_QUESTIONS.map((q, index) => {
            const isActive = activeId === q.id
            const value = localAnswers[q.id] || ''
            const isLast = index === BRIEF_QUESTIONS.length - 1
            const isFetchingThis = streamingId === q.id
            const hasThought = !!proofThoughts[q.id]
            const showStream = isFetchingThis && isActive
            const displayThought = showStream ? streamingText : (isActive ? proofThoughts[q.id] : null)
            const showHint = isActive && value.trim().length > 20 && !showStream

            return (
              <motion.div
                key={q.id}
                ref={el => { questionRefs.current[q.id] = el }}
                onClick={() => !isActive && setActiveId(q.id)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: isActive ? 1 : 0.35, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: index * 0.05 }}
                style={{
                  cursor: isActive ? 'default' : 'pointer',
                  marginBottom: isActive ? 40 : 64,
                  position: 'relative',
                  ...(isActive ? {
                    background: 'var(--surface-1)',
                    borderRadius: 14,
                    padding: '28px 32px 26px',
                    marginLeft: -32,
                    marginRight: -32,
                    boxShadow: '0 1px 2px rgba(26,24,22,0.04), 0 4px 12px rgba(26,24,22,0.07), 0 20px 40px rgba(26,24,22,0.09), 0 0 0 0.5px rgba(26,24,22,0.06)',
                  } : {}),
                }}
              >
                {/* Active mango rule */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ scaleY: 0, opacity: 0 }}
                      animate={{ scaleY: 1, opacity: 1 }}
                      exit={{ scaleY: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        position: 'absolute', left: -20, top: 28, bottom: 26,
                        width: 1.5, background: 'var(--mango)',
                        borderRadius: 1, transformOrigin: 'top',
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Category + dot */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 500, letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: isActive ? 'var(--stone)' : 'var(--aluminum)',
                    transition: 'color 0.3s',
                  }}>
                    {q.cat}
                  </span>
                  {(hasThought || isFetchingThis) && (
                    <motion.div
                      style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }}
                      animate={isFetchingThis
                        ? { scale: [1, 1.6, 1], opacity: [0.6, 1, 0.6] }
                        : { opacity: 0.8 }
                      }
                      transition={isFetchingThis ? { duration: 1, repeat: Infinity } : {}}
                    />
                  )}
                </div>

                {/* Question — the hero */}
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: isActive ? 30 : 19,
                  fontWeight: 400,
                  color: 'var(--dark)',
                  lineHeight: isActive ? 1.3 : 1.45,
                  letterSpacing: isActive ? '-0.01em' : '0',
                  marginBottom: isActive ? 22 : 0,
                  transition: 'font-size 0.35s cubic-bezier(0.16,1,0.3,1), line-height 0.35s cubic-bezier(0.16,1,0.3,1)',
                }}>
                  {mode === 'client' ? q.clientText : q.text}
                </div>

                {/* Answer + proof note — only when active */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <textarea
                        ref={el => { textareaRefs.current[q.id] = el }}
                        value={value}
                        onChange={e => handleInput(q.id, e.target.value)}
                        onFocus={() => setActiveId(q.id)}
                        onBlur={() => handleBlur(q.id)}
                        onKeyDown={e => handleKeyDown(e, q.id)}
                        placeholder={mode === 'client' ? q.clientPlaceholder : q.placeholder}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          borderBottom: '1px solid rgba(140,135,128,0.28)',
                          padding: '6px 0 14px',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 15,
                          fontWeight: 300,
                          color: 'var(--dark)',
                          outline: 'none',
                          resize: 'none',
                          lineHeight: 1.85,
                          minHeight: 88,
                          display: 'block',
                        }}
                      />

                      {/* proof. inline note */}
                      <AnimatePresence>
                        {(displayThought || showStream) && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                              marginTop: 20,
                              paddingTop: 16,
                              borderTop: '1px solid rgba(255,161,10,0.18)',
                              display: 'flex',
                              gap: 12,
                              alignItems: 'flex-start',
                            }}
                          >
                            <motion.div
                              style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--mango)', flexShrink: 0, marginTop: 5 }}
                              animate={showStream
                                ? { scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }
                                : { opacity: 1 }
                              }
                              transition={showStream ? { duration: 1, repeat: Infinity } : {}}
                            />
                            <p style={{
                              fontFamily: 'var(--font-sans)',
                              fontSize: 13,
                              fontWeight: 300,
                              color: 'var(--concrete)',
                              lineHeight: 1.85,
                              margin: 0,
                            }}>
                              {displayThought || ''}
                              {showStream && (
                                <span style={{ display: 'inline-block', width: 1.5, height: 11, background: 'var(--mango)', marginLeft: 2, verticalAlign: 'middle', animation: 'blink 0.9s step-end infinite' }} />
                              )}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* ⌘ Enter hint */}
                      <AnimatePresence>
                        {showHint && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ delay: displayThought ? 0.5 : 1.4, duration: 0.4 }}
                            style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            <kbd style={{
                              fontFamily: 'var(--font-sans)', fontSize: 10,
                              background: 'var(--bg)', border: '1px solid var(--aluminum)',
                              borderRadius: 4, padding: '2px 7px',
                              color: 'var(--stone)', letterSpacing: '0.02em',
                            }}>
                              ⌘ Enter
                            </kbd>
                            <span style={{ fontSize: 11, color: 'var(--stone)', fontWeight: 300 }}>
                              {isLast ? 'to finish' : 'to continue'}
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 32, borderTop: '1px solid rgba(213,212,214,0.35)', marginTop: 16 }}>
          <button
            onClick={() => router.push(`/project/${project.id}`)}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Overview
          </button>
          <button
            onClick={handleAdvance}
            style={{
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
              background: answeredCount >= 2 ? 'var(--dark)' : '#D5D4D6',
              color: answeredCount >= 2 ? '#FDFCFA' : '#8C8780',
              border: 'none', borderRadius: 5, padding: '12px 22px',
              cursor: answeredCount >= 2 ? 'pointer' : 'default',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (answeredCount >= 2) e.currentTarget.style.background = 'var(--mango)' }}
            onMouseLeave={e => { if (answeredCount >= 2) e.currentTarget.style.background = 'var(--dark)' }}
          >
            Continue to Debrief →
          </button>
        </div>
      </main>

      <ProofDrawer
        project={project} mode={mode} module="Brief"
        open={drawerOpen || isSummaryActive}
        onClose={() => { setDrawerOpen(false); setSummaryState(null) }}
        thoughts={proofThoughts}
        questionLabels={questionLabels}
        answers={localAnswers}
        onScrollToQuestion={handleScrollToQuestion}
        initialMessage={drawerOpen && !isSummaryActive && answeredCount < 2
          ? "Answer at least two questions. The brief is the foundation — everything in Synthesis traces back to it."
          : undefined}
        summaryMode={isSummaryActive}
        summaryState={summaryState}
        summaryText={summaryText}
        onContinue={handleAdvance}
        onReview={() => { setSummaryState(null); setDrawerOpen(false) }}
        summaryThinkingLabel="Reading the brief…"
        summaryContinueLabel="Continue to Debrief →"
      />

      <style>{`
        textarea::placeholder { color: var(--stone); }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  )
}
