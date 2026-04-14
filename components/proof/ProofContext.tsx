'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Project } from '@/types'
import { useProofStream } from '@/lib/useProofStream'
import { useProofStore } from '@/store'

interface ProofContextProps {
  project: Project
  forModule: 'debrief' | 'synthesis'
}

export default function ProofContext({ project, forModule }: ProofContextProps) {
  const { stream } = useProofStream()
  const { updateProject } = useProofStore()

  const briefSummary = project.brief?.proofSummary
  const debriefSummary = project.debrief?.proofSummary
  const synthesisContext = project.synthesis?.contextSummary as string | undefined

  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  // What stored summary to use/generate
  const storedSummary = forModule === 'synthesis' ? synthesisContext : briefSummary

  useEffect(() => {
    if (storedSummary) {
      setText(storedSummary)
      setDone(true)
      return
    }
    // Only synthesise if we have the right inputs
    if (forModule === 'debrief' && briefSummary) return // debrief uses brief summary directly
    if (forModule === 'synthesis' && briefSummary && debriefSummary) {
      synthesise()
    }
  }, [])

  async function synthesise() {
    setLoading(true)
    const discoverySummary = project.discoverySummary

    const prompt = `You have made these observations about a brand project:

On the brief:
${briefSummary}

On the debrief:
${debriefSummary}
${discoverySummary ? `\nDiscovery Summary:\n${discoverySummary}` : ''}

Write a single, unified piece of strategic context — 3-4 sentences. This is the foundation that Synthesis will be built on. Carry the thread from discovery through to the strategic position. Name the central tension. End with the one thing that must not be lost as the brand is built. No em dashes. No headers. One continuous thought.`

    await stream({
      project,
      mode: 'strategist',
      module: 'Context',
      prompt,
      maxTokens: 280,
      onChunk: (t) => setText(t),
      onComplete: (t) => {
        setText(t)
        setLoading(false)
        setDone(true)
        // Persist
        updateProject(project.id, {
          synthesis: { ...project.synthesis, contextSummary: t }
        })
      },
    })
  }

  if (!briefSummary && !debriefSummary) return null

  // Debrief page: just show the brief summary as-is (no synthesis needed yet)
  const displayText = forModule === 'debrief'
    ? briefSummary || ''
    : text

  if (!displayText && !loading) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
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
      <div style={{
        fontSize: 10, fontWeight: 500, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--mango)',
        marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />
        {loading ? 'proof. is thinking…' : 'On the project'}
      </div>

      {loading && !displayText ? (
        <div style={{ display: 'flex', gap: 4 }}>
          {[0,1,2].map(i => (
            <motion.div key={i}
              style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)' }}
              animate={{ opacity: [0.3,1,0.3], scale: [0.8,1,0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </div>
      ) : (
        <p style={{
          fontFamily: 'var(--font-sans)',
          fontStyle: 'normal',
          fontWeight: 300,
          fontSize: 14,
          color: 'var(--concrete)',
          lineHeight: 1.85,
        }}>
          {displayText}
          {loading && (
            <span style={{ display: 'inline-block', width: 1.5, height: 13, background: 'var(--mango)', marginLeft: 2, verticalAlign: 'middle', animation: 'blink 0.9s step-end infinite' }} />
          )}
        </p>
      )}
      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </motion.div>
  )
}
