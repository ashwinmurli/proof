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
      position: 'sticky', top: 0, zIndex: 10, height: 52,
      background: 'var(--surface-0)',
      borderBottom: '1px solid rgba(184,179,172,0.3)',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      padding: '0 clamp(20px, 5vw, 44px)',
      flexShrink: 0,
    }}>
      {/* Left — wordmark links to project overview */}
      <button
        onClick={() => router.push(`/project/${project.id}`)}
        style={{
          fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300,
          letterSpacing: '0.15em', background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--dark)', padding: 0, justifySelf: 'start',
        }}
      >
        proof<span style={{ color: 'var(--mango)' }}>.</span>
      </button>

      {/* Centre — phase + progress */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 500, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--stone)', lineHeight: 1,
        }}>
          {phase}
        </span>
        {totalCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {Array.from({ length: totalCount }).map((_, i) => (
              <motion.div
                key={i}
                style={{ width: 16, height: 2, borderRadius: 1 }}
                animate={{ background: i < answeredCount ? 'var(--mango)' : 'rgba(184,179,172,0.4)' }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right — proof. button (shows note count if present, otherwise Ask proof.) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifySelf: 'end' }}>
        <AnimatePresence mode="wait">
          {thoughtCount > 0 ? (
            <motion.div
              key="notes"
              initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 4 }}
              transition={{ duration: 0.18 }}
            >
              <ProofButton onClick={onAskProof} pulsing>
                {thoughtCount} {thoughtCount === 1 ? 'note' : 'notes'}
              </ProofButton>
            </motion.div>
          ) : (
            <motion.div
              key="ask"
              initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 4 }}
              transition={{ duration: 0.18 }}
            >
              <ProofButton onClick={onAskProof}>Ask proof.</ProofButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
