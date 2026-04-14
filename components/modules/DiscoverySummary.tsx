'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Project } from '@/types'
import { useProofStore } from '@/store'
import { useProofStream } from '@/lib/useProofStream'
import { BRIEF_QUESTIONS } from '@/lib/questions'
import Strip from '@/components/proof/Strip'

interface DiscoverySummaryProps {
  project: Project
}

export default function DiscoverySummary({ project }: DiscoverySummaryProps) {
  const router = useRouter()
  const { updateProject } = useProofStore()
  const { stream } = useProofStream()

  // Persist summary text on the project so it survives revisits
  const [summaryText, setSummaryText] = useState(project.brief?.proofSummary && project.debrief?.proofSummary
    ? project.discoverySummary || ''
    : '')
  const [phase, setPhase] = useState<'generating' | 'reading' | 'ready'>(
    project.discoverySummary ? 'ready' : 'generating'
  )

  const briefAnswers = BRIEF_QUESTIONS
    .filter(q => project.brief?.answers?.[q.id]?.value?.trim())
    .map(q => `${q.cat}: ${project.brief!.answers![q.id].value}`)
    .join('\n\n')

  const hasBrief = !!briefAnswers
  const hasDebrief = !!(project.debrief?.situation && project.debrief?.challenge && project.debrief?.angle)

  useEffect(() => {
    if (phase === 'generating' && !summaryText) {
      generate()
    }
  }, [])

  async function generate() {
    setPhase('generating')

    const debriefText = hasDebrief
      ? `Situation: ${project.debrief!.situation}\nChallenge: ${project.debrief!.challenge}\nAngle: ${project.debrief!.angle}`
      : ''

    const prompt = `You are completing the Discovery phase for a brand called "${project.name}" (${project.description}).

Here is what was gathered:

${hasBrief ? `Brief:\n${briefAnswers}` : ''}
${hasDebrief ? `\nDebrief:\n${debriefText}` : ''}
${project.brief?.proofSummary ? `\nproof.'s read of the brief:\n${project.brief.proofSummary}` : ''}
${project.debrief?.proofSummary ? `\nproof.'s read of the debrief:\n${project.debrief.proofSummary}` : ''}

Write the Discovery Summary. This is the document that closes Discovery and opens Synthesis.

It has three parts, each clearly labeled:

WHAT WE FOUND: [3-4 sentences. The most important truths from Discovery. What the brand is actually about at its core — not what the client said, what you heard underneath. Be specific. Name the thing.] 

THE TENSION: [1-2 sentences. The productive contradiction at the heart of this brand. The thing that makes it interesting rather than generic. Not a problem to solve — the creative engine.]

THE QUESTION WE'RE ANSWERING IN SYNTHESIS: [1 sentence. The sharpest possible version of what Synthesis must resolve. Concrete enough that you'd know when you'd answered it.]

No em dashes. No flattery. Direct.`

    await stream({
      project, mode: 'strategist', module: 'DiscoverySummary', prompt, maxTokens: 500,
      onChunk: (text) => { setSummaryText(text) },
      onComplete: (text) => {
        setSummaryText(text)
        updateProject(project.id, { discoverySummary: text })
        setPhase('reading')
        // Brief pause, then move to ready
        setTimeout(() => setPhase('ready'), 2000)
      },
    })
  }

  const handleContinue = useCallback(() => {
    updateProject(project.id, { status: 'synthesis' })
    router.push(`/project/${project.id}/synthesis`)
  }, [project.id, updateProject, router])

  // Parse the three sections from generated text
  function parseSection(key: string, nextKey: string | null): string {
    if (!summaryText) return ''
    const pattern = nextKey
      ? new RegExp(`${key}:\\s*(.+?)(?=\\n${nextKey}:|$)`, 's')
      : new RegExp(`${key}:\\s*(.+?)$`, 's')
    return summaryText.match(pattern)?.[1]?.trim() || ''
  }

  const found = parseSection('WHAT WE FOUND', 'THE TENSION')
  const tension = parseSection('THE TENSION', 'THE QUESTION WE\'RE ANSWERING IN SYNTHESIS')
  const question = parseSection('THE QUESTION WE\'RE ANSWERING IN SYNTHESIS', null)

  const isStreaming = phase === 'generating'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-0)' }}>
      <Strip
        project={project}
        phase="Discovery Summary"
        onAskProof={() => {}}
        totalCount={0}
      />

      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '72px 24px 120px' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: 64 }}
        >
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 14 }}>
            Discovery — 4 of 4
          </div>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.8, maxWidth: 420, fontWeight: 300 }}>
            {phase === 'generating'
              ? 'proof. is closing Discovery…'
              : 'What Discovery found. The foundation Synthesis builds on.'}
          </p>
        </motion.div>

        {/* Generating shimmer */}
        {phase === 'generating' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
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
              Reading everything from the brief and debrief…
            </span>
          </div>
        )}

        {/* Three sections — appear as they stream in */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* What we found */}
          <AnimatePresence>
            {(found || isStreaming) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ paddingBottom: 48, marginBottom: 48, borderBottom: '1px solid rgba(194,189,183,0.35)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--stone)' }}>
                    What we found
                  </span>
                  {isStreaming && !found && (
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[0,1,2].map(i => (
                        <motion.div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--mango)' }}
                          animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
                      ))}
                    </div>
                  )}
                </div>
                {found && (
                  <p style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 22,
                    fontWeight: 400,
                    color: 'var(--dark)',
                    lineHeight: 1.55,
                    letterSpacing: '-0.005em',
                  }}>
                    {found}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* The tension */}
          <AnimatePresence>
            {tension && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                style={{ paddingBottom: 48, marginBottom: 48, borderBottom: '1px solid rgba(194,189,183,0.35)' }}
              >
                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 20 }}>
                  The tension
                </div>
                <p style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontSize: 20,
                  fontWeight: 400,
                  color: 'var(--dark)',
                  lineHeight: 1.6,
                }}>
                  {tension}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* The question */}
          <AnimatePresence>
            {question && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                style={{ marginBottom: 64 }}
              >
                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 20 }}>
                  The question Synthesis answers
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 2, height: '100%', background: 'var(--mango)', borderRadius: 1, flexShrink: 0, alignSelf: 'stretch', minHeight: 32 }} />
                  <p style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 18,
                    fontWeight: 300,
                    color: 'var(--dark)',
                    lineHeight: 1.65,
                    flex: 1,
                  }}>
                    {question}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <AnimatePresence>
          {phase === 'ready' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 32, borderTop: '1px solid rgba(213,212,214,0.35)' }}>
                <button
                  onClick={() => router.push(`/project/${project.id}/debrief`)}
                  style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  ← Debrief
                </button>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button
                    onClick={generate}
                    style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />
                    Regenerate
                  </button>
                  <button
                    onClick={handleContinue}
                    style={{
                      fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                      background: 'var(--dark)', color: '#FDFCFA',
                      border: 'none', borderRadius: 5, padding: '12px 22px',
                      cursor: 'pointer', transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--mango)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--dark)'}
                  >
                    Begin Synthesis →
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Still generating — show a quiet back button */}
        {phase === 'generating' && (
          <button
            onClick={() => router.push(`/project/${project.id}/debrief`)}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--stone)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Debrief
          </button>
        )}
      </main>
    </div>
  )
}
