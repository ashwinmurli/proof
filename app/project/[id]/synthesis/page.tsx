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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F2EB' }}>
      <Strip project={project} phase="Synthesis" onAskProof={() => {}} />
      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '80px 24px' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 16 }}>
            Synthesis
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.06, letterSpacing: '-0.015em', marginBottom: 20 }}>
            Coming next.
          </h1>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, fontWeight: 300 }}>
            This is where the raw material of Discovery becomes a brand. Purpose, values, personality, voice, naming, tagline, manifesto.
          </p>
        </motion.div>
      </main>
    </div>
  )
}
