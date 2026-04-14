'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProofStore } from '@/store'
import { motion } from 'framer-motion'
import Strip from '@/components/proof/Strip'

const STAGES = [
  { id: 'brief',             label: 'Brief',             desc: 'The questions that surface what the brand actually is.',    path: 'brief' },
  { id: 'debrief',           label: 'Debrief',           desc: 'Interpretation. Your point of view on the challenge.',      path: 'debrief' },
  { id: 'discovery-summary', label: 'Discovery Summary', desc: 'What was found. The tension. The question to answer.',      path: 'discovery-summary' },
  { id: 'synthesis',         label: 'Synthesis',         desc: 'Beliefs, values, personality, voice, naming, tagline, manifesto.', path: 'synthesis' },
]

// Status reflects the furthest phase reached
const STATUS_ORDER = ['brief', 'debrief', 'synthesis', 'complete']

export default function ProjectOverview() {
  const params = useParams()
  const router = useRouter()
  const { projects, setActiveProject, generateShareToken } = useProofStore()
  const [copied, setCopied] = useState(false)

  const projectId = params.id as string
  const project = projects[projectId]

  useEffect(() => {
    if (!project) { router.push('/'); return }
    setActiveProject(projectId)
  }, [project, projectId, router, setActiveProject])

  if (!project) return null

  const currentStatusIndex = STATUS_ORDER.indexOf(project.status)

  function getStageState(stageId: string) {
    // Discovery summary is a special case — not in STATUS_ORDER
    if (stageId === 'discovery-summary') {
      if (project.discoverySummary) return 'done'
      // Accessible if debrief is complete
      if (project.debrief?.situation) return 'active'
      return 'locked'
    }
    const stageIndex = STATUS_ORDER.indexOf(stageId)
    if (stageIndex < currentStatusIndex) return 'done'
    if (stageIndex === currentStatusIndex) return 'active'
    return 'locked'
  }

  function handleShare() {
    const token = project.shareToken || generateShareToken(project.id)
    const url = `${window.location.origin}/share/${token}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Strip
        project={project}
        phase="Overview"
        onAskProof={() => {}}
      />

      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '72px 24px 120px' }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header */}
          <div style={{ marginBottom: 64 }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 14 }}>
              Project
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.1, marginBottom: 12 }}>
              {project.name}
            </h1>
            {project.description && (
              <p style={{ fontSize: 15, color: 'var(--concrete)', fontWeight: 300, lineHeight: 1.7 }}>
                {project.description}
              </p>
            )}
          </div>

          {/* Stages */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 64 }}>
            {STAGES.map((stage, i) => {
              const state = getStageState(stage.id)
              const isLocked = state === 'locked'
              const isDone = state === 'done'
              const isActive = state === 'active'

              return (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => !isLocked && router.push(`/project/${project.id}/${stage.path}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 0',
                    borderBottom: '1px solid rgba(194,189,183,0.4)',
                    cursor: isLocked ? 'default' : 'pointer',
                    opacity: isLocked ? 0.38 : 1,
                    transition: 'opacity 0.2s',
                  }}
                  whileHover={!isLocked ? { x: 4 } : {}}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    {/* Status indicator */}
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: isDone ? 'var(--mango)' : isActive ? 'var(--dark)' : 'var(--aluminum)',
                      flexShrink: 0,
                      transition: 'background 0.3s',
                    }} />
                    <div>
                      <div style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 20,
                        fontWeight: 400,
                        color: 'var(--dark)',
                        marginBottom: 4,
                      }}>
                        {stage.label}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--concrete)', fontWeight: 300 }}>
                        {stage.desc}
                      </div>
                    </div>
                  </div>
                  {!isLocked && (
                    <div style={{ fontSize: 18, color: 'var(--stone)' }}>→</div>
                  )}
                </motion.div>
              )
            })}
          </div>

          {/* Brand Home — appears when synthesis has content */}
          {project.synthesis && (project.synthesis.beliefs?.belief || project.synthesis.manifesto?.final) && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginTop: 16 }}
            >
              <motion.div
                onClick={() => router.push(`/project/${project.id}/brand-home`)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '20px 0', borderBottom: '1px solid rgba(194,189,183,0.4)',
                  cursor: 'pointer',
                }}
                whileHover={{ x: 4 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: project.synthesis.manifesto?.final ? 'var(--mango)' : 'var(--aluminum)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400, color: 'var(--dark)', marginBottom: 4 }}>
                      Brand Home
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--concrete)', fontWeight: 300 }}>
                      The complete brand document.
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 18, color: 'var(--stone)' }}>→</div>
              </motion.div>
            </motion.div>
          )}

          {/* Share */}
          {(() => {
            const hasSynthesis = !!(project.synthesis?.beliefs?.belief || project.synthesis?.manifesto?.final)
            return (
              <div style={{
                marginTop: 32,
                padding: '24px 28px',
                background: 'var(--surface-1)',
                border: '1px solid var(--aluminum)',
                borderRadius: 10,
              }}>
                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 10 }}>
                  {hasSynthesis ? 'Share with client' : 'Share brief with client'}
                </div>
                <p style={{ fontSize: 13, color: 'var(--concrete)', lineHeight: 1.75, fontWeight: 300, marginBottom: 16 }}>
                  {hasSynthesis
                    ? 'Send this link to your client to share the Brand Home. proof. will show them the complete brand document.'
                    : 'Send this link to your client so they can fill in the brief directly. proof. will guide them — warmly, not critically.'}
                </p>
                <button
                  onClick={handleShare}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                    fontWeight: 500,
                    background: copied ? 'var(--mango)' : 'var(--dark)',
                    color: '#FDFCFA',
                    border: 'none',
                    borderRadius: 5,
                    padding: '10px 20px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  {copied ? 'Link copied ✓' : hasSynthesis ? 'Copy Brand Home link' : 'Copy client link'}
                </button>
              </div>
            )
          })()}
        </motion.div>
      </main>
    </div>
  )
}
