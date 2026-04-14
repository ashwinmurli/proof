'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProofStore } from '@/store'
import { motion } from 'framer-motion'
import Strip from '@/components/proof/Strip'
import ProofContext from '@/components/proof/ProofContext'

const MODULES = [
  { id: 'beliefs',     label: 'What we believe',         desc: 'Conviction, horizon, practice.',                    path: 'beliefs' },
  { id: 'values',      label: 'What we stand for',       desc: '3 core values with behavioural definitions.',       path: 'values' },
  { id: 'personality', label: 'Who we are',              desc: 'Brand as a person. Tensions, not adjectives.',      path: 'personality' },
  { id: 'tone',        label: 'How we speak',            desc: 'The spectrum. What sounds like us and what doesn\'t.', path: 'tone' },
  { id: 'naming',      label: 'What we\'re called',      desc: 'Only if the brand doesn\'t have a name yet.',       path: 'naming' },
  { id: 'tagline',     label: 'The line',                desc: 'Directions, variations, locked.',                   path: 'tagline' },
  { id: 'manifesto',   label: 'What we\'re about',       desc: 'In the brand\'s voice, for the people it\'s for.',  path: 'manifesto' },
]

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

  const s = project.synthesis || {}

  function isComplete(id: string): boolean {
    switch (id) {
      case 'beliefs':     return !!(s.beliefs?.belief && s.beliefs?.building && s.beliefs?.working)
      case 'values':      return !!(s.values && s.values.length >= 3)
      case 'personality': return !!(s.personality?.tensions?.length)
      case 'tone':        return !!(s.tone?.poleA && s.tone?.poleB)
      case 'naming':      return !!(s.naming?.chosen || project.name)
      case 'tagline':     return !!(s.tagline?.chosen)
      case 'manifesto':   return !!(s.manifesto?.final)
      default: return false
    }
  }

  const completedCount = MODULES.filter(m => isComplete(m.id)).length

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F5F2EB' }}>
      <Strip project={project} phase="Synthesis" onAskProof={() => {}} />

      <main style={{ flex: 1, maxWidth: 660, width: '100%', margin: '0 auto', padding: '80px 24px 120px' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>

          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 16 }}>
            Synthesis
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 400, color: 'var(--dark)', lineHeight: 1.06, letterSpacing: '-0.015em', marginBottom: 20 }}>
            Building the brand.
          </h1>
          <p style={{ fontSize: 15, color: 'var(--concrete)', lineHeight: 1.85, maxWidth: 460, fontWeight: 300, marginBottom: 64 }}>
            This is where Discovery becomes a brand. Work through each module in order — each one builds on the last.
          </p>

          <ProofContext project={project} forModule="synthesis" />

          {/* Module list */}
          <div>
            {MODULES.map((mod, i) => {
              const done = isComplete(mod.id)
              return (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => router.push(`/project/${project.id}/synthesis/${mod.path}`)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 0', borderBottom: '1px solid rgba(194,189,183,0.4)',
                    cursor: 'pointer',
                  }}
                  whileHover={{ x: 4 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: done ? 'var(--mango)' : 'var(--aluminum)',
                      transition: 'background 0.3s',
                    }} />
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400, color: 'var(--dark)', marginBottom: 3 }}>
                        {mod.label}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--concrete)', fontWeight: 300 }}>{mod.desc}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 16, color: 'var(--stone)' }}>→</div>
                </motion.div>
              )
            })}
          </div>

          {/* Brand Home CTA */}
          {completedCount >= 4 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ marginTop: 48, display: 'flex', justifyContent: 'flex-end' }}
            >
              <button
                onClick={() => router.push(`/project/${project.id}/brand-home`)}
                style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, letterSpacing: '0.05em', background: 'var(--dark)', color: '#FDFCFA', border: 'none', borderRadius: 5, padding: '12px 24px', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--mango)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--dark)')}
              >
                View Brand Home →
              </button>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
