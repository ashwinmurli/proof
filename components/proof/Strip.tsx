'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Project } from '@/types'
import ProofButton from '@/components/proof/ProofButton'

interface StripProps {
  project: Project
  phase: string
  onAskProof: () => void
  thoughtCount?: number
  answeredCount?: number
  totalCount?: number
}

export default function Strip({
  project, phase, onAskProof,
  thoughtCount = 0, answeredCount = 0, totalCount = 5,
}: StripProps) {
  const router = useRouter()

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 10, height: 56,
      background: '#F5F2EB',
      borderBottom: '1px solid rgba(184,179,172,0.35)',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      padding: '0 44px',
      flexShrink: 0,
    }}>
      {/* Left — wordmark */}
      <button
        onClick={() => router.push(`/project/${project.id}`)}
        style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 300, letterSpacing: '0.15em', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dark)', padding: 0, justifySelf: 'start' }}
      >
        proof<span style={{ color: 'var(--mango)' }}>.</span>
      </button>

      {/* Centre — project name above progress marks */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: '0.03em', lineHeight: 1 }}>
          {project.name || 'Untitled'}
        </span>
        {totalCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {Array.from({ length: totalCount }).map((_, i) => (
              <motion.div
                key={i}
                style={{ width: 18, height: 2, borderRadius: 1 }}
                animate={{ background: i < answeredCount ? 'var(--mango)' : 'rgba(184,179,172,0.45)' }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right — notes + ask + settings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifySelf: 'end' }}>
        <AnimatePresence>
          {thoughtCount > 0 && (
            <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.2 }}>
              <ProofButton onClick={onAskProof} pulsing>
                {thoughtCount} {thoughtCount === 1 ? 'note' : 'notes'}
              </ProofButton>
            </motion.div>
          )}
        </AnimatePresence>

        <ProofButton onClick={onAskProof} pulsing>Ask proof.</ProofButton>

        <button
          onClick={() => router.push('/settings')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--stone)', fontSize: 15, lineHeight: 1, padding: '2px 4px', transition: 'color 0.18s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--concrete)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--stone)')}
        >⚙</button>
      </div>


    </div>
  )
}
