'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProofStore } from '@/store'
import { motion } from 'framer-motion'
import Strip from '@/components/proof/Strip'

export default function SynthesisPage() {
  const params = useParams()
  const router = useRouter()
  const { projects, setActiveProject } = useProofStore()
  const projectId = params.id as string
  const project = projects[projectId]

  useEffect(() => {
    if (!project) { router.push('/'); return }
    setActiveProject(projectId)
  }, [project, projectId, router, setActiveProject])

  if (!project) return null

  const briefSummary = project.brief?.proofSummary
  const debriefSummary = project.debrief?.proofSummary

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F2EB' }}>
      <Strip project={project} phase="Synthesis" onAskProof={() => {}} />
      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '80px 24px 120px' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 16 }}>
            Synthesis
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.06, letterSpacing: '-0.015em', marginBottom: 20 }}>
            Coming next.
          </h1>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, fontWeight: 300, marginBottom: 56 }}>
            Purpose, values, personality, voice, naming, tagline, manifesto. Everything built on what was found in Discovery.
          </p>

          {/* Reference cards — proof.'s observations carried forward */}
          {(briefSummary || debriefSummary) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {briefSummary && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  style={{ padding: '20px 24px', background: '#FAF8F4', border: '1px solid rgba(184,179,172,0.35)', borderLeft: '1.5px solid var(--mango)', borderRadius: '0 8px 8px 0' }}
                >
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mango)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />
                    proof. on the brief
                  </div>
                  <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: 'var(--concrete)', lineHeight: 1.85 }}>
                    {briefSummary}
                  </p>
                </motion.div>
              )}
              {debriefSummary && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                  style={{ padding: '20px 24px', background: '#FAF8F4', border: '1px solid rgba(184,179,172,0.35)', borderLeft: '1.5px solid var(--mango)', borderRadius: '0 8px 8px 0' }}
                >
                  <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mango)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--mango)', display: 'inline-block' }} />
                    proof. on the debrief
                  </div>
                  <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: 'var(--concrete)', lineHeight: 1.85 }}>
                    {debriefSummary}
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
