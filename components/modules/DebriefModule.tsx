'use client'

import { useState, useRef, useCallback } from 'react'
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
    placeholder: 'Honest, not flattering. What is the real state of this brand?',
    proofPrompt: 'The user has written a situation statement. Assess whether this is a genuine diagnosis or a polished summary. Does it say something uncomfortable enough to be true? It should. 2 sentences max. No em dashes.',
  },
  {
    id: 'challenge' as const,
    label: 'The Challenge',
    question: 'What is the real strategic problem to solve?',
    placeholder: 'Often different from what the client said they wanted.',
    proofPrompt: 'The user has defined the strategic challenge. Is this the real challenge, or a symptom of it? Is it specific enough to guide creative decisions? Apply the competitor test. 2 sentences max. No em dashes.',
  },
  {
    id: 'angle' as const,
    label: 'Our Angle',
    question: 'What is your point of view on how to approach this?',
    placeholder: 'The first strategic stake in the ground. If a competitor could take the same angle, it is not an angle.',
    proofPrompt: 'The user has written their strategic angle. Is this a genuine point of view or a description of process? A real angle is a bet. Does this feel like a bet? Apply the competitor test explicitly. 2 sentences max. No em dashes.',
  },
]

export default function DebriefModule({ project }: { project: Project }) {
  const router = useRouter()
  const { updateProject } = useProofStore()
  const { stream } = useProofStream()

  const [values, setValues] = useState({
    situation: project.debrief?.situation || '',
    challenge: project.debrief?.challenge || '',
    angle: project.debrief?.angle || '',
  })
  const [thoughts, setThoughts] = useState<Record<string, string>>({})
  const [fetchedIds, setFetchedIds] = useState<Set<string>>(new Set())
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState('situation')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(
    !!(project.debrief?.situation || project.debrief?.challenge || project.debrief?.angle)
  )

  // Summary state
  const [summaryText, setSummaryText] = useState('')
  const [summaryState, setSummaryState] = useState<'thinking' | 'arrived' | null>(null)

  const blurTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const briefSummary = BRIEF_QUESTIONS
    .filter(q => project.brief?.answers?.[q.id]?.value?.trim())
    .map(q => `${q.cat}: ${project.brief?.answers?.[q.id]?.value}`)
    .join('\n\n')

  const allFilled = values.situation.trim().length > 20 &&
    values.challenge.trim().length > 20 &&
    values.angle.trim().length > 20

  const answeredCount = [values.situation, values.challenge, values.angle]
    .filter(v => v.trim().length > 20).length

  const thoughtCount = Object.keys(thoughts).length
  const sectionLabels = Object.fromEntries(SECTIONS.map(s => [s.id, s.label]))
  const isSummaryActive = summaryState === 'thinking' || summaryState === 'arrived'

  function saveDebrief(v: typeof values) {
    updateProject(project.id, { debrief: { situation: v.situation, challenge: v.challenge, angle: v.angle } })
  }

  function handleInput(id: string, value: string) {
    const next = { ...values, [id]: value }
    setValues(next)
    saveDebrief(next)
  }

  function handleBlur(id: string) {
    const value = values[id as keyof typeof values]?.trim()
    if (!value || value.length < 20 || fetchedIds.has(id)) return
    clearTimeout(blurTimers.current[id])
    blurTimers.current[id] = setTimeout(() => fetchThought(id, value), 1000)
  }

  async function fetchThought(id: string, answer: string) {
    const section = SECTIONS.find(s => s.id === id)
    if (!section) return
    setStreamingId(id)

    const prompt = `${section.proofPrompt}

Brief context:
${briefSummary}

Their ${section.label}: "${answer}"`

    await stream({
      project, mode: 'strategist', module: 'Debrief', prompt, maxTokens: 180,
      onChunk: () => {},
      onComplete: (text) => {
        setThoughts(prev => ({ ...prev, [id]: text }))
        setFetchedIds(prev => new Set([...prev, id]))
        setStreamingId(null)
      },
    })
  }

  async function generateDraft() {
    if (generating || !briefSummary) return
    setGenerating(true)

    const prompt = `Based on this brand brief, write a first draft of all three debrief sections.

Brief:
${briefSummary}

Write each section labeled exactly:
SITUATION: [1-2 honest sentences on what's actually going on — uncomfortable enough to be true]
CHALLENGE: [1 sentence — the real strategic problem, often different from what the client stated]
ANGLE: [1-2 sentences — a specific point of view, a bet, not a process description]`

    await stream({
      project, mode: 'strategist', module: 'Debrief', prompt, maxTokens: 400,
      onChunk: () => {},
      onComplete: (text) => {
        const sitMatch = text.match(/SITUATION:\s*(.+?)(?=\nCHALLENGE:|$)/s)
        const chalMatch = text.match(/CHALLENGE:\s*(.+?)(?=\nANGLE:|$)/s)
        const angMatch = text.match(/ANGLE:\s*(.+?)$/s)
        const newValues = {
          situation: sitMatch?.[1]?.trim() || values.situation,
          challenge: chalMatch?.[1]?.trim() || values.challenge,
          angle: angMatch?.[1]?.trim() || values.angle,
        }
        setValues(newValues)
        saveDebrief(newValues)
        setGenerating(false)
        setGenerated(true)
      },
    })
  }

  async function fetchDebriefSummary() {
    setSummaryState('thinking')
    setDrawerOpen(true)

    const prompt = `You have read the complete debrief for "${project.name}".

Brief:
${briefSummary}

Their debrief:
Situation: ${values.situation}
Challenge: ${values.challenge}
Angle: ${values.angle}

Write 2-3 sentences. Assess whether the angle is a genuine bet or a safe observation. Is the challenge specific enough to guide creative decisions? Is there tension between the situation and the angle that will make the strategy interesting? Be direct. No flattery. No em dashes.`

    await stream({
      project, mode: 'strategist', module: 'Debrief', prompt, maxTokens: 250,
      onChunk: () => {},
      onComplete: (text) => {
        setSummaryText(text)
        setSummaryState('arrived')
      },
    })
  }

  function handleKeyDown(e: React.KeyboardEvent, id: string) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      const idx = SECTIONS.findIndex(s => s.id === id)
      const isLast = idx === SECTIONS.length - 1
      if (isLast) {
        if (allFilled && !summaryState) fetchDebriefSummary()
      } else {
        const next = SECTIONS[idx + 1]
        setActiveId(next.id)
        setTimeout(() => textareaRefs.current[next.id]?.focus(), 80)
      }
    }
  }

  const handleScrollToSection = useCallback((id: string) => {
    setActiveId(id)
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
        thoughtCount={thoughtCount}
        answeredCount={answeredCount}
        totalCount={SECTIONS.length}
      />

      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '80px 24px 120px' }}>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 16 }}>
            Discovery — Stage 2 of 4
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.06, letterSpacing: '-0.015em', marginBottom: 20 }}>
            The Debrief
          </h1>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, marginBottom: 48, fontWeight: 300 }}>
            This is not a summary of the brief. It is an interpretation. Here is what we heard, what it means, and what the real challenge is underneath the stated one.
          </p>

          {/* Generate from brief — only if brief exists and not yet generated */}
          {briefSummary && !generated && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                padding: '18px 22px', marginBottom: 56,
                background: '#FAF8F4', border: '1px solid rgba(184,179,172,0.4)',
                borderLeft: '2px solid var(--mango)', borderRadius: '0 8px 8px 0',
              }}
            >
              <p style={{ fontSize: 13, color: 'var(--concrete)', lineHeight: 1.6, fontWeight: 300 }}>
                proof. can write a first draft from your brief. You own the edit.
              </p>
              <button
                onClick={generateDraft}
                disabled={generating}
                style={{
                  fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
                  background: generating ? '#D5D4D6' : 'var(--dark)', color: '#FDFCFA',
                  border: 'none', borderRadius: 5, padding: '9px 18px',
                  cursor: generating ? 'default' : 'pointer', whiteSpace: 'nowrap', transition: 'background 0.2s', flexShrink: 0,
                }}
                onMouseEnter={e => { if (!generating) (e.currentTarget.style.background = 'var(--mango)') }}
                onMouseLeave={e => { if (!generating) (e.currentTarget.style.background = 'var(--dark)') }}
              >
                {generating ? 'Writing…' : 'Generate draft →'}
              </button>
            </motion.div>
          )}

          {generated && !briefSummary && <div style={{ marginBottom: 56 }} />}
          {!generated && !briefSummary && <div style={{ marginBottom: 56 }} />}
        </motion.div>

        {/* Sections */}
        <div>
          {SECTIONS.map((section, index) => {
            const isActive = activeId === section.id
            const value = values[section.id]
            const isLast = index === SECTIONS.length - 1
            const isFetchingThis = streamingId === section.id
            const hasThought = !!thoughts[section.id]

            return (
              <motion.div
                key={section.id}
                ref={el => { sectionRefs.current[section.id] = el }}
                onClick={() => !isActive && setActiveId(section.id)}
                animate={{ opacity: isActive ? 1 : 0.38 }}
                transition={{ duration: 0.35 }}
                style={{ marginBottom: 68, cursor: isActive ? 'default' : 'pointer', position: 'relative' }}
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

                {/* Label + subtle dot */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: isActive ? 'var(--concrete)' : 'var(--stone)', transition: 'color 0.3s' }}>
                    {section.label}
                  </div>
                  {(hasThought || isFetchingThis) && (
                    <motion.div
                      style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }}
                      animate={isFetchingThis ? { scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] } : { opacity: 0.7 }}
                      transition={isFetchingThis ? { duration: 1, repeat: Infinity } : {}}
                    />
                  )}
                </div>

                {/* Question */}
                <div style={{ fontFamily: 'var(--font-display)', fontSize: isActive ? 24 : 19, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.4, marginBottom: 20, transition: 'font-size 0.35s cubic-bezier(0.16,1,0.3,1)', letterSpacing: '-0.005em' }}>
                  {section.question}
                </div>

                {/* Answer */}
                <textarea
                  ref={el => { textareaRefs.current[section.id] = el }}
                  value={value}
                  onChange={e => handleInput(section.id, e.target.value)}
                  onFocus={() => setActiveId(section.id)}
                  onBlur={() => handleBlur(section.id)}
                  onKeyDown={e => handleKeyDown(e, section.id)}
                  placeholder={section.placeholder}
                  style={{
                    width: '100%', background: 'transparent', border: 'none',
                    borderBottom: `1px solid ${isActive ? 'rgba(110,107,104,0.4)' : '#D5D4D6'}`,
                    padding: '8px 0 16px', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 300,
                    color: 'var(--dark)', outline: 'none', resize: 'none', lineHeight: 1.85,
                    minHeight: 72, transition: 'border-color 0.25s', display: 'block',
                  }}
                />

                {/* Cmd+Enter hint */}
                <AnimatePresence>
                  {isActive && value.trim().length > 20 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.6 }}
                      style={{ marginTop: 8, fontSize: 11, color: 'var(--stone)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <kbd style={{ fontFamily: 'var(--font-sans)', fontSize: 10, background: '#EFECE5', border: '1px solid #D5D4D6', borderRadius: 3, padding: '2px 6px', color: 'var(--concrete)' }}>⌘ Enter</kbd>
                      <span>{isLast ? 'to finish the debrief' : 'to continue'}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>

        {/* Nav */}
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
      </main>

      <ProofDrawer
        project={project} mode="strategist" module="Debrief"
        open={drawerOpen || isSummaryActive}
        onClose={() => { setDrawerOpen(false); if (!isSummaryActive) setSummaryState(null) }}
        thoughts={thoughts}
        answers={values}
        questionLabels={sectionLabels}
        onScrollToQuestion={handleScrollToSection}
        initialMessage={drawerOpen && !isSummaryActive && !allFilled ? "Complete all three sections before moving on. The debrief is your point of view — without it, there's nothing to build from." : undefined}
        summaryMode={isSummaryActive}
        summaryState={summaryState}
        summaryText={summaryText}
        onContinue={handleAdvance}
        onReview={() => { setSummaryState(null); setDrawerOpen(false) }}
      />

      <style>{`textarea::placeholder { color: var(--stone); font-style: italic; } @keyframes blink { 50%{opacity:0} }`}</style>
    </div>
  )
}
