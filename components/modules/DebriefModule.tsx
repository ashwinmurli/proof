'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Project } from '@/types'
import { useProofStore } from '@/store'
import { useProofStream } from '@/lib/useProofStream'
import { BRIEF_QUESTIONS } from '@/lib/questions'
import Strip from '@/components/proof/Strip'
import ProofDrawer from '@/components/proof/ProofDrawer'

interface DebriefSection {
  id: 'situation' | 'challenge' | 'angle'
  label: string
  question: string
  placeholder: string
  proofPrompt: string
}

const SECTIONS: DebriefSection[] = [
  {
    id: 'situation',
    label: 'The Situation',
    question: 'What is actually going on with this brand right now?',
    placeholder: 'Honest, not flattering. What is the real state of this brand?',
    proofPrompt: 'The user has written a situation statement for the debrief. Respond as proof. — assess whether this is a genuine diagnosis or a polished summary. Does it say something that would be uncomfortable to show the client? It should. 2-3 sentences.',
  },
  {
    id: 'challenge',
    label: 'The Challenge',
    question: 'What is the real strategic problem to solve?',
    placeholder: 'Often different from what the client said they wanted.',
    proofPrompt: 'The user has defined the strategic challenge. Respond as proof. — is this the real challenge, or a symptom of it? Is it specific enough to guide creative decisions? 2-3 sentences.',
  },
  {
    id: 'angle',
    label: 'Our Angle',
    question: 'What is your point of view on how to approach this?',
    placeholder: 'The first strategic stake in the ground. If a competitor could take the same angle, it is not an angle.',
    proofPrompt: 'The user has written their strategic angle. Respond as proof. — is this a genuine point of view, or a description of the process? A real angle is a bet. Does this feel like a bet? 2-3 sentences. Apply the competitor test.',
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
  const [openId, setOpenId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string>('situation')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [generating, setGenerating] = useState(false)

  const blurTimers: Record<string, ReturnType<typeof setTimeout>> = {}

  // Build brief summary for context
  const briefSummary = BRIEF_QUESTIONS
    .filter(q => project.brief?.answers?.[q.id]?.value?.trim())
    .map(q => `${q.cat}: ${project.brief?.answers?.[q.id]?.value}`)
    .join('\n\n')

  // Generate a first draft of the debrief from the brief
  async function generateDraft() {
    if (generating || !briefSummary) return
    setGenerating(true)

    const prompt = `Based on this brand brief, write a first draft of all three debrief sections.

Brief:
${briefSummary}

Write each section clearly labeled:
SITUATION: [1-2 sentences on what's actually going on with this brand]
CHALLENGE: [1 sentence — the real strategic problem, often different from what the client stated]
ANGLE: [1-2 sentences — a specific point of view on how to approach this brand]

Be direct. Be specific. The situation should be honest enough to be uncomfortable. The challenge should be precise. The angle should be a real bet, not a description of process.`

    let full = ''
    await stream({
      project,
      mode: 'strategist',
      module: 'Debrief',
      prompt,
      maxTokens: 400,
      onChunk: (text) => { full = text },
      onComplete: (text) => {
        // Parse the three sections
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

  function saveDebrief(v: typeof values) {
    updateProject(project.id, {
      debrief: {
        situation: v.situation,
        challenge: v.challenge,
        angle: v.angle,
      },
    })
  }

  function handleInput(id: string, value: string) {
    const next = { ...values, [id]: value }
    setValues(next)
    saveDebrief(next)
    clearTimeout(blurTimers[id])
  }

  function handleBlur(id: string) {
    const value = values[id as keyof typeof values]?.trim()
    if (!value || value.length < 20 || fetchedIds.has(id)) return
    blurTimers[id] = setTimeout(() => fetchThought(id, value), 1000)
  }

  async function fetchThought(id: string, answer: string) {
    const section = SECTIONS.find(s => s.id === id)
    if (!section) return
    setStreamingId(id)

    const prompt = `${section.proofPrompt}

Brief context:
${briefSummary}

Their ${section.label}:
"${answer}"`

    await stream({
      project,
      mode: 'strategist',
      module: 'Debrief',
      prompt,
      maxTokens: 200,
      onChunk: (text) => setThoughts(prev => ({ ...prev, [id]: text })),
      onComplete: (text) => {
        setThoughts(prev => ({ ...prev, [id]: text }))
        setFetchedIds(prev => new Set([...prev, id]))
        setStreamingId(null)
        setOpenId(id)
      },
    })
  }

  function handleKeyDown(e: React.KeyboardEvent, id: string) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      const idx = SECTIONS.findIndex(s => s.id === id)
      const next = SECTIONS[idx + 1]
      if (next) setActiveId(next.id)
    }
  }

  const allFilled = values.situation.trim().length > 20 &&
    values.challenge.trim().length > 20 &&
    values.angle.trim().length > 20

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Strip project={project} phase="Discovery — Debrief" onAskProof={() => setDrawerOpen(true)} />

      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '80px 24px 120px' }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 16 }}>
            Discovery — Stage 2 of 4
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.08, marginBottom: 20 }}>
            The Debrief
          </h1>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 480, fontWeight: 300, marginBottom: 40 }}>
            This is not a summary of the brief. It is an interpretation. It says: here is what we heard, here is what it means, here is the real challenge underneath the stated one.
          </p>

          {/* Generate from brief */}
          {briefSummary && !generated && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                padding: '20px 24px',
                background: '#FDFCFA',
                border: '1px solid var(--aluminum)',
                borderRadius: 8,
                marginBottom: 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <p style={{ fontSize: 13, color: 'var(--concrete)', lineHeight: 1.6, fontWeight: 300 }}>
                proof. can write a first draft from your brief answers. You own the edit.
              </p>
              <button
                onClick={generateDraft}
                disabled={generating}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  fontWeight: 500,
                  background: generating ? 'var(--aluminum)' : 'var(--dark)',
                  color: '#FDFCFA',
                  border: 'none',
                  borderRadius: 5,
                  padding: '9px 18px',
                  cursor: generating ? 'default' : 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => { if (!generating) (e.currentTarget.style.background = 'var(--mango)') }}
                onMouseLeave={e => { if (!generating) (e.currentTarget.style.background = 'var(--dark)') }}
              >
                {generating ? 'Writing…' : 'Generate draft →'}
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {SECTIONS.map((section, i) => {
            const isActive = activeId === section.id
            const value = values[section.id]
            const thought = thoughts[section.id]
            const hasThought = !!thought
            const isStreaming = streamingId === section.id
            const thoughtOpen = openId === section.id

            return (
              <motion.div
                key={section.id}
                onClick={() => !isActive && setActiveId(section.id)}
                animate={{ opacity: isActive ? 1 : 0.45 }}
                transition={{ duration: 0.3 }}
                style={{
                  marginBottom: 64,
                  cursor: isActive ? 'default' : 'pointer',
                }}
              >
                {/* Label + indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: isActive ? 'var(--concrete)' : 'var(--stone)',
                    transition: 'color 0.3s',
                  }}>
                    {section.label}
                  </div>

                  <AnimatePresence>
                    {(hasThought || isStreaming) && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenId(thoughtOpen ? null : section.id)
                          if (!isActive) setActiveId(section.id)
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
                        }}
                      >
                        <motion.div
                          style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mango)' }}
                          animate={isStreaming
                            ? { scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }
                            : { boxShadow: ['0 0 0 0px rgba(255,161,10,0.4)', '0 0 0 4px rgba(255,161,10,0)', '0 0 0 0px rgba(255,161,10,0.4)'] }
                          }
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <span style={{
                          fontSize: 10, fontWeight: 400, color: 'var(--mango)',
                          letterSpacing: '0.04em', fontFamily: 'var(--font-display)', fontStyle: 'italic',
                        }}>
                          {isStreaming ? 'thinking…' : 'note'}
                        </span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: isActive ? 22 : 18,
                  fontWeight: 400,
                  color: 'var(--dark)',
                  lineHeight: 1.45,
                  marginBottom: 20,
                  transition: 'font-size 0.3s',
                }}>
                  {section.question}
                </div>

                <textarea
                  value={value}
                  onChange={e => handleInput(section.id, e.target.value)}
                  onFocus={() => setActiveId(section.id)}
                  onBlur={() => handleBlur(section.id)}
                  onKeyDown={e => handleKeyDown(e, section.id)}
                  placeholder={section.placeholder}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${isActive ? 'var(--concrete)' : 'var(--aluminum)'}`,
                    padding: '8px 0 14px',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 15,
                    fontWeight: 300,
                    color: 'var(--dark)',
                    outline: 'none',
                    resize: 'none',
                    lineHeight: 1.85,
                    minHeight: 72,
                    transition: 'border-color 0.25s',
                    display: 'block',
                  }}
                />

                {/* Cmd+Enter hint */}
                <AnimatePresence>
                  {isActive && value.trim().length > 20 && i < SECTIONS.length - 1 && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ marginTop: 8, fontSize: 11, color: 'var(--stone)', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <kbd style={{ fontFamily: 'var(--font-sans)', fontSize: 10, background: 'var(--aluminum)', borderRadius: 3, padding: '1px 5px', color: 'var(--concrete)' }}>⌘ Enter</kbd>
                      <span>to move on</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* proof. thought */}
                <AnimatePresence>
                  {thoughtOpen && (hasThought || isStreaming) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ marginTop: 20, paddingLeft: 18, borderLeft: '1.5px solid var(--mango)' }}>
                        <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85 }}>
                          {thought}
                          {isStreaming && (
                            <span style={{ display: 'inline-block', width: 1.5, height: 14, background: 'var(--mango)', marginLeft: 2, verticalAlign: 'middle', animation: 'blink 0.9s step-end infinite' }} />
                          )}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>

        {/* Nav */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingTop: 32, borderTop: '1px solid rgba(194,189,183,0.5)',
        }}>
          <button
            onClick={() => router.push(`/project/${project.id}/brief`)}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Brief
          </button>
          <button
            onClick={() => {
              if (!allFilled) { setDrawerOpen(true); return }
              updateProject(project.id, { status: 'research' })
              router.push(`/project/${project.id}/research`)
            }}
            style={{
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, letterSpacing: '0.06em',
              background: allFilled ? 'var(--dark)' : 'var(--aluminum)',
              color: allFilled ? '#FDFCFA' : '#8C8780',
              border: 'none', borderRadius: 5, padding: '12px 26px',
              cursor: allFilled ? 'pointer' : 'default', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (allFilled) (e.currentTarget.style.background = 'var(--mango)') }}
            onMouseLeave={e => { if (allFilled) (e.currentTarget.style.background = 'var(--dark)') }}
          >
            Continue to Research →
          </button>
        </div>
      </main>

      <ProofDrawer
        project={project}
        mode="strategist"
        module="Debrief"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialMessage={!allFilled ? "Complete all three sections before moving on. The debrief is your point of view — without it, there's nothing to build from." : undefined}
      />

      <style>{`@keyframes blink { 50% { opacity: 0; } } textarea::placeholder { color: var(--stone); font-style: italic; }`}</style>
    </div>
  )
}
