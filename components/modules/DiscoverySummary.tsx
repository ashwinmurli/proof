'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Project } from '@/types'
import { useProofStore } from '@/store'
import { useProofStream } from '@/lib/useProofStream'
import { BRIEF_QUESTIONS } from '@/lib/questions'
import Strip from '@/components/proof/Strip'


// Strip markdown formatting from model output
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')  // **bold**
    .replace(/\*(.+?)\*/g, '$1')        // *italic*
    .replace(/^#+\s+/gm, '')            // # headers
    .replace(/^\s*[-*]\s+/gm, '')      // bullet points
    .trim()
}

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
  const [phase, setPhase] = useState<'generating' | 'ready'>(
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

Respond using EXACTLY these three section labels on their own lines, followed by the content:

WHAT WE FOUND
[3-4 sentences. The most important truths from Discovery — what the brand is actually about at its core, not what the client said. What you heard underneath. Be specific. Name the thing. Wrap 2-3 of the sharpest phrases in double brackets like [[this phrase]] — these are the key insights that stand out.]

THE TENSION
[1-2 sentences. The productive contradiction at the heart of this brand. Not a problem to solve — the creative engine that makes it interesting rather than generic. Wrap 1 key phrase in [[double brackets]].]

THE QUESTION
[1 sentence. The sharpest possible version of what Synthesis must resolve. Concrete enough that you'd know when you'd answered it. No highlights needed here.]

No em dashes. No flattery. No markdown formatting. Direct.`

    await stream({
      project, mode: 'strategist', module: 'DiscoverySummary', prompt, maxTokens: 500,
      onChunk: (text) => { setSummaryText(text) },
      onComplete: (text) => {
        setSummaryText(text)
        updateProject(project.id, { discoverySummary: text })
        setPhase('ready')
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
    // Match label on its own line, then capture content until next label or end
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const escapedNext = nextKey ? nextKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : null
    const pattern = escapedNext
      ? new RegExp(`${escapedKey}[:\\s]*\\n([\\s\\S]+?)(?=\\n${escapedNext}[:\\s]*\\n|$)`)
      : new RegExp(`${escapedKey}[:\\s]*\\n([\\s\\S]+?)$`)
    return summaryText.match(pattern)?.[1]?.trim() || ''
  }

  const found = stripMarkdown(parseSection('WHAT WE FOUND', 'THE TENSION'))
  const tension = stripMarkdown(parseSection('THE TENSION', 'THE QUESTION'))
  const question = stripMarkdown(parseSection('THE QUESTION', null))

  const isStreaming = phase === 'generating'

  // Brush stroke SVG underline — mango, hand-drawn feel
  const brushUnderlineSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='8' viewBox='0 0 100 8' preserveAspectRatio='none'%3E%3Cpath d='M0 5 Q10 3 20 5 Q30 7 40 4.5 Q50 2 60 5 Q70 7.5 80 4 Q90 2 100 5' stroke='%23FFA10A' stroke-width='2.5' fill='none' stroke-linecap='round' stroke-linejoin='round' opacity='0.85'/%3E%3Cpath d='M0 6.5 Q15 4.5 30 6 Q45 7.5 60 5.5 Q75 3.5 100 6' stroke='%23FFA10A' stroke-width='1.2' fill='none' stroke-linecap='round' opacity='0.4'/%3E%3C/svg%3E`

  // Render text with [[highlighted]] phrases getting brush underline
  function renderHighlighted(text: string) {
    const parts = text.split(/\[\[(.+?)\]\]/)
    if (parts.length === 1) return <>{text}</>
    return (
      <>
        {parts.map((part, i) =>
          i % 2 === 0
            ? <React.Fragment key={i}>{part}</React.Fragment>
            : (
              <span key={i} style={{
                display: 'inline',
                backgroundImage: `url("${brushUnderlineSvg}")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'bottom center',
                backgroundSize: '100% 8px',
                paddingBottom: '6px',
              }}>
                {part}
              </span>
            )
        )}
      </>
    )
  }

  // Dotted divider with punched half-circles
  function PunchedDivider() {
    const circleStyle = (side: 'left' | 'right'): React.CSSProperties => ({
      position: 'absolute',
      [side]: -29,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 20,
      height: 20,
      borderRadius: '50%',
      background: 'var(--bg)',
      border: '1px solid rgba(184,179,172,0.3)',
      zIndex: 3,
    })
    return (
      <div style={{ position: 'relative', height: 20, margin: '20px 0' }}>
        <div style={circleStyle('left')} />
        <div style={{
          position: 'absolute', left: -18, right: -18, top: '50%', transform: 'translateY(-50%)',
          borderTop: '1.5px dotted rgba(184,179,172,0.45)',
        }} />
        <div style={circleStyle('right')} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-0)' }}>
      <Strip
        project={project}
        phase="Discovery Summary"
        onAskProof={() => {}}
      />

      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '72px 24px 120px' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: 48 }}
        >
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 14 }}>
            Discovery — 4 of 4
          </div>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 420, fontWeight: 300, margin: 0 }}>
            {isStreaming ? 'proof. is closing Discovery…' : 'What was found. The foundation Synthesis builds on.'}
          </p>
        </motion.div>

        {/* Generating */}
        {isStreaming && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(i => (
                <motion.div key={i}
                  style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Single card containing all three sections */}
        <AnimatePresence>
          {(found || tension || question) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: 'var(--surface-1)',
                borderRadius: 14,
                border: '1px solid rgba(184,179,172,0.3)',
                padding: '28px 28px',
                boxShadow: '0 2px 4px rgba(26,24,22,0.04), 0 8px 24px rgba(26,24,22,0.07), 0 24px 48px rgba(26,24,22,0.06)',
                marginBottom: 48,
                overflow: 'visible',
                position: 'relative',
              }}
            >
              {/* WHAT WE FOUND */}
              {(found || isStreaming) && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--aluminum)', marginBottom: 14 }}>
                    proof.'s thoughts on what we found
                  </div>
                  {found ? (
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.75, margin: 0 }}>
                      {renderHighlighted(found)}
                    </p>
                  ) : (
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[0,1,2].map(i => (
                        <motion.div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--mango)' }}
                          animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Divider 1 */}
              {found && tension && <PunchedDivider />}

              {/* THE TENSION */}
              {tension && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--aluminum)', marginBottom: 14 }}>
                    proof.'s thoughts on the tension
                  </div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.75, margin: 0 }}>
                    {renderHighlighted(tension)}
                  </p>
                </div>
              )}

              {/* Divider 2 */}
              {tension && question && <PunchedDivider />}

              {/* THE QUESTION */}
              {question && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--aluminum)', marginBottom: 14 }}>
                    proof.'s thoughts on the question we answer
                  </div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.75, margin: 0 }}>
                    {renderHighlighted(question)}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

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

        {isStreaming && (
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
