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
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Summary state — lives in the panel now
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
    const allAnswers = BRIEF_QUESTIONS.filter(q => localAnswers[q.id]?.trim().length > 10).map(q => `${q.cat}: ${localAnswers[q.id]}`).join('\n\n')
    const prompt = mode === 'strategist'
      ? `Brief for "${project.name}" (${project.description}).\nContext:\n${allAnswers}\nThey answered "${q.cat}": "${answer}"\nInterpret what this reveals. Show you understood it. Push on the one thing still needing sharpening. Do not ask for what you can infer. 2 sentences max. No em dashes. No flattery.`
      : `Client answered: "${q.clientText}"\nAnswer: "${answer}"\nRespond warmly. Acknowledge specifically. 1-2 sentences.`

    await stream({
      project, mode, module: 'Brief', prompt, maxTokens: 180,
      onChunk: () => {},
      onComplete: (text) => {
        setProofThoughts(prev => ({ ...prev, [id]: text }))
        saveProofThought(id, text)
        setFetchedIds(prev => new Set([...prev, id]))
        setStreamingId(null)
      },
    })
  }, [localAnswers, project, mode, stream, saveProofThought])

  const fetchBriefSummary = useCallback(async () => {
    setSummaryState('thinking')
    setDrawerOpen(true)
    const allAnswers = BRIEF_QUESTIONS.filter(q => localAnswers[q.id]?.trim()).map(q => `${q.cat}: ${localAnswers[q.id]}`).join('\n\n')
    const prompt = `Complete brief for "${project.name}" (${project.description}):\n${allAnswers}\nWrite 3-4 sentences. Synthesise what you heard across all five answers. Name the thread that connects them. Name the tension at the heart of this brand. End with the real strategic question. Not a summary — an interpretation. No flattery. No em dashes.`
    let collected = ''
    await stream({
      project, mode: 'strategist', module: 'Brief', prompt, maxTokens: 300,
      onChunk: (text) => { collected = text },
      onComplete: (text) => {
        setSummaryText(text)
        setSummaryState('arrived')
        // Persist summary to project
        updateProject(project.id, {
          brief: { ...project.brief, answers: project.brief?.answers || {}, proofSummary: text }
        })
      },
    })
  }, [localAnswers, project, stream])

  const handleScrollToQuestion = useCallback((id: string) => {
    setActiveId(id)
    const el = questionRefs.current[id]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => textareaRefs.current[id]?.focus(), 400)
    }
    // Drawer stays open intentionally
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
    // Show summary first if not yet seen — same as Cmd+Enter on last question
    if (answeredCount >= 3 && !summaryState) {
      fetchBriefSummary()
      return
    }
    updateProject(project.id, { status: 'debrief' })
    router.push(`/project/${project.id}/debrief`)
  }, [answeredCount, summaryState, fetchBriefSummary, project.id, updateProject, router])

  const isSummaryActive = summaryState === 'thinking' || summaryState === 'arrived'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F2EB' }}>
      <Strip
        project={project}
        phase="Discovery — Brief"
        onAskProof={() => { setSummaryState(null); setDrawerOpen(true) }}
        thoughtCount={thoughtCount}
        answeredCount={answeredCount}
        totalCount={BRIEF_QUESTIONS.length}
      />

      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '80px 24px 120px' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 16 }}>
            {mode === 'client' ? `A brief for ${project.name}` : 'Discovery — Stage 1 of 4'}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.06, letterSpacing: '-0.015em', marginBottom: 20 }}>
            {mode === 'client' ? 'Tell us your story.' : 'The Brief'}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, marginBottom: 72, fontWeight: 300 }}>
            {mode === 'client' ? `Your strategist asked us to gather some background. There are no wrong answers — just honest ones.` : 'Before we can build a brand, we need to understand it from the inside. The real answer is almost always underneath the first one.'}
          </p>
        </motion.div>



        {/* Questions */}
        <div>
          {BRIEF_QUESTIONS.map((q, index) => {
            const isActive = activeId === q.id
            const value = localAnswers[q.id] || ''
            const isLast = index === BRIEF_QUESTIONS.length - 1
            const isFetchingThis = streamingId === q.id
            const hasThoughtForThis = !!proofThoughts[q.id]

            return (
              <motion.div
                key={q.id}
                ref={el => { questionRefs.current[q.id] = el }}
                onClick={() => !isActive && setActiveId(q.id)}
                animate={{ opacity: isActive ? 1 : 0.38 }}
                transition={{ duration: 0.35 }}
                style={{ marginBottom: 68, cursor: isActive ? 'default' : 'pointer', position: 'relative' }}
              >
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} exit={{ scaleY: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      style={{ position: 'absolute', left: -20, top: 0, bottom: 0, width: 1.5, background: 'var(--mango)', borderRadius: 1, transformOrigin: 'top' }}
                    />
                  )}
                </AnimatePresence>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: isActive ? 'var(--concrete)' : 'var(--stone)', transition: 'color 0.3s' }}>
                    {q.cat}
                  </div>
                  {(hasThoughtForThis || isFetchingThis) && (
                    <motion.div
                      style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }}
                      animate={isFetchingThis ? { scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] } : { opacity: 0.7 }}
                      transition={isFetchingThis ? { duration: 1, repeat: Infinity } : {}}
                    />
                  )}
                </div>

                <div style={{ fontFamily: 'var(--font-display)', fontSize: isActive ? 24 : 19, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.4, marginBottom: 20, transition: 'font-size 0.35s cubic-bezier(0.16,1,0.3,1)', letterSpacing: '-0.005em' }}>
                  {mode === 'client' ? q.clientText : q.text}
                </div>

                <textarea
                  ref={el => { textareaRefs.current[q.id] = el }}
                  value={value}
                  onChange={e => handleInput(q.id, e.target.value)}
                  onFocus={() => setActiveId(q.id)}
                  onBlur={() => handleBlur(q.id)}
                  onKeyDown={e => handleKeyDown(e, q.id)}
                  placeholder={mode === 'client' ? q.clientPlaceholder : q.placeholder}
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${isActive ? 'rgba(110,107,104,0.4)' : '#D5D4D6'}`, padding: '8px 0 16px', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 300, color: 'var(--dark)', outline: 'none', resize: 'none', lineHeight: 1.85, minHeight: 72, transition: 'border-color 0.25s', display: 'block' }}
                />

                <AnimatePresence>
                  {isActive && value.trim().length > 20 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.6 }}
                      style={{ marginTop: 8, fontSize: 11, color: 'var(--stone)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <kbd style={{ fontFamily: 'var(--font-sans)', fontSize: 10, background: '#EFECE5', border: '1px solid #D5D4D6', borderRadius: 3, padding: '2px 6px', color: 'var(--concrete)' }}>⌘ Enter</kbd>
                      <span>{isLast ? 'to finish the brief' : 'to continue'}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 32, borderTop: '1px solid rgba(213,212,214,0.4)' }}>
          <button onClick={() => router.push(`/project/${project.id}`)} style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Overview
          </button>
          <button
            onClick={handleAdvance}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, letterSpacing: '0.05em', background: answeredCount >= 2 ? 'var(--dark)' : '#D5D4D6', color: answeredCount >= 2 ? '#FDFCFA' : '#8C8780', border: 'none', borderRadius: 5, padding: '12px 22px', cursor: answeredCount >= 2 ? 'pointer' : 'default', transition: 'all 0.2s' }}
            onMouseEnter={e => { if (answeredCount >= 2) (e.currentTarget.style.background = 'var(--mango)') }}
            onMouseLeave={e => { if (answeredCount >= 2) (e.currentTarget.style.background = 'var(--dark)') }}
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
        initialMessage={drawerOpen && !isSummaryActive && answeredCount < 2 ? "Answer at least two questions. The brief is the foundation — everything in Synthesis traces back to it." : undefined}
        summaryMode={isSummaryActive}
        summaryState={summaryState}
        summaryText={summaryText}
        onContinue={handleAdvance}
        onReview={() => { setSummaryState(null); setDrawerOpen(false) }}
        summaryThinkingLabel="Reading the brief…"
        summaryContinueLabel="Continue to Debrief →"
      />

      <style>{`textarea::placeholder { color: var(--stone); font-style: italic; } @keyframes blink { 50%{opacity:0} }`}</style>
    </div>
  )
}
