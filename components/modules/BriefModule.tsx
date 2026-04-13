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
      BRIEF_QUESTIONS
        .filter(q => existing[q.id]?.proofThought)
        .map(q => [q.id, existing[q.id].proofThought!])
    )
  })
  const [fetchedIds, setFetchedIds] = useState<Set<string>>(new Set(
    Object.entries(project.brief?.answers || {}).filter(([, a]) => a.proofThought).map(([id]) => id)
  ))
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Summary state
  const [summaryText, setSummaryText] = useState('')
  const [summaryVisible, setSummaryVisible] = useState(false)
  const [summaryState, setSummaryState] = useState<'idle' | 'thinking' | 'arrived'>('idle')

  const blurTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  const answeredCount = Object.values(localAnswers).filter(v => v.trim().length > 20).length
  const thoughtCount = Object.keys(proofThoughts).length

  // Question labels for the drawer notes tab
  const questionLabels = Object.fromEntries(BRIEF_QUESTIONS.map(q => [q.id, q.cat]))

  useEffect(() => {
    setTimeout(() => textareaRefs.current[activeId]?.focus(), 400)
  }, [activeId])

  const handleInput = useCallback((id: string, value: string) => {
    setLocalAnswers(prev => ({ ...prev, [id]: value }))
    saveAnswer(id, value)
  }, [saveAnswer])

  const handleBlur = useCallback((id: string) => {
    const value = localAnswers[id]?.trim()
    if (!value || value.length < 28 || fetchedIds.has(id)) return
    clearTimeout(blurTimers.current[id])
    blurTimers.current[id] = setTimeout(() => fetchThought(id, value), 1000)
  }, [localAnswers, fetchedIds])

  const fetchThought = useCallback(async (id: string, answer: string) => {
    const q = BRIEF_QUESTIONS.find(q => q.id === id)
    if (!q) return
    setStreamingId(id)

    const allAnswers = BRIEF_QUESTIONS
      .filter(q => localAnswers[q.id]?.trim().length > 10)
      .map(q => `${q.cat}: ${localAnswers[q.id]}`).join('\n\n')

    const prompt = mode === 'strategist'
      ? `Brief for "${project.name}" (${project.description}).
Context:\n${allAnswers}
They answered "${q.cat}": "${answer}"
Interpret what this reveals. Show you understood it. Push on the one thing still needing sharpening. Do not ask for what you can infer. 2 sentences max. No em dashes. No flattery.`
      : `Client answered: "${q.clientText}"\nAnswer: "${answer}"\nRespond warmly. Acknowledge specifically. 1-2 sentences.`

    let finalText = ''
    await stream({
      project, mode, module: 'Brief', prompt, maxTokens: 180,
      onChunk: (text) => { finalText = text },
      onComplete: (text) => {
        finalText = text
        setProofThoughts(prev => ({ ...prev, [id]: text }))
        saveProofThought(id, text)
        setFetchedIds(prev => new Set([...prev, id]))
        setStreamingId(null)
      },
    })
  }, [localAnswers, project, mode, stream, saveProofThought])

  const fetchBriefSummary = useCallback(async () => {
    setSummaryState('thinking')
    setSummaryVisible(true)

    const allAnswers = BRIEF_QUESTIONS
      .filter(q => localAnswers[q.id]?.trim())
      .map(q => `${q.cat}: ${localAnswers[q.id]}`).join('\n\n')

    const prompt = `Complete brief for "${project.name}" (${project.description}):
${allAnswers}
Write 3-4 sentences. Synthesise what you heard across all five answers. Name the thread that connects them. Name the tension at the heart of this brand. End with the real strategic question. Not a summary — an interpretation. No flattery. No em dashes.`

    // Collect silently, then reveal whole
    let collected = ''
    await stream({
      project, mode: 'strategist', module: 'Brief', prompt, maxTokens: 300,
      onChunk: (text) => { collected = text },
      onComplete: (text) => {
        setSummaryText(text)
        setSummaryState('arrived')
      },
    })
  }, [localAnswers, project, stream])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      const currentIndex = BRIEF_QUESTIONS.findIndex(q => q.id === id)
      const isLast = currentIndex === BRIEF_QUESTIONS.length - 1

      if (isLast) {
        if (answeredCount >= 3 && summaryState === 'idle') fetchBriefSummary()
      } else {
        const next = BRIEF_QUESTIONS[currentIndex + 1]
        setActiveId(next.id)
        setTimeout(() => textareaRefs.current[next.id]?.focus(), 80)
      }
    }
  }, [answeredCount, summaryState, fetchBriefSummary])

  const handleAdvance = useCallback(() => {
    if (answeredCount < 2) { setDrawerOpen(true); return }
    updateProject(project.id, { status: 'debrief' })
    router.push(`/project/${project.id}/debrief`)
  }, [answeredCount, project.id, updateProject, router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F2EB' }}>
      <Strip
        project={project}
        phase="Discovery — Brief"
        onAskProof={() => setDrawerOpen(true)}
        thoughtCount={thoughtCount}
      />

      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '80px 24px 120px' }}>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 16 }}>
            {mode === 'client' ? `A brief for ${project.name}` : 'Discovery — Stage 1 of 4'}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.06, letterSpacing: '-0.015em', marginBottom: 20 }}>
            {mode === 'client' ? 'Tell us your story.' : 'The Brief'}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, marginBottom: 72, fontWeight: 300 }}>
            {mode === 'client'
              ? `Your strategist asked us to gather some background. There are no wrong answers — just honest ones.`
              : 'Before we can build a brand, we need to understand it from the inside. The real answer is almost always underneath the first one.'}
          </p>
        </motion.div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 72 }}>
          {BRIEF_QUESTIONS.map(q => {
            const done = localAnswers[q.id]?.trim().length > 20
            return (
              <motion.div key={q.id}
                style={{ height: 2, flex: 1, borderRadius: 1 }}
                animate={{ background: done ? 'var(--mango)' : '#D5D4D6' }}
                transition={{ duration: 0.5 }}
              />
            )
          })}
        </div>

        {/* Questions */}
        <div>
          {BRIEF_QUESTIONS.map((q, index) => {
            const isActive = activeId === q.id
            const value = localAnswers[q.id] || ''
            const isLast = index === BRIEF_QUESTIONS.length - 1
            const isFetchingThis = streamingId === q.id

            return (
              <motion.div
                key={q.id}
                onClick={() => !isActive && setActiveId(q.id)}
                animate={{ opacity: isActive ? 1 : 0.38 }}
                transition={{ duration: 0.35 }}
                style={{ marginBottom: 68, cursor: isActive ? 'default' : 'pointer', position: 'relative' }}
              >
                {/* Active left rule */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ scaleY: 0, opacity: 0 }}
                      animate={{ scaleY: 1, opacity: 1 }}
                      exit={{ scaleY: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        position: 'absolute', left: -20, top: 0, bottom: 0,
                        width: 1.5, background: 'var(--mango)', borderRadius: 1,
                        transformOrigin: 'top',
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Category label — no inline indicator */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
                }}>
                  <div style={{
                    fontSize: 10, fontWeight: 500, letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: isActive ? 'var(--concrete)' : 'var(--stone)',
                    transition: 'color 0.3s',
                  }}>
                    {q.cat}
                  </div>
                  {/* Subtle dot — just signals a thought exists, doesn't demand attention */}
                  {proofThoughts[q.id] && (
                    <div style={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: 'var(--mango)', opacity: 0.7,
                      flexShrink: 0,
                    }} />
                  )}
                  {isFetchingThis && (
                    <div style={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: 'var(--mango)',
                      animation: 'breathe 1s ease-in-out infinite',
                    }} />
                  )}
                </div>

                {/* Question */}
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: isActive ? 24 : 19,
                  fontWeight: 400,
                  color: 'var(--dark)',
                  lineHeight: 1.4,
                  marginBottom: 20,
                  transition: 'font-size 0.35s cubic-bezier(0.16,1,0.3,1)',
                  letterSpacing: '-0.005em',
                }}>
                  {mode === 'client' ? q.clientText : q.text}
                </div>

                {/* Answer */}
                <textarea
                  ref={el => { textareaRefs.current[q.id] = el }}
                  value={value}
                  onChange={e => handleInput(q.id, e.target.value)}
                  onFocus={() => setActiveId(q.id)}
                  onBlur={() => handleBlur(q.id)}
                  onKeyDown={e => handleKeyDown(e, q.id)}
                  placeholder={mode === 'client' ? q.clientPlaceholder : q.placeholder}
                  style={{
                    width: '100%', background: 'transparent', border: 'none',
                    borderBottom: `1px solid ${isActive ? 'rgba(110,107,104,0.4)' : '#D5D4D6'}`,
                    padding: '8px 0 16px', fontFamily: 'var(--font-sans)',
                    fontSize: 15, fontWeight: 300, color: 'var(--dark)',
                    outline: 'none', resize: 'none', lineHeight: 1.85,
                    minHeight: 72, transition: 'border-color 0.25s', display: 'block',
                  }}
                />

                {/* Cmd+Enter hint */}
                <AnimatePresence>
                  {isActive && value.trim().length > 20 && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ delay: 0.6 }}
                      style={{ marginTop: 8, fontSize: 11, color: 'var(--stone)', display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      <kbd style={{
                        fontFamily: 'var(--font-sans)', fontSize: 10,
                        background: '#EFECE5', border: '1px solid #D5D4D6',
                        borderRadius: 3, padding: '2px 6px', color: 'var(--concrete)',
                      }}>⌘ Enter</kbd>
                      <span>{isLast ? 'to finish the brief' : 'to continue'}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>

        {/* Brief summary — arrives as a complete thought */}
        <AnimatePresence>
          {summaryVisible && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{ marginBottom: 48 }}
            >
              {/* Thinking state */}
              {summaryState === 'thinking' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ padding: '28px 0', display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }}
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--stone)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                    proof. is reading the brief
                  </span>
                </motion.div>
              )}

              {/* Arrived state — whole thought revealed at once */}
              {summaryState === 'arrived' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    padding: '28px 32px',
                    background: '#FAF8F4',
                    border: '1px solid rgba(184,179,172,0.4)',
                    borderTop: '2px solid var(--mango)',
                    borderRadius: '0 0 10px 10px',
                  }}
                >
                  <div style={{
                    fontSize: 10, fontWeight: 500, letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: 'var(--mango)',
                    marginBottom: 18, display: 'flex', alignItems: 'center', gap: 7,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />
                    proof. on the brief
                  </div>
                  <p style={{
                    fontFamily: 'var(--font-display)', fontStyle: 'italic',
                    fontSize: 17, color: 'var(--dark)', lineHeight: 1.9,
                    marginBottom: 28,
                  }}>
                    {summaryText}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button
                      onClick={handleAdvance}
                      style={{
                        fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                        letterSpacing: '0.05em', background: 'var(--dark)', color: '#FDFCFA',
                        border: 'none', borderRadius: 5, padding: '11px 22px',
                        cursor: 'pointer', transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--mango)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--dark)')}
                    >
                      Continue to Debrief →
                    </button>
                    <button
                      onClick={() => { setSummaryVisible(false); setSummaryState('idle'); setActiveId(BRIEF_QUESTIONS[0].id) }}
                      style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Review answers first
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nav */}
        {!summaryVisible && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: 32, borderTop: '1px solid rgba(213,212,214,0.4)',
          }}>
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
                letterSpacing: '0.05em',
                background: answeredCount >= 2 ? 'var(--dark)' : '#D5D4D6',
                color: answeredCount >= 2 ? '#FDFCFA' : '#8C8780',
                border: 'none', borderRadius: 5, padding: '12px 22px',
                cursor: answeredCount >= 2 ? 'pointer' : 'default', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (answeredCount >= 2) (e.currentTarget.style.background = 'var(--mango)') }}
              onMouseLeave={e => { if (answeredCount >= 2) (e.currentTarget.style.background = 'var(--dark)') }}
            >
              Continue to Debrief →
            </button>
          </div>
        )}
      </main>

      <ProofDrawer
        project={project} mode={mode} module="Brief"
        open={drawerOpen} onClose={() => setDrawerOpen(false)}
        thoughts={proofThoughts}
        questionLabels={questionLabels}
        initialMessage={answeredCount < 2 ? "Answer at least two questions. The brief is the foundation — everything in Synthesis traces back to it." : undefined}
      />

      <style>{`
        textarea::placeholder { color: var(--stone); font-style: italic; }
        @keyframes breathe { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.65)} }
        @keyframes blink { 50%{opacity:0} }
      `}</style>
    </div>
  )
}
